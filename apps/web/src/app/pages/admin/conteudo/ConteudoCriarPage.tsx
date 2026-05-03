import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Image as ImageIcon,
  LayoutGrid,
  Layers,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Kind = "match-letter" | "mark-images" | "video" | "composite";

interface MatchItem {
  id: string;
  label: string;
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

type CompositeBlock = VideoBlockData | MatchBlockData | MarkBlockData;

let _id = 0;
const uid = () => `u${++_id}`;

const newMatchItems = (): MatchItem[] => [
  { id: uid(), label: "", imageFile: null, imagePreview: null, audioFile: null, existingImageUrl: null, existingAudioUrl: null },
  { id: uid(), label: "", imageFile: null, imagePreview: null, audioFile: null, existingImageUrl: null, existingAudioUrl: null },
  { id: uid(), label: "", imageFile: null, imagePreview: null, audioFile: null, existingImageUrl: null, existingAudioUrl: null },
];

const newMarkItems = (): MarkItem[] => [
  { id: uid(), label: "", imageFile: null, imagePreview: null, isCorrect: true, existingImageUrl: null },
  { id: uid(), label: "", imageFile: null, imagePreview: null, isCorrect: false, existingImageUrl: null },
  { id: uid(), label: "", imageFile: null, imagePreview: null, isCorrect: false, existingImageUrl: null },
  { id: uid(), label: "", imageFile: null, imagePreview: null, isCorrect: false, existingImageUrl: null },
];

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
    <div className="flex min-w-[240px] items-center gap-2 border border-slate-200 bg-slate-50 px-2 py-1.5">
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
}: {
  accept: string;
  label: string;
  fileName?: string | null;
  preview?: string | null;
  existingUrl?: string | null;
  onChange: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const isImg = accept.startsWith("image");
  const displayPreview = preview ?? (isImg ? existingUrl : null);
  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
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
        {label}
      </button>
      {displayPreview && (
        <img src={displayPreview} alt="" className="h-9 w-9 border border-slate-200 object-cover" />
      )}
      {!isImg && existingUrl && !fileName && (
        <MiniAudioPlayer src={existingUrl} />
      )}
      {!isImg && fileName && (
        <span className="max-w-[120px] truncate text-xs text-slate-500">{fileName}</span>
      )}
    </div>
  );
}

function VideoFileBtn({
  label,
  fileName,
  existingUrl,
  onChange,
}: {
  label: string;
  fileName?: string | null;
  existingUrl?: string | null;
  onChange: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Video className="h-3.5 w-3.5 text-slate-500" />
          {label}
        </button>
        {fileName && (
          <span className="max-w-[160px] truncate text-xs text-slate-500">{fileName}</span>
        )}
      </div>
      {existingUrl && !fileName && (
        <div className="rounded border border-slate-200 bg-slate-950 p-2">
          <video
            src={existingUrl}
            controls
            preload="metadata"
            className="mx-auto max-h-[360px] w-full bg-slate-950 object-contain"
          />
        </div>
      )}
    </div>
  );
}

function AudioRound({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls = {
    sm: { wrap: "h-7 w-7", icon: "h-3 w-3" },
    md: { wrap: "h-10 w-10", icon: "h-4 w-4" },
    lg: { wrap: "h-12 w-12", icon: "h-5 w-5" },
  }[size];
  return (
    <div
      className={`flex ${cls.wrap} shrink-0 items-center justify-center rounded-full bg-slate-800 shadow-sm`}
    >
      <Volume2 className={`${cls.icon} text-white`} />
    </div>
  );
}

// ─── Static Card Thumbnails ───────────────────────────────────────────────────

function MiniPhone({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-24 overflow-hidden rounded-[14px] border-[3px] border-slate-800 bg-slate-800 shadow-md">
      <div className="h-1.5 bg-slate-800" />
      <div className="min-h-32 space-y-1 bg-slate-100 p-1.5">{children}</div>
      <div className="h-1.5 bg-slate-800" />
    </div>
  );
}

function ThumbMatchLetter() {
  return (
    <MiniPhone>
      <div className="flex justify-center py-0.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800">
          <Volume2 className="h-2.5 w-2.5 text-white" />
        </div>
      </div>
      {[3, 5, 3].map((n, i) => (
        <div key={i} className="flex items-center gap-1 rounded border border-slate-200 bg-white p-1">
          <div className="h-5 w-5 shrink-0 rounded-sm bg-slate-200" />
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200">
            <Volume2 className="h-2 w-2 text-slate-400" />
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: n }).map((_, j) => (
              <div key={j} className="h-3 w-3 border border-slate-300 bg-white" />
            ))}
          </div>
        </div>
      ))}
    </MiniPhone>
  );
}

