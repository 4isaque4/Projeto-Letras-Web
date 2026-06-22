import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  Pencil,
  Save,
  Video,
  X,
} from "lucide-react";
import { apiGet, apiPatch } from "../../../core/api/client";
import type { MediaLibraryItem } from "./cmsTypes";

async function fetchMediaLibrary(): Promise<MediaLibraryItem[]> {
  return apiGet("/painel/conteudo/media-biblioteca");
}

async function patchMediaItem(
  id: string,
  payload: { publicUrl?: string | null; durationSec?: number | null },
): Promise<MediaLibraryItem> {
  return apiPatch(`/painel/conteudo/media-biblioteca/${id}`, payload);
}

const KIND_LABEL: Record<string, string> = {
  tutorial: "Tutorial obrigatório",
  "intro-etapa": "Introdução de etapa",
  "intro-modulo": "Introdução de módulo",
  dica: "Dica de apoio",
  geral: "Geral",
};

const KIND_ORDER = ["tutorial", "intro-etapa", "intro-modulo", "dica", "geral"];

function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function fmtDuration(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}min ${String(s).padStart(2, "0")}s`;
}

function groupByKind(items: MediaLibraryItem[]): Map<string, MediaLibraryItem[]> {
  const map = new Map<string, MediaLibraryItem[]>();
  for (const kind of KIND_ORDER) map.set(kind, []);
  for (const item of items) {
    const k = item.kind in KIND_LABEL ? item.kind : "geral";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

// ─── Modal de edição ──────────────────────────────────────────────────────────

interface EditModalProps {
  item: MediaLibraryItem;
  onClose: () => void;
  onSaved: (updated: MediaLibraryItem) => void;
}

function EditModal({ item, onClose, onSaved }: EditModalProps) {
  const [url, setUrl] = useState(item.public_url ?? "");
  const [dur, setDur] = useState(String(item.duration_sec ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedUrl = url.trim() || null;
    if (trimmedUrl && !isSafeUrl(trimmedUrl)) {
      setError("Link inválido. Use um endereço que comece com https://");
      return;
    }
    setSaving(true);
    try {
      const updated = await patchMediaItem(item.id, {
        publicUrl: trimmedUrl,
        durationSec: dur ? parseInt(dur, 10) : null,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="pr-4">
            <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide mb-1">
              {KIND_LABEL[item.kind] ?? "Vídeo"}
            </p>
            <h2 className="text-base font-semibold text-slate-900 leading-snug">{item.title}</h2>
            {item.description && (
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">{item.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Link do vídeo
            </label>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Cole o link do YouTube, Vimeo ou do arquivo de vídeo.
            </p>
          </div>

          <div className="w-40">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Duração (em segundos)
            </label>
            <input
              type="number"
              min={1}
              value={dur}
              onChange={(e) => setDur(e.target.value)}
              placeholder="ex: 140"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              <Save size={15} />
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Linha de vídeo ───────────────────────────────────────────────────────────

interface ItemRowProps {
  item: MediaLibraryItem;
  onEdit: (item: MediaLibraryItem) => void;
}

function ItemRow({ item, onEdit }: ItemRowProps) {
  const hasUrl = Boolean(item.public_url);
  return (
    <div className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all hover:shadow-sm ${hasUrl ? "border-slate-200 bg-white" : "border-amber-100 bg-amber-50/50"}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${hasUrl ? "bg-indigo-50 text-indigo-500" : "bg-amber-100 text-amber-600"}`}>
        <Video size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{item.description}</p>
        )}
        {item.duration_sec && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <Clock size={11} />
            {fmtDuration(item.duration_sec)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasUrl ? (
          <>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle size={11} />
              Configurado
            </span>
            {isSafeUrl(item.public_url) && (
              <a
                href={item.public_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Abrir vídeo"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            Sem link
          </span>
        )}
        <button
          onClick={() => onEdit(item)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
          title="Editar link"
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ConteudoVideosPage() {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MediaLibraryItem | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchMediaLibrary()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(updated: MediaLibraryItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setEditing(null);
  }

  const grouped = groupByKind(items);
  const configured = items.filter((i) => i.public_url).length;
  const total = items.length;
  const allDone = total > 0 && configured === total;
  const progress = total > 0 ? Math.round((configured / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {editing && (
        <EditModal item={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Voltar */}
        <div className="mb-6">
          <Link
            to="/admin/conteudo"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm transition-all"
          >
            <ArrowLeft size={15} />
            Aulas e Mídias
          </Link>
        </div>

        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Vídeos de Orientação</h1>
          <p className="mt-1 text-sm text-slate-500">
            Adicione o link de cada vídeo usado no aplicativo mobile. Os vídeos ficam visíveis para o alfabetizando conforme ele avança na jornada.
          </p>
        </div>

        {/* Barra de progresso */}
        {!loading && total > 0 && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">
                {allDone ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <CheckCircle size={15} />
                    Todos os vídeos configurados
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-slate-900">{configured}</span>
                    {" de "}
                    <span className="font-semibold text-slate-900">{total}</span>
                    {" vídeos com link"}
                  </>
                )}
              </span>
              <span className="text-sm font-semibold text-slate-500">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full transition-all ${allDone ? "bg-emerald-500" : "bg-indigo-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {!allDone && (
              <p className="mt-2 text-xs text-slate-400">
                {total - configured} vídeo(s) ainda sem link configurado
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="py-20 text-center text-slate-400 text-sm">Carregando…</div>
        )}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-8">
            {Array.from(grouped.entries()).map(([kind, kindItems]) => {
              if (kindItems.length === 0) return null;
              const kindConfigured = kindItems.filter((i) => i.public_url).length;
              return (
                <section key={kind}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-700">
                      {KIND_LABEL[kind] ?? kind}
                    </h2>
                    <span className="text-xs text-slate-400">
                      {kindConfigured}/{kindItems.length} configurados
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {kindItems.map((item) => (
                      <ItemRow key={item.id} item={item} onEdit={setEditing} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
