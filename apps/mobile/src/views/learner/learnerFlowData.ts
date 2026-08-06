import { useCallback, useEffect, useMemo, useState } from 'react';
import { httpClient } from '../../infra/api/http-client';
import { toUserFacingMessage } from '../../infra/api/user-facing-error.js';
import {
  LearnerFlowLesson,
  LearnerFlowModule,
  mapPainelToModules,
  PainelConteudoResponse,
  resolveMediaUrlBySlug,
} from './learnerFlowMapper';
import { useOptionalLearnerSession } from './learnerSessionContext';

// Slug do vídeo "Etapa 1 – Como conduzir cada tela com o alfabetizando"
// (kind=intro-etapa) cadastrado no painel — card opcional da tela de
// Orientações da Etapa 1.
const ETAPA1_INTRO_VIDEO_SLUG = 'etapa1-conduzir-tela';

export type {
  LearnerFlowActivity,
  LearnerFlowLesson,
  LearnerFlowModule,
  LearnerFlowScreen,
  LearnerMediaKind,
  PainelConteudoResponse,
} from './learnerFlowMapper';

let cachedModules: LearnerFlowModule[] | null = null;
let cachedEtapa1IntroVideoUrl: string | null = null;
let cacheTimestamp = 0;
let cachedLearnerProfileId: string | null = null;
// O catálogo de acesso muda o conteúdo do cache (filtra aulas), então faz parte
// da chave — senão o runner do educador e a home do aluno se contaminam.
let cachedSkipAccessCatalog = false;
const CACHE_TTL_MS = 60_000;

interface AccessCatalogLesson {
  id: string;
  accessStatus: 'locked' | 'available';
  progressStatus: 'not_started' | 'in_progress' | 'completed';
  attemptCount: number;
  pointsAwarded: number;
}

interface AccessCatalogResponse {
  themes: Array<{ stages: Array<{ modules: Array<{ lessons: AccessCatalogLesson[] }> }> }>;
}

function applyAccessCatalog(modules: LearnerFlowModule[], catalog: AccessCatalogResponse): LearnerFlowModule[] {
  const accessByActivity = new Map(
    catalog.themes.flatMap((theme) => theme.stages).flatMap((stage) => stage.modules)
      .flatMap((moduleItem) => moduleItem.lessons).map((lesson) => [lesson.id, lesson]),
  );
  return modules.map((moduleItem) => ({
    ...moduleItem,
    lessons: moduleItem.lessons
      .filter((lesson) => accessByActivity.has(lesson.progressId))
      .map((lesson) => {
        const access = accessByActivity.get(lesson.progressId)!;
        return { ...lesson, accessStatus: access.accessStatus, progressStatus: access.progressStatus, attemptCount: access.attemptCount, pointsAwarded: access.pointsAwarded };
      }),
  })).filter((moduleItem) => moduleItem.lessons.length > 0);
}

interface FetchedLearnerFlow {
  modules: LearnerFlowModule[];
  etapa1IntroVideoUrl: string | null;
}

async function fetchLearnerModules(
  learnerProfileId: string | null,
  skipAccessCatalog: boolean,
): Promise<FetchedLearnerFlow> {
  // published=true garante que rascunhos do CMS nao apareçam para o alfabetizando.
  const payload = await httpClient.get<PainelConteudoResponse>(
    '/painel/conteudo?scope=cms&published=true',
  );
  const etapa1IntroVideoUrl = resolveMediaUrlBySlug(payload, ETAPA1_INTRO_VIDEO_SLUG);
  const rawModules = mapPainelToModules(payload);
  // A Etapa 1 é conduzida presencialmente pelo alfabetizador e NÃO passa pela
  // fila de acesso do aluno (learner_activity_access): essa fila só é semeada
  // para a jornada autônoma (Etapa 2+), e uma atividade de Etapa 1 publicada no
  // painel mas ainda não propagada para a fila sumia da lista — deixando o
  // alfabetizando travado na Etapa 1 ("Conteúdo não encontrado" ao entrar na
  // aula, ou "Etapa 1 sem aulas publicadas").
  if (skipAccessCatalog || !learnerProfileId || learnerProfileId.startsWith('learner-local-profile-')) {
    return { modules: rawModules, etapa1IntroVideoUrl };
  }
  try {
    const catalog = await httpClient.get<AccessCatalogResponse>(
      `/learner-activities/catalog?studentId=${encodeURIComponent(learnerProfileId)}`,
    );
    return { modules: applyAccessCatalog(rawModules, catalog), etapa1IntroVideoUrl };
  } catch {
    // Compatibilidade enquanto a migration local ainda não foi aplicada.
    return { modules: rawModules, etapa1IntroVideoUrl };
  }
}

