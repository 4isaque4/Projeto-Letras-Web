import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  AlignLeft,
  ArrowLeft,
  BookOpen,
  Check,
  FolderOpen,
  Image as ImageIcon,
  LayoutGrid,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Video,
  Volume2,
  X,
} from "lucide-react";
import { useConteudoData } from "./useConteudoData";
import { Asset } from "./cmsTypes";
import { resolvePublicAssetUrl } from "./cmsUtils";
import { env } from "../../../core/config/env";

// ─── Types ────────────────────────────────────────────────────────────────────

type Kind = "match-letter" | "mark-images" | "video" | "composite";

interface MatchItem {
  id: string;
  label: string;
  optionsText: string;
  imageFile: File | null;
  imagePreview: string | null;
  audioFile: File | null;
  existingImageUrl: string | null;
  existingAudioUrl: string | null;
}

interface MarkItem {
  id: string;
  label: string;
  imageFile: File | null;
  imagePreview: string | null;
  isCorrect: boolean;
  existingImageUrl: string | null;
}

interface VideoBlockData {
  id: string;
  kind: "video";
  videoFile: File | null;
  instrText: string;
  instrAudioFile: File | null;
  notes: string;
  existingVideoUrl: string | null;
  existingInstrAudioUrl: string | null;
}

interface MatchBlockData {
  id: string;
  kind: "match-letter";
  letraAlvo: string;
  instrAudioFile: File | null;
  items: MatchItem[];
  existingInstrAudioUrl: string | null;
}

interface MarkBlockData {
  id: string;
  kind: "mark-images";
  instrText: string;
  instrAudioFile: File | null;
  items: MarkItem[];
  existingInstrAudioUrl: string | null;
}

interface TextBlockData {
  id: string;
  kind: "text";
  content: string;
  audience: "educator" | "learner" | "both";
}

interface ImageBlockData {
  id: string;
  kind: "image";
  imageFile: File | null;
  imagePreview: string | null;
  caption: string;
  existingImageUrl: string | null;
}

interface AudioBlockData {
  id: string;
  kind: "audio";
  audioFile: File | null;
  label: string;
  existingAudioUrl: string | null;
}

type CompositeBlock = VideoBlockData | MatchBlockData | MarkBlockData | TextBlockData | ImageBlockData | AudioBlockData;

let _id = 0;
const uid = () => `u${++_id}`;

function assetPublicUrl(storagePath: string) {
  return resolvePublicAssetUrl(storagePath, env.supabaseUrl ?? "");
}

function isImageAsset(a: Asset) { return a.kind === "png" || a.kind === "jpg"; }
function isAudioAsset(a: Asset) { return a.kind === "mp3" || a.kind === "wav"; }
function isVideoAsset(a: Asset) { return a.kind === "mp4"; }
function assetDisplayName(asset: Asset) {
  const metadata = asset.metadata ?? {};
  const title = typeof metadata.title === "string" ? metadata.title.trim() : "";
  const originalFileName =
    typeof metadata.originalFileName === "string" ? metadata.originalFileName.trim() : "";
  return title || originalFileName || asset.storage_path.split("/").pop() || asset.storage_path;
}

function parseMatchOptions(item: MatchItem) {
  const manualOptions = item.optionsText
    .split(/[,\s]+/)
    .map((option) => option.trim().toUpperCase())
    .filter(Boolean);
  if (manualOptions.length > 0) return manualOptions;
  return item.label.toUpperCase().split("").filter(Boolean);
}

const newMatchItems = (): MatchItem[] => [
  { id: uid(), label: "", optionsText: "", imageFile: null, imagePreview: null, audioFile: null, existingImageUrl: null, existingAudioUrl: null },
  { id: uid(), label: "", optionsText: "", imageFile: null, imagePreview: null, audioFile: null, existingImageUrl: null, existingAudioUrl: null },
  { id: uid(), label: "", optionsText: "", imageFile: null, imagePreview: null, audioFile: null, existingImageUrl: null, existingAudioUrl: null },
];

const newMarkItems = (): MarkItem[] => [
  { id: uid(), label: "", imageFile: null, imagePreview: null, isCorrect: true, existingImageUrl: null },
  { id: uid(), label: "", imageFile: null, imagePreview: null, isCorrect: false, existingImageUrl: null },
  { id: uid(), label: "", imageFile: null, imagePreview: null, isCorrect: false, existingImageUrl: null },
  { id: uid(), label: "", imageFile: null, imagePreview: null, isCorrect: false, existingImageUrl: null },
];

// ─── Media Picker Modal ───────────────────────────────────────────────────────

type PickerFilter = "image" | "audio" | "video";

