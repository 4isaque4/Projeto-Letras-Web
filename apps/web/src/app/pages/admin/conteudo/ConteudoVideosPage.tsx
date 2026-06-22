import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { AlertCircle, ArrowLeft, Check, Upload, Video, X } from "lucide-react";
import { apiGet, apiPatch, apiPostFormData } from "../../../core/api/client";
import StateDisplay from "../../../components/StateDisplay";
import type { MediaLibraryItem } from "./cmsTypes";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface StorageFile {
  name: string;
  sizeBytes: number;
  mimetype: string;
  updatedAt: string;
  publicUrl: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchMediaLibrary(): Promise<MediaLibraryItem[]> {
  return apiGet("/painel/conteudo/media-biblioteca");
}

async function fetchStorageFiles(): Promise<StorageFile[]> {
  return apiGet("/painel/conteudo/storage-files?bucket=cms-videos&folder=media-library");
}

async function assignVideoUrl(id: string, publicUrl: string | null): Promise<MediaLibraryItem> {
  return apiPatch(`/painel/conteudo/media-biblioteca/${id}`, { publicUrl });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileNameFromUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
  } catch {
    return url.split("/").pop() ?? "";
  }
}

const KIND_LABEL: Record<string, string> = {
  tutorial: "Tutorial obrigatório",
  "intro-etapa": "Introdução de etapa",
  "intro-modulo": "Introdução de módulo",
  dica: "Dica de apoio",
  geral: "Geral",
};

const KIND_DESCRIPTION: Record<string, string> = {
  tutorial: "Vídeos assistidos pelo alfabetizador antes de iniciar a alfabetização.",
  "intro-etapa": "Vídeo de abertura exibido ao entrar em cada etapa.",
  "intro-modulo": "Vídeo de introdução exibido ao entrar em cada módulo.",
  dica: "Vídeos de apoio exibidos durante as atividades do aplicativo.",
  geral: "Outros vídeos do aplicativo.",
};

const KIND_ORDER = ["tutorial", "intro-etapa", "intro-modulo", "dica", "geral"];

function groupByKind(items: MediaLibraryItem[]): Map<string, MediaLibraryItem[]> {
  const map = new Map<string, MediaLibraryItem[]>();
  for (const k of KIND_ORDER) map.set(k, []);
  for (const item of items) {
    const k = item.kind in KIND_LABEL ? item.kind : "geral";
    map.get(k)!.push(item);
  }
  return map;
}

// ─── Modal de atribuição ──────────────────────────────────────────────────────

interface AssignModalProps {
  item: MediaLibraryItem;
  onClose: () => void;
  onAssigned: (updated: MediaLibraryItem) => void;
}

