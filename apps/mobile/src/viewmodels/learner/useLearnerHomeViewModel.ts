import { LearnerScreenSnapshot, SocketIdentity } from '@letras/shared-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LearnerSessionRepositoryImpl } from '../../data/repositories/learner-session-repository.impl';
import { useLearnerRealtime } from '../../hooks/useLearnerRealtime';
import { httpClient } from '../../infra/api/http-client';
import { SessionStorage } from '../../infra/storage/session-storage';
import { createLearnerSyncOutbox } from '../../infra/storage/learner-sync-outbox.js';
import type { LearnerSyncOutboxEntry } from '../../infra/storage/learner-sync-outbox';
import { toUserFacingMessage } from '../../infra/api/user-facing-error.js';
import type { LessonCompletionResult } from '../../views/learner/learnerAccessPolicy.js';

const LOCAL_PROFILE_PREFIX = 'learner-local-profile';

// Outbox de sincronizacao: escritas de progresso/conclusao que falharem por
// rede sao enfileiradas aqui e reenviadas no bootstrap, ao voltar ao primeiro
// plano e ao reconectar o realtime. A chave idempotente evita envio duplicado.
const learnerSyncOutbox = createLearnerSyncOutbox({ storage: AsyncStorage });

async function sendOutboxEntry(entry: LearnerSyncOutboxEntry): Promise<unknown> {
  if (entry.method === 'PATCH') {
    return httpClient.patch(entry.endpoint, entry.payload);
  }
  if (entry.method === 'PUT') {
    return httpClient.put(entry.endpoint, entry.payload);
  }
  return httpClient.post(entry.endpoint, entry.payload);
}

interface SyncCurrentStateInput {
  currentView?: string;
  currentActivityId?: string;
  statePayload?: Record<string, unknown>;
}

type ProgressStatus = 'IN_PROGRESS' | 'COMPLETED';
type ExtendedProgressStatus = ProgressStatus | 'LOCKED';

interface RecordProgressInput {
  activityId: string;
  status: ExtendedProgressStatus;
  score?: number;
  elapsedSeconds?: number;
  attempts?: number;
  errorsCount?: number;
  maxAttempts?: number;
  lockReason?: string;
}

const UUID_PREFIX_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const CUID_PATTERN = /^c[a-z0-9]{10,}/i;

function resolveCanonicalActivityId(activityId: string): string | null {
  const normalized = activityId.trim();
  if (!normalized) return null;
  const uuidMatch = normalized.match(UUID_PREFIX_PATTERN);
  if (uuidMatch) return uuidMatch[0];
  // Aceita cuid (formato do Prisma local): c + alfanumérico, min 10 chars
  if (CUID_PATTERN.test(normalized)) return normalized;
  return null;
}

interface LearnerHomeViewModelOptions {
  // Quando presente, o view-model opera "por cima" do perfil de um alfabetizando
  // específico (runner da Etapa 1 no modo educador): pula bootstrap de sessão,
  // realtime e lock-polling; recordProgress posta com este UUID. O guard de
  // perfil local (learner-local-profile-*) segue valendo.
  overrideLearnerProfileId?: string;
  // Nome do alfabetizando no modo override (o bootstrap que buscaria o nome é
  // pulado; sem isto o cabeçalho das aulas do runner mostraria "—").
  overrideLearnerName?: string;
  // Tema do alfabetizando no modo override: escopa o stage-status/firstStage do
  // runner ao tema atribuído (sem isto, cairia no primeiro tema publicado).
  overrideThemeId?: string;
}