function ThumbMarkImages() {
  return (
    <MiniPhone>
      <div className="mx-auto h-1.5 w-16 rounded-sm bg-slate-300" />
      <div className="flex justify-center py-0.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800">
          <Volume2 className="h-2.5 w-2.5 text-white" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {[true, false, false, true].map((c, i) => (
          <div
            key={i}
            className={`h-9 rounded border ${c ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}
          />
        ))}
      </div>
    </MiniPhone>
  );
}

function ThumbVideo() {
  return (
    <MiniPhone>
      <div className="flex h-24 items-center justify-center rounded bg-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
          <Play className="h-4 w-4 fill-white text-white" />
        </div>
      </div>
      <div className="h-1.5 w-14 rounded-sm bg-slate-300" />
      <div className="h-1.5 w-10 rounded-sm bg-slate-200" />
    </MiniPhone>
  );
}

function ThumbComposite() {
  return (
    <MiniPhone>
      <div className="flex h-7 items-center justify-center rounded bg-slate-800">
        <Play className="h-3 w-3 fill-white text-white" />
      </div>
      <div className="flex items-center gap-1 rounded border border-slate-200 bg-white p-1">
        <div className="h-4 w-4 shrink-0 rounded-sm bg-slate-200" />
        <div className="flex gap-0.5">
          {[0, 1, 2].map((j) => (
            <div key={j} className="h-3 w-3 border border-slate-300 bg-white" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-0.5">
        {[true, false, false, true].map((c, i) => (
          <div
            key={i}
            className={`h-6 rounded border ${c ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}
          />
        ))}
      </div>
    </MiniPhone>
  );
}

// ─── Live Preview Components ──────────────────────────────────────────────────

function LiveMatchLetter({ letraAlvo, items }: { letraAlvo: string; items: MatchItem[] }) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-center pt-1">
        <AudioRound size="lg" />
      </div>
      {items.map((item) => {
        const letters = item.label.toUpperCase().split("").filter(Boolean);
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
  return (
    <div className="space-y-2">
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
      {instrText && <p className="text-xs text-slate-700">{instrText}</p>}
    </div>
  );
}

function LiveComposite({ blocks }: { blocks: CompositeBlock[] }) {
  if (blocks.length === 0) {
    return (
      <p className="py-8 text-center text-xs italic text-slate-400">
        Adicione blocos ao exercício
      </p>
    );
  }
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
          <div key={item.id} className="space-y-2 border border-slate-200 bg-slate-50 p-3">
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
              />
              <FileBtn
                accept="audio/*"
                label={item.audioFile ? item.audioFile.name : "Áudio (opcional)"}
                fileName={item.audioFile?.name}
                existingUrl={item.existingAudioUrl}
                onChange={(f) => onItemChange(item.id, { audioFile: f })}
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
            className={`space-y-2 border p-3 ${item.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
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
  titulo,
  setTitulo,
  themes,
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
  titulo: string;
  setTitulo: (v: string) => void;
  themes: { id: string; title: string }[];
  modulesForTheme: { id: string; title: string }[];
}) {
  if (isEditing) {
    const themeName = themes.find((t) => t.id === selectedThemeId)?.title ?? "—";
    const moduleName = modulesForTheme.find((m) => m.id === selectedModuleId)?.title ?? "—";
    return (
      <>
        <section className="space-y-3 border border-slate-300 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Localização</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tema</p>
              <p className="mt-0.5 text-sm text-slate-900">{themeName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Módulo</p>
              <p className="mt-0.5 text-sm text-slate-900">{moduleName}</p>
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
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              disabled={themeMode === "existing" && !selectedThemeId}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
            >
              <option value="">Selecione um módulo...</option>
              {modulesForTheme.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Ex: Etapa 2 — Reconhecimento da letra A"
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

type CompositeRawBlock = CompositeVideoBlock | CompositeMatchBlock | CompositeMarkBlock;

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConteudoCriarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingActivityId = searchParams.get("id") ?? null;
  const isEditing = editingActivityId !== null;

  const { data, createTheme, createModule, createActivity, updateActivity, uploadAsset } = useConteudoData();

  const [kind, setKind] = useState<Kind | null>(null);

  // Org state (shared)
  const [themeMode, setThemeMode] = useState<"existing" | "new">("existing");
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [newThemeTitle, setNewThemeTitle] = useState("");
  const [moduleMode, setModuleMode] = useState<"existing" | "new">("existing");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
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

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const modulesForTheme = data.modules.filter((m) => m.theme_id === selectedThemeId);

  // ── Hydration from editing activity ──────────────────────────────────────

  useEffect(() => {
    if (!editingActivityId || data.activities.length === 0) return;

    const activity = data.activities.find((a) => a.id === editingActivityId);
    if (!activity) return;

    setTitulo(activity.title);
    setSelectedModuleId(activity.module_id);
    setModuleMode("existing");
    setThemeMode("existing");

    const moduleItem = data.modules.find((m) => m.id === activity.module_id);
    if (moduleItem) setSelectedThemeId(moduleItem.theme_id);

    const parsed = parseInstructions(activity.instructions);
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

  function patchMatch(id: string, patch: Partial<MatchItem>) {
    setMatchItems((p) => p.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function patchMark(id: string, patch: Partial<MarkItem>) {
    setMarkItems((p) => p.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  // ── Composite block handlers ──────────────────────────────────────────────

  function addCompositeBlock(blockKind: "video" | "match-letter" | "mark-images") {
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
            { id: uid(), label: "", imageFile: null, imagePreview: null, audioFile: null, existingImageUrl: null, existingAudioUrl: null },
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
        return { id: it.id, label: word, imageUrl, wordAudioUrl, options: word.split("").filter(Boolean), correctOptions: [] as string[] };
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
    if (!kind) return;
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
        const m = await createModule({ themeId, title: newModuleTitle.trim(), stageNumber: 2 });
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
        exerciseJson = { schema: "letras-stage2-v1", screenTemplate: "composite", blocks };
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
        setSubmitted(true);
        setTimeout(() => void navigate("/admin/conteudo"), 2500);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Type Selection ────────────────────────────────────────────────────────

  if (!kind) {
    const cards: {
      value: Kind;
      icon: React.ReactNode;
      title: string;
      desc: string;
      thumb: React.ReactNode;
    }[] = [
      {
        value: "match-letter",
        icon: <BookOpen className="h-5 w-5 text-slate-700" />,
        title: "Encontrar a Letra",
        desc: "O aluno vê uma imagem de uma palavra e toca na posição da letra ensinada.",
        thumb: <ThumbMatchLetter />,
      },
      {
        value: "mark-images",
        icon: <LayoutGrid className="h-5 w-5 text-slate-700" />,
        title: "Escolher Imagens",
        desc: "O aluno vê uma grade de imagens e marca as que correspondem ao critério dado.",
        thumb: <ThumbMarkImages />,
      },
      {
        value: "video",
        icon: <Video className="h-5 w-5 text-slate-700" />,
        title: "Aula em Vídeo",
        desc: "Um vídeo com instrução opcional em texto e áudio para orientar o aluno.",
        thumb: <ThumbVideo />,
      },
      {
        value: "composite",
        icon: <Layers className="h-5 w-5 text-slate-700" />,
        title: "Aula Personalizada",
        desc: "Combine vídeo, exercício de letras e escolha de imagens na ordem que quiser.",
        thumb: <ThumbComposite />,
      },
    ];

    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-6">
          <Link
            to="/admin/conteudo"
            className="flex w-fit items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Aulas e Mídias
          </Link>
        </div>

        <h1 className="mb-1 text-xl font-semibold text-slate-900">Nova aula</h1>
        <p className="mb-8 text-sm text-slate-500">
          Escolha o tipo de aula que vai criar.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setKind(c.value)}
              className="flex flex-col gap-4 border-2 border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-900 hover:bg-slate-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center border border-slate-200 bg-slate-50">
                  {c.icon}
                </div>
                <p className="font-semibold text-slate-900">{c.title}</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">{c.desc}</p>
              {c.thumb}
            </button>
          ))}
        </div>
      </div>
    );
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

  const kindLabel: Record<Kind, string> = {
    "match-letter": "Encontrar a Letra",
    "mark-images": "Escolher Imagens",
    video: "Aula em Vídeo",
    composite: "Aula Personalizada",
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      {isEditing && (
        <div className="mb-4 flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-4 py-3">
          <Pencil className="h-4 w-4 shrink-0 text-emerald-700" />
          <p className="text-sm font-medium text-emerald-800">
            Editando aula: {titulo || "…"}
          </p>
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        {isEditing ? (
          <Link
            to="/admin/conteudo"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Aulas e Mídias
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setKind(null)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">{kindLabel[kind]}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {kind === "match-letter" && "Configure a letra, as palavras e as imagens do exercício."}
          {kind === "mark-images" && "Configure as imagens e marque quais são as respostas certas."}
          {kind === "video" && "Envie o vídeo e adicione orientações opcionais para o aluno."}
          {kind === "composite" && "Adicione os blocos na ordem em que devem aparecer para o aluno."}
        </p>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-6 lg:flex-row lg:items-start"
      >
        {/* ── Left: Form ───────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-4">
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
            titulo={titulo}
            setTitulo={setTitulo}
            themes={data.themes}
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
                    { id: uid(), label: "", imageFile: null, imagePreview: null, audioFile: null, existingImageUrl: null, existingAudioUrl: null },
                  ])
                }
                onRemoveItem={(id) => setMatchItems((p) => p.filter((it) => it.id !== id))}
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
              />
            </section>
          )}

          {kind === "video" && (
            <section className="space-y-4 border border-slate-300 bg-white p-5">
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
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Instrução em texto{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <p className="text-xs text-slate-500">Aparece abaixo do vídeo no app.</p>
                <input
                  type="text"
                  placeholder="Ex: Assista ao vídeo com atenção"
                  value={videoInstrText}
                  onChange={(e) => setVideoInstrText(e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
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
                <div key={b.id} className="border border-slate-300 bg-slate-50">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      {b.kind === "video" && <Video className="h-4 w-4 text-slate-500" />}
                      {b.kind === "match-letter" && <BookOpen className="h-4 w-4 text-slate-500" />}
                      {b.kind === "mark-images" && <LayoutGrid className="h-4 w-4 text-slate-500" />}
                      Bloco {bi + 1} —{" "}
                      {b.kind === "video"
                        ? "Vídeo"
                        : b.kind === "match-letter"
                          ? "Encontrar a Letra"
                          : "Escolher Imagens"}
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

                  <div className="p-4">
                    {b.kind === "video" && (
                      <div className="space-y-3">
                        <VideoFileBtn
                          label={(b as VideoBlockData).videoFile?.name ?? "Escolher vídeo"}
                          fileName={(b as VideoBlockData).videoFile?.name}
                          existingUrl={(b as VideoBlockData).existingVideoUrl}
                          onChange={(f) => patchCompositeBlock(b.id, { videoFile: f })}
                        />
                        <input
                          type="text"
                          placeholder="Instrução em texto (opcional)"
                          value={(b as VideoBlockData).instrText}
                          onChange={(e) => patchCompositeBlock(b.id, { instrText: e.target.value })}
                          className="w-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
                        />
                        <FileBtn
                          accept="audio/*"
                          label={(b as VideoBlockData).instrAudioFile?.name ?? "Áudio de instrução (opcional)"}
                          fileName={(b as VideoBlockData).instrAudioFile?.name}
                          existingUrl={(b as VideoBlockData).existingInstrAudioUrl}
                          onChange={(f) => patchCompositeBlock(b.id, { instrAudioFile: f })}
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
                      />
                    )}
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => addCompositeBlock("video")}
                  className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <Video className="h-3.5 w-3.5 text-slate-500" />
                  Vídeo
                </button>
                <button
                  type="button"
                  onClick={() => addCompositeBlock("match-letter")}
                  className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                  Encontrar a Letra
                </button>
                <button
                  type="button"
                  onClick={() => addCompositeBlock("mark-images")}
                  className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
                  Escolher Imagens
                </button>
              </div>
            </section>
          )}

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
        <div className="hidden lg:block lg:w-64 lg:shrink-0">
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
    </div>
  );
}