function MediaPickerModal({
  filter,
  assets,
  onSelect,
  onClose,
}: {
  filter: PickerFilter;
  assets: Asset[];
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = assets.filter((a) => {
    if (filter === "image" && !isImageAsset(a)) return false;
    if (filter === "audio" && !isAudioAsset(a)) return false;
    if (filter === "video" && !isVideoAsset(a)) return false;
    if (query.trim()) {
      const normalizedQuery = query.toLowerCase();
      return (
        assetDisplayName(a).toLowerCase().includes(normalizedQuery) ||
        a.storage_path.toLowerCase().includes(normalizedQuery)
      );
    }
    return true;
  });

  const label = filter === "image" ? "imagens" : filter === "audio" ? "áudios" : "vídeos";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded border border-slate-200 bg-white shadow-xl" style={{ maxHeight: "80vh" }}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-900">Biblioteca — {label}</span>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-4 py-2">
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-slate-200 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">
              {query ? "Nenhum resultado para esta busca." : `Nenhuma mídia do tipo ${label} encontrada na biblioteca.`}
            </p>
          )}

          {filter === "image" && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {filtered.map((a) => {
                const url = assetPublicUrl(a.storage_path);
                const name = assetDisplayName(a);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(url)}
                    className="group flex flex-col overflow-hidden rounded border-2 border-transparent bg-slate-50 hover:border-slate-900"
                  >
                    <div className="flex h-24 w-full items-center justify-center overflow-hidden bg-slate-100">
                      <img src={url} alt={name} className="h-full w-full object-cover" />
                    </div>
                    <p className="truncate px-1.5 py-1 text-center text-[10px] text-slate-500 group-hover:text-slate-900">{name}</p>
                  </button>
                );
              })}
            </div>
          )}

          {(filter === "audio" || filter === "video") && (
            <div className="space-y-2">
              {filtered.map((a) => {
                const url = assetPublicUrl(a.storage_path);
                const name = assetDisplayName(a);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(url)}
                    className="flex w-full items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-slate-900 hover:bg-slate-100"
                  >
                    {filter === "video" ? (
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded bg-slate-900">
                        <video src={url} preload="metadata" className="h-full w-full object-cover" muted />
                      </div>
                    ) : (
                      <Volume2 className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700">{name}</p>
                      <p className="truncate text-xs text-slate-400">{a.kind.toUpperCase()}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-400">{filtered.length} arquivo(s) — selecione para usar</p>
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function MiniAudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const progress = duration > 0 ? currentTime / duration : 0;

  function formatTime(value: number) {
    if (!Number.isFinite(value) || value <= 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function toggle() {
    if (!ref.current) return;
    if (playing) {
      ref.current.pause();
      setPlaying(false);
    } else {
      void ref.current.play().then(() => setPlaying(true));
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nextProgress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    ref.current.currentTime = nextProgress * duration;
  }

  return (
    <div className="flex w-full max-w-md min-w-0 items-center gap-2 border border-slate-200 bg-slate-50 px-2 py-1.5">
      <button
        type="button"
        onClick={toggle}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 hover:bg-slate-900"
        aria-label={playing ? "Pausar áudio" : "Tocar áudio"}
      >
        {playing ? (
          <Pause className="h-3 w-3 fill-white text-white" />
        ) : (
          <Play className="h-3 w-3 fill-white text-white" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-slate-500">Áudio existente</span>
          <span className="shrink-0 tabular-nums text-[10px] text-slate-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        <div
          className="h-1.5 cursor-pointer rounded-full bg-slate-200"
          onClick={seek}
          role="slider"
          aria-label="Avançar áudio"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, Math.floor(duration))}
          aria-valuenow={Math.floor(currentTime)}
        >
          <div
            className="h-full rounded-full bg-slate-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <audio
        ref={ref}
        src={src}
        onLoadedMetadata={() => setDuration(ref.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(ref.current?.currentTime || 0)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        className="sr-only"
      />
    </div>
  );
}

function FileBtn({
  accept,
  label,
  fileName,
  preview,
  existingUrl,
  onChange,
  onPickFromLibrary,
}: {
  accept: string;
  label: string;
  fileName?: string | null;
  preview?: string | null;
  existingUrl?: string | null;
  onChange: (f: File | null) => void;
  onPickFromLibrary?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const isImg = accept.startsWith("image");
  const uploadLabel = onPickFromLibrary
    ? isImg
      ? "Importar imagem"
      : accept.startsWith("audio")
        ? "Importar áudio"
        : "Importar arquivo"
    : label;

  return (
    <div className="max-w-full space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {onPickFromLibrary && (
          <button
            type="button"
            onClick={onPickFromLibrary}
            className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
            Biblioteca
          </button>
        )}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {isImg ? (
            <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
          ) : (
            <Volume2 className="h-3.5 w-3.5 text-slate-500" />
          )}
          {uploadLabel}
        </button>
        {/* New file selected — inline feedback */}
        {isImg && preview && (
          <img src={preview} alt="" className="h-9 w-9 border-2 border-slate-700 object-cover" title="Nova imagem selecionada" />
        )}
        {!isImg && fileName && (
          <span className="max-w-[140px] truncate text-xs text-slate-500">{fileName}</span>
        )}
      </div>

      {/* Existing saved media — shown prominently below */}
      {isImg && existingUrl && !preview && (
        <div className="flex max-w-md items-start gap-2 rounded border border-slate-200 bg-slate-50 p-2">
          <img
            src={existingUrl}
            alt="Imagem salva"
            className="h-20 w-20 shrink-0 border border-slate-200 object-cover"
          />
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Atual</p>
            <p className="text-xs text-slate-500 leading-snug">Selecione um arquivo ou da biblioteca para substituir.</p>
          </div>
        </div>
      )}
      {!isImg && existingUrl && !fileName && (
        <div className="max-w-md space-y-1 rounded border border-slate-200 bg-slate-50 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Atual</p>
          <MiniAudioPlayer src={existingUrl} />
        </div>
      )}
    </div>
  );
}

function VideoFileBtn({
  label,
  fileName,
  existingUrl,
  onChange,
  onPickFromLibrary,
}: {
  label: string;
  fileName?: string | null;
  existingUrl?: string | null;
  onChange: (f: File | null) => void;
  onPickFromLibrary?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={ref}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {onPickFromLibrary && (
          <button
            type="button"
            onClick={onPickFromLibrary}
            className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
            Biblioteca
          </button>
        )}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Video className="h-3.5 w-3.5 text-slate-500" />
          Importar vídeo
        </button>
        {fileName && (
          <span className="max-w-[160px] truncate text-xs text-slate-500">{fileName}</span>
        )}
      </div>
      {!fileName && !existingUrl && (
        <p className="text-xs text-slate-500">
          Selecione um vídeo da biblioteca ou importe um novo arquivo do computador.
        </p>
      )}
      {fileName && (
        <p className="text-xs text-slate-500">Arquivo selecionado: {label}</p>
      )}
      {existingUrl && !fileName && (
        <div className="max-w-full overflow-hidden rounded border border-slate-200 bg-slate-950 p-2">
          <video
            src={existingUrl}
            controls
            preload="metadata"
            className="mx-auto aspect-video max-h-80 w-full bg-slate-950 object-contain"
          />
        </div>
      )}
    </div>
  );
}

function AudioRound({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls = {
    sm: { wrap: "h-[38px] w-12", svg: { width: 38, height: 32 }, color: "#9be39f", stroke: 4 },
    md: { wrap: "h-[52px] w-[66px]", svg: { width: 50, height: 42 }, color: "#9be39f", stroke: 4 },
    lg: { wrap: "h-[68px] w-[86px]", svg: { width: 66, height: 54 }, color: "#2fa536", stroke: 4.5 },
  }[size];
  return (
    <button
      type="button"
      className={`flex ${cls.wrap} shrink-0 items-center justify-center transition hover:opacity-80 active:scale-95`}
      aria-label="Reproduzir audio"
    >
      <svg
        width={cls.svg.width}
        height={cls.svg.height}
        viewBox="0 0 66 54"
        fill="none"
        aria-hidden="true"
      >
        <path d="M8 22H19L33 10V44L19 32H8V22Z" fill={cls.color} />
        <path
          d="M42 20C45 23.5 45 30.5 42 34"
          stroke={cls.color}
          strokeWidth={cls.stroke}
          strokeLinecap="round"
        />
        <path
          d="M49 15C55 21 55 33 49 39"
          stroke={cls.color}
          strokeWidth={cls.stroke}
          strokeLinecap="round"
        />
        {size === "lg" ? (
          <path
            d="M56 10C65 19 65 35 56 44"
            stroke={cls.color}
            strokeWidth={cls.stroke}
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </button>
  );
}

// ─── Live Preview Components ──────────────────────────────────────────────────

function MobileScreenArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const isPrevious = direction === "previous";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-[72px] flex-col items-center gap-0.5 transition hover:opacity-80 active:scale-95 disabled:pointer-events-none disabled:opacity-25"
      aria-label={isPrevious ? "Tela anterior" : "Proxima tela"}
    >
      <svg
        width="55"
        height="46"
        viewBox="0 0 55 46"
        fill="none"
        aria-hidden="true"
        className={isPrevious ? "scale-x-[-1]" : undefined}
      >
        <path
          d="M4 17H30V8L51 23L30 38V29H4V17Z"
          stroke="#8fd17e"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[10px] font-semibold lowercase text-[#8fd17e]">
        {isPrevious ? "voltar" : "avançar"}
      </span>
    </button>
  );
}

function LiveMatchLetter({ letraAlvo, items }: { letraAlvo: string; items: MatchItem[] }) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-center pt-1">
        <AudioRound size="lg" />
      </div>
      {items.map((item) => {
        const letters = parseMatchOptions(item);
        const previewSrc = item.imagePreview ?? item.existingImageUrl;
        return (
          <div key={item.id} className="rounded border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100">
                {previewSrc ? (
                  <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-slate-300" />
                )}
              </div>
              <AudioRound size="sm" />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {letters.length > 0
                ? letters.map((_, i) => (
                    <div key={i} className="h-7 w-7 border border-slate-300 bg-white" />
                  ))
                : [0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-7 w-7 border border-dashed border-slate-200 bg-white" />
                  ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LiveMarkImages({ instrText, items }: { instrText: string; items: MarkItem[] }) {
  return (
    <div className="space-y-2">
      {instrText ? (
        <p className="text-center text-xs font-medium text-slate-700">{instrText}</p>
      ) : (
        <p className="text-center text-xs italic text-slate-400">Instrução aparece aqui</p>
      )}
      <div className="flex justify-center">
        <AudioRound size="md" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => {
          const previewSrc = item.imagePreview ?? item.existingImageUrl;
          return (
            <div
              key={item.id}
              className={`rounded border p-1 ${item.isCorrect ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}
            >
              <div className="flex h-12 w-full items-center justify-center overflow-hidden rounded bg-slate-100">
                {previewSrc ? (
                  <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-slate-300" />
                )}
              </div>
              <p className="mt-0.5 text-center text-xs text-slate-600">{item.label || "—"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveVideo({
  videoFile,
  instrText,
  existingVideoUrl,
}: {
  videoFile: File | null;
  instrText: string;
  existingVideoUrl: string | null;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoFile) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const videoSrc = objectUrl ?? existingVideoUrl;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded bg-slate-900">
        {videoSrc ? (
          <video
            src={videoSrc}
            controls
            preload="metadata"
            className="aspect-video w-full bg-slate-900 object-contain"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <Play className="h-4 w-4 fill-slate-400 text-slate-400" />
            </div>
          </div>
        )}
      </div>
      {false && (
      <div className="flex h-28 items-center justify-center rounded bg-slate-800">
        {videoFile ? (
          <div className="text-center">
            <Play className="mx-auto h-7 w-7 fill-white text-white" />
            <p className="mt-1 max-w-[110px] truncate text-xs text-slate-300">{videoFile.name}</p>
          </div>
        ) : existingVideoUrl ? (
          <div className="text-center">
            <Play className="mx-auto h-7 w-7 fill-white text-white" />
            <p className="mt-1 max-w-[110px] truncate text-xs text-slate-300">Vídeo existente</p>
          </div>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <Play className="h-4 w-4 fill-slate-400 text-slate-400" />
          </div>
        )}
      </div>
      )}
      {instrText && <p className="text-xs leading-relaxed text-slate-700">{instrText}</p>}
    </div>
  );
}

function LiveComposite({ blocks }: { blocks: CompositeBlock[] }) {
  const [page, setPage] = useState(0);
  const screens: { id: string; title: string; content: React.ReactNode }[] = [];

  blocks.forEach((b, blockIndex) => {
    const prefix = `${blockIndex + 1}`;
    if (b.kind === "video") {
      const vb = b as VideoBlockData;
      screens.push({
        id: `${b.id}-video`,
        title: `Vídeo ${prefix}`,
        content: (
          <LiveVideo
            videoFile={vb.videoFile}
            existingVideoUrl={vb.existingVideoUrl}
            instrText={vb.instrText}
          />
        ),
      });
      return;
    }
    if (b.kind === "text") {
      const tb = b as TextBlockData;
      const label =
        tb.audience === "educator" ? "Alfabetizador" : tb.audience === "learner" ? "Aluno" : "Ambos";
      screens.push({
        id: `${b.id}-text`,
        title: `Texto ${prefix}`,
        content: (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">{label}</p>
            <p className="text-xs leading-relaxed">
              {tb.content || <span className="italic opacity-60">Texto vazio</span>}
            </p>
          </div>
        ),
      });
      return;
    }
    if (b.kind === "image") {
      const ib = b as ImageBlockData;
      const src = ib.imagePreview ?? ib.existingImageUrl;
      screens.push({
        id: `${b.id}-image`,
        title: `Imagem ${prefix}`,
        content: (
          <div className="space-y-2">
            <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded bg-slate-100">
              {src ? (
                <img src={src} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-slate-300" />
              )}
            </div>
            {ib.caption && <p className="text-center text-xs leading-relaxed text-slate-600">{ib.caption}</p>}
          </div>
        ),
      });
      return;
    }
    if (b.kind === "audio") {
      const ab = b as AudioBlockData;
      screens.push({
        id: `${b.id}-audio`,
        title: `Áudio ${prefix}`,
        content: (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
            <AudioRound size="lg" />
            <p className="text-sm font-medium text-slate-700">{ab.label || "Áudio"}</p>
          </div>
        ),
      });
      return;
    }
    if (b.kind === "match-letter") {
      const mb = b as MatchBlockData;
      mb.items.forEach((item, itemIndex) => {
        const letters = parseMatchOptions(item);
        const src = item.imagePreview ?? item.existingImageUrl;
        screens.push({
          id: `${b.id}-match-${item.id}`,
          title: `Encontrar ${mb.letraAlvo || "?"} · ${itemIndex + 1}/${mb.items.length}`,
          content: (
            <div className="space-y-3">
              <div className="text-center">
                <AudioRound size="lg" />
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Toque no quadradinho onde aparece a letra {mb.letraAlvo || "alvo"}.
                </p>
              </div>
              <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
                {src ? <img src={src} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-slate-300" />}
              </div>
              <p className="text-center text-sm font-bold tracking-wide text-slate-800">{item.label || "PALAVRA"}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {(letters.length ? letters : ["", "", "", ""]).map((letter, index) => (
                  <div key={`${letter}-${index}`} className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-sm font-semibold text-slate-700">
                    {letter}
                  </div>
                ))}
              </div>
            </div>
          ),
        });
      });
      return;
    }
    const mb = b as MarkBlockData;
    screens.push({
      id: `${b.id}-mark-images`,
      title: `Escolher imagens ${prefix}`,
      content: <LiveMarkImages instrText={mb.instrText} items={mb.items} />,
    });
  });

  const total = Math.max(screens.length, 1);
  const currentPage = Math.min(page, total - 1);
  const currentScreen = screens[currentPage];

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(screens.length - 1, 0)));
  }, [screens.length]);

  if (blocks.length === 0) {
    return (
      <p className="py-8 text-center text-xs italic text-slate-400">
        Adicione blocos ao exercício
      </p>
    );
  }
  return (
    <div className="flex min-h-[520px] flex-col overflow-x-hidden bg-white">
      <div className="bg-white px-3 py-2">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>Tela {currentPage + 1} de {total}</span>
          <span className="max-w-[120px] truncate">{currentScreen?.title}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#8fd17e] transition-all"
            style={{ width: `${((currentPage + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {currentScreen?.content}
      </div>

      <div className="flex items-center justify-center gap-10 bg-white px-3 pb-4 pt-2">
        <MobileScreenArrow
          direction="previous"
          disabled={currentPage === 0}
          onClick={() => setPage((current) => Math.max(current - 1, 0))}
        />
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(current + 1, total - 1))}
          disabled={currentPage >= total - 1}
          className="flex min-w-[72px] flex-col items-center gap-0.5 transition hover:opacity-80 active:scale-95 disabled:pointer-events-none disabled:opacity-25"
          aria-label="Próxima tela"
        >
          <svg width="55" height="46" viewBox="0 0 55 46" fill="none" aria-hidden="true">
            <path
              d="M4 17H30V8L51 23L30 38V29H4V17Z"
              stroke="#8fd17e"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[10px] font-semibold lowercase text-[#8fd17e]">avançar</span>
        </button>
      </div>
    </div>
  );
  return (
    <div className="space-y-2">
      {blocks.map((b) => (
        <div key={b.id} className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-500">
          {b.kind === "video" && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-slate-800">
                <Play className="h-3 w-3 fill-white text-white" />
              </div>
              <span className="truncate">
                {(b as VideoBlockData).videoFile?.name || (b as VideoBlockData).existingVideoUrl ? "Vídeo existente" : "Vídeo sem arquivo"}
              </span>
            </div>
          )}
          {b.kind === "text" && (() => {
            const tb = b as TextBlockData;
            const colorCls =
              tb.audience === "educator"
                ? "border-blue-200 bg-blue-50 text-blue-800"
                : tb.audience === "learner"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-700";
            const label =
              tb.audience === "educator" ? "Alfab." : tb.audience === "learner" ? "Aluno" : "Ambos";
            return (
              <div className={`rounded border p-1.5 ${colorCls}`}>
                <p className="mb-0.5 font-semibold uppercase tracking-wide" style={{ fontSize: "9px" }}>{label}</p>
                <p className="leading-snug" style={{ fontSize: "10px" }}>
                  {tb.content || <span className="italic opacity-60">Texto vazio</span>}
                </p>
              </div>
            );
          })()}
          {b.kind === "image" && (() => {
            const ib = b as ImageBlockData;
            const src = ib.imagePreview ?? ib.existingImageUrl;
            return (
              <div className="space-y-1">
                <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded bg-slate-200">
                  {src
                    ? <img src={src} alt="" className="h-full w-full object-cover" />
                    : <ImageIcon className="h-6 w-6 text-slate-400" />}
                </div>
                {ib.caption && <p className="text-center text-[10px] text-slate-500">{ib.caption}</p>}
              </div>
            );
          })()}
          {b.kind === "audio" && (() => {
            const ab = b as AudioBlockData;
            return (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700">
                  <Volume2 className="h-3 w-3 text-white" />
                </div>
                <span className="truncate">{ab.label || "Áudio"}</span>
              </div>
            );
          })()}
          {b.kind === "match-letter" && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>
                Encontrar &ldquo;{(b as MatchBlockData).letraAlvo || "?"}&rdquo; —{" "}
                {(b as MatchBlockData).items.length} palavra(s)
              </span>
            </div>
          )}
          {b.kind === "mark-images" && (
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>Escolher imagens — {(b as MarkBlockData).items.length} imagem(ns)</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Reusable Form Blocks ─────────────────────────────────────────────────────

function MatchItemsField({
  items,
  letraAlvo,
  instrAudioFile,
  existingInstrAudioUrl,
  onLetraChange,
  onInstrAudioChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onPickImage,
  onPickAudio,
}: {
  items: MatchItem[];
  letraAlvo: string;
  instrAudioFile: File | null;
  existingInstrAudioUrl?: string | null;
  onLetraChange: (v: string) => void;
  onInstrAudioChange: (f: File | null) => void;
  onItemChange: (id: string, patch: Partial<MatchItem>) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onPickImage?: (itemId: string) => void;
  onPickAudio?: (itemId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Letra que o aluno deve encontrar</label>
        <p className="text-xs text-slate-500">Digite a letra que aparecerá destacada nas palavras.</p>
        <input
          type="text"
          maxLength={1}
          placeholder="A"
          value={letraAlvo}
          onChange={(e) => onLetraChange(e.target.value.toUpperCase().slice(0, 1))}
          className="w-16 border border-slate-300 px-3 py-2 text-center text-xl font-bold uppercase text-slate-900 placeholder:font-normal placeholder:normal-case placeholder:text-slate-300"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Áudio de instrução</label>
        <p className="text-xs text-slate-500">
          Áudio que o aluno ouve antes de começar, explicando o que deve fazer.
        </p>
        <FileBtn
          accept="audio/*"
          label={instrAudioFile ? instrAudioFile.name : "Escolher áudio"}
          fileName={instrAudioFile?.name}
          existingUrl={existingInstrAudioUrl}
          onChange={onInstrAudioChange}
          onPickFromLibrary={onPickAudio ? () => onPickAudio("__instr__") : undefined}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <label className="text-sm font-medium text-slate-700">Palavras do exercício</label>
            <p className="mt-0.5 text-xs text-slate-500">
              Cada palavra precisa de uma imagem. O áudio da palavra é opcional.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddItem}
            className="flex items-center gap-1 border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </button>
        </div>

        {items.map((item, index) => (
          <div key={item.id} className="min-w-0 space-y-2 border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Palavra {index + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Ex: ANZOL"
              value={item.label}
              onChange={(e) =>
                onItemChange(item.id, { label: e.target.value.toUpperCase() })
              }
              className="w-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium uppercase tracking-wide text-slate-900 placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
            />
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Letras/opções</label>
              <input
                type="text"
                placeholder={item.label ? parseMatchOptions(item).join(", ") : "A, N, Z, O, L"}
                value={item.optionsText}
                onChange={(e) => onItemChange(item.id, { optionsText: e.target.value.toUpperCase() })}
                className="w-full border border-slate-300 bg-white px-3 py-1.5 text-sm uppercase tracking-wide text-slate-900 placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-500">
                Separe por vírgula ou espaço. Deixe vazio para usar as letras da palavra.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FileBtn
                accept="image/*"
                label="Imagem"
                preview={item.imagePreview}
                existingUrl={item.existingImageUrl}
                onChange={(f) =>
                  onItemChange(item.id, {
                    imageFile: f,
                    imagePreview: f ? URL.createObjectURL(f) : null,
                  })
                }
                onPickFromLibrary={onPickImage ? () => onPickImage(item.id) : undefined}
              />
              <FileBtn
                accept="audio/*"
                label={item.audioFile ? item.audioFile.name : "Áudio (opcional)"}
                fileName={item.audioFile?.name}
                existingUrl={item.existingAudioUrl}
                onChange={(f) => onItemChange(item.id, { audioFile: f })}
                onPickFromLibrary={onPickAudio ? () => onPickAudio(item.id) : undefined}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarkItemsField({
  items,
  instrText,
  instrAudioFile,
  existingInstrAudioUrl,
  onInstrTextChange,
  onInstrAudioChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onPickImage,
  onPickAudio,
}: {
  items: MarkItem[];
  instrText: string;
  instrAudioFile: File | null;
  existingInstrAudioUrl?: string | null;
  onInstrTextChange: (v: string) => void;
  onInstrAudioChange: (f: File | null) => void;
  onItemChange: (id: string, patch: Partial<MarkItem>) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onPickImage?: (itemId: string) => void;
  onPickAudio?: (itemId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Instrução</label>
        <p className="text-xs text-slate-500">
          Texto que aparece na tela dizendo o que o aluno deve fazer.
        </p>
        <input
          type="text"
          placeholder="Ex: Marque as imagens que começam com A"
          value={instrText}
          onChange={(e) => onInstrTextChange(e.target.value)}
          className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Áudio de instrução</label>
        <FileBtn
          accept="audio/*"
          label={instrAudioFile ? instrAudioFile.name : "Escolher áudio"}
          fileName={instrAudioFile?.name}
          existingUrl={existingInstrAudioUrl}
          onChange={onInstrAudioChange}
          onPickFromLibrary={onPickAudio ? () => onPickAudio("__instr__") : undefined}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <label className="text-sm font-medium text-slate-700">Imagens</label>
            <p className="mt-0.5 text-xs text-slate-500">
              Marque quais são as respostas certas.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddItem}
            className="flex items-center gap-1 border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </button>
        </div>

        {items.map((item, index) => (
          <div
            key={item.id}
            className={`min-w-0 space-y-2 border p-3 ${item.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Imagem {index + 1}</span>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={item.isCorrect}
                    onChange={(e) => onItemChange(item.id, { isCorrect: e.target.checked })}
                    className="accent-emerald-600"
                  />
                  <span className={item.isCorrect ? "font-semibold text-emerald-700" : "text-slate-500"}>
                    Resposta certa
                  </span>
                </label>
                {items.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <input
              type="text"
              placeholder="Ex: ELEFANTE"
              value={item.label}
              onChange={(e) => onItemChange(item.id, { label: e.target.value })}
              className="w-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
            />
            <FileBtn
              accept="image/*"
              label="Imagem"
              preview={item.imagePreview}
              existingUrl={item.existingImageUrl}
              onChange={(f) =>
                onItemChange(item.id, {
                  imageFile: f,
                  imagePreview: f ? URL.createObjectURL(f) : null,
                })
              }
              onPickFromLibrary={onPickImage ? () => onPickImage(item.id) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Org Section (reused across all types) ────────────────────────────────────

function OrgSection({
  isEditing = false,
  themeMode,
  setThemeMode,
  selectedThemeId,
  setSelectedThemeId,
  newThemeTitle,
  setNewThemeTitle,
  moduleMode,
  setModuleMode,
  selectedModuleId,
  setSelectedModuleId,
  newModuleTitle,
  setNewModuleTitle,
  newModuleStage,
  setNewModuleStage,
  selectedStageId,
  setSelectedStageId,
  stageMode,
  setStageMode,
  newStageTitle,
  setNewStageTitle,
  newStageNumber,
  setNewStageNumber,
  titulo,
  setTitulo,
  themes,
  stages,
  modulesForTheme,
}: {
  isEditing?: boolean;
  themeMode: "existing" | "new";
  setThemeMode: (v: "existing" | "new") => void;
  selectedThemeId: string;
  setSelectedThemeId: (v: string) => void;
  newThemeTitle: string;
  setNewThemeTitle: (v: string) => void;
  moduleMode: "existing" | "new";
  setModuleMode: (v: "existing" | "new") => void;
  selectedModuleId: string;
  setSelectedModuleId: (v: string) => void;
  newModuleTitle: string;
  setNewModuleTitle: (v: string) => void;
  newModuleStage: 1 | 2 | 3;
  setNewModuleStage: (v: 1 | 2 | 3) => void;
  selectedStageId: string;
  setSelectedStageId: (v: string) => void;
  stageMode: "existing" | "new";
  setStageMode: (v: "existing" | "new") => void;
  newStageTitle: string;
  setNewStageTitle: (v: string) => void;
  newStageNumber: 1 | 2 | 3;
  setNewStageNumber: (v: 1 | 2 | 3) => void;
  titulo: string;
  setTitulo: (v: string) => void;
  themes: { id: string; title: string }[];
  stages: { id: string; theme_id: string; title: string; stage_number: number }[];
  modulesForTheme: { id: string; title: string; stage_number?: number }[];
}) {
  const stagesForTheme = stages.filter((s) => s.theme_id === selectedThemeId);

  if (isEditing) {
    const themeName = themes.find((t) => t.id === selectedThemeId)?.title ?? "—";
    const moduleEntry = modulesForTheme.find((m) => m.id === selectedModuleId);
    const moduleName = moduleEntry?.title ?? "—";
    const moduleStage =
      typeof moduleEntry?.stage_number === "number" ? moduleEntry.stage_number : null;
    return (
      <>
        <section className="space-y-3 border border-slate-300 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Localização</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tema</p>
              <p className="mt-0.5 text-sm text-slate-900">{themeName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Módulo</p>
              <p className="mt-0.5 text-sm text-slate-900">{moduleName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Etapa</p>
              <p className="mt-0.5 text-sm text-slate-900">
                {moduleStage !== null ? `Etapa ${moduleStage}` : "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2 border border-slate-300 bg-white p-5">
          <label className="block font-semibold text-slate-900">Título da aula</label>
          <input
            type="text"
            placeholder="Ex: Encontrando o A nas palavras"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </section>
      </>
    );
  }

  return (
    <>
      <section className="space-y-4 border border-slate-300 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Onde salvar</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Tema</label>
          <div className="flex gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="themeMode"
                checked={themeMode === "existing"}
                onChange={() => setThemeMode("existing")}
                className="accent-slate-900"
              />
              Tema existente
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="themeMode"
                checked={themeMode === "new"}
                onChange={() => setThemeMode("new")}
                className="accent-slate-900"
              />
              Criar novo tema
            </label>
          </div>
          {themeMode === "existing" ? (
            <select
              value={selectedThemeId}
              onChange={(e) => {
                setSelectedThemeId(e.target.value);
                setSelectedModuleId("");
              }}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Selecione um tema...</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Ex: Animais do campo"
              value={newThemeTitle}
              onChange={(e) => setNewThemeTitle(e.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            />
          )}
        </div>

        {/* Etapa — entre Tema e Módulo, conforme hierarquia Tema → Etapa → Módulo */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Etapa</label>
          <p className="text-xs text-slate-500">
            Etapa 1 = tutoriais e base · Etapa 2 = reconhecimento de letras · Etapa 3 = leitura.
          </p>
          <div className="flex gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="stageMode"
                checked={stageMode === "existing"}
                onChange={() => setStageMode("existing")}
                className="accent-slate-900"
              />
              Etapa existente
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="stageMode"
                checked={stageMode === "new"}
                onChange={() => setStageMode("new")}
                className="accent-slate-900"
              />
              Criar nova etapa
            </label>
          </div>
          {stageMode === "existing" ? (
            <>
              <select
                title="Selecionar etapa"
                value={selectedStageId}
                onChange={(e) => {
                  const stageId = e.target.value;
                  setSelectedStageId(stageId);
                  setSelectedModuleId("");
                  const s = stagesForTheme.find((st) => st.id === stageId);
                  if (s) setNewModuleStage(s.stage_number as 1 | 2 | 3);
                }}
                disabled={(themeMode === "existing" && !selectedThemeId) || stagesForTheme.length === 0}
                className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
              >
                <option value="">Selecione a etapa...</option>
                {stagesForTheme.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              {stagesForTheme.length === 0 && (
                <p className="text-[10px] text-slate-500">
                  Nenhuma etapa configurada para este tema. Escolha “Criar nova etapa”.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <select
                title="Número da etapa"
                value={newStageNumber}
                onChange={(e) => {
                  const n = Number(e.target.value) as 1 | 2 | 3;
                  setNewStageNumber(n);
                  setNewModuleStage(n);
                }}
                className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value={1}>Etapa 1</option>
                <option value={2}>Etapa 2</option>
                <option value={3}>Etapa 3</option>
              </select>
              <input
                type="text"
                placeholder="Título da etapa (ex: Etapa 1 — Tutoriais)"
                value={newStageTitle}
                onChange={(e) => setNewStageTitle(e.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              />
              <p className="text-[10px] text-slate-500">
                O vídeo de introdução da etapa pode ser configurado depois.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Módulo</label>
          <div className="flex gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="moduleMode"
                checked={moduleMode === "existing"}
                onChange={() => setModuleMode("existing")}
                className="accent-slate-900"
              />
              Módulo existente
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="moduleMode"
                checked={moduleMode === "new"}
                onChange={() => setModuleMode("new")}
                className="accent-slate-900"
              />
              Criar novo módulo
            </label>
          </div>
          {moduleMode === "existing" ? (
            <select
              title="Selecionar módulo"
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              disabled={!selectedStageId}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
            >
              <option value="">Selecione um módulo...</option>
              {modulesForTheme
                .filter((m) => !selectedStageId || (typeof m.stage_number === "number" && m.stage_number === newModuleStage))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Ex: Reconhecimento da letra A"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            />
          )}
        </div>
      </section>

      <section className="space-y-2 border border-slate-300 bg-white p-5">
        <label className="block font-semibold text-slate-900">Título da aula</label>
        <p className="text-xs text-slate-500">Nome para identificar esta aula no painel.</p>
        <input
          type="text"
          placeholder="Ex: Encontrando o A nas palavras"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
        />
      </section>
    </>
  );
}

// ─── Instruction JSON types ───────────────────────────────────────────────────

interface MatchLetterItem {
  id: string;
  label: string;
  imageUrl: string | null;
  wordAudioUrl: string | null;
  options?: string[];
  correctOptions?: string[];
}

interface MarkImageItem {
  id: string;
  label: string;
  imageUrl: string | null;
  isCorrect: boolean;
}

interface MatchLetterInstructions {
  schema: string;
  screenTemplate: "exercise-match-letter";
  letraAlvo: string;
  instructionAudioUrl: string | null;
  progressiveUnlock: boolean;
  exercise: { items: MatchLetterItem[] };
}

interface MarkImagesInstructions {
  schema: string;
  screenTemplate: "exercise-mark-images";
  instructionText: string;
  instructionAudioUrl: string | null;
  exercise: { items: MarkImageItem[] };
}

interface VideoInstructions {
  schema: string;
  screenTemplate: "video";
  videoUrl: string | null;
  instructionText: string | null;
  instructionAudioUrl: string | null;
  notes: string | null;
}

interface CompositeVideoBlock {
  id: string;
  type: "video";
  videoUrl: string | null;
  instrText: string;
  instrAudioUrl: string | null;
  notes: string;
}

interface CompositeMatchBlock {
  id: string;
  type: "exercise-match-letter";
  letraAlvo: string;
  instructionAudioUrl: string | null;
  progressiveUnlock: boolean;
  exercise: { items: MatchLetterItem[] };
}

interface CompositeMarkBlock {
  id: string;
  type: "exercise-mark-images";
  instructionText: string;
  instructionAudioUrl: string | null;
  exercise: { items: MarkImageItem[] };
}

interface CompositeTextBlock {
  id: string;
  type: "text";
  content: string;
  audience: "educator" | "learner" | "both";
}

interface CompositeImageBlock {
  id: string;
  type: "image";
  imageUrl: string | null;
  caption: string;
}

interface CompositeAudioBlock {
  id: string;
  type: "audio";
  audioUrl: string | null;
  label: string;
}

type CompositeRawBlock = CompositeVideoBlock | CompositeMatchBlock | CompositeMarkBlock | CompositeTextBlock | CompositeImageBlock | CompositeAudioBlock;

interface CompositeInstructions {
  schema: string;
  screenTemplate: "composite";
  blocks: CompositeRawBlock[];
}

type ParsedInstructions =
  | MatchLetterInstructions
  | MarkImagesInstructions
  | VideoInstructions
  | CompositeInstructions
  | null;

const DRAFT_STORAGE_KEY = "conteudo-criar-page-draft-v1";

type DraftMatchItem = Omit<MatchItem, "imageFile" | "audioFile"> & {
  imageFileName?: string | null;
  audioFileName?: string | null;
};
type DraftMarkItem = Omit<MarkItem, "imageFile"> & { imageFileName?: string | null };
type DraftCompositeBlock =
  | (Omit<VideoBlockData, "videoFile" | "instrAudioFile"> & {
      videoFileName?: string | null;
      instrAudioFileName?: string | null;
    })
  | (Omit<MatchBlockData, "instrAudioFile" | "items"> & {
      instrAudioFileName?: string | null;
      items: DraftMatchItem[];
    })
  | (Omit<MarkBlockData, "instrAudioFile" | "items"> & {
      instrAudioFileName?: string | null;
      items: DraftMarkItem[];
    })
  | TextBlockData
  | (Omit<ImageBlockData, "imageFile"> & { imageFileName?: string | null })
  | (Omit<AudioBlockData, "audioFile"> & { audioFileName?: string | null });

interface ConteudoCriarDraft {
  savedAt: string;
  kind: Kind;
  themeMode: "existing" | "new";
  selectedThemeId: string;
  newThemeTitle: string;
  moduleMode: "existing" | "new";
  selectedModuleId: string;
  newModuleTitle: string;
  newModuleStage: 1 | 2 | 3;
  selectedStageId?: string;
  titulo: string;
  letraAlvo: string;
  instrAudioFileName?: string | null;
  existingInstrAudioUrl: string | null;
  matchItems: DraftMatchItem[];
  markInstrText: string;
  markInstrAudioFileName?: string | null;
  existingMarkInstrAudioUrl: string | null;
  markItems: DraftMarkItem[];
  videoFileName?: string | null;
  existingVideoUrl: string | null;
  videoInstrText: string;
  videoInstrAudioFileName?: string | null;
  existingVideoInstrAudioUrl: string | null;
  videoNotes: string;
  compositeBlocks: DraftCompositeBlock[];
  tutorNotes: string;
}

function parseInstructions(raw: string | null | undefined): ParsedInstructions {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParsedInstructions;
  } catch {
    return null;
  }
}

function screenTemplateToKind(template: string | undefined): Kind {
  if (template === "exercise-match-letter") return "match-letter";
  if (template === "exercise-mark-images") return "mark-images";
  if (template === "video") return "video";
  if (template === "composite") return "composite";
  return "match-letter";
}

function serializeMatchItem(item: MatchItem): DraftMatchItem {
  return {
    id: item.id,
    label: item.label,
    optionsText: item.optionsText,
    imagePreview: null,
    existingImageUrl: item.existingImageUrl,
    existingAudioUrl: item.existingAudioUrl,
    imageFileName: item.imageFile?.name ?? null,
    audioFileName: item.audioFile?.name ?? null,
  };
}

function serializeMarkItem(item: MarkItem): DraftMarkItem {
  return {
    id: item.id,
    label: item.label,
    imagePreview: null,
    isCorrect: item.isCorrect,
    existingImageUrl: item.existingImageUrl,
    imageFileName: item.imageFile?.name ?? null,
  };
}

function hydrateMatchItem(item: DraftMatchItem): MatchItem {
  return {
    id: item.id || uid(),
    label: item.label || "",
    optionsText: item.optionsText || "",
    imageFile: null,
    imagePreview: item.imagePreview ?? null,
    audioFile: null,
    existingImageUrl: item.existingImageUrl ?? null,
    existingAudioUrl: item.existingAudioUrl ?? null,
  };
}

function hydrateMarkItem(item: DraftMarkItem): MarkItem {
  return {
    id: item.id || uid(),
    label: item.label || "",
    imageFile: null,
    imagePreview: item.imagePreview ?? null,
    isCorrect: Boolean(item.isCorrect),
    existingImageUrl: item.existingImageUrl ?? null,
  };
}

function serializeCompositeBlock(block: CompositeBlock): DraftCompositeBlock {
  if (block.kind === "video") {
    return {
      ...block,
      videoFileName: block.videoFile?.name ?? null,
      instrAudioFileName: block.instrAudioFile?.name ?? null,
      videoFile: undefined,
      instrAudioFile: undefined,
    } as DraftCompositeBlock;
  }
  if (block.kind === "match-letter") {
    return {
      ...block,
      instrAudioFileName: block.instrAudioFile?.name ?? null,
      instrAudioFile: undefined,
      items: block.items.map(serializeMatchItem),
    } as DraftCompositeBlock;
  }
  if (block.kind === "mark-images") {
    return {
      ...block,
      instrAudioFileName: block.instrAudioFile?.name ?? null,
      instrAudioFile: undefined,
      items: block.items.map(serializeMarkItem),
    } as DraftCompositeBlock;
  }
  if (block.kind === "image") {
    return {
      ...block,
      imagePreview: null,
      imageFileName: block.imageFile?.name ?? null,
      imageFile: undefined,
    } as DraftCompositeBlock;
  }
  if (block.kind === "audio") {
    return {
      ...block,
      audioFileName: block.audioFile?.name ?? null,
      audioFile: undefined,
    } as DraftCompositeBlock;
  }
  return block;
}

function hydrateCompositeBlock(block: DraftCompositeBlock): CompositeBlock {
  if (block.kind === "video") {
    return { ...block, videoFile: null, instrAudioFile: null } as VideoBlockData;
  }
  if (block.kind === "match-letter") {
    return {
      ...block,
      instrAudioFile: null,
      items: Array.isArray(block.items) ? block.items.map(hydrateMatchItem) : newMatchItems(),
    } as MatchBlockData;
  }
  if (block.kind === "mark-images") {
    return {
      ...block,
      instrAudioFile: null,
      items: Array.isArray(block.items) ? block.items.map(hydrateMarkItem) : newMarkItems(),
    } as MarkBlockData;
  }
  if (block.kind === "image") {
    return { ...block, imageFile: null, imagePreview: block.imagePreview ?? null } as ImageBlockData;
  }
  if (block.kind === "audio") {
    return { ...block, audioFile: null } as AudioBlockData;
  }
  return block;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConteudoCriarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingActivityId = searchParams.get("id") ?? null;
  const isEditing = editingActivityId !== null;

  const { data, createTheme, createStage, createModule, createActivity, updateActivity, uploadAsset } =
    useConteudoData();

  // picker state: which field is waiting for a library selection
  const [picker, setPicker] = useState<{
    filter: PickerFilter;
    onSelect: (url: string) => void;
  } | null>(null);

  const [kind, setKind] = useState<Kind>("composite");

  // Org state (shared)
  const [themeMode, setThemeMode] = useState<"existing" | "new">("existing");
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [newThemeTitle, setNewThemeTitle] = useState("");
  const [moduleMode, setModuleMode] = useState<"existing" | "new">("existing");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  // Espelha o stage_number da etapa selecionada; começa na Etapa 1 e é sempre
  // sobrescrito ao escolher a etapa (obrigatória para módulo novo).
  const [newModuleStage, setNewModuleStage] = useState<1 | 2 | 3>(1);
  const [selectedStageId, setSelectedStageId] = useState("");
  // Criação de etapa inline (destrava temas sem etapas, inclusive tema novo).
  const [stageMode, setStageMode] = useState<"existing" | "new">("existing");
  const [newStageTitle, setNewStageTitle] = useState("");
  const [newStageNumber, setNewStageNumber] = useState<1 | 2 | 3>(1);
  const [titulo, setTitulo] = useState("");

  // match-letter
  const [letraAlvo, setLetraAlvo] = useState("");
  const [instrAudioFile, setInstrAudioFile] = useState<File | null>(null);
  const [existingInstrAudioUrl, setExistingInstrAudioUrl] = useState<string | null>(null);
  const [matchItems, setMatchItems] = useState<MatchItem[]>(newMatchItems);

  // mark-images
  const [markInstrText, setMarkInstrText] = useState("");
  const [markInstrAudioFile, setMarkInstrAudioFile] = useState<File | null>(null);
  const [existingMarkInstrAudioUrl, setExistingMarkInstrAudioUrl] = useState<string | null>(null);
  const [markItems, setMarkItems] = useState<MarkItem[]>(newMarkItems);

  // video
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [videoInstrText, setVideoInstrText] = useState("");
  const [videoInstrAudioFile, setVideoInstrAudioFile] = useState<File | null>(null);
  const [existingVideoInstrAudioUrl, setExistingVideoInstrAudioUrl] = useState<string | null>(null);
  const [videoNotes, setVideoNotes] = useState("");

  // composite
  const [compositeBlocks, setCompositeBlocks] = useState<CompositeBlock[]>([]);

  // shared tutor notes (all lesson types)
  const [tutorNotes, setTutorNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const modulesForTheme = data.modules.filter((m) => m.theme_id === selectedThemeId);
  const draftStorageKey = `${DRAFT_STORAGE_KEY}:${editingActivityId ?? "new"}`;

  function buildDraft(): ConteudoCriarDraft {
    return {
      savedAt: new Date().toISOString(),
      kind,
      themeMode,
      selectedThemeId,
      newThemeTitle,
      moduleMode,
      selectedModuleId,
      newModuleTitle,
      newModuleStage,
      selectedStageId,
      titulo,
      letraAlvo,
      instrAudioFileName: instrAudioFile?.name ?? null,
      existingInstrAudioUrl,
      matchItems: matchItems.map(serializeMatchItem),
      markInstrText,
      markInstrAudioFileName: markInstrAudioFile?.name ?? null,
      existingMarkInstrAudioUrl,
      markItems: markItems.map(serializeMarkItem),
      videoFileName: videoFile?.name ?? null,
      existingVideoUrl,
      videoInstrText,
      videoInstrAudioFileName: videoInstrAudioFile?.name ?? null,
      existingVideoInstrAudioUrl,
      videoNotes,
      compositeBlocks: compositeBlocks.map(serializeCompositeBlock),
      tutorNotes,
    };
  }

  function applyDraft(draft: ConteudoCriarDraft) {
    setKind(draft.kind || "composite");
    setThemeMode(draft.themeMode === "new" ? "new" : "existing");
    setSelectedThemeId(draft.selectedThemeId || "");
    setNewThemeTitle(draft.newThemeTitle || "");
    setModuleMode(draft.moduleMode === "new" ? "new" : "existing");
    setSelectedModuleId(draft.selectedModuleId || "");
    setNewModuleTitle(draft.newModuleTitle || "");
    setNewModuleStage([1, 2, 3].includes(Number(draft.newModuleStage)) ? draft.newModuleStage : 1);
    setSelectedStageId(draft.selectedStageId || "");
    setTitulo(draft.titulo || "");
    setLetraAlvo(draft.letraAlvo || "");
    setInstrAudioFile(null);
    setExistingInstrAudioUrl(draft.existingInstrAudioUrl ?? null);
    setMatchItems(Array.isArray(draft.matchItems) && draft.matchItems.length > 0 ? draft.matchItems.map(hydrateMatchItem) : newMatchItems());
    setMarkInstrText(draft.markInstrText || "");
    setMarkInstrAudioFile(null);
    setExistingMarkInstrAudioUrl(draft.existingMarkInstrAudioUrl ?? null);
    setMarkItems(Array.isArray(draft.markItems) && draft.markItems.length > 0 ? draft.markItems.map(hydrateMarkItem) : newMarkItems());
    setVideoFile(null);
    setExistingVideoUrl(draft.existingVideoUrl ?? null);
    setVideoInstrText(draft.videoInstrText || "");
    setVideoInstrAudioFile(null);
    setExistingVideoInstrAudioUrl(draft.existingVideoInstrAudioUrl ?? null);
    setVideoNotes(draft.videoNotes || "");
    setCompositeBlocks(Array.isArray(draft.compositeBlocks) ? draft.compositeBlocks.map(hydrateCompositeBlock) : []);
    setTutorNotes(draft.tutorNotes || "");
  }

  function draftHasContent(draft: ConteudoCriarDraft) {
    return Boolean(
      draft.titulo.trim() ||
        draft.newThemeTitle.trim() ||
        draft.newModuleTitle.trim() ||
        draft.tutorNotes.trim() ||
        draft.videoInstrText.trim() ||
        draft.videoNotes.trim() ||
        draft.markInstrText.trim() ||
        draft.letraAlvo.trim() ||
        draft.existingVideoUrl ||
        draft.existingInstrAudioUrl ||
        draft.existingMarkInstrAudioUrl ||
        draft.existingVideoInstrAudioUrl ||
        draft.matchItems.some((item) => item.label.trim() || item.optionsText.trim() || item.existingImageUrl || item.existingAudioUrl) ||
        draft.markItems.some((item) => item.label.trim() || item.existingImageUrl) ||
        draft.compositeBlocks.length > 0
    );
  }

  // ── Hydration from editing activity ──────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isEditing) {
      setDraftReady(true);
      return;
    }

    const raw = window.localStorage.getItem(draftStorageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ConteudoCriarDraft;
        applyDraft(parsed);
        setDraftSavedAt(parsed.savedAt || null);
        setDraftRestored(true);
      } catch {
        window.localStorage.removeItem(draftStorageKey);
      }
    }
    setDraftReady(true);
  }, [draftStorageKey, isEditing]);

  useEffect(() => {
    if (!editingActivityId || data.activities.length === 0) return;

    const activity = data.activities.find((a) => a.id === editingActivityId);
    if (!activity) return;

    setTitulo(activity.title);
    setSelectedModuleId(activity.module_id);
    setModuleMode("existing");
    setThemeMode("existing");

    const moduleItem = data.modules.find((m) => m.id === activity.module_id);
    if (moduleItem) {
      setSelectedThemeId(moduleItem.theme_id);
      if (moduleItem.stage_id) setSelectedStageId(moduleItem.stage_id);
      if (moduleItem.stage_number) setNewModuleStage(moduleItem.stage_number as 1 | 2 | 3);
    }

    const parsed = parseInstructions(activity.instructions);
    if (parsed && "tutorNotes" in parsed && typeof parsed.tutorNotes === "string") {
      setTutorNotes(parsed.tutorNotes);
    }
    const detectedKind = parsed
      ? screenTemplateToKind((parsed as { screenTemplate?: string }).screenTemplate)
      : "match-letter";

    setKind(detectedKind);

    if (parsed && parsed.screenTemplate === "exercise-match-letter") {
      const p = parsed as MatchLetterInstructions;
      setLetraAlvo(p.letraAlvo ?? "");
      setExistingInstrAudioUrl(p.instructionAudioUrl ?? null);
      setInstrAudioFile(null);
      const hydratedItems: MatchItem[] = (p.exercise?.items ?? []).map((it) => ({
        id: uid(),
        label: it.label ?? "",
        optionsText: Array.isArray(it.options) ? it.options.join(", ") : "",
        imageFile: null,
        imagePreview: null,
        audioFile: null,
        existingImageUrl: it.imageUrl ?? null,
        existingAudioUrl: it.wordAudioUrl ?? null,
      }));
      setMatchItems(hydratedItems.length > 0 ? hydratedItems : newMatchItems());
    } else if (parsed && parsed.screenTemplate === "exercise-mark-images") {
      const p = parsed as MarkImagesInstructions;
      setMarkInstrText(p.instructionText ?? "");
      setExistingMarkInstrAudioUrl(p.instructionAudioUrl ?? null);
      setMarkInstrAudioFile(null);
      const hydratedItems: MarkItem[] = (p.exercise?.items ?? []).map((it) => ({
        id: uid(),
        label: it.label ?? "",
        imageFile: null,
        imagePreview: null,
        isCorrect: it.isCorrect ?? false,
        existingImageUrl: it.imageUrl ?? null,
      }));
      setMarkItems(hydratedItems.length > 0 ? hydratedItems : newMarkItems());
    } else if (parsed && parsed.screenTemplate === "video") {
      const p = parsed as VideoInstructions;
      setExistingVideoUrl(p.videoUrl ?? null);
      setVideoFile(null);
      setVideoInstrText(p.instructionText ?? "");
      setExistingVideoInstrAudioUrl(p.instructionAudioUrl ?? null);
      setVideoInstrAudioFile(null);
      setVideoNotes(p.notes ?? "");
    } else if (parsed && parsed.screenTemplate === "composite") {
      const p = parsed as CompositeInstructions;
      const hydratedBlocks: CompositeBlock[] = (p.blocks ?? []).map((b) => {
        if (b.type === "video") {
          const vb = b as CompositeVideoBlock;
          return {
            id: uid(),
            kind: "video" as const,
            videoFile: null,
            instrText: vb.instrText ?? "",
            instrAudioFile: null,
            notes: vb.notes ?? "",
            existingVideoUrl: vb.videoUrl ?? null,
            existingInstrAudioUrl: vb.instrAudioUrl ?? null,
          } satisfies VideoBlockData;
        } else if (b.type === "exercise-match-letter") {
          const mb = b as CompositeMatchBlock;
          const items: MatchItem[] = (mb.exercise?.items ?? []).map((it) => ({
            id: uid(),
            label: it.label ?? "",
            optionsText: Array.isArray(it.options) ? it.options.join(", ") : "",
            imageFile: null,
            imagePreview: null,
            audioFile: null,
            existingImageUrl: it.imageUrl ?? null,
            existingAudioUrl: it.wordAudioUrl ?? null,
          }));
          return {
            id: uid(),
            kind: "match-letter" as const,
            letraAlvo: mb.letraAlvo ?? "",
            instrAudioFile: null,
            items: items.length > 0 ? items : newMatchItems(),
            existingInstrAudioUrl: mb.instructionAudioUrl ?? null,
          } satisfies MatchBlockData;
        } else if (b.type === "text") {
          const tb = b as CompositeTextBlock;
          return {
            id: uid(),
            kind: "text" as const,
            content: tb.content ?? "",
            audience: tb.audience ?? "educator",
          } satisfies TextBlockData;
        } else if (b.type === "image") {
          const ib = b as CompositeImageBlock;
          return {
            id: uid(),
            kind: "image" as const,
            imageFile: null,
            imagePreview: null,
            caption: ib.caption ?? "",
            existingImageUrl: ib.imageUrl ?? null,
          } satisfies ImageBlockData;
        } else if (b.type === "audio") {
          const ab = b as CompositeAudioBlock;
          return {
            id: uid(),
            kind: "audio" as const,
            audioFile: null,
            label: ab.label ?? "",
            existingAudioUrl: ab.audioUrl ?? null,
          } satisfies AudioBlockData;
        } else {
          const mb = b as CompositeMarkBlock;
          const items: MarkItem[] = (mb.exercise?.items ?? []).map((it) => ({
            id: uid(),
            label: it.label ?? "",
            imageFile: null,
            imagePreview: null,
            isCorrect: it.isCorrect ?? false,
            existingImageUrl: it.imageUrl ?? null,
          }));
          return {
            id: uid(),
            kind: "mark-images" as const,
            instrText: mb.instructionText ?? "",
            instrAudioFile: null,
            items: items.length > 0 ? items : newMarkItems(),
            existingInstrAudioUrl: mb.instructionAudioUrl ?? null,
          } satisfies MarkBlockData;
        }
      });
      setCompositeBlocks(hydratedBlocks);
    } else {
      setMatchItems(newMatchItems());
    }
  }, [editingActivityId, data.activities, data.modules]);

  // ── Item handlers (single types) ──────────────────────────────────────────

  useEffect(() => {
    if (!draftReady || submitted || typeof window === "undefined") return;

    const draft = buildDraft();
    if (!draftHasContent(draft)) {
      window.localStorage.removeItem(draftStorageKey);
      setDraftSavedAt(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      const nextDraft = buildDraft();
      window.localStorage.setItem(draftStorageKey, JSON.stringify(nextDraft));
      setDraftSavedAt(nextDraft.savedAt);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [
    draftReady,
    submitted,
    draftStorageKey,
    kind,
    themeMode,
    selectedThemeId,
    newThemeTitle,
    moduleMode,
    selectedModuleId,
    newModuleTitle,
    newModuleStage,
    selectedStageId,
    titulo,
    letraAlvo,
    instrAudioFile,
    existingInstrAudioUrl,
    matchItems,
    markInstrText,
    markInstrAudioFile,
    existingMarkInstrAudioUrl,
    markItems,
    videoFile,
    existingVideoUrl,
    videoInstrText,
    videoInstrAudioFile,
    existingVideoInstrAudioUrl,
    videoNotes,
    compositeBlocks,
    tutorNotes,
  ]);

  useEffect(() => {
    if (!draftReady || submitted || typeof window === "undefined") return;
    const draft = buildDraft();
    if (!draftHasContent(draft)) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draftReady, submitted, titulo, compositeBlocks, matchItems, markItems, tutorNotes]);

  function patchMatch(id: string, patch: Partial<MatchItem>) {
    setMatchItems((p) => p.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function patchMark(id: string, patch: Partial<MarkItem>) {
    setMarkItems((p) => p.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  // ── Composite block handlers ──────────────────────────────────────────────

  function addCompositeBlock(blockKind: "video" | "match-letter" | "mark-images" | "text" | "image" | "audio") {
    if (blockKind === "video") {
      setCompositeBlocks((p) => [
        ...p,
        { id: uid(), kind: "video", videoFile: null, instrText: "", instrAudioFile: null, notes: "", existingVideoUrl: null, existingInstrAudioUrl: null },
      ]);
    } else if (blockKind === "match-letter") {
      setCompositeBlocks((p) => [
        ...p,
        { id: uid(), kind: "match-letter", letraAlvo: "", instrAudioFile: null, items: newMatchItems(), existingInstrAudioUrl: null },
      ]);
    } else if (blockKind === "text") {
      setCompositeBlocks((p) => [
        ...p,
        { id: uid(), kind: "text", content: "", audience: "educator" },
      ]);
    } else if (blockKind === "image") {
      setCompositeBlocks((p) => [
        ...p,
        { id: uid(), kind: "image", imageFile: null, imagePreview: null, caption: "", existingImageUrl: null },
      ]);
    } else if (blockKind === "audio") {
      setCompositeBlocks((p) => [
        ...p,
        { id: uid(), kind: "audio", audioFile: null, label: "", existingAudioUrl: null },
      ]);
    } else {
      setCompositeBlocks((p) => [
        ...p,
        { id: uid(), kind: "mark-images", instrText: "", instrAudioFile: null, items: newMarkItems(), existingInstrAudioUrl: null },
      ]);
    }
  }

  function removeCompositeBlock(id: string) {
    setCompositeBlocks((p) => p.filter((b) => b.id !== id));
  }

  function patchCompositeBlock(id: string, patch: Record<string, unknown>) {
    setCompositeBlocks((p) => p.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function patchCompositeMatchItem(blockId: string, itemId: string, patch: Partial<MatchItem>) {
    setCompositeBlocks((p) =>
      p.map((b) => {
        if (b.id !== blockId || b.kind !== "match-letter") return b;
        const mb = b as MatchBlockData;
        return { ...mb, items: mb.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) };
      }),
    );
  }

  function addCompositeMatchItem(blockId: string) {
    setCompositeBlocks((p) =>
      p.map((b) => {
        if (b.id !== blockId || b.kind !== "match-letter") return b;
        const mb = b as MatchBlockData;
        return {
          ...mb,
          items: [
            ...mb.items,
            { id: uid(), label: "", optionsText: "", imageFile: null, imagePreview: null, audioFile: null, existingImageUrl: null, existingAudioUrl: null },
          ],
        };
      }),
    );
  }

  function removeCompositeMatchItem(blockId: string, itemId: string) {
    setCompositeBlocks((p) =>
      p.map((b) => {
        if (b.id !== blockId || b.kind !== "match-letter") return b;
        const mb = b as MatchBlockData;
        return { ...mb, items: mb.items.filter((it) => it.id !== itemId) };
      }),
    );
  }

  function patchCompositeMarkItem(blockId: string, itemId: string, patch: Partial<MarkItem>) {
    setCompositeBlocks((p) =>
      p.map((b) => {
        if (b.id !== blockId || b.kind !== "mark-images") return b;
        const mb = b as MarkBlockData;
        return { ...mb, items: mb.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) };
      }),
    );
  }

  function addCompositeMarkItem(blockId: string) {
    setCompositeBlocks((p) =>
      p.map((b) => {
        if (b.id !== blockId || b.kind !== "mark-images") return b;
        const mb = b as MarkBlockData;
        return {
          ...mb,
          items: [
            ...mb.items,
            { id: uid(), label: "", imageFile: null, imagePreview: null, isCorrect: false, existingImageUrl: null },
          ],
        };
      }),
    );
  }

  function removeCompositeMarkItem(blockId: string, itemId: string) {
    setCompositeBlocks((p) =>
      p.map((b) => {
        if (b.id !== blockId || b.kind !== "mark-images") return b;
        const mb = b as MarkBlockData;
        return { ...mb, items: mb.items.filter((it) => it.id !== itemId) };
      }),
    );
  }

  // ── Upload helpers ────────────────────────────────────────────────────────

  async function up(file: File, title: string): Promise<string | null> {
    const r = await uploadAsset({ file, status: "publicado", title });
    return r?.sourceUrl ?? null;
  }

  async function uploadMatchItems(items: MatchItem[]) {
    return Promise.all(
      items.map(async (it) => {
        const imageUrl = it.imageFile
          ? await up(it.imageFile, `img-${it.label || "item"}`)
          : it.existingImageUrl;
        const wordAudioUrl = it.audioFile
          ? await up(it.audioFile, `audio-${it.label || "item"}`)
          : it.existingAudioUrl;
        const word = it.label.toUpperCase();
        return { id: it.id, label: word, imageUrl, wordAudioUrl, options: parseMatchOptions(it), correctOptions: [] as string[] };
      }),
    );
  }

  async function uploadMarkItems(items: MarkItem[]) {
    return Promise.all(
      items.map(async (it) => {
        const imageUrl = it.imageFile
          ? await up(it.imageFile, `img-${it.label || "item"}`)
          : it.existingImageUrl;
        return { id: it.id, label: it.label, imageUrl, isCorrect: it.isCorrect };
      }),
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      let themeId = selectedThemeId;
      if (themeMode === "new") {
        if (!newThemeTitle.trim()) throw new Error("Informe o nome do tema.");
        const t = await createTheme({ title: newThemeTitle.trim() });
        if (!t) throw new Error("Não foi possível criar o tema.");
        themeId = t.id;
      }
      if (!themeId) throw new Error("Selecione ou crie um tema.");

      let moduleId = selectedModuleId;
      if (moduleMode === "new") {
        if (!newModuleTitle.trim()) throw new Error("Informe o nome do módulo.");

        // Etapa obrigatória: todo módulo novo nasce vinculado a uma etapa do
        // tema (hierarquia Tema → Etapa → Módulo). Sem isso o app não sabe em
        // qual etapa a aula entra — origem do antigo fallback silencioso "2".
        let stageId = selectedStageId;
        let stageNumber = newModuleStage;
        if (stageMode === "new") {
          if (!newStageTitle.trim()) throw new Error("Informe o título da etapa.");
          const st = await createStage({
            themeId,
            stageNumber: newStageNumber,
            title: newStageTitle.trim(),
          });
          if (!st) throw new Error("Não foi possível criar a etapa.");
          stageId = st.id;
          stageNumber = newStageNumber;
        }
        if (!stageId) throw new Error("Selecione a etapa do módulo.");

        const m = await createModule({
          themeId,
          title: newModuleTitle.trim(),
          stageNumber,
          stageId,
        });
        if (!m) throw new Error("Não foi possível criar o módulo.");
        moduleId = m.id;
      }
      if (!moduleId) throw new Error("Selecione ou crie um módulo.");
      if (!titulo.trim()) throw new Error("Informe o título da aula.");

      let exerciseJson: unknown;

      if (kind === "match-letter") {
        if (!letraAlvo.trim()) throw new Error("Informe a letra alvo.");
        const target = letraAlvo.toUpperCase();
        const audioUrl = instrAudioFile
          ? await up(instrAudioFile, `instrucao-${titulo}`)
          : existingInstrAudioUrl;
        const items = (await uploadMatchItems(matchItems)).map((it) => ({
          ...it,
          correctOptions: [target],
        }));
        exerciseJson = {
          schema: "letras-stage2-v1",
          screenTemplate: "exercise-match-letter",
          letraAlvo: target,
          instructionAudioUrl: audioUrl,
          progressiveUnlock: false,
          exercise: { items },
          tutorNotes: tutorNotes.trim() || null,
        };
      } else if (kind === "mark-images") {
        const audioUrl = markInstrAudioFile
          ? await up(markInstrAudioFile, `instrucao-${titulo}`)
          : existingMarkInstrAudioUrl;
        const items = await uploadMarkItems(markItems);
        exerciseJson = {
          schema: "letras-stage2-v1",
          screenTemplate: "exercise-mark-images",
          instructionText: markInstrText,
          instructionAudioUrl: audioUrl,
          exercise: { items },
          tutorNotes: tutorNotes.trim() || null,
        };
      } else if (kind === "video") {
        const resolvedVideoUrl = videoFile
          ? await up(videoFile, `video-${titulo}`)
          : existingVideoUrl;
        if (!resolvedVideoUrl) throw new Error("Selecione um arquivo de vídeo.");
        const audioUrl = videoInstrAudioFile
          ? await up(videoInstrAudioFile, `instrucao-${titulo}`)
          : existingVideoInstrAudioUrl;
        exerciseJson = {
          schema: "letras-stage2-v1",
          screenTemplate: "video",
          videoUrl: resolvedVideoUrl,
          instructionText: videoInstrText || null,
          instructionAudioUrl: audioUrl,
          notes: videoNotes || null,
          tutorNotes: tutorNotes.trim() || null,
        };
      } else {
        // composite
        if (compositeBlocks.length === 0) throw new Error("Adicione pelo menos um bloco.");
        const blocks = await Promise.all(
          compositeBlocks.map(async (b) => {
            if (b.kind === "video") {
              const vb = b as VideoBlockData;
              const videoUrl = vb.videoFile
                ? await up(vb.videoFile, `video-bloco-${b.id}`)
                : vb.existingVideoUrl;
              const audioUrl = vb.instrAudioFile
                ? await up(vb.instrAudioFile, `audio-bloco-${b.id}`)
                : vb.existingInstrAudioUrl;
              return { id: b.id, type: "video", videoUrl, instrText: vb.instrText, instrAudioUrl: audioUrl, notes: vb.notes };
            } else if (b.kind === "text") {
              const tb = b as TextBlockData;
              return { id: b.id, type: "text", content: tb.content, audience: tb.audience };
            } else if (b.kind === "image") {
              const ib = b as ImageBlockData;
              const imageUrl = ib.imageFile
                ? await up(ib.imageFile, `img-bloco-${b.id}`)
                : ib.existingImageUrl;
              return { id: b.id, type: "image", imageUrl, caption: ib.caption };
            } else if (b.kind === "audio") {
              const ab = b as AudioBlockData;
              const audioUrl = ab.audioFile
                ? await up(ab.audioFile, `audio-bloco-${b.id}`)
                : ab.existingAudioUrl;
              return { id: b.id, type: "audio", audioUrl, label: ab.label };
            } else if (b.kind === "match-letter") {
              const mb = b as MatchBlockData;
              const audioUrl = mb.instrAudioFile
                ? await up(mb.instrAudioFile, `audio-bloco-${b.id}`)
                : mb.existingInstrAudioUrl;
              const target = mb.letraAlvo.toUpperCase();
              const items = (await uploadMatchItems(mb.items)).map((it) => ({ ...it, correctOptions: [target] }));
              return { id: b.id, type: "exercise-match-letter", letraAlvo: target, instructionAudioUrl: audioUrl, progressiveUnlock: false, exercise: { items } };
            } else {
              const mb = b as MarkBlockData;
              const audioUrl = mb.instrAudioFile
                ? await up(mb.instrAudioFile, `audio-bloco-${b.id}`)
                : mb.existingInstrAudioUrl;
              const items = await uploadMarkItems(mb.items);
              return { id: b.id, type: "exercise-mark-images", instructionText: mb.instrText, instructionAudioUrl: audioUrl, exercise: { items } };
            }
          }),
        );
        exerciseJson = { schema: "letras-stage2-v1", screenTemplate: "composite", blocks, tutorNotes: tutorNotes.trim() || null };
      }

      const instructionsStr = JSON.stringify(exerciseJson);

      if (isEditing && editingActivityId) {
        const updated = await updateActivity({
          activityId: editingActivityId,
          moduleId,
          title: titulo.trim(),
          instructions: instructionsStr,
        });
        if (!updated) throw new Error("Não foi possível salvar as alterações.");
        if (typeof window !== "undefined") window.localStorage.removeItem(draftStorageKey);
        setSubmitted(true);
        void navigate("/admin/conteudo");
      } else {
        const activity = await createActivity({
          moduleId,
          title: titulo.trim(),
          type: "letra",
          instructions: instructionsStr,
          isPublished: false,
        });
        if (!activity) throw new Error("Não foi possível salvar a aula.");
        if (typeof window !== "undefined") window.localStorage.removeItem(draftStorageKey);
        setSubmitted(true);
        setTimeout(() => void navigate("/admin/conteudo"), 2500);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────

  if (submitted && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-16">
        <div className="flex h-14 w-14 items-center justify-center bg-emerald-100">
          <Check className="h-7 w-7 text-emerald-700" />
        </div>
        <p className="text-lg font-semibold text-slate-900">Aula criada com sucesso!</p>
        <p className="text-sm text-slate-500">Redirecionando para o painel...</p>
      </div>
    );
  }

  // ── Main Form ─────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      {isEditing && (
        <div className="mb-4 flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-4 py-3">
          <Pencil className="h-4 w-4 shrink-0 text-emerald-700" />
          <p className="text-sm font-medium text-emerald-800">
            Editando aula: {titulo || "…"}
          </p>
        </div>
      )}

      {draftRestored && (
        <div className="mb-4 flex items-start justify-between gap-3 border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            Rascunho recuperado automaticamente. Textos, blocos e mídias da biblioteca foram restaurados.
            Arquivos escolhidos direto do computador podem precisar ser reanexados.
          </p>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            className="text-xs font-medium text-amber-800 hover:text-amber-950"
          >
            OK
          </button>
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/admin/conteudo"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Aulas e Mídias
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {isEditing ? "Editar aula" : "Nova aula"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Adicione os blocos na ordem em que devem aparecer para o aluno.
        </p>
        {draftSavedAt && (
          <p className="mt-2 text-xs text-emerald-700">
            Rascunho salvo automaticamente.
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex w-full min-w-0 flex-col gap-6 lg:flex-row lg:items-start"
      >
        {/* ── Left: Form ───────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">
          <OrgSection
            isEditing={isEditing}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            selectedThemeId={selectedThemeId}
            setSelectedThemeId={setSelectedThemeId}
            newThemeTitle={newThemeTitle}
            setNewThemeTitle={setNewThemeTitle}
            moduleMode={moduleMode}
            setModuleMode={setModuleMode}
            selectedModuleId={selectedModuleId}
            setSelectedModuleId={setSelectedModuleId}
            newModuleTitle={newModuleTitle}
            setNewModuleTitle={setNewModuleTitle}
            newModuleStage={newModuleStage}
            setNewModuleStage={setNewModuleStage}
            selectedStageId={selectedStageId}
            setSelectedStageId={setSelectedStageId}
            stageMode={stageMode}
            setStageMode={setStageMode}
            newStageTitle={newStageTitle}
            setNewStageTitle={setNewStageTitle}
            newStageNumber={newStageNumber}
            setNewStageNumber={setNewStageNumber}
            titulo={titulo}
            setTitulo={setTitulo}
            themes={data.themes}
            stages={data.stages}
            modulesForTheme={modulesForTheme}
          />

          {/* Exercise config */}
          {kind === "match-letter" && (
            <section className="space-y-1 border border-slate-300 bg-white p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Exercício</h2>
              <MatchItemsField
                items={matchItems}
                letraAlvo={letraAlvo}
                instrAudioFile={instrAudioFile}
                existingInstrAudioUrl={existingInstrAudioUrl}
                onLetraChange={setLetraAlvo}
                onInstrAudioChange={setInstrAudioFile}
                onItemChange={patchMatch}
                onAddItem={() =>
                  setMatchItems((p) => [
                    ...p,
                    { id: uid(), label: "", optionsText: "", imageFile: null, imagePreview: null, audioFile: null, existingImageUrl: null, existingAudioUrl: null },
                  ])
                }
                onRemoveItem={(id) => setMatchItems((p) => p.filter((it) => it.id !== id))}
                onPickImage={(itemId) =>
                  setPicker({
                    filter: "image",
                    onSelect: (url) => {
                      patchMatch(itemId, { existingImageUrl: url, imageFile: null, imagePreview: null });
                      setPicker(null);
                    },
                  })
                }
                onPickAudio={(itemId) =>
                  setPicker({
                    filter: "audio",
                    onSelect: (url) => {
                      if (itemId === "__instr__") setExistingInstrAudioUrl(url);
                      else patchMatch(itemId, { existingAudioUrl: url, audioFile: null });
                      setPicker(null);
                    },
                  })
                }
              />
            </section>
          )}

          {kind === "mark-images" && (
            <section className="space-y-1 border border-slate-300 bg-white p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Exercício</h2>
              <MarkItemsField
                items={markItems}
                instrText={markInstrText}
                instrAudioFile={markInstrAudioFile}
                existingInstrAudioUrl={existingMarkInstrAudioUrl}
                onInstrTextChange={setMarkInstrText}
                onInstrAudioChange={setMarkInstrAudioFile}
                onItemChange={patchMark}
                onAddItem={() =>
                  setMarkItems((p) => [
                    ...p,
                    { id: uid(), label: "", imageFile: null, imagePreview: null, isCorrect: false, existingImageUrl: null },
                  ])
                }
                onRemoveItem={(id) => setMarkItems((p) => p.filter((it) => it.id !== id))}
                onPickImage={(itemId) =>
                  setPicker({
                    filter: "image",
                    onSelect: (url) => {
                      patchMark(itemId, { existingImageUrl: url, imageFile: null, imagePreview: null });
                      setPicker(null);
                    },
                  })
                }
                onPickAudio={(itemId) =>
                  setPicker({
                    filter: "audio",
                    onSelect: (url) => {
                      if (itemId === "__instr__") setExistingMarkInstrAudioUrl(url);
                      setPicker(null);
                    },
                  })
                }
              />
            </section>
          )}

          {kind === "video" && (
            <section className="space-y-4 overflow-hidden border border-slate-300 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Vídeo</h2>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Arquivo de vídeo</label>
                <p className="text-xs text-slate-500">
                  Aceita mp4, webm, mov, avi e outros formatos de vídeo.
                </p>
                <VideoFileBtn
                  label={videoFile ? videoFile.name : "Escolher vídeo"}
                  fileName={videoFile?.name}
                  existingUrl={existingVideoUrl}
                  onChange={setVideoFile}
                  onPickFromLibrary={() =>
                    setPicker({
                      filter: "video",
                      onSelect: (url) => {
                        setExistingVideoUrl(url);
                        setVideoFile(null);
                        setPicker(null);
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Instrução em texto{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <p className="text-xs text-slate-500">Aparece abaixo do vídeo no app.</p>
                <textarea
                  rows={2}
                  placeholder="Ex: Assista ao vídeo com atenção"
                  value={videoInstrText}
                  onChange={(e) => setVideoInstrText(e.target.value)}
                  className="w-full resize-y border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Áudio de instrução{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <FileBtn
                  accept="audio/*"
                  label={videoInstrAudioFile ? videoInstrAudioFile.name : "Escolher áudio"}
                  fileName={videoInstrAudioFile?.name}
                  existingUrl={existingVideoInstrAudioUrl}
                  onChange={setVideoInstrAudioFile}
                  onPickFromLibrary={() =>
                    setPicker({
                      filter: "audio",
                      onSelect: (url) => {
                        setExistingVideoInstrAudioUrl(url);
                        setVideoInstrAudioFile(null);
                        setPicker(null);
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Anotações internas{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <p className="text-xs text-slate-500">
                  Visível apenas no painel, não aparece para o aluno.
                </p>
                <textarea
                  rows={2}
                  placeholder="Observações pedagógicas, contexto, referências..."
                  value={videoNotes}
                  onChange={(e) => setVideoNotes(e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </section>
          )}

          {kind === "composite" && (
            <section className="space-y-4 border border-slate-300 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Blocos da aula</h2>
              <p className="text-xs text-slate-500">
                Adicione e organize os blocos. O aluno verá na ordem em que aparecem aqui.
              </p>

              {compositeBlocks.length === 0 && (
                <p className="border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                  Nenhum bloco adicionado ainda.
                </p>
              )}

              {compositeBlocks.map((b, bi) => (
                <div key={b.id} className="min-w-0 overflow-hidden border border-slate-300 bg-slate-50">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
                    <div className="min-w-0 flex items-center gap-2 text-sm font-medium text-slate-700">
                      {b.kind === "video" && <Video className="h-4 w-4 text-slate-500" />}
                      {b.kind === "text" && <AlignLeft className="h-4 w-4 text-slate-500" />}
                      {b.kind === "image" && <ImageIcon className="h-4 w-4 text-slate-500" />}
                      {b.kind === "audio" && <Volume2 className="h-4 w-4 text-slate-500" />}
                      {b.kind === "match-letter" && <BookOpen className="h-4 w-4 text-slate-500" />}
                      {b.kind === "mark-images" && <LayoutGrid className="h-4 w-4 text-slate-500" />}
                      <span className="truncate">
                        Bloco {bi + 1} —{" "}
                        {b.kind === "video"
                          ? "Vídeo"
                          : b.kind === "text"
                            ? "Texto"
                            : b.kind === "image"
                              ? "Imagem"
                              : b.kind === "audio"
                                ? "Áudio"
                                : b.kind === "match-letter"
                                  ? "Encontrar a Letra"
                                  : "Escolher Imagens"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCompositeBlock(b.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </button>
                  </div>

                  <div className="min-w-0 p-4">
                    {b.kind === "video" && (
                      <div className="space-y-3">
                        <VideoFileBtn
                          label={(b as VideoBlockData).videoFile?.name ?? "Escolher vídeo"}
                          fileName={(b as VideoBlockData).videoFile?.name}
                          existingUrl={(b as VideoBlockData).existingVideoUrl}
                          onChange={(f) => patchCompositeBlock(b.id, { videoFile: f })}
                          onPickFromLibrary={() =>
                            setPicker({
                              filter: "video",
                              onSelect: (url) => {
                                patchCompositeBlock(b.id, { existingVideoUrl: url, videoFile: null });
                                setPicker(null);
                              },
                            })
                          }
                        />
                        <textarea
                          rows={2}
                          placeholder="Instrução em texto (opcional)"
                          value={(b as VideoBlockData).instrText}
                          onChange={(e) => patchCompositeBlock(b.id, { instrText: e.target.value })}
                          className="w-full resize-y border border-slate-300 bg-white px-3 py-1.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400"
                        />
                        <FileBtn
                          accept="audio/*"
                          label={(b as VideoBlockData).instrAudioFile?.name ?? "Áudio de instrução (opcional)"}
                          fileName={(b as VideoBlockData).instrAudioFile?.name}
                          existingUrl={(b as VideoBlockData).existingInstrAudioUrl}
                          onChange={(f) => patchCompositeBlock(b.id, { instrAudioFile: f })}
                          onPickFromLibrary={() =>
                            setPicker({
                              filter: "audio",
                              onSelect: (url) => {
                                patchCompositeBlock(b.id, { existingInstrAudioUrl: url, instrAudioFile: null });
                                setPicker(null);
                              },
                            })
                          }
                        />
                        <textarea
                          rows={2}
                          placeholder="Anotações internas (opcional)"
                          value={(b as VideoBlockData).notes}
                          onChange={(e) => patchCompositeBlock(b.id, { notes: e.target.value })}
                          className="w-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                    )}

                    {b.kind === "text" && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Para quem é este texto?</label>
                          <p className="text-xs text-slate-500">
                            "Alfabetizador" fica visível no painel para guiar o tutor. "Alfabetizando" aparece na tela do app.
                          </p>
                          <select
                            value={(b as TextBlockData).audience}
                            onChange={(e) =>
                              patchCompositeBlock(b.id, { audience: e.target.value as TextBlockData["audience"] })
                            }
                            className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                          >
                            <option value="educator">Alfabetizador — orientação para o tutor</option>
                            <option value="learner">Alfabetizando — texto visível no app</option>
                            <option value="both">Ambos</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Conteúdo do texto</label>
                          <textarea
                            rows={3}
                            placeholder={
                              (b as TextBlockData).audience === "educator"
                                ? "Ex: Peça ao aluno que pronuncie cada palavra em voz alta antes de marcar."
                                : "Ex: Agora é sua vez! Encontre todas as imagens que começam com A."
                            }
                            value={(b as TextBlockData).content}
                            onChange={(e) => patchCompositeBlock(b.id, { content: e.target.value })}
                            className="w-full border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    )}

                    {b.kind === "image" && (
                      <div className="space-y-3">
                        <FileBtn
                          accept="image/*"
                          label="Escolher imagem"
                          preview={(b as ImageBlockData).imagePreview}
                          existingUrl={(b as ImageBlockData).existingImageUrl}
                          onChange={(f) =>
                            patchCompositeBlock(b.id, {
                              imageFile: f,
                              imagePreview: f ? URL.createObjectURL(f) : null,
                            })
                          }
                          onPickFromLibrary={() =>
                            setPicker({
                              filter: "image",
                              onSelect: (url) => {
                                patchCompositeBlock(b.id, { existingImageUrl: url, imageFile: null, imagePreview: null });
                                setPicker(null);
                              },
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="Legenda (opcional)"
                          value={(b as ImageBlockData).caption}
                          onChange={(e) => patchCompositeBlock(b.id, { caption: e.target.value })}
                          className="w-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                    )}

                    {b.kind === "audio" && (
                      <div className="space-y-3">
                        <FileBtn
                          accept="audio/*"
                          label="Escolher áudio"
                          fileName={(b as AudioBlockData).audioFile?.name}
                          existingUrl={(b as AudioBlockData).existingAudioUrl}
                          onChange={(f) => patchCompositeBlock(b.id, { audioFile: f })}
                          onPickFromLibrary={() =>
                            setPicker({
                              filter: "audio",
                              onSelect: (url) => {
                                patchCompositeBlock(b.id, { existingAudioUrl: url, audioFile: null });
                                setPicker(null);
                              },
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="Legenda (opcional)"
                          value={(b as AudioBlockData).label}
                          onChange={(e) => patchCompositeBlock(b.id, { label: e.target.value })}
                          className="w-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                    )}

                    {b.kind === "match-letter" && (
                      <MatchItemsField
                        items={(b as MatchBlockData).items}
                        letraAlvo={(b as MatchBlockData).letraAlvo}
                        instrAudioFile={(b as MatchBlockData).instrAudioFile}
                        existingInstrAudioUrl={(b as MatchBlockData).existingInstrAudioUrl}
                        onLetraChange={(v) => patchCompositeBlock(b.id, { letraAlvo: v })}
                        onInstrAudioChange={(f) => patchCompositeBlock(b.id, { instrAudioFile: f })}
                        onItemChange={(itemId, patch) => patchCompositeMatchItem(b.id, itemId, patch)}
                        onAddItem={() => addCompositeMatchItem(b.id)}
                        onRemoveItem={(itemId) => removeCompositeMatchItem(b.id, itemId)}
                        onPickImage={(itemId) =>
                          setPicker({
                            filter: "image",
                            onSelect: (url) => {
                              patchCompositeMatchItem(b.id, itemId, { existingImageUrl: url, imageFile: null, imagePreview: null });
                              setPicker(null);
                            },
                          })
                        }
                        onPickAudio={(itemId) =>
                          setPicker({
                            filter: "audio",
                            onSelect: (url) => {
                              if (itemId === "__instr__") patchCompositeBlock(b.id, { existingInstrAudioUrl: url, instrAudioFile: null });
                              else patchCompositeMatchItem(b.id, itemId, { existingAudioUrl: url, audioFile: null });
                              setPicker(null);
                            },
                          })
                        }
                      />
                    )}

                    {b.kind === "mark-images" && (
                      <MarkItemsField
                        items={(b as MarkBlockData).items}
                        instrText={(b as MarkBlockData).instrText}
                        instrAudioFile={(b as MarkBlockData).instrAudioFile}
                        existingInstrAudioUrl={(b as MarkBlockData).existingInstrAudioUrl}
                        onInstrTextChange={(v) => patchCompositeBlock(b.id, { instrText: v })}
                        onInstrAudioChange={(f) => patchCompositeBlock(b.id, { instrAudioFile: f })}
                        onItemChange={(itemId, patch) => patchCompositeMarkItem(b.id, itemId, patch)}
                        onAddItem={() => addCompositeMarkItem(b.id)}
                        onRemoveItem={(itemId) => removeCompositeMarkItem(b.id, itemId)}
                        onPickImage={(itemId) =>
                          setPicker({
                            filter: "image",
                            onSelect: (url) => {
                              patchCompositeMarkItem(b.id, itemId, { existingImageUrl: url, imageFile: null, imagePreview: null });
                              setPicker(null);
                            },
                          })
                        }
                        onPickAudio={(itemId) =>
                          setPicker({
                            filter: "audio",
                            onSelect: (url) => {
                              if (itemId === "__instr__") patchCompositeBlock(b.id, { existingInstrAudioUrl: url, instrAudioFile: null });
                              setPicker(null);
                            },
                          })
                        }
                      />
                    )}
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-1">
                {(
                  [
                    { kind: "text", icon: <AlignLeft className="h-3.5 w-3.5 text-slate-500" />, label: "Texto" },
                    { kind: "image", icon: <ImageIcon className="h-3.5 w-3.5 text-slate-500" />, label: "Imagem" },
                    { kind: "audio", icon: <Volume2 className="h-3.5 w-3.5 text-slate-500" />, label: "Áudio" },
                    { kind: "video", icon: <Video className="h-3.5 w-3.5 text-slate-500" />, label: "Vídeo" },
                    { kind: "match-letter", icon: <BookOpen className="h-3.5 w-3.5 text-slate-500" />, label: "Encontrar a Letra" },
                    { kind: "mark-images", icon: <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />, label: "Escolher Imagens" },
                  ] as { kind: Parameters<typeof addCompositeBlock>[0]; icon: React.ReactNode; label: string }[]
                ).map(({ kind, icon, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addCompositeBlock(kind)}
                    className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2 border border-slate-300 bg-white p-5">
            <label className="block font-semibold text-slate-900">Orientações para o alfabetizador</label>
            <p className="text-xs text-slate-500">
              Visível apenas no painel. Use para descrever o objetivo pedagógico da aula, como o tutor deve conduzir o aluno, e o que observar durante a atividade.
            </p>
            <textarea
              rows={3}
              placeholder="Ex: Nesta aula o aluno deve reconhecer a letra A em posição inicial. O alfabetizador deve pronunciar cada palavra e pedir que o aluno repita antes de responder."
              value={tutorNotes}
              onChange={(e) => setTutorNotes(e.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400"
            />
          </section>

          {submitError && (
            <div className="flex items-start gap-2 border border-red-200 bg-red-50 p-3">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Salvar aula"}
          </button>
        </div>

        {/* ── Right: Live Preview ───────────────────────────────────────────── */}
        <div className="hidden lg:block lg:w-72 lg:shrink-0">
          <div className="sticky top-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              Preview no celular
            </p>
            <div className="overflow-hidden rounded-3xl border-[5px] border-slate-800 bg-slate-800 shadow-xl">
              <div className="h-3 bg-slate-800" />
              <div className="max-h-[72vh] min-h-64 overflow-y-auto bg-slate-100 p-3">
                {kind === "match-letter" && (
                  <LiveMatchLetter letraAlvo={letraAlvo} items={matchItems} />
                )}
                {kind === "mark-images" && (
                  <LiveMarkImages instrText={markInstrText} items={markItems} />
                )}
                {kind === "video" && (
                  <LiveVideo videoFile={videoFile} instrText={videoInstrText} existingVideoUrl={existingVideoUrl} />
                )}
                {kind === "composite" && <LiveComposite blocks={compositeBlocks} />}
              </div>
              <div className="h-3 bg-slate-800" />
            </div>
          </div>
        </div>
      </form>

      {picker && (
        <MediaPickerModal
          filter={picker.filter}
          assets={data.assets}
          onSelect={picker.onSelect}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