export function useLearnerHomeViewModel(options: LearnerHomeViewModelOptions = {}) {
  const { overrideLearnerProfileId, overrideLearnerName, overrideThemeId } = options;
  // Runner da Etapa 1: o alfabetizador conduz sob o perfil do alfabetizando.
  const isEducatorConducted = Boolean(overrideLearnerProfileId);
  const repository = useMemo(() => new LearnerSessionRepositoryImpl(), []);
  const realtime = useLearnerRealtime();
  const { connect, disconnect, sendStateUpdate, requestHelp: emitHelp } = realtime;

  const [learnerProfileId, setLearnerProfileId] = useState<string | null>(overrideLearnerProfileId ?? null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [themeNames, setThemeNames] = useState<string[]>([]);
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [polledIsLocked, setPolledIsLocked] = useState(false);
  const [helpRequestedAt, setHelpRequestedAt] = useState<string | null>(null);
  const lastStateRef = useRef<SyncCurrentStateInput>({
    currentView: 'LearnerHome',
  });

  const initialize = useCallback(async () => {
    // Modo override (runner da Etapa 1 no educador): o perfil já vem por prop.
    // Não fazemos bootstrap de sessão, realtime nem busca de temas — o educador
    // apenas conduz as aulas e grava progresso sob o id do alfabetizando.
    if (overrideLearnerProfileId) {
      setLearnerProfileId(overrideLearnerProfileId);
      if (overrideLearnerName) setLearnerName(overrideLearnerName);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      // Só inicializa se já existe um perfil vinculado no storage.
      // Sem esse guarda, bootstrapPersistentSession() criaria um perfil
      // automático no servidor, bypassando o fluxo de vínculo CPF/telefone.
      const storedId = await SessionStorage.getLearnerProfileId();
      if (!storedId || storedId.startsWith(`${LOCAL_PROFILE_PREFIX}-`)) {
        setLoading(false);
        return;
      }

      const session = await repository.bootstrapPersistentSession();
      setLearnerProfileId(session.learnerProfileId);
      httpClient.setLearnerIdentity(session.learnerProfileId);
      setDeviceId(session.deviceId);

      const identity: SocketIdentity = {
        learnerProfileId: session.learnerProfileId,
        participantId: session.deviceId,
        role: 'learner',
      };

      const isLocalFallbackProfile = session.learnerProfileId.startsWith('learner-local-profile-');
      const shouldConnectRealtime = !isLocalFallbackProfile;
      if (shouldConnectRealtime) {
        connect(identity);
      }

      const themes = await repository.getAssignedThemes(session.learnerProfileId);
      setThemeNames(themes.map((item) => item.theme.name));

      if (!isLocalFallbackProfile) {
        try {
          const profile = await httpClient.get<{ displayName?: string }>(
            `/cadastros/alfabetizandos/${session.learnerProfileId}`,
          );
          if (profile.displayName) setLearnerName(profile.displayName);
        } catch {
          // não crítico — cabeçalho funciona sem o nome
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao inicializar sessao';
      const normalized = message.toLowerCase();
      const isProvisioningWarning =
        normalized.includes('learner profile is not provisioned') ||
        normalized.includes('profile is not provisioned');
      // Nunca expor mensagem tecnica/JSON/HTTP ao alfabetizando (RN de copy).
      setErrorMessage(
        isProvisioningWarning
          ? null
          : toUserFacingMessage(
              error,
              'Nao foi possivel abrir sua sessao agora. Toque em Atualizar para tentar de novo.',
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [connect, repository, overrideLearnerProfileId, overrideLearnerName]);

  const syncCurrentState = useCallback(
    async ({
      currentView = 'LearnerHome',
      currentActivityId,
      statePayload,
    }: SyncCurrentStateInput = {}) => {
      if (!learnerProfileId) {
        return;
      }

      const payload = {
        learnerProfileId,
        currentView,
        currentActivityId,
        state: {
          timestamp: new Date().toISOString(),
          ...(statePayload ?? {}),
        },
      };

      lastStateRef.current = {
        currentView: payload.currentView,
        currentActivityId: payload.currentActivityId,
        statePayload: payload.state,
      };

      sendStateUpdate(payload);

      await repository.pushState(learnerProfileId, {
        currentView: payload.currentView,
        currentActivityId: payload.currentActivityId,
        statePayload: payload.state,
      });
    },
    [learnerProfileId, repository, sendStateUpdate],
  );

  const requestHelp = useCallback(
    async (
      message = 'Preciso de apoio na atividade atual.',
      snapshot?: LearnerScreenSnapshot,
    ) => {
      if (!learnerProfileId) {
        return;
      }

      const currentState = lastStateRef.current;
      try {
        await httpClient.post('/painel/support-requests', {
          learnerProfileId,
          currentView: currentState.currentView,
          currentActivityId: currentState.currentActivityId,
          activityId: currentState.currentActivityId,
          message,
          sourcePlatform: 'mobile',
          metadata: {
            deviceId,
            statePayload: currentState.statePayload ?? {},
            snapshot: snapshot ?? null,
          },
        });
      } catch (error) {
        const normalizedMessage =
          error instanceof Error ? error.message : 'Nao foi possivel enviar o pedido de ajuda.';
        setErrorMessage(normalizedMessage);
      }

      emitHelp({
        learnerProfileId,
        message,
        snapshot,
      });

      // Marca o pedido como pendente no app do aluno; o botao PEDIR AJUDA
      // vira "AGUARDANDO AJUDA" ate o alfabetizador destravar (chega via
      // help_received do realtime, que atualiza helpAcknowledgedAt).
      setHelpRequestedAt(new Date().toISOString());
    },
    [deviceId, emitHelp, learnerProfileId],
  );

  const recordProgress = useCallback(
    async ({ activityId, status, score, elapsedSeconds, attempts, errorsCount, maxAttempts, lockReason }: RecordProgressInput): Promise<LessonCompletionResult | null> => {
      if (!learnerProfileId || !activityId) {
        return null;
      }

      // Perfis locais (modo offline/fallback) nao tem registro no backend,
      // entao nao adianta tentar gravar progresso.
      if (learnerProfileId.startsWith('learner-local-profile-')) {
        return null;
      }

      // Em producao o mobile aponta para o painel Express
      // (painel.letras.cloud/api/v1), que expoe POST /painel/progress
      // espelhando o contrato do POST /progress do backend NestJS.
      const canonicalActivityId = resolveCanonicalActivityId(activityId);
      if (!canonicalActivityId) {
        return null;
      }

      // Descreve a escrita de forma serializavel para que, em caso de falha de
      // rede, o mesmo payload possa ser reenviado pela outbox. A idempotencyKey
      // e fixada por invocacao: retentativas usam a mesma chave e nao duplicam.
      const idempotencyKey = `${status === 'COMPLETED' ? 'lesson' : 'progress'}:${learnerProfileId}:${canonicalActivityId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

      const outboxEntry: LearnerSyncOutboxEntry = status === 'COMPLETED' && !isEducatorConducted
        ? {
            idempotencyKey,
            learnerId: learnerProfileId,
            kind: 'completion',
            endpoint: `/learner-activities/${canonicalActivityId}/complete`,
            method: 'POST',
            payload: {
              studentId: learnerProfileId,
              idempotencyKey,
              score,
              elapsedSeconds,
              metadata: { attempts: attempts ?? 1 },
              sourcePlatform: 'mobile',
            },
            createdAt: new Date().toISOString(),
          }
        : {
            idempotencyKey,
            learnerId: learnerProfileId,
            kind: 'progress',
            endpoint: '/painel/progress',
            method: 'POST',
            payload: {
              learnerProfileId,
              activityId: canonicalActivityId,
              // O backend só aceita IN_PROGRESS e COMPLETED — LOCKED é local
              status: status === 'LOCKED' ? 'IN_PROGRESS' : status,
              ...(typeof score === 'number' ? { score } : {}),
              ...(typeof elapsedSeconds === 'number' ? { elapsedSeconds } : {}),
              ...(typeof attempts === 'number' ? { attempts } : {}),
              ...(typeof errorsCount === 'number' ? { errorsCount } : {}),
              ...(typeof maxAttempts === 'number' ? { maxAttempts } : {}),
              ...(typeof lockReason === 'string' && lockReason.trim() ? { lockReason } : {}),
            },
            createdAt: new Date().toISOString(),
          };

      // Conclusão pela via canônica (activity_progress) — é o que o gate de
      // etapa lê (computeLearnerStageStatus) e o que a lista de aulas usa para
      // marcar ✓. Serve de fallback quando a via por atribuição falha, e é a
      // via ÚNICA da Etapa 1 conduzida pelo alfabetizador: a Etapa 1 não é
      // semeada em learner_activity_access, então `/learner-activities/:id/
      // complete` (que exige a aula atribuída) não conclui e o alfabetizando
      // ficava refazendo o mesmo exercício para sempre.
      const completeViaCanonicalProgress = async (): Promise<LessonCompletionResult | null> => {
        const result = await httpClient.post<{ stageCompleted?: unknown }>('/painel/progress', {
          learnerProfileId,
          activityId: canonicalActivityId,
          status: 'COMPLETED',
          ...(typeof score === 'number' ? { score } : {}),
          ...(typeof elapsedSeconds === 'number' ? { elapsedSeconds } : {}),
          ...(typeof attempts === 'number' ? { attempts } : {}),
        });
        return { lessonCompleted: true, stageCompleted: Boolean(result?.stageCompleted) };
      };

      try {
        if (status === 'COMPLETED') {
          if (isEducatorConducted) {
            return await completeViaCanonicalProgress();
          }
          try {
            return await httpClient.post<LessonCompletionResult>(
              outboxEntry.endpoint,
              outboxEntry.payload,
            );
          } catch (completionError) {
            // Aula fora da fila de atribuição (trilha não propagada) ainda
            // precisa ser registrada — senão a aula nunca fica concluída.
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.warn('[learner] completion via assignment failed; using canonical progress', completionError);
            }
            return await completeViaCanonicalProgress();
          }
        }

        await httpClient.post(outboxEntry.endpoint, outboxEntry.payload);
        return null;
      } catch (error) {
        // Falha de rede nao deve quebrar a UI da aula nem perder pontos: a
        // escrita fica pendente na outbox e sera reenviada no proximo bootstrap,
        // reconexao ou retorno ao primeiro plano.
        try {
          await learnerSyncOutbox.enqueue(outboxEntry);
        } catch (enqueueError) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[learner] failed to enqueue progress in outbox', enqueueError);
          }
        }
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[learner] failed to record progress; enqueued for retry', error);
        }
        return null;
      }
    },
    [learnerProfileId, isEducatorConducted],
  );

  const drainOutbox = useCallback(async () => {
    if (!learnerProfileId || learnerProfileId.startsWith(`${LOCAL_PROFILE_PREFIX}-`)) {
      return;
    }
    try {
      await learnerSyncOutbox.drain(sendOutboxEntry, learnerProfileId);
    } catch (error) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[learner] failed to drain sync outbox', error);
      }
    }
  }, [learnerProfileId]);

  const setSessionLocked = useCallback(
    async (isLocked: boolean) => {
      if (!learnerProfileId) return;
      await repository.setLocked(learnerProfileId, isLocked);
    },
    [learnerProfileId, repository],
  );

  const cleanup = useCallback(() => {
    disconnect();
    httpClient.setLearnerIdentity(null);
  }, [disconnect]);

  useEffect(() => {
    // Runner do educador não tem lock de sessão do aluno para vigiar.
    if (overrideLearnerProfileId) {
      setPolledIsLocked(false);
      return;
    }
    if (!learnerProfileId || learnerProfileId.startsWith('learner-local-profile-')) {
      setPolledIsLocked(false);
      return;
    }

    let active = true;
    const pollLockState = async () => {
      const snapshot = await repository.getSessionState(learnerProfileId);
      if (!active) {
        return;
      }
      setPolledIsLocked(Boolean(snapshot?.sessionState?.isLocked));
    };

    void pollLockState();
    const timer = setInterval(pollLockState, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [learnerProfileId, repository, overrideLearnerProfileId]);

  useEffect(() => {
    // O snapshot HTTP e a fonte canonica do lock. O realtime so antecipa a
    // mudanca de UI; se o evento de unlock se perder, o proximo poll precisa
    // conseguir destravar a sessao em vez de ficar preso no ultimo `true`.
    if (realtime.isLocked) setPolledIsLocked(true);
  }, [realtime.isLocked]);

  useEffect(() => {
    // Drena a outbox assim que ha um perfil valido (bootstrap) e sempre que o
    // app retorna ao primeiro plano — momentos tipicos de reconexao de rede.
    if (!learnerProfileId || learnerProfileId.startsWith(`${LOCAL_PROFILE_PREFIX}-`)) {
      return;
    }

    void drainOutbox();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void drainOutbox();
      }
    });

    return () => subscription.remove();
  }, [learnerProfileId, drainOutbox]);

  return {
    loading,
    errorMessage,
    learnerProfileId,
    themeId: overrideThemeId ?? null,
    learnerName,
    deviceId,
    themeNames,
    isLocked: polledIsLocked,
    presence: realtime.presence,
    helpAcknowledgedAt: realtime.helpAcknowledgedAt,
    helpRequestedAt,
    // Ajuda pendente = pediu ajuda e ainda nao recebeu o ack (help_received).
    // Quando o educator destrava, helpAcknowledgedAt > helpRequestedAt e a
    // UI volta ao estado normal do botao "PEDIR AJUDA".
    isHelpPending: Boolean(
      helpRequestedAt &&
        (!realtime.helpAcknowledgedAt || realtime.helpAcknowledgedAt < helpRequestedAt),
    ),
    // Runner da Etapa 1 (educador conduzindo no próprio celular): o alfabetizador
    // está ao lado, então os exercícios não travam por tentativas erradas.
    isEducatorConducted,
    initialize,
    cleanup,
    syncCurrentState,
    requestHelp,
    recordProgress,
    drainOutbox,
    setSessionLocked,
  };
}