async function fetchCompletedProgressIds(learnerProfileId: string): Promise<Set<string>> {
  try {
    const result = await httpClient.get<{ completedActivityIds: string[] }>(
      `/painel/progress/${learnerProfileId}`,
    );
    return new Set(result.completedActivityIds ?? []);
  } catch {
    return new Set();
  }
}

interface StageStatusEntry {
  stageNumber: number;
  completed: boolean;
  unlocked: boolean;
}

interface StageStatusResponse {
  stages: StageStatusEntry[];
  etapa1Completed: boolean;
  currentStageNumber: number;
}

// Busca o status por etapa autoritativo do painel (fonte da verdade do gate).
// Retorna null em 404/erro de rede/API antiga — o chamador cai no rollup local,
// o que torna a ordem de deploy (painel antes do mobile) segura.
async function fetchStageStatus(
  learnerProfileId: string,
  themeId: string,
): Promise<StageStatusResponse | null> {
  try {
    return await httpClient.get<StageStatusResponse>(
      `/painel/learners/${learnerProfileId}/stage-status?themeId=${encodeURIComponent(themeId)}`,
    );
  } catch {
    return null;
  }
}

export interface StageRollup {
  unlockedStages: Set<number>;
  currentStage: number;
  etapa1Completed: boolean;
  // Menor etapa-ENTIDADE do tema (a conduzida pelo educador). Vem do stage-status
  // do painel, que enumera todas as etapas ativas — inclusive uma Etapa 1 vazia.
  // No fallback local cai para a menor etapa COM conteúdo (aproximação offline).
  firstStage: number;
}

// Desbloqueio sequencial de aulas dentro de um módulo: a 1ª é sempre aberta; as
// demais abrem quando a aula anterior está concluída. Compartilhado entre a home
// do alfabetizando e o runner da Etapa 1 do educador (fonte única da regra).
export function isLessonUnlocked(
  lessons: LearnerFlowLesson[],
  index: number,
  completedLessonIds: Set<string>,
): boolean {
  if (index === 0) return true;
  return completedLessonIds.has(lessons[index - 1].progressId);
}

// Rollup local a partir das aulas visíveis + progresso concluído. Regra igual à
// do painel: uma etapa desbloqueia se é a menor ou se todas as anteriores estão
// concluídas; "Etapa 1" é a menor etapa presente.
export function computeStageRollup(
  modules: LearnerFlowModule[],
  completedLessonIds: Set<string>,
): StageRollup {
  const allLessons = modules.flatMap((m) => m.lessons);
  const stageNumbers = [...new Set(allLessons.map((l) => l.stageNumber))].sort((a, b) => a - b);
  const unlockedStages = new Set<number>();
  const firstStage = stageNumbers[0];
  let previousComplete = true;
  let etapa1Completed = false;

  for (const stage of stageNumbers) {
    if (previousComplete) unlockedStages.add(stage);
    const stageLessons = allLessons.filter((l) => l.stageNumber === stage);
    const stageDone =
      stageLessons.length > 0 && stageLessons.every((l) => completedLessonIds.has(l.progressId));
    if (stage === firstStage) etapa1Completed = stageDone;
    previousComplete = previousComplete && stageDone;
  }

  const currentStage = unlockedStages.size > 0 ? Math.max(...unlockedStages) : firstStage ?? 1;
  return { unlockedStages, currentStage, etapa1Completed, firstStage: firstStage ?? 1 };
}

