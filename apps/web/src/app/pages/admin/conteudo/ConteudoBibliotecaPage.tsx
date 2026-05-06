import React, { FormEvent, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  FolderOpen,
  Layers,
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
import {
  getAssetFriendlyName,
  inferAssetKindFromFile,
  isAudioKind,
  isImageKind,
  isVideoKind,
  resolvePublicAssetUrl,
} from "./cmsUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIME_BY_KIND: Record<AssetKind, string> = {
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  png: "image/png",
  jpg: "image/jpeg",
};

type FilterType = "all" | "imagem" | "audio" | "mp4";

const isImage = isImageKind;
const isAudio = isAudioKind;
const isVideo = isVideoKind;

function assetUrl(storagePath: string) {
  return resolvePublicAssetUrl(storagePath, env.supabaseUrl ?? "");
}

function cleanFileName(asset: Asset): string {
  const friendly = getAssetFriendlyName(asset);
  const withoutUuid = friendly.replace(
    /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[^.]+)?$/i,
    "$1",
  );
  return withoutUuid || friendly;
}

// ─── Audio Card ───────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const url = assetUrl(asset.storage_path);
  const name = cleanFileName(asset);

  function toggle() {
    if (!ref.current) return;
    if (playing) {
      ref.current.pause();
      setPlaying(false);
    } else {
      void ref.current.play().then(() => setPlaying(true));
    }
  }

  function handleTimeUpdate() {
    const el = ref.current;
    if (!el || !el.duration) return;
    setCurrentTime(el.currentTime);
    setProgress(el.currentTime / el.duration);
  }

  function handleLoadedMetadata() {
    if (ref.current) setDuration(ref.current.duration);
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || !el.duration) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * el.duration;
    setProgress(pct);
    setCurrentTime(el.currentTime);
  }

  return (
    <div className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded border border-slate-200 bg-gradient-to-br from-slate-700 to-slate-900">
        {/* Área central clicável para play/pause */}
        <button
          type="button"
          onClick={toggle}
          className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 pb-10"
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

        {/* Barra de progresso + tempo — fixada na base do card */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
          <div
            className="pointer-events-auto relative h-2 cursor-pointer rounded-full bg-white/20"
            onClick={seek}
            title="Clique para avançar"
          >
            <div
              className="h-full rounded-full bg-white/70 transition-[width]"
              style={{ width: `${progress * 100}%` }}
            />
            {/* Ponteiro de posição */}
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow"
              style={{ left: `calc(${progress * 100}% - 6px)` }}
            />
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-[10px] text-white/50">{formatTime(currentTime)}</span>
            <span className="text-[10px] text-white/50">{formatTime(duration)}</span>
          </div>
        </div>

        <audio
          ref={ref}
          src={url}
          onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className="sr-only"
        />

        {/* Hover overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-between bg-black/20 p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStatusChange(asset.status === "publicado" ? "rascunho" : "publicado"); }}
            className={`pointer-events-auto border px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${
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
            className="pointer-events-auto flex h-7 w-7 items-center justify-center border border-red-400 bg-red-600/80 text-white backdrop-blur-sm hover:bg-red-700"
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
  const name = cleanFileName(asset);

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

        {/* Hover overlay — pointer-events-none no container, só os botões capturam cliques */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-2">
            <button
              type="button"
              onClick={() => onStatusChange(asset.status === "publicado" ? "rascunho" : "publicado")}
              className={`pointer-events-auto border px-2 py-0.5 text-xs font-medium backdrop-blur-sm transition-colors ${
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
              className="pointer-events-auto flex h-7 w-7 items-center justify-center border border-red-400 bg-red-600/80 text-white backdrop-blur-sm hover:bg-red-700"
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
    updateModule,
    deleteModule,
    uploadAsset,
    updateAsset,
    deleteAsset,
    cmsThemes,
    cmsModules,
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

  // Module management
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");

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
    else if (filterKind === "audio") result = result.filter((a) => isAudio(a.kind));
    else if (filterKind === "mp4") result = result.filter((a) => isVideo(a.kind));
    return result;
  }, [data.assets, filterKind, filterThemeId, assetsByTheme]);

  const counts = useMemo(() => {
    const base = filterThemeId !== null
      ? (assetsByTheme.get(filterThemeId) ?? [])
      : data.assets;
    return {
      all:    base.length,
      imagem: base.filter((a) => isImage(a.kind)).length,
      audio:  base.filter((a) => isAudio(a.kind)).length,
      mp4:    base.filter((a) => isVideo(a.kind)).length,
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
    const rejected: string[] = [];
    for (const file of files) {
      const kind = inferAssetKindFromFile(file);
      if (!kind) {
        rejected.push(file.name);
        continue;
      }
      await uploadAsset({
        file,
        kind,
        status: uploadStatus,
        folder,
        metadata,
      });
    }
    if (rejected.length > 0) {
      window.alert(
        `Tipo de arquivo nao suportado: ${rejected.join(", ")}.\n` +
          `Aceitos: PNG, JPG, MP4, MP3, WAV.`,
      );
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

  const handleSaveModule = async (moduleId: string) => {
    const title = editModuleTitle.trim();
    if (!title) return;
    const saved = await updateModule({ moduleId, title });
    if (saved) setEditingModuleId(null);
  };

  const handleDeleteModule = async (moduleId: string, title: string) => {
    const ok = await confirm({
      title: "Excluir módulo",
      message: `Excluir "${title}"? Todas as aulas e mídias vinculadas serão removidas.`,
      confirmLabel: "Excluir módulo",
      variant: "danger",
    });
    if (!ok) return;
    await deleteModule(moduleId);
    if (editingModuleId === moduleId) setEditingModuleId(null);
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
    { value: "audio",  label: `Áudios (${counts.audio})`    },
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

      {/* ── Módulos ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900">Módulos</h2>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {cmsModules.length}
          </span>
        </div>

        {cmsModules.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum módulo cadastrado.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
            {cmsThemes
              .filter((theme) => cmsModules.some((m) => m.theme_id === theme.id))
              .map((theme) => {
                const themeModules = cmsModules.filter((m) => m.theme_id === theme.id);
                return (
                  <div key={theme.id}>
                    {/* Theme group header */}
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2">
                      <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {theme.title}
                      </span>
                    </div>

                    {/* Modules list */}
                    <div className="divide-y divide-slate-50">
                      {themeModules
                        .slice()
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                        .map((module) => {
                          const activityCount = data.activities.filter(
                            (a) => a.module_id === module.id,
                          ).length;
                          const isEditingThis = editingModuleId === module.id;

                          return (
                            <div
                              key={module.id}
                              className="flex items-center gap-3 px-4 py-3"
                            >
                              <BookOpen className="h-4 w-4 shrink-0 text-slate-300" />

                              {isEditingThis ? (
                                <div className="flex flex-1 items-center gap-2">
                                  <input
                                    value={editModuleTitle}
                                    onChange={(e) => setEditModuleTitle(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") void handleSaveModule(module.id);
                                      if (e.key === "Escape") setEditingModuleId(null);
                                    }}
                                    className="min-w-0 flex-1 border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void handleSaveModule(module.id)}
                                    disabled={busy.startsWith("module-update")}
                                    className="border border-slate-900 bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingModuleId(null)}
                                    className="border border-slate-200 px-2.5 py-1 text-slate-500 hover:bg-slate-50"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                      {module.title}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      Etapa {module.stage_number} · {activityCount} aula
                                      {activityCount !== 1 ? "s" : ""}
                                    </p>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingModuleId(module.id);
                                        setEditModuleTitle(module.title);
                                      }}
                                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                      title="Renomear módulo"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeleteModule(module.id, module.title)
                                      }
                                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                      title="Excluir módulo"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}

            {/* Modules sem tema reconhecido */}
            {(() => {
              const orphans = cmsModules.filter(
                (m) => !cmsThemes.some((t) => t.id === m.theme_id),
              );
              if (orphans.length === 0) return null;
              return (
                <div>
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2">
                    <FolderOpen className="h-3.5 w-3.5 text-slate-300" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Sem tema
                    </span>
                  </div>
                  {orphans.map((module) => {
                    const activityCount = data.activities.filter(
                      (a) => a.module_id === module.id,
                    ).length;
                    const isEditingThis = editingModuleId === module.id;
                    return (
                      <div key={module.id} className="flex items-center gap-3 px-4 py-3">
                        <BookOpen className="h-4 w-4 shrink-0 text-slate-300" />
                        {isEditingThis ? (
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              value={editModuleTitle}
                              onChange={(e) => setEditModuleTitle(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void handleSaveModule(module.id);
                                if (e.key === "Escape") setEditingModuleId(null);
                              }}
                              className="min-w-0 flex-1 border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => void handleSaveModule(module.id)}
                              className="border border-slate-900 bg-slate-900 px-2.5 py-1 text-xs text-white hover:bg-slate-700"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingModuleId(null)}
                              className="border border-slate-200 px-2.5 py-1 text-slate-500 hover:bg-slate-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">{module.title}</p>
                              <p className="text-xs text-slate-400">
                                Etapa {module.stage_number} · {activityCount} aula
                                {activityCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => { setEditingModuleId(module.id); setEditModuleTitle(module.title); }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteModule(module.id, module.title)}
                                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
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
