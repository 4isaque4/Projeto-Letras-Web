import { AlertTriangle, Link2, Unlink, X } from "lucide-react";

interface TutorItem {
  id: string;
  nome: string;
}
interface Props {
  learnerName: string;
  currentTutorName: string;
  currentTutorId: string | null;
  tutors: TutorItem[];
  tutorId: string;
  reason: string;
  saving: boolean;
  onTutorChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onRemove: () => void;
}

export default function LearnerLinkDialog(props: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <section
        className="w-full max-w-lg border border-slate-300 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-dialog-title"
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Alfabetizando
            </p>
            <h2
              id="link-dialog-title"
              className="mt-1 text-xl font-bold text-slate-950"
            >
              Vínculo de {props.learnerName}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Responsável atual: {props.currentTutorName || "Sem alfabetizador"}
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-5 px-6 py-5">
          <label className="block text-sm font-semibold text-slate-800">
            Alfabetizador responsável
            <select
              value={props.tutorId}
              onChange={(e) => props.onTutorChange(e.target.value)}
              className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900"
            >
              <option value="">Selecione o alfabetizador</option>
              {props.tutors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Motivo da alteração
            <textarea
              value={props.reason}
              onChange={(e) => props.onReasonChange(e.target.value)}
              rows={3}
              placeholder="Explique brevemente por que o vínculo será alterado"
              className="mt-2 w-full resize-none border border-slate-300 px-3 py-2.5 font-normal text-slate-900"
            />
          </label>
          <div className="flex gap-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              A troca é livre e não apaga progresso, tentativas, pontos nem
              aulas concluídas.
            </p>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <div>
            {props.currentTutorId ? (
              <button
                type="button"
                disabled={props.saving}
                onClick={props.onRemove}
                className="inline-flex items-center gap-2 border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Unlink className="h-4 w-4" /> Remover vínculo
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={props.onClose}
              className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={props.saving}
              onClick={props.onSave}
              className="inline-flex items-center gap-2 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />{" "}
              {props.saving ? "Salvando..." : "Salvar vínculo"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