function AssignModal({ item, onClose, onAssigned }: AssignModalProps) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [savingFile, setSavingFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStorageFiles()
      .then(setFiles)
      .catch((e) => setFilesError(e instanceof Error ? e.message : "Erro ao carregar arquivos"))
      .finally(() => setLoadingFiles(false));
  }, []);

  async function handleSelect(file: StorageFile) {
    setActionError(null);
    setSavingFile(file.name);
    try {
      const updated = await assignVideoUrl(item.id, file.publicUrl);
      onAssigned(updated);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Erro ao salvar");
      setSavingFile(null);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const updated = await apiPostFormData(
        `/painel/conteudo/media-biblioteca/${item.id}/upload`,
        form,
      ) as MediaLibraryItem;
      onAssigned(updated);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 overflow-y-auto">
      <div className="w-full max-w-lg border border-gray-300 bg-white shadow-xl">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div className="pr-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {KIND_LABEL[item.kind] ?? "Vídeo"}
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-gray-900 leading-snug">{item.title}</h2>
            {item.description && (
              <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
            )}
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="shrink-0 p-1 text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        {/* Lista de arquivos disponíveis */}
        <div className="px-5 pt-4 pb-2">
          <p className="mb-2 text-xs font-medium text-gray-700">Vídeos disponíveis na biblioteca</p>
          {loadingFiles && (
            <p className="py-8 text-center text-sm text-gray-400">Carregando arquivos…</p>
          )}
          {filesError && (
            <p className="mb-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{filesError}</p>
          )}
          {!loadingFiles && !filesError && files.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              Nenhum vídeo encontrado na biblioteca. Faça o upload abaixo.
            </p>
          )}
        </div>

        {!loadingFiles && files.length > 0 && (
          <div className="max-h-64 overflow-y-auto border-y border-gray-100">
            <table className="w-full">
              <tbody>
                {files.map((f) => {
                  const isCurrent = item.public_url === f.publicUrl;
                  return (
                    <tr key={f.name} className={`border-b border-gray-100 last:border-0 ${isCurrent ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Video size={13} className="shrink-0 text-gray-400" />
                          <span className="truncate text-xs font-medium text-gray-900">{f.name}</span>
                        </div>
                        <p className="mt-0.5 pl-5 text-[11px] text-gray-400">{fmtBytes(f.sizeBytes)}</p>
                      </td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap">
                        {isCurrent ? (
                          <span className="flex items-center justify-end gap-1 text-xs text-gray-500">
                            <Check size={12} /> selecionado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelect(f)}
                            disabled={savingFile !== null}
                            className="border border-gray-900 bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-700 disabled:opacity-50"
                          >
                            {savingFile === f.name ? "Salvando…" : "Selecionar"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé com upload */}
        <div className="px-5 py-4">
          {actionError && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle size={13} /> {actionError}
            </p>
          )}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mov,.mp4,.avi,.mkv,.webm"
                onChange={handleUpload}
                aria-label="Selecionar arquivo de vídeo para upload"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || savingFile !== null}
                className="flex items-center gap-1.5 border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Upload size={14} />
                {uploading ? "Enviando vídeo…" : "Fazer upload de novo vídeo"}
              </button>
              <p className="mt-1 text-[11px] text-gray-400">
                MP4, MOV, AVI, WebM — máximo 200 MB
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-1 text-sm text-gray-400 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Linha de slot ────────────────────────────────────────────────────────────

interface SlotRowProps {
  item: MediaLibraryItem;
  onAssign: (item: MediaLibraryItem) => void;
  onRemove: (updated: MediaLibraryItem) => void;
}

function SlotRow({ item, onAssign, onRemove }: SlotRowProps) {
  const [removing, setRemoving] = useState(false);
  const hasVideo = Boolean(item.public_url);
  const fileName = fileNameFromUrl(item.public_url);

  async function handleRemove() {
    setRemoving(true);
    try {
      const updated = await assignVideoUrl(item.id, null);
      onRemove(updated);
    } catch {
      setRemoving(false);
    }
  }

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-xs leading-snug text-gray-500">{item.description}</p>
        )}
        {hasVideo && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
            <Check size={11} className="shrink-0" />
            <span className="truncate max-w-64" title={fileName}>{fileName}</span>
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap align-middle">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onAssign(item)}
            className="border border-gray-900 bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-700"
          >
            {hasVideo ? "Trocar vídeo" : "Selecionar vídeo"}
          </button>
          {hasVideo && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-40"
            >
              {removing ? "…" : "Remover"}
            </button>
          )}
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
  const [assigningTo, setAssigningTo] = useState<MediaLibraryItem | null>(null);

  useEffect(() => {
    fetchMediaLibrary()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, []);

  function handleAssigned(updated: MediaLibraryItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setAssigningTo(null);
  }

  function handleRemoved(updated: MediaLibraryItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  const grouped = groupByKind(items);

  return (
    <div className="min-h-screen bg-gray-100">
      {assigningTo && (
        <AssignModal
          item={assigningTo}
          onClose={() => setAssigningTo(null)}
          onAssigned={handleAssigned}
        />
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
            Cada item abaixo representa um vídeo exibido em um momento específico da jornada do alfabetizando. Clique em{" "}
            <strong className="font-medium text-gray-800">Selecionar vídeo</strong> para escolher da biblioteca ou enviar um novo arquivo.
          </p>
        </div>

        {loading && <StateDisplay type="loading" />}
        {error && <StateDisplay type="error" message={error} />}

        {!loading && !error && items.length === 0 && (
          <StateDisplay type="empty" message="Nenhum vídeo cadastrado na biblioteca." />
        )}

        {!loading && !error && items.length > 0 && (
          <div className="flex flex-col gap-5">
            {Array.from(grouped.entries()).map(([kind, kindItems]) => {
              if (kindItems.length === 0) return null;
              const assigned = kindItems.filter((i) => i.public_url).length;
              return (
                <div key={kind} className="border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-sm font-semibold text-gray-900">
                        {KIND_LABEL[kind] ?? kind}
                      </h2>
                      <span className="text-xs text-gray-400">
                        {assigned} de {kindItems.length} atribuídos
                      </span>
                    </div>
                    {KIND_DESCRIPTION[kind] && (
                      <p className="mt-0.5 text-xs text-gray-500">{KIND_DESCRIPTION[kind]}</p>
                    )}
                  </div>
                  <table className="w-full">
                    <tbody>
                      {kindItems.map((item) => (
                        <SlotRow
                          key={item.id}
                          item={item}
                          onAssign={setAssigningTo}
                          onRemove={handleRemoved}
                        />
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
