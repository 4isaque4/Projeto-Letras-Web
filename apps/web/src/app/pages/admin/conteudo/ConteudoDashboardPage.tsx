import { FormEvent, useRef, useState } from "react";
import {
  BookOpen,
  Eye,
  FileAudio2,
  FileImage,
  FileVideo,
  Folder,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Monitor,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Upload,
  Video,
  Volume2,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useConfirm } from "../../../components/ConfirmDialog";
import StateDisplay from "../../../components/StateDisplay";
import { env } from "../../../core/config/env";
import { useConteudoData } from "./useConteudoData";
import {
  assetStatusLabel,
  formatBytes,
  getAssetFriendlyName,
  inferAssetKindFromFile,
  resolvePublicAssetUrl,
} from "./cmsUtils";

function iconByKind(kind: string) {
  if (kind === "mp4") return <FileVideo className="h-4 w-4 text-slate-500" />;
  if (kind === "mp3" || kind === "wav") return <FileAudio2 className="h-4 w-4 text-slate-500" />;
  return <FileImage className="h-4 w-4 text-slate-500" />;
}

function activityTypeLabel(type: string) {
  if (type === "letra") return "Exercício de letras";
  if (type === "video") return "Vídeo";
  if (type === "quiz") return "Quiz";
  if (type === "audio") return "Áudio";
  return type;
}

function activityTypeIcon(type: string) {
  if (type === "video") return <Video className="h-3.5 w-3.5 text-slate-400" />;
  if (type === "letra") return <BookOpen className="h-3.5 w-3.5 text-slate-400" />;
  if (type === "quiz") return <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />;
  if (type === "audio") return <Volume2 className="h-3.5 w-3.5 text-slate-400" />;
  return null;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CompactAudioPlayer({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(() => setPlaying(true));
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * el.duration;
    setCurrentTime(el.currentTime);
  }

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700"
        aria-label={playing ? "Pausar" : "Tocar"}
      >
        {playing ? (
          <Pause className="h-3 w-3 fill-white" />
        ) : (
          <Play className="h-3 w-3 fill-white" />
        )}
      </button>
      <div
        className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-slate-200"
        onClick={seek}
        title="Clique para avançar"
      >
        <div
          className="h-full rounded-full bg-slate-700 transition-[width]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </span>
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        className="sr-only"
      />
    </div>
  );
}