export function useLearnerFlowData() {
  const session = useOptionalLearnerSession();
  const learnerProfileId = session?.learnerProfileId ?? null;
  const sessionThemeId = session?.themeId ?? null;
  const skipAccessCatalog = session?.isEducatorConducted === true;

  const [modules, setModules] = useState<LearnerFlowModule[]>(cachedModules ?? []);
  const [etapa1IntroVideoUrl, setEtapa1IntroVideoUrl] = useState<string | null>(
    cachedEtapa1IntroVideoUrl,
  );
  const [loading, setLoading] = useState(cachedModules === null);
  const [error, setError] = useState<string | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  // Override autoritativo do painel (quando o endpoint stage-status responde);
  // null = usar apenas o rollup local.
  const [remoteRollup, setRemoteRollup] = useState<StageRollup | null>(null);

  const load = useCallback(async () => {
    const now = Date.now();
    let activeModules: LearnerFlowModule[] = [];
    if (
      cachedModules &&
      cachedLearnerProfileId === learnerProfileId &&
      cachedSkipAccessCatalog === skipAccessCatalog &&
      now - cacheTimestamp < CACHE_TTL_MS
    ) {
      activeModules = cachedModules;
      setModules(cachedModules);
      setLoading(false);
    } else {
      setLoading(true);
      setError(null);
      try {
        const fetched = await fetchLearnerModules(learnerProfileId, skipAccessCatalog);
        cachedModules = fetched.modules;
        cachedEtapa1IntroVideoUrl = fetched.etapa1IntroVideoUrl;
        cachedLearnerProfileId = learnerProfileId;
        cachedSkipAccessCatalog = skipAccessCatalog;
        cacheTimestamp = now;
        activeModules = fetched.modules;
        setModules(fetched.modules);
        setEtapa1IntroVideoUrl(fetched.etapa1IntroVideoUrl);
      } catch (fetchError) {
        // Mensagem amigavel (sem JSON/URL/HTTP) para o alfabetizando; o botao
        // Atualizar refaz a busca quando a conexao/servidor voltar.
        const message = toUserFacingMessage(
          fetchError,
          'Nao foi possivel carregar suas aulas agora. Toque em Atualizar para tentar de novo.',
        );
        setError(message);
        setModules([]);
        cachedModules = [];
        cachedLearnerProfileId = learnerProfileId;
        cachedSkipAccessCatalog = skipAccessCatalog;
        cacheTimestamp = now;
      } finally {
        setLoading(false);
      }
    }

    if (learnerProfileId && !learnerProfileId.startsWith('learner-local-profile-')) {
      const ids = await fetchCompletedProgressIds(learnerProfileId);
      setCompletedLessonIds(ids);

      // Status autoritativo do painel para o tema do alfabetizando: prioriza o
      // tema da sessão (runner do educador injeta o tema atribuído ao aluno).
      // Cada LearnerFlowModule.id é o id do tema; a jornada é travada em um tema,
      // então sem tema na sessão usamos o primeiro presente. Falha/404 → mantém
      // só o rollup local (fallback).
      const themeId = sessionThemeId ?? activeModules[0]?.id ?? null;
      if (themeId) {
        const status = await fetchStageStatus(learnerProfileId, themeId);
        setRemoteRollup(
          status
            ? {
                unlockedStages: new Set(
                  status.stages.filter((s) => s.unlocked).map((s) => s.stageNumber),
                ),
                currentStage: status.currentStageNumber,
                etapa1Completed: status.etapa1Completed,
                // Menor etapa-entidade (inclui uma Etapa 1 vazia, que não aparece
                // nos módulos/conteúdo) — fonte da verdade do "quem é a Etapa 1".
                firstStage: status.stages.length
                  ? Math.min(...status.stages.map((s) => s.stageNumber))
                  : 1,
              }
            : null,
        );
      } else {
        setRemoteRollup(null);
      }
    }
  }, [learnerProfileId, sessionThemeId, skipAccessCatalog]);

  useEffect(() => {
    void load();
  }, [load]);

  const moduleMap = useMemo(() => new Map(modules.map((item) => [item.id, item])), [modules]);

  const getLesson = useCallback(
    (moduleId: string, lessonId: string): LearnerFlowLesson | null => {
      const moduleItem = moduleMap.get(moduleId);
      if (!moduleItem) return null;
      return moduleItem.lessons.find((lesson) => lesson.id === lessonId) ?? null;
    },
    [moduleMap],
  );

  // Rollup do gate: prioriza o status autoritativo do painel; cai para o cálculo
  // local (offline ou API antiga) sem quebrar o desbloqueio de etapas.
  const localRollup = useMemo(
    () => computeStageRollup(modules, completedLessonIds),
    [modules, completedLessonIds],
  );
  const rollup = remoteRollup ?? localRollup;

  return {
    modules,
    etapa1IntroVideoUrl,
    loading,
    error,
    completedLessonIds,
    refresh: load,
    getLesson,
    unlockedStages: rollup.unlockedStages,
    currentStage: rollup.currentStage,
    etapa1Completed: rollup.etapa1Completed,
    firstStage: rollup.firstStage,
  };
}
