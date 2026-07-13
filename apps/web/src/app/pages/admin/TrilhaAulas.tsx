import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  RefreshCw,
  Save,
  Settings2,
} from "lucide-react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet, apiPatch, apiPost } from "../../core/api/client";
import TrilhaAulaCard, { TrilhaAula } from "./TrilhaAulaCard";

interface Theme {
  id: string;
  title: string;
  sort_order: number;
}
interface Stage {
  id: string;
  theme_id: string;
  stage_number: number;
  title: string;
}
interface ModuleItem {
  id: string;
  theme_id: string;
  title: string;
  stage_number: number;
  sort_order?: number;
}
interface Activity {
  id: string;
  module_id: string;
  title: string;
  type?: string | null;
  instructions?: string | null;
  sort_order: number;
  is_published?: boolean;
}
interface ConteudoResponse {
  themes: Theme[];
  stages: Stage[];
  modules: ModuleItem[];
  activities: Activity[];
}
interface MoveRequest {
  lesson: TrilhaAula;
  target: TrilhaAula;
  crossGroup: boolean;
}

export default function TrilhaAulas() {
  const [data, setData] = useState<ConteudoResponse | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncInfo, setSyncInfo] = useState("");
  const [busyId, setBusyId] = useState("");
  const [reorganizing, setReorganizing] = useState(false);
  const [dragged, setDragged] = useState<TrilhaAula | null>(null);
  const [pendingMove, setPendingMove] = useState<MoveRequest | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = (await apiGet(
        "/painel/conteudo?scope=cms",
      )) as ConteudoResponse;
      setData(response);
      setSelectedThemeId((current) => {
        if (current && response.themes.some((theme) => theme.id === current)) {
          return current;
        }
        const ordered = [...response.themes].sort(
          (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        );
        return ordered[0]?.id ?? "";
      });
    } catch (cause) {
      setData(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar os temas e aulas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const themes = useMemo(
    () =>
      [...(data?.themes ?? [])].sort(
        (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
      ),
    [data],
  );
  const selectedTheme = useMemo(
    () => themes.find((theme) => theme.id === selectedThemeId),
    [themes, selectedThemeId],
  );
  const themeModules = useMemo(
    () =>
      (data?.modules ?? [])
        .filter((module) => module.theme_id === selectedThemeId)
        .sort(
          (a, b) =>
            Number(a.stage_number ?? 0) - Number(b.stage_number ?? 0) ||
            Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        ),
    [data, selectedThemeId],
  );
  const lessonsByModule = useMemo(() => {
    const map = new Map<string, TrilhaAula[]>();
    const moduleIds = new Set(themeModules.map((module) => module.id));
    const ordered = [...(data?.activities ?? [])]
      .filter((activity) => moduleIds.has(activity.module_id))
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
    let position = 0;
    for (const module of themeModules) {
      const lessons = ordered
        .filter((activity) => activity.module_id === module.id)
        .map((activity) => ({
          id: activity.id,
          moduleId: module.id,
          title: activity.title,
          instructions: activity.instructions ?? "",
          type: activity.type,
          isPublished: activity.is_published !== false,
          position: (position += 1),
        }));
      map.set(module.id, lessons);
    }
    return map;
  }, [data, themeModules]);
  const flatLessons = useMemo(
    () => themeModules.flatMap((module) => lessonsByModule.get(module.id) ?? []),
    [themeModules, lessonsByModule],
  );
  const stageNumbers = useMemo(
    () =>
      [...new Set(themeModules.map((module) => module.stage_number))].sort(
        (a, b) => Number(a) - Number(b),
      ),
    [themeModules],
  );
  const stageTitle = useCallback(
    (stageNumber: number) =>
      data?.stages.find(
        (stage) =>
          stage.theme_id === selectedThemeId &&
          stage.stage_number === stageNumber,
      )?.title ?? `Etapa ${stageNumber}`,
    [data, selectedThemeId],
  );
  const publishedCount = flatLessons.filter(
    (lesson) => lesson.isPublished,
  ).length;

  // Depois de cada alteração na trilha, reaplica o catálogo aos vínculos
  // ativos para que todos os alfabetizandos do tema recebam a mesma trilha.
  const applyGradeToLinks = useCallback(async () => {
    try {
      const result = (await apiPost("/learner-activities/sync-grade", {})) as {
        totalLinks: number;
        updatedLinks: number;
      };
      setSyncInfo(
        result.updatedLinks > 0
          ? `Trilha aplicada a ${result.updatedLinks} de ${result.totalLinks} alfabetizando(s) com vínculo ativo.`
          : "Trilha já estava aplicada a todos os alfabetizandos com vínculo ativo.",
      );
    } catch (cause) {
      setSyncInfo("");
      setError(
        cause instanceof Error
          ? `Trilha salva, mas não foi possível aplicá-la aos alfabetizandos: ${cause.message}`
          : "Trilha salva, mas não foi possível aplicá-la aos alfabetizandos.",
      );
    }
  }, []);

  const toggleGrade = async (lesson: TrilhaAula) => {
    try {
      setBusyId(lesson.id);
      setError("");
      setSyncInfo("");
      await apiPatch(`/painel/conteudo/atividades/${lesson.id}`, {
        isPublished: !lesson.isPublished,
      });
      await applyGradeToLinks();
      await loadCatalog();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível alterar a aula.",
      );
    } finally {
      setBusyId("");
    }
  };

  const requestMove = (lesson: TrilhaAula, target: TrilhaAula) => {
    if (lesson.id === target.id) return;
    const movement = {
      lesson,
      target,
      crossGroup: lesson.moduleId !== target.moduleId,
    };
    if (movement.crossGroup) setPendingMove(movement);
    else void saveMove(movement);
  };

  const saveMove = async (movement: MoveRequest) => {
    try {
      setBusyId(movement.lesson.id);
      setPendingMove(null);
      setError("");
      setSyncInfo("");
      const fromIndex = flatLessons.findIndex(
        (item) => item.id === movement.lesson.id,
      );
      const targetIndex = flatLessons.findIndex(
        (item) => item.id === movement.target.id,
      );
      const without = flatLessons.filter(
        (item) => item.id !== movement.lesson.id,
      );
      let insertAt = without.findIndex((item) => item.id === movement.target.id);
      if (fromIndex < targetIndex) insertAt += 1;
      without.splice(insertAt, 0, {
        ...movement.lesson,
        moduleId: movement.target.moduleId,
      });

      // Renumera as aulas por módulo na nova ordem e persiste só o que mudou.
      const positionByModule = new Map<string, number>();
      const updates: Array<{ id: string; body: Record<string, unknown> }> = [];
      for (const item of without) {
        const nextOrder = (positionByModule.get(item.moduleId) ?? 0) + 1;
        positionByModule.set(item.moduleId, nextOrder);
        const original = data?.activities.find(
          (activity) => activity.id === item.id,
        );
        if (!original) continue;
        const moduleChanged = original.module_id !== item.moduleId;
        const orderChanged = Number(original.sort_order ?? 0) !== nextOrder;
        if (!moduleChanged && !orderChanged) continue;
        updates.push({
          id: item.id,
          body: moduleChanged
            ? { moduleId: item.moduleId, sortOrder: nextOrder }
            : { sortOrder: nextOrder },
        });
      }
      for (const update of updates) {
        await apiPatch(`/painel/conteudo/atividades/${update.id}`, update.body);
      }
      if (updates.length > 0) await applyGradeToLinks();
      await loadCatalog();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível reorganizar as aulas.",
      );
    } finally {
      setBusyId("");
      setDragged(null);
    }
  };

  const moveBy = (lesson: TrilhaAula, direction: -1 | 1) => {
    const index = flatLessons.findIndex((item) => item.id === lesson.id);
    const target = flatLessons[index + direction];
    if (target) requestMove(lesson, target);
  };

  const toggleCollapsed = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-800">
            Estrutura pedagógica
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Trilha de aulas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Defina a ordem das aulas e quais entram na trilha de cada tema. A
            trilha é comum: vale para todos os alfabetizandos do tema, e o
            histórico de conclusão é preservado.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReorganizing((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${reorganizing ? "bg-blue-900 text-white" : "border border-slate-300 bg-white text-slate-800"}`}
          >
            <Settings2 className="h-4 w-4" />
            {reorganizing ? "Concluir organização" : "Reorganizar aulas"}
          </button>
          <button
            type="button"
            onClick={() => void loadCatalog()}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50"
            aria-label="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-end">
        <div>
          <label
            htmlFor="trilha-theme"
            className="mb-2 block text-sm font-bold text-slate-900"
          >
            Tema
          </label>
          <select
            id="trilha-theme"
            value={selectedThemeId}
            onChange={(event) => setSelectedThemeId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Selecione um tema</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.title}
              </option>
            ))}
          </select>
        </div>
        {selectedTheme ? (
          <div className="flex min-w-64 items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
            <Layers className="h-5 w-5 text-slate-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Trilha do tema
              </p>
              <p className="font-semibold text-slate-900">
                {selectedTheme.title}
              </p>
              <p className="text-xs text-slate-500">
                {stageNumbers.length}{" "}
                {stageNumbers.length === 1 ? "etapa" : "etapas"} ·{" "}
                {themeModules.length}{" "}
                {themeModules.length === 1 ? "módulo" : "módulos"} ·{" "}
                {publishedCount} de {flatLessons.length} aulas na trilha
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {error ? <StateDisplay type="error" message={error} /> : null}
      {syncInfo ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {syncInfo}
        </div>
      ) : null}
      {loading ? (
        <StateDisplay type="loading" />
      ) : !selectedTheme || themeModules.length === 0 ? (
        <StateDisplay
          type="empty"
          message="Nenhum módulo com aulas foi criado para este tema. Use Aulas e Mídias para montar o conteúdo."
        />
      ) : (
        <div className="space-y-6">
          {stageNumbers.map((stageNumber) => {
            const stageModules = themeModules.filter(
              (module) => module.stage_number === stageNumber,
            );
            return (
              <section
                key={stageNumber}
                className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50"
              >
                <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
                  <BookOpen className="h-5 w-5 text-blue-900" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Etapa {stageNumber}
                    </p>
                    <h2 className="text-lg font-bold text-slate-950">
                      {stageTitle(stageNumber)}
                    </h2>
                  </div>
                </div>
                <div className="space-y-4 p-4">
                  {stageModules.map((module) => {
                    const lessons = lessonsByModule.get(module.id) ?? [];
                    const key = `${selectedThemeId}:${module.id}`;
                    const isClosed = collapsed.has(key);
                    return (
                      <div
                        key={module.id}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => toggleCollapsed(key)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Módulo
                            </p>
                            <p className="font-semibold text-slate-900">
                              {module.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>
                              {lessons.length}{" "}
                              {lessons.length === 1 ? "aula" : "aulas"}
                            </span>
                            {isClosed ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </button>
                        {!isClosed ? (
                          <div className="space-y-3 border-t border-slate-100 p-4">
                            {lessons.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                Nenhuma aula neste módulo.
                              </p>
                            ) : (
                              lessons.map((lesson) => (
                                <TrilhaAulaCard
                                  key={lesson.id}
                                  lesson={lesson}
                                  reorganizing={reorganizing}
                                  busy={busyId === lesson.id}
                                  onToggle={() => void toggleGrade(lesson)}
                                  onMove={(direction) =>
                                    moveBy(lesson, direction)
                                  }
                                  onDragStart={() => setDragged(lesson)}
                                  onDrop={() =>
                                    dragged && requestMove(dragged, lesson)
                                  }
                                />
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {pendingMove ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-950">
              Mover aula para outro módulo?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              “{pendingMove.lesson.title}” será movida para outro módulo ou
              etapa. Isso altera a trilha comum do tema para todos os
              alfabetizandos. Conclusões, tentativas e pontos serão
              preservados.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingMove(null);
                  setDragged(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => pendingMove && void saveMove(pendingMove)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
              >
                <Save className="h-4 w-4" />
                Confirmar mudança
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