export default function ConteudoDashboardPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, loading, error, busy, uploadAsset, cmsThemes, deleteActivity } = useConteudoData();
  const [uploadThemeId, setUploadThemeId] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"rascunho" | "publicado" | "arquivado">(
    "publicado",
  );
  const [files, setFiles] = useState<File[]>([]);

  if (loading) return <StateDisplay type="loading" />;
  if (error) return <StateDisplay type="error" message={error} />;

  const recentActivities = [...data.activities]
    .sort((a, b) => Number(b.sort_order ?? 0) - Number(a.sort_order ?? 0))
    .slice(0, 6);

  const recentAssets = data.assets.slice(0, 4);

  const onQuickUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedTheme = cmsThemes.find((t) => t.id === uploadThemeId) ?? null;
    if (files.length === 0 || !selectedTheme) return;
    const themeSlug = selectedTheme.slug?.trim() || selectedTheme.id;
    for (const file of files) {
      await uploadAsset({
        file,
        kind: inferAssetKindFromFile(file) ?? "png",
        status: uploadStatus,
        folder: `acervo/${themeSlug}`,
        metadata: {
          source: "dashboard-theme-upload",
          themeId: selectedTheme.id,
          themeTitle: selectedTheme.title,
          themeSlug,
        },
      });
    }
    setFiles([]);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Aulas e Mídias</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monte as aulas do aplicativo e gerencie as mídias usadas nelas.
        </p>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { value: data.totals.themes,     label: "Temas",          Icon: BookOpen  },
          { value: data.totals.modules,    label: "Módulos",         Icon: Layers    },
          { value: data.totals.assets,     label: "Mídias enviadas", Icon: ImageIcon },
          { value: data.totals.blueprints, label: "Telas prontas",   Icon: Monitor   },
        ].map(({ value, label, Icon }) => (
          <div key={label} className="border border-slate-300 bg-white p-4">
            <div className="flex items-start justify-between">
              <p className="text-3xl font-semibold text-slate-900">{value}</p>
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Action Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          {
            to: "/admin/conteudo/criar",
            Icon: Plus,
            title: "Criar nova aula",
            desc: "Exercício com preview ao vivo",
          },
          {
            to: "/admin/conteudo/biblioteca",
            Icon: Folder,
            title: "Biblioteca de mídias",
            desc: "Imagens, áudios e vídeos",
          },
          {
            to: "/admin/conteudo/importar-telas",
            Icon: Upload,
            title: "Importar telas",
            desc: "Trazer telas prontas",
          },
        ].map(({ to, Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 border-2 border-slate-200 bg-white p-4 transition-colors hover:border-slate-900 hover:bg-slate-50"
          >
            <Icon className="h-5 w-5 shrink-0 text-slate-600 group-hover:text-slate-900" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900">{title}</p>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Quick Upload ────────────────────────────────────────────────────── */}
      <form onSubmit={(e) => void onQuickUpload(e)} className="border border-slate-300 bg-white p-4 space-y-3">
        <div>
          <p className="font-semibold text-slate-900">Upload rápido de mídias</p>
          <p className="mt-0.5 text-sm text-slate-500">
            Envie imagens, áudios e vídeos vinculando direto a um tema.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            value={uploadThemeId}
            onChange={(e) => setUploadThemeId(e.target.value)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Selecione o tema do upload</option>
            {cmsThemes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <select
            value={uploadStatus}
            onChange={(e) =>
              setUploadStatus(e.target.value as "rascunho" | "publicado" | "arquivado")
            }
            className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="publicado">Publicado</option>
            <option value="rascunho">Rascunho</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="flex-1 border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
          <button
            type="submit"
            disabled={busy === "asset-upload" || files.length === 0 || !uploadThemeId}
            className="shrink-0 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy === "asset-upload" ? "Enviando..." : files.length > 0 ? `Enviar ${files.length}` : "Enviar"}
          </button>
        </div>

        {!uploadThemeId && (
          <p className="text-xs text-slate-400">Selecione um tema antes de enviar.</p>
        )}

        {files.length > 0 && (
          <div className="max-h-24 space-y-1 overflow-auto border border-slate-200 bg-slate-50 p-2">
            {files.map((f) => (
              <p key={`${f.name}-${f.size}`} className="text-xs text-slate-600">
                {f.name} <span className="text-slate-400">({formatBytes(f.size)})</span>
              </p>
            ))}
          </div>
        )}
      </form>

      {/* ── Aulas + Mídias ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Aulas recentes */}
        <section className="xl:col-span-2 border border-slate-300 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Aulas recentes</h2>
            <Link
              to="/admin/conteudo/criar"
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova aula
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <StateDisplay type="empty" message="Nenhuma aula criada ainda." />
          ) : (
            <ul>
              {recentActivities.map((activity) => {
                const module = data.modules.find((m) => m.id === activity.module_id);
                const theme = module ? data.themes.find((t) => t.id === module.theme_id) : null;
                const isDeleting = busy === `activity-delete-${activity.id}`;
                return (
                  <li
                    key={activity.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{activity.title}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        {activityTypeIcon(activity.type)}
                        <span>{activityTypeLabel(activity.type)}</span>
                        {theme && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="truncate">{theme.title}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`border px-2 py-0.5 text-xs font-medium ${
                          activity.is_published
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {activity.is_published ? "Publicada" : "Rascunho"}
                      </span>

                      <button
                        type="button"
                        onClick={() => navigate(`/mobile/modulos#activity-${activity.id}`)}
                        title="Ver no mobile"
                        className="flex items-center gap-1 border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/admin/conteudo/criar?id=${activity.id}`)}
                        title="Editar"
                        className="flex items-center gap-1 border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => {
                          void (async () => {
                            const ok = await confirm({
                              title: "Excluir aula",
                              message: `Excluir "${activity.title}"? Esta ação não pode ser desfeita.`,
                              confirmLabel: "Excluir",
                              variant: "danger",
                            });
                            if (ok) void deleteActivity(activity.id);
                          })();
                        }}
                        title="Excluir aula"
                        className="flex items-center justify-center border border-slate-200 bg-white p-1 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Últimas mídias */}
        <section className="border border-slate-300 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Últimas mídias</h2>
            <Link
              to="/admin/conteudo/biblioteca"
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Ver todas
            </Link>
          </div>

          {recentAssets.length === 0 ? (
            <StateDisplay type="empty" message="Nenhuma mídia enviada ainda." />
          ) : (
            <ul>
              {recentAssets.map((asset) => {
                const isImage = asset.kind === "png" || asset.kind === "jpg";
                const isVideo = asset.kind === "mp4";
                const isAudio = asset.kind === "mp3" || asset.kind === "wav";
                const previewUrl = resolvePublicAssetUrl(asset.storage_path, env.supabaseUrl ?? "");
                const displayName = getAssetFriendlyName(asset) || asset.storage_path;
                return (
                  <li
                    key={asset.id}
                    className="border-b border-slate-100 px-4 py-3 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      {isImage && previewUrl ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={previewUrl}
                            alt={displayName}
                            className="h-12 w-12 rounded border border-slate-200 object-cover"
                            onError={(e) => {
                              e.currentTarget.style.visibility = "hidden";
                            }}
                          />
                        </a>
                      ) : isVideo && previewUrl ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="relative block h-12 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-900"
                        >
                          <video
                            src={previewUrl}
                            preload="metadata"
                            muted
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="h-4 w-4 fill-white text-white" />
                          </div>
                        </a>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50">
                          {iconByKind(asset.kind)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={previewUrl || asset.storage_path}
                          target="_blank"
                          rel="noreferrer"
                          title={asset.storage_path}
                          className="block truncate text-sm font-medium text-slate-900 hover:underline"
                        >
                          {displayName}
                        </a>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-[11px] uppercase text-slate-400">{asset.kind}</span>
                          <span className="text-[11px] text-slate-300">·</span>
                          <span className="text-[11px] text-slate-400">{assetStatusLabel(asset.status)}</span>
                        </div>
                        {isAudio && previewUrl ? <CompactAudioPlayer url={previewUrl} /> : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
