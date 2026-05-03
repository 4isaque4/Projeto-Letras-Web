import { FormEvent, useMemo, useRef, useState } from "react";
import {
  FolderOpen,
  Pause,
  Pencil,
  Play,
  Save,
  Trash2,
  Upload,
  Video,
  Volume2,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { useConfirm } from "../../../components/ConfirmDialog";
import StateDisplay from "../../../components/StateDisplay";
import { env } from "../../../core/config/env";
import { Asset, AssetKind, AssetStatus } from "./cmsTypes";
import { useConteudoData } from "./useConteudoData";
import { getAssetDisplayName, inferAssetKindFromFile, resolvePublicAssetUrl } from "./cmsUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIME_BY_KIND: Record<AssetKind, string> = {
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  png: "image/png",
  jpg: "image/jpeg",
};

type FilterType = "all" | "imagem" | "mp3" | "mp4";

function isImage(kind: AssetKind) { return kind === "png" || kind === "jpg"; }
function isAudio(kind: AssetKind) { return kind === "mp3"; }
function isVideo(kind: AssetKind) { return kind === "mp4"; }

function assetUrl(storagePath: string) {
  return resolvePublicAssetUrl(storagePath, env.supabaseUrl ?? "");
}

function cleanFileName(storagePath: string): string {
  const full = getAssetDisplayName(storagePath);
  const withoutUuid = full.replace(
    /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[^.]+)?$/i,
    "$1",
  );
  return withoutUuid || full;
}

// ─── Audio Card ───────────────────────────────────────────────────────────────

function AudioCard({
  asset,
  onDelete,
  onStatusChange,
}: {
  asset: Asset;
  onDelete: () => void;
  onStatusChange: (s: AssetStatus) => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const url = assetUrl(asset.storage_path);
  const name = cleanFileName(asset.storage_path);

  function toggle() {
    if (!ref.current) return;
    if (playing) {
      ref.current.pause();
      setPlaying(false);
    } else {
      void ref.current.play().then(() => setPlaying(true));
    }
  }

  return (
    <div className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded border border-slate-200 bg-gradient-to-br from-slate-700 to-slate-900">
        <button
          type="button"
          onClick={toggle}
          className="flex h-full w-full flex-col items-center justify-center gap-3 px-4"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/35">
            {playing ? (
              <Pause className="h-5 w-5 fill-white text-white" />
            ) : (
              <Play className="h-5 w-5 fill-white text-white" />
            )}
          </div>
          <div className="flex max-w-full items-center gap-1.5 px-2">
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-white/50" />
            <span className="truncate text-xs text-white/80">{name}</span>
          </div>
        </button>
        <audio ref={ref} src={url} onEnded={() => setPlaying(false)} className="sr-only" />

        {/* Hover overlay — mesma estrutura do VisualCard */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-between bg-black/30 p-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStatusChange(asset.status === "publicado" ? "rascunho" : "publicado"); }}
            className={`border px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${
              asset.status === "publicado"
                ? "border-emerald-400 bg-emerald-500/80 text-white"
                : "border-slate-400 bg-slate-700/80 text-white"
            }`}
          >
            {asset.status === "publicado" ? "Publicado" : "Rascunho"}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex h-7 w-7 items-center justify-center border border-red-400 bg-red-600/80 text-white backdrop-blur-sm hover:bg-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-1 truncate text-xs text-slate-500" title={name}>{name}</p>
    </div>
  );
}

// ─── Image / Video Card ───────────────────────────────────────────────────────

