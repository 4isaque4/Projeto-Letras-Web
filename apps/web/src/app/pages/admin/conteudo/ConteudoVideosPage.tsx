import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
import { env } from "../../../core/config/env";
import type { MediaLibraryItem, MediaLibraryKind } from "./cmsTypes";

// ─── API ──────────────────────────────────────────────────────────────────────

const API = `${env.apiBaseUrl ?? "http://localhost:8082/api/v1"}`;

async function fetchMediaLibrary(): Promise<MediaLibraryItem[]> {
  const res = await fetch(`${API}/painel/conteudo/media-biblioteca`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Falha ao carregar vídeos");
  return res.json();
}

async function patchMediaItem(
  id: string,
  payload: { publicUrl?: string | null; durationSec?: number | null },
): Promise<MediaLibraryItem> {
  const res = await fetch(`${API}/painel/conteudo/media-biblioteca/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erro ao salvar");
  }
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  tutorial: "Tutorial obrigatório",
  "intro-etapa": "Introdução de Etapa",
  "intro-modulo": "Introdução de Módulo",
  dica: "Dica (Tutorial de Apoio)",
  geral: "Geral",
};

const KIND_COLOR: Record<string, string> = {
  tutorial: "bg-indigo-100 text-indigo-700",
  "intro-etapa": "bg-emerald-100 text-emerald-700",
  "intro-modulo": "bg-teal-100 text-teal-700",
  dica: "bg-amber-100 text-amber-700",
  geral: "bg-slate-100 text-slate-600",
};

const KIND_ORDER: MediaLibraryKind[] = [
  "tutorial",
  "intro-etapa",
  "intro-modulo",
  "dica",
  "geral",
];

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
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}'${String(s).padStart(2, "0")}"`;
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

// ─── Edit Modal ───────────────────────────────────────────────────────────────

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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedUrl = url.trim() || null;
    if (trimmedUrl && !isSafeUrl(trimmedUrl)) {
      setError("URL inválida. Use apenas https:// ou http://.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {KIND_LABEL[item.kind] ?? item.kind}
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-slate-900">{item.title}</h2>
            {item.description && (
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              URL pública do vídeo
            </label>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... ou URL do storage"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Cole a URL do YouTube, Vimeo, ou o link direto do arquivo no storage.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Duração (segundos)
              </label>
              <input
                type="number"
                min={1}
                value={dur}
                onChange={(e) => setDur(e.target.value)}
                placeholder="ex: 140"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Slug</label>
              <input
                readOnly
                value={item.slug ?? "—"}
                className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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

// ─── Item Row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: MediaLibraryItem;
  onEdit: (item: MediaLibraryItem) => void;
}

function ItemRow({ item, onEdit }: ItemRowProps) {
  const hasUrl = Boolean(item.public_url);
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 hover:shadow-sm transition-all">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Video size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-800">{item.title}</span>
          {item.duration_sec && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={11} />
              {fmtDuration(item.duration_sec)}
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{item.description}</p>
        )}
        {item.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasUrl ? (
          <>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle size={11} />
              Configurado
            </span>
            {isSafeUrl(item.public_url) ? (
              <a
                href={item.public_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Abrir vídeo"
              >
                <ExternalLink size={14} />
              </a>
            ) : null}
          </>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            Sem URL
          </span>
        )}
        <button
          onClick={() => onEdit(item)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Editar"
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConteudoVideosPage() {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MediaLibraryItem | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchMediaLibrary()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro"))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(updated: MediaLibraryItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setEditing(null);
  }

  const grouped = groupByKind(items);
  const configured = items.filter((i) => i.public_url).length;
  const total = items.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {editing && (
        <EditModal item={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            to="/admin/conteudo"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm"
          >
            <ArrowLeft size={15} />
            Aulas e Mídias
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Vídeos de Orientação</h1>
            <p className="mt-1 text-sm text-slate-500">
              Configure as URLs dos vídeos de tutorial, dicas e introdução de etapas usados no
              app mobile.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
            <span className="font-semibold text-emerald-600">{configured}</span>
            <span className="text-slate-400"> / {total} configurados</span>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.round((configured / total) * 100)}%` }}
            />
          </div>
        )}

        {loading && (
          <div className="py-16 text-center text-slate-400">Carregando vídeos…</div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-8">
            {Array.from(grouped.entries()).map(([kind, kindItems]) => {
              if (kindItems.length === 0) return null;
              return (
                <section key={kind}>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${KIND_COLOR[kind] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {KIND_LABEL[kind] ?? kind}
                    </span>
                    <span className="text-xs text-slate-400">{kindItems.length} vídeo(s)</span>
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
