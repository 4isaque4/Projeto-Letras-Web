import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListPlus,
  ListX,
  NotebookText,
} from "lucide-react";
import { presentActivityContent } from "./activityManagementPresentation";

export interface GradeLesson {
  id: string;
  moduleId: string;
  title: string;
  instructions: string;
  type?: string | null;
  isPublished: boolean;
  position: number;
}

export default function GradeLessonCard({
  lesson,
  reorganizing,
  busy,
  onToggle,
  onMove,
  onDragStart,
  onDrop,
}: {
  lesson: GradeLesson;
  reorganizing: boolean;
  busy: boolean;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const content = presentActivityContent(lesson);
  return (
    <article
      draggable={reorganizing}
      onDragStart={onDragStart}
      onDragOver={(event) => reorganizing && event.preventDefault()}
      onDrop={onDrop}
      className={`rounded-xl border bg-white p-4 shadow-sm transition ${reorganizing ? "cursor-grab border-blue-300" : "border-slate-200"} ${lesson.isPublished ? "" : "opacity-75"}`}
    >
      <div className="flex gap-3">
        {reorganizing ? (
          <GripVertical
            className="mt-1 h-5 w-5 shrink-0 text-slate-400"
            aria-label="Arrastar aula"
          />
        ) : (
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${lesson.isPublished ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-500"}`}
          >
            <NotebookText className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              {String(lesson.position).padStart(2, "0")}
            </span>
            <h4 className="font-bold text-slate-950">{lesson.title}</h4>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lesson.isPublished ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"}`}
            >
              {lesson.isPublished ? "Na grade" : "Fora da grade"}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
            {content.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{content.typeLabel}</span>
            <span>
              {content.screenCount}{" "}
              {content.screenCount === 1 ? "tela" : "telas"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {reorganizing ? (
            <>
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                onClick={() => onMove(-1)}
                aria-label="Mover aula para cima"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                onClick={() => onMove(1)}
                aria-label="Mover aula para baixo"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onToggle}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {lesson.isPublished ? (
                <ListX className="h-4 w-4" />
              ) : (
                <ListPlus className="h-4 w-4" />
              )}
              {lesson.isPublished ? "Remover da grade" : "Incluir na grade"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