function VisualCard({
  asset,
  onDelete,
  onStatusChange,
}: {
  asset: Asset;
  onDelete: () => void;
  onStatusChange: (s: AssetStatus) => void;
}) {
  const url = assetUrl(asset.storage_path);
  const name = cleanFileName(asset.storage_path);

  return (
    <div className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded border border-slate-200 bg-slate-100">
        {isImage(asset.kind) && url ? (
          <img
            src={url}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : isVideo(asset.kind) && url ? (
          <>
            <video
              src={url}
              preload="metadata"
              muted
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 group-hover:bg-black/60">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200">
            {isVideo(asset.kind) ? (
              <Video className="h-8 w-8 text-slate-400" />
            ) : (
              <ImageIcon className="h-8 w-8 text-slate-400" />
            )}
          </div>
        )}

        {/* Hover overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-2">
            <button
              type="button"
              onClick={() => onStatusChange(asset.status === "publicado" ? "rascunho" : "publicado")}
              className={`border px-2 py-0.5 text-xs font-medium backdrop-blur-sm transition-colors ${
                asset.status === "publicado"
                  ? "border-emerald-400 bg-emerald-500/80 text-white hover:bg-emerald-600/80"
                  : "border-slate-400 bg-slate-700/80 text-white hover:bg-slate-800/80"
              }`}
            >
              {asset.status === "publicado" ? "Publicado" : "Rascunho"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center border border-red-400 bg-red-600/80 text-white backdrop-blur-sm hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-1 truncate text-xs text-slate-500" title={name}>
        {name}
      </p>
    </div>
  );
}

// ─── Media Card dispatcher ────────────────────────────────────────────────────

function MediaCard({
  asset,
  onDelete,
  onStatusChange,
}: {
  asset: Asset;
  onDelete: () => void;
  onStatusChange: (s: AssetStatus) => void;
}) {
  if (isAudio(asset.kind)) {
    return <AudioCard asset={asset} onDelete={onDelete} onStatusChange={onStatusChange} />;
  }
  return <VisualCard asset={asset} onDelete={onDelete} onStatusChange={onStatusChange} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConteudoBibliotecaPage() {
  const {
    data,
    loading,
    error,
    busy,
    feedback,
    setFeedback,
    createTheme,
    updateTheme,
    deleteTheme,
    uploadAsset,
    updateAsset,
    deleteAsset,
    cmsThemes,
    modulesById,
    themesById,
  } = useConteudoData();

  const confirm = useConfirm();

  // Upload
  const [uploadThemeId, setUploadThemeId] = useState("");
  const [uploadStatus, setUploadStatus] = useState<AssetStatus>("publicado");
  const [files, setFiles] = useState<File[]>([]);

  // Theme management
  const [newThemeTitle, setNewThemeTitle] = useState("");
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editThemeTitle, setEditThemeTitle] = useState("");

  // Filter
  const [filterKind, setFilterKind] = useState<FilterType>("all");
  const [filterThemeId, setFilterThemeId] = useState<string | null>(null);

  // ── Derived data ────────────────────────────────────────────────────────────

  // Map themeId → assets belonging to that theme
  const assetsByTheme = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const asset of data.assets) {
      const activity = asset.activity_id
        ? data.activities.find((a) => a.id === asset.activity_id)
        : null;
      const moduleItem = activity ? modulesById.get(activity.module_id) : null;
      const themeFromActivity = moduleItem ? themesById.get(moduleItem.theme_id) : null;
      const metadata =
        asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata)
          ? (asset.metadata as Record<string, unknown>)
          : null;
      const metadataThemeId =
        typeof metadata?.themeId === "string" ? metadata.themeId : "";
      const themeId = themeFromActivity?.id ?? metadataThemeId ?? "";
      const existing = map.get(themeId) ?? [];
      existing.push(asset);
      map.set(themeId, existing);
    }
    return map;
  }, [data.assets, data.activities, modulesById, themesById]);

  const filteredAssets = useMemo(() => {
    let result = data.assets;
    if (filterThemeId !== null) {
      const ids = new Set((assetsByTheme.get(filterThemeId) ?? []).map((a) => a.id));
      result = result.filter((a) => ids.has(a.id));
    }
    if (filterKind === "imagem") result = result.filter((a) => isImage(a.kind));
    else if (filterKind !== "all") result = result.filter((a) => a.kind === filterKind);
    return result;
  }, [data.assets, filterKind, filterThemeId, assetsByTheme]);

  const counts = useMemo(() => {
    const base = filterThemeId !== null
      ? (assetsByTheme.get(filterThemeId) ?? [])
      : data.assets;
    return {
      all:    base.length,
      imagem: base.filter((a) => isImage(a.kind)).length,
      mp3:    base.filter((a) => a.kind === "mp3").length,
      mp4:    base.filter((a) => a.kind === "mp4").length,
    };
  }, [data.assets, filterThemeId, assetsByTheme]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    const theme = cmsThemes.find((t) => t.id === uploadThemeId) ?? null;
    const folder = theme ? `acervo/${theme.slug || theme.id}` : "acervo";
    const metadata: Record<string, unknown> = theme
      ? { themeId: theme.id, themeTitle: theme.title, themeSlug: theme.slug }
      : {};
    for (const file of files) {
      await uploadAsset({
        file,
        kind: inferAssetKindFromFile(file) ?? "png",
        status: uploadStatus,
        folder,
        metadata,
      });
    }
    setFiles([]);
  };

  const handleCreateTheme = async (e: FormEvent) => {
    e.preventDefault();
    const title = newThemeTitle.trim();
    if (!title) return;
    const created = await createTheme({ title });
    if (created) setNewThemeTitle("");
  };

  const handleSaveTheme = async (themeId: string) => {
    const title = editThemeTitle.trim();
    if (!title) return;
    const saved = await updateTheme(themeId, { title });
    if (saved) setEditingThemeId(null);
  };

  const handleDeleteTheme = async (themeId: string, title: string) => {
    const ok = await confirm({
      title: "Excluir tema",
      message: `Excluir "${title}"? Todos os módulos, aulas e mídias vinculadas serão removidos.`,
      confirmLabel: "Excluir tema",
      variant: "danger",
    });
    if (!ok) return;
    await deleteTheme(themeId);
    if (editingThemeId === themeId) setEditingThemeId(null);
  };

  const handleDeleteAsset = async (assetId: string) => {
    const ok = await confirm({
      title: "Excluir mídia",
      message: "Excluir esta mídia permanentemente? Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    await deleteAsset(assetId);
  };

  const handleStatusChange = async (asset: Asset, newStatus: AssetStatus) => {
    await updateAsset({
      assetId: asset.id,
      activityId: asset.activity_id ?? null,
      kind: asset.kind,
      status: newStatus,
      storagePath: asset.storage_path,
      mimeType: MIME_BY_KIND[asset.kind],
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <StateDisplay type="loading" />;
  if (error) return <StateDisplay type="error" message={error} />;

  const filterTabs: { value: FilterType; label: string }[] = [
    { value: "all",    label: `Todos (${counts.all})`       },
    { value: "imagem", label: `Imagens (${counts.imagem})`  },
    { value: "mp3",    label: `Áudios (${counts.mp3})`      },
    { value: "mp4",    label: `Vídeos (${counts.mp4})`      },
  ];

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Biblioteca de Mídias</h1>
        <p className="mt-1 text-sm text-slate-500">
          Imagens, áudios e vídeos usados nas aulas do aplicativo.
        </p>
      </div>

      {/* ── Feedback ───────────────────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`flex items-center justify-between border px-4 py-3 text-sm ${
            feedback.type === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="ml-3 opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Temas ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Temas</h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {cmsThemes.map((theme) => {
            const themeAssets = assetsByTheme.get(theme.id) ?? [];
            const previews = themeAssets.filter((a) => isImage(a.kind)).slice(0, 3);
            const isEditingThis = editingThemeId === theme.id;

            const isActive = filterThemeId === theme.id;

            return (
              <div
                key={theme.id}
                className={`overflow-hidden rounded border bg-white transition-shadow ${
                  isActive
                    ? "border-slate-900 shadow-md"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                {/* Preview thumbnails — clicável para filtrar */}
                <button
                  type="button"
                  onClick={() => setFilterThemeId(isActive ? null : theme.id)}
                  className="relative w-full"
                  title={isActive ? "Remover filtro" : `Ver mídias de "${theme.title}"`}
                >
                  <div className={`grid gap-px bg-slate-200 ${previews.length > 1 ? "grid-cols-3" : "grid-cols-1"} h-20`}>
                    {previews.length > 0 ? (
                      previews.map((a) => (
                        <img
                          key={a.id}
                          src={assetUrl(a.storage_path)}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                        />
                      ))
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-50">
                        <FolderOpen className="h-7 w-7 text-slate-300" />
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                      <span className="border border-white bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                        Filtrando
                      </span>
                    </div>
                  )}
                </button>

                {/* Title + actions */}
                <div className="px-3 py-2.5">
                  {isEditingThis ? (
                    <div className="flex gap-1">
                      <input
                        value={editThemeTitle}
                        onChange={(e) => setEditThemeTitle(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && void handleSaveTheme(theme.id)}
                        className="min-w-0 flex-1 border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveTheme(theme.id)}
                        className="border border-slate-900 bg-slate-900 px-2 py-1 text-white hover:bg-slate-700"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingThemeId(null)}
                        className="border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setFilterThemeId(isActive ? null : theme.id)}
                        className="min-w-0 text-left"
                      >
                        <p className={`truncate text-sm font-medium ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                          {theme.title}
                        </p>
                        <p className="text-xs text-slate-400">{themeAssets.length} arquivo(s)</p>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingThemeId(theme.id); setEditThemeTitle(theme.title); }}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Renomear tema"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleDeleteTheme(theme.id, theme.title); }}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Excluir tema"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* New theme card */}
          <form
            onSubmit={(e) => void handleCreateTheme(e)}
            className="flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
          >
            <FolderOpen className="h-6 w-6 text-slate-300" />
            <input
              value={newThemeTitle}
              onChange={(e) => setNewThemeTitle(e.target.value)}
              placeholder="Nome do tema..."
              className="w-full border border-slate-300 px-2 py-1.5 text-center text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900"
            />
            <button
              type="submit"
              disabled={!newThemeTitle.trim() || busy === "theme"}
              className="w-full border border-slate-900 bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {busy === "theme" ? "Criando..." : "Criar tema"}
            </button>
          </form>
        </div>
      </section>

      {/* ── Upload ─────────────────────────────────────────────────────────── */}
      <section className="border border-slate-300 bg-white p-5">
        <p className="mb-4 font-semibold text-slate-900">Enviar mídias</p>

        <form onSubmit={(e) => void handleUpload(e)} className="flex flex-wrap items-end gap-3">
          {/* File picker */}
          <div className="flex-1" style={{ minWidth: 200 }}>
            <label className="mb-1 block text-xs font-medium text-slate-500">Arquivo(s)</label>
            <label className="flex cursor-pointer items-center gap-2 border border-slate-300 bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100">
              <Upload className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate text-sm text-slate-600">
                {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : "Escolher arquivos..."}
              </span>
              <input
                type="file"
                multiple
                accept="image/*,audio/*,video/*"
                className="sr-only"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </label>
          </div>

          {/* Theme */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Tema</label>
            <select
              value={uploadThemeId}
              onChange={(e) => setUploadThemeId(e.target.value)}
              className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Sem tema</option>
              {cmsThemes.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
            <select
              value={uploadStatus}
              onChange={(e) => setUploadStatus(e.target.value as AssetStatus)}
              className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="publicado">Publicado</option>
              <option value="rascunho">Rascunho</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={files.length === 0 || busy === "asset-upload"}
            className="border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {busy === "asset-upload"
              ? "Enviando..."
              : files.length > 0
                ? `Enviar (${files.length})`
                : "Enviar"}
          </button>
        </form>

        {files.length > 0 && (
          <ul className="mt-3 max-h-24 space-y-0.5 overflow-auto border border-slate-100 bg-slate-50 px-3 py-2">
            {files.map((f) => (
              <li key={`${f.name}-${f.size}`} className="truncate text-xs text-slate-500">
                {f.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Grid de mídias ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Tipo */}
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterKind(tab.value)}
              className={`border px-3 py-1.5 text-sm font-medium transition-colors ${
                filterKind === tab.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Separador + tema ativo */}
          {filterThemeId !== null && (
            <>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1 border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
                <span>{cmsThemes.find((t) => t.id === filterThemeId)?.title ?? "Tema"}</span>
                <button
                  type="button"
                  onClick={() => setFilterThemeId(null)}
                  className="ml-1 opacity-70 hover:opacity-100"
                  title="Remover filtro de tema"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Grid */}
        {filteredAssets.length === 0 ? (
          <StateDisplay type="empty" message="Nenhuma mídia para o filtro selecionado." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filteredAssets.map((asset) => (
              <MediaCard
                key={asset.id}
                asset={asset}
                onDelete={() => void handleDeleteAsset(asset.id)}
                onStatusChange={(s) => void handleStatusChange(asset, s)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
