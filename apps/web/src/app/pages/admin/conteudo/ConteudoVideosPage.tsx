import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Clock, ExternalLink, Pencil, Save, Video, X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md border border-gray-300 bg-white shadow-lg">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div className="pr-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {KIND_LABEL[item.kind] ?? "Vídeo"}
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-gray-900 leading-snug">{item.title}</h2>
            {item.description && (
              <p className="mt-1 text-xs text-gray-500">{item.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 text-gray-400 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Link do vídeo
            </label>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">
              Cole o link do YouTube, Vimeo ou do arquivo de vídeo.
            </p>
          </div>

          <div className="w-40">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Duração (segundos)
            </label>
            <input
              type="number"
              min={1}
              value={dur}
              onChange={(e) => setDur(e.target.value)}
              placeholder="ex: 140"
              className="w-full border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 border border-gray-900 bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
            >
              <Save size={14} />
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
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Video size={15} className="shrink-0 text-gray-400" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
            {item.description && (
              <p className="truncate text-xs text-gray-500">{item.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
        {item.duration_sec ? (
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {fmtDuration(item.duration_sec)}
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap">
        {hasUrl ? (
          <span className="text-gray-700">Configurado</span>
        ) : (
          <span className="font-medium text-red-600">Sem link</span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          {hasUrl && isSafeUrl(item.public_url) && (
            <a
              href={item.public_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-gray-700"
              title="Abrir vídeo"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-1.5 text-gray-400 hover:text-gray-700"
            title="Editar link"
          >
            <Pencil size={14} />
          </button>
        </div>
      </td>
    </tr>
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

  return (
    <div className="min-h-screen bg-gray-100">
      {editing && (
        <EditModal item={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <Link
            to="/admin/conteudo"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={14} />
            Aulas e Mídias
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Vídeos de Orientação</h1>
          <p className="mt-1 text-sm text-gray-600">
            Adicione o link de cada vídeo usado no aplicativo mobile. Os vídeos ficam visíveis para o alfabetizando conforme ele avança na jornada.
          </p>
        </div>

        {loading && (
          <p className="py-12 text-center text-sm text-gray-500">Carregando…</p>
        )}
        {error && (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-6">
            {Array.from(grouped.entries()).map(([kind, kindItems]) => {
              if (kindItems.length === 0) return null;
              const configured = kindItems.filter((i) => i.public_url).length;
              return (
                <div key={kind} className="border border-gray-300 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <h2 className="text-sm font-semibold text-gray-900">
                      {KIND_LABEL[kind] ?? kind}
                    </h2>
                    <span className="text-xs text-gray-500">
                      {configured}/{kindItems.length} configurados
                    </span>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {kindItems.map((item) => (
                        <ItemRow key={item.id} item={item} onEdit={setEditing} />
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
