import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  RefreshCw,
  Save,
  Settings2,
  UserRound,
} from "lucide-react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet, apiPatch, apiPost } from "../../core/api/client";
import ActivityLessonCard, { ManagedLesson } from "./ActivityLessonCard";

interface LinkItem {
  id: string;
  aluno: string;
  tutor: string;
  studentId: string;
}
interface Module {
  id: string;
  title: string;
  lessons: ManagedLesson[];
}
interface Stage {
  stageNumber: number;
  title: string;
  completed: boolean;
  modules: Module[];
}
interface Theme {
  id: string;
  title: string;
  stages: Stage[];
}
interface Catalog {
  link: { id: string };
  themes: Theme[];
}
interface MoveRequest {
  lesson: ManagedLesson;
  target: ManagedLesson;
  targetModuleId: string;
  targetIndex: number;
  crossGroup: boolean;
}

export default function AtividadesAlfabetizando() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [reorganizing, setReorganizing] = useState(false);
  const [dragged, setDragged] = useState<ManagedLesson | null>(null);
  const [pendingMove, setPendingMove] = useState<MoveRequest | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      try {
        const response = (await apiGet("/cadastros/vinculos")) as {
          confirmados: LinkItem[];
        };
        const rows = response.confirmados ?? [];
        setLinks(rows);
        setSelectedStudentId(rows[0]?.studentId ?? "");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar os vínculos.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadCatalog = useCallback(async () => {
    if (!selectedStudentId) {
      setCatalog(null);
      return;
    }
    try {
      setLoading(true);
      setError("");
      setCatalog(
        (await apiGet(
          `/learner-activities/catalog?studentId=${encodeURIComponent(selectedStudentId)}`,
        )) as Catalog,
      );
    } catch (cause) {
      setCatalog(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar as atividades.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);
  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const selectedLink = useMemo(
    () => links.find((link) => link.studentId === selectedStudentId),
    [links, selectedStudentId],
  );
  const lessons = useMemo(
    () =>
      catalog?.themes
        .flatMap((theme) => theme.stages)
        .flatMap((stage) => stage.modules)
        .flatMap((module) =>
          module.lessons.map((lesson) => ({ ...lesson, moduleId: module.id })),
        ) ?? [],
    [catalog],
  );
  const completed = lessons.filter(
    (lesson) => lesson.progressStatus === "completed",
  ).length;

  const toggleAccess = async (lesson: ManagedLesson) => {
    if (!catalog?.link.id) return;
    const nextStatus =
      lesson.accessStatus === "available" ? "locked" : "available";
    try {
      setBusyId(lesson.id);
      setError("");
      await apiPatch("/learner-activities/access", {
        linkId: catalog.link.id,
        changes: [{ activityId: lesson.id, accessStatus: nextStatus }],
        reason:
          nextStatus === "available"
            ? "Liberada pelo painel"
            : "Bloqueada pelo painel",
      });
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

  const requestMove = (lesson: ManagedLesson, target: ManagedLesson) => {
    if (lesson.id === target.id) return;
    const targetIndex = Math.max(
      0,
      lessons.findIndex((item) => item.id === target.id),
    );
    const movement = {
      lesson,
      target,
      targetModuleId: target.moduleId,
      targetIndex,
      crossGroup: lesson.moduleId !== target.moduleId,
    };
    if (movement.crossGroup) setPendingMove(movement);
    else void saveMove(movement, false);
  };

  const saveMove = async (
    movement: MoveRequest,
    confirmedCrossGroup: boolean,
  ) => {
    if (!catalog?.link.id) return;
    try {
      setBusyId(movement.lesson.id);
      setPendingMove(null);
      await apiPost("/learner-activities/reorder", {
        linkId: catalog.link.id,
        activityId: movement.lesson.id,
        targetModuleId: movement.targetModuleId,
        targetIndex: movement.targetIndex,
        confirmedCrossGroup,
      });
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

  const moveBy = (lesson: ManagedLesson, direction: -1 | 1) => {
    const index = lessons.findIndex((item) => item.id === lesson.id);
    const target = lessons[index + direction];
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
            Acompanhamento individual
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Atividades do alfabetizando
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Defina a ordem e escolha quais aulas ficam disponíveis. O histórico
            de conclusão é preservado.
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
            htmlFor="activity-student"
            className="mb-2 block text-sm font-bold text-slate-900"
          >
            Alfabetizando
          </label>
          <select
            id="activity-student"
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Selecione um alfabetizando</option>
            {links.map((link) => (
              <option key={link.id} value={link.studentId}>
                {link.aluno}
              </option>
            ))}
          </select>
        </div>
        {selectedLink ? (
          <div className="flex min-w-64 items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
            <UserRound className="h-5 w-5 text-slate-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Alfabetizador responsável
              </p>
              <p className="font-semibold text-slate-900">
                {selectedLink.tutor}
              </p>
              <p className="text-xs text-slate-500">
                {completed} de {lessons.length} aulas concluídas
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {error ? <StateDisplay type="error" message={error} /> : null}
      {loading ? (
        <StateDisplay type="loading" />
      ) : !catalog?.themes.length ? (
        <StateDisplay
          type="empty"
          message="Nenhuma aula foi atribuída a este vínculo."
        />
      ) : (
        <div className="space-y-6">
          {catalog.themes.map((theme) => (
            <section
              key={theme.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50"
            >
              <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
                <BookOpen className="h-5 w-5 text-blue-900" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Tema
                  </p>
                  <h2 className="text-lg font-bold text-slate-950">
                    {theme.title}
                  </h2>
                </div>
              </div>
              <div className="space-y-4 p-4">
                {theme.stages.map((stage) => (
                  <div
                    key={stage.stageNumber}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                      <h3 className="font-bold text-slate-900">
                        {stage.title}
                      </h3>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                        {stage.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <Clock3 className="h-4 w-4" />
                        )}
                        {stage.completed ? "Etapa concluída" : "Em andamento"}
                      </span>
                    </div>
                    {stage.modules.map((module) => {
                      const key = `${theme.id}:${stage.stageNumber}:${module.id}`;
                      const isClosed = collapsed.has(key);
                      return (
                        <div
                          key={module.id}
                          className="border-t border-slate-200"
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
                              <span>{module.lessons.length} aulas</span>
                              {isClosed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                          {!isClosed ? (
                            <div className="space-y-3 border-t border-slate-100 p-4">
                              {module.lessons.map((item) => {
                                const lesson = { ...item, moduleId: module.id };
                                return (
                                  <ActivityLessonCard
                                    key={lesson.id}
                                    lesson={lesson}
                                    reorganizing={reorganizing}
                                    busy={busyId === lesson.id}
                                    onToggle={() => void toggleAccess(lesson)}
                                    onMove={(direction) =>
                                      moveBy(lesson, direction)
                                    }
                                    onDragStart={() => setDragged(lesson)}
                                    onDrop={() =>
                                      dragged && requestMove(dragged, lesson)
                                    }
                                  />
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>
          ))}
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
              Mover aula para outro grupo?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              “{pendingMove.lesson.title}” será movida para outro módulo ou
              etapa. Isso altera a sequência pedagógica e a próxima liberação
              automática. Conclusões, tentativas e pontos serão preservados.
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
                onClick={() => void saveMove(pendingMove, true)}
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
