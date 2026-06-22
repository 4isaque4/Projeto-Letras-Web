import { useEffect, useRef, useState } from "react";
import { apiPost } from "../../../core/api/client";
import {
  AlignLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Image as ImageIcon,
  MessageSquare,
  MoveDown,
  MoveUp,
  Plus,
  Target,
  Trash2,
  User,
  Users,
  Video,
  Volume2,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockAudience = "educator" | "learner" | "both";

export interface TextBlock {
  id: string;
  type: "text";
  content: string;
  audience: BlockAudience;
  narrationAudioUrl?: string;
}

export interface ImageBlock {
  id: string;
  type: "image";
  url: string;
  caption: string;
}

export interface VideoBlock {
  id: string;
  type: "video";
  url: string;
  caption: string;
}

export interface AudioBlock {
  id: string;
  type: "audio";
  url: string;
  caption: string;
}

export interface MatchLetterRow {
  id: string;
  label: string;
  imageUrl: string;
  wordAudioUrl: string;
  spellingAudioUrl: string;
  optionsText: string;
  correctOption: string;
  notes: string;
}

export interface MarkImageRow {
  id: string;
  label: string;
  imageUrl: string;
  audioUrl: string;
  isCorrectTarget: boolean;
  notes: string;
}

export interface ExerciseMatchLetterBlock {
  id: string;
  type: "exercise-match-letter";
  letter: string;
  instruction: string;
  instructionAudioUrl: string;
  maxAttempts: number;
  progressiveUnlock: boolean;
  rows: MatchLetterRow[];
  reinforcementText: string;
  reinforcementAudioUrl: string;
}

export interface ExerciseMarkImagesBlock {
  id: string;
  type: "exercise-mark-images";
  letter: string;
  instruction: string;
  instructionAudioUrl: string;
  expectedSelections: number;
  maxAttempts: number;
  rows: MarkImageRow[];
}

export type LessonBlock =
  | TextBlock
  | ImageBlock
  | VideoBlock
  | AudioBlock
  | ExerciseMatchLetterBlock
  | ExerciseMarkImagesBlock;

// ─── Serialization ────────────────────────────────────────────────────────────

export function serializeBlocks(blocks: LessonBlock[]): string {
  if (blocks.length === 0) return "";

  const serialized = blocks.map((block) => {
    if (block.type === "exercise-match-letter") {
      return {
        ...block,
        rows: block.rows.map((row) => ({
          ...row,
          options: row.optionsText
            .split(/[,\s]+/)
            .map((t) => t.trim().toUpperCase())
            .filter(Boolean),
          correctOptions: [row.correctOption.trim().toUpperCase().slice(0, 1)].filter(Boolean),
          audioUrl: row.wordAudioUrl || null,
          wordAudioUrl: row.wordAudioUrl || null,
          spellingAudioUrl: row.spellingAudioUrl || null,
          imageUrl: row.imageUrl || null,
        })),
      };
    }
    if (block.type === "exercise-mark-images") {
      return {
        ...block,
        rows: block.rows.map((row) => ({
          ...row,
          imageUrl: row.imageUrl || null,
          audioUrl: row.audioUrl || null,
        })),
      };
    }
    return block;
  });

  return JSON.stringify({ schema: "letras-stage2-v2", blocks: serialized }, null, 2);
}

export function deserializeToBlocks(raw: string): LessonBlock[] {
  if (!raw?.trim()) return [];

  if (!raw.startsWith("{")) {
    const parts = raw.split(/\n\s*\n/).filter((p) => p.trim());
    return parts.map((content, i) => ({
      id: genId("text"),
      type: "text" as const,
      content: content.trim(),
      audience: i === 0 ? ("educator" as const) : ("learner" as const),
    }));
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (parsed.schema === "letras-stage2-v2" && Array.isArray(parsed.blocks)) {
      return (parsed.blocks as LessonBlock[]).map((b) => ({
        ...b,
        id: b.id || genId(b.type),
      }));
    }

    return convertV1ToBlocks(parsed);
  } catch {
    return [{ id: genId("text"), type: "text", content: raw, audience: "educator" }];
  }
}

function convertV1ToBlocks(parsed: Record<string, unknown>): LessonBlock[] {
  const blocks: LessonBlock[] = [];

  const eg = typeof parsed.educatorGuidance === "string" ? parsed.educatorGuidance.trim() : "";
  const ls = typeof parsed.learnerSpeech === "string" ? parsed.learnerSpeech.trim() : "";

  if (eg) blocks.push({ id: genId("text"), type: "text", content: eg, audience: "educator" });
  if (ls) blocks.push({ id: genId("text"), type: "text", content: ls, audience: "learner" });

  const ex = parsed.exercise as Record<string, unknown> | undefined;
  if (!ex) return blocks;

  const tmpl = String(ex.template ?? parsed.screenTemplate ?? "");
  const items = Array.isArray(ex.items) ? (ex.items as Record<string, unknown>[]) : [];

  if (tmpl === "exercise-match-letter") {
    blocks.push({
      id: genId("exercise-match-letter"),
      type: "exercise-match-letter",
      letter: String(ex.targetLetter ?? "A"),
      instruction: String(ex.instructionText ?? ""),
      instructionAudioUrl: String(ex.instructionAudioUrl ?? ""),
      maxAttempts: Number(ex.maxAttemptsBeforeLock ?? 3),
      progressiveUnlock: Boolean(ex.progressiveUnlock),
      rows: items.map((item) => ({
        id: String(item.id ?? genId("row")),
        label: String(item.label ?? ""),
        imageUrl: String(item.imageUrl ?? ""),
        wordAudioUrl: String(item.wordAudioUrl ?? item.audioUrl ?? ""),
        spellingAudioUrl: String(item.spellingAudioUrl ?? ""),
        optionsText: Array.isArray(item.options) ? (item.options as string[]).join(", ") : "",
        correctOption: Array.isArray(item.correctOptions)
          ? String((item.correctOptions as string[])[0] ?? "A")
          : "A",
        notes: String(item.notes ?? ""),
      })),
      reinforcementText: "",
      reinforcementAudioUrl: "",
    });
  } else if (tmpl === "exercise-mark-images") {
    blocks.push({
      id: genId("exercise-mark-images"),
      type: "exercise-mark-images",
      letter: String(ex.targetLetter ?? "A"),
      instruction: String(ex.instructionText ?? ""),
      instructionAudioUrl: String(ex.instructionAudioUrl ?? ""),
      expectedSelections: Number(ex.expectedSelections ?? 2),
      maxAttempts: Number(ex.maxAttemptsBeforeLock ?? 3),
      rows: items.map((item) => ({
        id: String(item.id ?? genId("row")),
        label: String(item.label ?? ""),
        imageUrl: String(item.imageUrl ?? ""),
        audioUrl: String(item.audioUrl ?? ""),
        isCorrectTarget: Boolean(item.isCorrectTarget),
        notes: String(item.notes ?? ""),
      })),
    });
  }

  return blocks;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeDefaultBlock(type: LessonBlock["type"]): LessonBlock {
  switch (type) {
    case "text":
      return { id: genId("text"), type: "text", content: "", audience: "educator" };
    case "image":
      return { id: genId("image"), type: "image", url: "", caption: "" };
    case "video":
      return { id: genId("video"), type: "video", url: "", caption: "" };
    case "audio":
      return { id: genId("audio"), type: "audio", url: "", caption: "" };
    case "exercise-match-letter":
      return {
        id: genId("exercise-match-letter"),
        type: "exercise-match-letter",
        letter: "A",
        instruction: "",
        instructionAudioUrl: "",
        maxAttempts: 3,
        progressiveUnlock: true,
        rows: [
          { id: genId("row"), label: "Anzol", imageUrl: "", wordAudioUrl: "", spellingAudioUrl: "", optionsText: "A, N, Z, O, L", correctOption: "A", notes: "" },
          { id: genId("row"), label: "Sal", imageUrl: "", wordAudioUrl: "", spellingAudioUrl: "", optionsText: "S, A, L", correctOption: "A", notes: "" },
          { id: genId("row"), label: "Rato", imageUrl: "", wordAudioUrl: "", spellingAudioUrl: "", optionsText: "R, A, T, O", correctOption: "A", notes: "" },
        ],
        reinforcementText: "Vamos tentar novamente.",
        reinforcementAudioUrl: "",
      };
    case "exercise-mark-images":
      return {
        id: genId("exercise-mark-images"),
        type: "exercise-mark-images",
        letter: "A",
        instruction: "Marque as imagens cujo nome começa com a letra A",
        instructionAudioUrl: "",
        expectedSelections: 2,
        maxAttempts: 3,
        rows: [
          { id: genId("row"), label: "Abelha", imageUrl: "", audioUrl: "", isCorrectTarget: true, notes: "" },
          { id: genId("row"), label: "Girafa", imageUrl: "", audioUrl: "", isCorrectTarget: false, notes: "" },
          { id: genId("row"), label: "Abacate", imageUrl: "", audioUrl: "", isCorrectTarget: true, notes: "" },
          { id: genId("row"), label: "Bola", imageUrl: "", audioUrl: "", isCorrectTarget: false, notes: "" },
        ],
      };
  }
}

const BLOCK_META: Record<LessonBlock["type"], { icon: React.ReactNode; label: string; color: string }> = {
  text: { icon: <AlignLeft className="h-3.5 w-3.5" />, label: "Texto", color: "border-slate-300 bg-slate-50" },
  image: { icon: <ImageIcon className="h-3.5 w-3.5" />, label: "Imagem", color: "border-blue-200 bg-blue-50" },
  video: { icon: <Video className="h-3.5 w-3.5" />, label: "Vídeo", color: "border-purple-200 bg-purple-50" },
  audio: { icon: <Volume2 className="h-3.5 w-3.5" />, label: "Áudio", color: "border-teal-200 bg-teal-50" },
  "exercise-match-letter": { icon: <BookOpen className="h-3.5 w-3.5" />, label: "Exercício: Marcar Letra", color: "border-amber-200 bg-amber-50" },
  "exercise-mark-images": { icon: <Target className="h-3.5 w-3.5" />, label: "Exercício: Marcar Imagens", color: "border-emerald-200 bg-emerald-50" },
};

const ADD_BLOCK_OPTIONS: { type: LessonBlock["type"]; icon: React.ReactNode; label: string }[] = [
  { type: "text", icon: <AlignLeft className="h-4 w-4" />, label: "Texto / Orientação" },
  { type: "image", icon: <ImageIcon className="h-4 w-4" />, label: "Imagem" },
  { type: "video", icon: <Video className="h-4 w-4" />, label: "Vídeo" },
  { type: "audio", icon: <Volume2 className="h-4 w-4" />, label: "Áudio" },
  { type: "exercise-mark-images", icon: <Target className="h-4 w-4" />, label: "Exercício: Marcar Imagens" },
  { type: "exercise-match-letter", icon: <BookOpen className="h-4 w-4" />, label: "Exercício: Marcar Letra" },
];

// ─── Add-block dropdown ───────────────────────────────────────────────────────

function AddBlockMenu({ onSelect }: { onSelect: (type: LessonBlock["type"]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500 hover:bg-slate-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar bloco
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-60 border border-slate-200 bg-white shadow-md">
          {ADD_BLOCK_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                onSelect(opt.type);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="text-slate-400">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Insert line between blocks ───────────────────────────────────────────────

function InsertLine({ onInsert }: { onInsert: (type: LessonBlock["type"]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="group relative my-1 flex items-center">
      <div className="h-px flex-1 bg-slate-200 group-hover:bg-slate-300" />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mx-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:border-slate-500 hover:text-slate-700"
        title="Inserir bloco aqui"
      >
        <Plus className="h-3 w-3" />
      </button>
      <div className="h-px flex-1 bg-slate-200 group-hover:bg-slate-300" />

      {open && (
        <div className="absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 border border-slate-200 bg-white shadow-md">
          {ADD_BLOCK_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                onInsert(opt.type);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="text-slate-400">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Block wrapper (header + controls) ───────────────────────────────────────

function BlockWrapper({
  block,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
  children,
}: {
  block: LessonBlock;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const meta = BLOCK_META[block.type];

  return (
    <div className={`rounded border ${meta.color} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-inherit px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <GripVertical className="h-3.5 w-3.5 text-slate-300" />
          {meta.icon}
          <span>{meta.label}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="rounded p-1 text-slate-400 hover:bg-white/60 hover:text-slate-700 disabled:opacity-30"
            title="Mover para cima"
          >
            <MoveUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="rounded p-1 text-slate-400 hover:bg-white/60 hover:text-slate-700 disabled:opacity-30"
            title="Mover para baixo"
          >
            <MoveDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Remover bloco"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {/* Body */}
      <div className="p-3">{children}</div>
    </div>
  );
}

// ─── Text block editor ────────────────────────────────────────────────────────

function TextBlockEditor({
  block,
  onChange,
}: {
  block: TextBlock;
  onChange: (updates: Partial<TextBlock>) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const showTts = block.audience === "learner" || block.audience === "both";

  const AUDIENCE_OPTIONS: { value: BlockAudience; label: string; icon: React.ReactNode }[] = [
    { value: "educator", label: "Para o alfabetizador", icon: <User className="h-3.5 w-3.5" /> },
    { value: "learner", label: "Para o alfabetizando", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { value: "both", label: "Para ambos", icon: <Users className="h-3.5 w-3.5" /> },
  ];

  const handleGenerateAudio = async () => {
    const text = block.content.trim();
    if (!text || isGenerating) return;
    setIsGenerating(true);
    setTtsError(null);
    try {
      const data = await apiPost("/painel/tts/generate", { text }) as { url?: string };
      if (!data.url) throw new Error("Falha ao gerar áudio");
      onChange({ narrationAudioUrl: data.url });
    } catch (err) {
      setTtsError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {AUDIENCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ audience: opt.value })}
            className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors ${
              block.audience === opt.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
      <textarea
        value={block.content}
        onChange={(e) => onChange({ content: e.target.value })}
        rows={4}
        placeholder={
          block.audience === "educator"
            ? "Orientações para o alfabetizador... (ex.: Mostre a letra A e peça ao aluno que identifique objetos na sala cujo nome começa com ela.)"
            : block.audience === "learner"
              ? "Fala para o alfabetizando ouvir no app... (ex.: Olá! Vamos aprender a letra A hoje.)"
              : "Texto para ambos..."
        }
        className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-700 focus:outline-none"
      />

      {showTts && (
        <div className="space-y-1.5 border-t border-slate-100 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleGenerateAudio()}
              disabled={!block.content.trim() || isGenerating}
              className="flex items-center gap-1.5 border border-emerald-600 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Volume2 className="h-3.5 w-3.5" />
              {isGenerating ? "Gerando áudio..." : "Converter texto em áudio"}
            </button>
            {block.narrationAudioUrl && (
              <button
                type="button"
                onClick={() => onChange({ narrationAudioUrl: "" })}
                title="Remover áudio gerado"
                className="text-slate-400 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {block.narrationAudioUrl && (
            <audio src={block.narrationAudioUrl} controls className="h-8 w-full" />
          )}
          {ttsError && (
            <p className="text-xs text-red-600">{ttsError}</p>
          )}
          <p className="text-xs text-slate-400">
            O áudio gerado substitui o texto na tela do alfabetizando — ele ouve em vez de ler.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Media block editor ───────────────────────────────────────────────────────

function MediaBlockEditor({
  block,
  onChange,
}: {
  block: ImageBlock | VideoBlock | AudioBlock;
  onChange: (updates: Partial<ImageBlock | VideoBlock | AudioBlock>) => void;
}) {
  const placeholder =
    block.type === "image"
      ? "URL da imagem (https://...)"
      : block.type === "video"
        ? "URL do vídeo (https://...)"
        : "URL do áudio (https://...)";

  return (
    <div className="space-y-2">
      <input
        value={block.url}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder={placeholder}
        className="w-full border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-700 focus:outline-none"
      />

      {/* Preview */}
      {block.url.trim() && (
        <div className="rounded border border-slate-200 bg-white p-2">
          {block.type === "image" && (
            <img
              src={block.url}
              alt={block.caption || "preview"}
              className="max-h-48 max-w-full rounded object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          {block.type === "video" && (
            <video src={block.url} controls className="max-h-48 max-w-full rounded" />
          )}
          {block.type === "audio" && (
            <audio src={block.url} controls className="w-full" />
          )}
        </div>
      )}

      <input
        value={block.caption}
        onChange={(e) => onChange({ caption: e.target.value })}
        placeholder="Legenda (opcional)"
        className="w-full border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-700 focus:outline-none"
      />
    </div>
  );
}

// ─── Exercise: Mark Images editor ─────────────────────────────────────────────

function ExerciseMarkImagesEditor({
  block,
  onChange,
}: {
  block: ExerciseMarkImagesBlock;
  onChange: (updates: Partial<ExerciseMarkImagesBlock>) => void;
}) {
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);

  const updateRow = (id: string, updates: Partial<MarkImageRow>) => {
    onChange({ rows: block.rows.map((r) => (r.id === id ? { ...r, ...updates } : r)) });
  };

  const addRow = () => {
    onChange({
      rows: [
        ...block.rows,
        { id: genId("row"), label: "", imageUrl: "", audioUrl: "", isCorrectTarget: false, notes: "" },
      ],
    });
  };

  const removeRow = (id: string) => {
    onChange({ rows: block.rows.filter((r) => r.id !== id) });
  };

  const applyBulk = () => {
    const lines = bulkInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows: MarkImageRow[] = lines.map((line) => {
      const [labelRaw = "", correctRaw = "", imageRaw = "", audioRaw = ""] = line.split("|").map((t) => t.trim());
      const isCorrect = ["sim", "s", "1", "true", "x", "yes"].includes(correctRaw.toLowerCase());
      return {
        id: genId("row"),
        label: labelRaw || "Item",
        imageUrl: imageRaw,
        audioUrl: audioRaw,
        isCorrectTarget: isCorrect,
        notes: "",
      };
    });
    if (rows.length > 0) {
      onChange({ rows });
      setBulkInput("");
      setShowBulk(false);
    }
  };

  const correctCount = block.rows.filter((r) => r.isCorrectTarget).length;

  return (
    <div className="space-y-3">
      {/* Settings row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">Letra-alvo</label>
          <input
            value={block.letter}
            maxLength={1}
            onChange={(e) => onChange({ letter: e.target.value.toUpperCase() })}
            className="mt-0.5 w-full border border-slate-300 bg-white px-2 py-1.5 text-center text-sm font-bold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">Seleções corretas</label>
          <input
            type="number"
            min={1}
            value={block.expectedSelections}
            onChange={(e) => onChange({ expectedSelections: Math.max(1, Number(e.target.value)) })}
            className="mt-0.5 w-full border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">Max tentativas</label>
          <input
            type="number"
            min={1}
            value={block.maxAttempts}
            onChange={(e) => onChange({ maxAttempts: Math.max(1, Number(e.target.value)) })}
            className="mt-0.5 w-full border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <div className="flex flex-col justify-end">
          <span className="text-[10px] text-slate-400">
            {correctCount} correto{correctCount !== 1 ? "s" : ""} / {block.rows.length} itens
          </span>
        </div>
      </div>

      {/* Instruction */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={block.instruction}
          onChange={(e) => onChange({ instruction: e.target.value })}
          placeholder="Instrução para o aluno (texto)"
          className="border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none"
        />
        <input
          value={block.instructionAudioUrl}
          onChange={(e) => onChange({ instructionAudioUrl: e.target.value })}
          placeholder="URL do áudio da instrução (opcional)"
          className="border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none"
        />
      </div>

      {/* Bulk import */}
      <div>
        <button
          type="button"
          onClick={() => setShowBulk((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
        >
          {showBulk ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Importar itens em lote
        </button>
        {showBulk && (
          <div className="mt-2 space-y-2 rounded border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-500">
              Formato por linha: <code className="rounded bg-slate-100 px-1">nome | sim/não | imageUrl | audioUrl</code>
            </p>
            <textarea
              rows={5}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={"Abelha | sim | | \nGirafa | não | | \nAbacate | sim | | "}
              className="w-full border border-slate-300 px-3 py-2 text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={applyBulk}
              className="border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Aplicar importação
            </button>
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {block.rows.map((row, idx) => (
          <div key={row.id} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded border border-slate-200 bg-white p-2.5">
            {/* Correct toggle */}
            <button
              type="button"
              onClick={() => updateRow(row.id, { isCorrectTarget: !row.isCorrectTarget })}
              title={row.isCorrectTarget ? "Correto — clique para marcar como errado" : "Errado — clique para marcar como correto"}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                row.isCorrectTarget
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300 bg-white text-slate-400"
              }`}
            >
              {row.isCorrectTarget ? "✓" : idx + 1}
            </button>

            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <input
                value={row.label}
                onChange={(e) => updateRow(row.id, { label: e.target.value })}
                placeholder={`Item ${idx + 1} (ex.: Abelha)`}
                className="border border-slate-200 px-2 py-1 text-xs focus:outline-none"
              />
              <input
                value={row.imageUrl}
                onChange={(e) => updateRow(row.id, { imageUrl: e.target.value })}
                placeholder="URL da imagem (opcional)"
                className="border border-slate-200 px-2 py-1 text-xs focus:outline-none"
              />
              <input
                value={row.audioUrl}
                onChange={(e) => updateRow(row.id, { audioUrl: e.target.value })}
                placeholder="URL do áudio (opcional)"
                className="border border-slate-200 px-2 py-1 text-xs focus:outline-none sm:col-span-2"
              />
            </div>

            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={block.rows.length <= 1}
              className="mt-0.5 rounded p-1 text-slate-300 hover:text-red-500 disabled:opacity-30"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="flex w-full items-center justify-center gap-1.5 border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-slate-500 hover:text-slate-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar item
        </button>
      </div>
    </div>
  );
}

// ─── Exercise: Match Letter editor ────────────────────────────────────────────

function ExerciseMatchLetterEditor({
  block,
  onChange,
}: {
  block: ExerciseMatchLetterBlock;
  onChange: (updates: Partial<ExerciseMatchLetterBlock>) => void;
}) {
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [showReinforcement, setShowReinforcement] = useState(false);

  const updateRow = (id: string, updates: Partial<MatchLetterRow>) => {
    onChange({ rows: block.rows.map((r) => (r.id === id ? { ...r, ...updates } : r)) });
  };

  const addRow = () => {
    onChange({
      rows: [
        ...block.rows,
        { id: genId("row"), label: "", imageUrl: "", wordAudioUrl: "", spellingAudioUrl: "", optionsText: "", correctOption: block.letter || "A", notes: "" },
      ],
    });
  };

  const removeRow = (id: string) => {
    onChange({ rows: block.rows.filter((r) => r.id !== id) });
  };

  const applyBulk = () => {
    const fallback = block.letter.trim().toUpperCase().slice(0, 1) || "A";
    const lines = bulkInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows: MatchLetterRow[] = lines.map((line) => {
      const [labelRaw = "", optionsRaw = "", correctRaw = "", imageRaw = "", wordAudioRaw = "", spellingRaw = ""] =
        line.split("|").map((t) => t.trim());
      return {
        id: genId("row"),
        label: labelRaw || "Item",
        imageUrl: imageRaw,
        wordAudioUrl: wordAudioRaw,
        spellingAudioUrl: spellingRaw,
        optionsText: optionsRaw || fallback,
        correctOption: correctRaw.trim().toUpperCase().slice(0, 1) || fallback,
        notes: "",
      };
    });
    if (rows.length > 0) {
      onChange({ rows });
      setBulkInput("");
      setShowBulk(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Settings row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">Letra-alvo</label>
          <input
            value={block.letter}
            maxLength={1}
            onChange={(e) => onChange({ letter: e.target.value.toUpperCase() })}
            className="mt-0.5 w-full border border-slate-300 bg-white px-2 py-1.5 text-center text-sm font-bold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">Max tentativas</label>
          <input
            type="number"
            min={1}
            value={block.maxAttempts}
            onChange={(e) => onChange({ maxAttempts: Math.max(1, Number(e.target.value)) })}
            className="mt-0.5 w-full border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <label className="sm:col-span-2 flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={block.progressiveUnlock}
            onChange={(e) => onChange({ progressiveUnlock: e.target.checked })}
          />
          Liberar itens em ordem (sequencial)
        </label>
      </div>

      {/* Instruction */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={block.instruction}
          onChange={(e) => onChange({ instruction: e.target.value })}
          placeholder="Instrução para o aluno (texto)"
          className="border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none"
        />
        <input
          value={block.instructionAudioUrl}
          onChange={(e) => onChange({ instructionAudioUrl: e.target.value })}
          placeholder="URL do áudio da instrução (opcional)"
          className="border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none"
        />
      </div>

      {/* Reinforcement */}
      <div>
        <button
          type="button"
          onClick={() => setShowReinforcement((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
        >
          {showReinforcement ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Configurar reforço em caso de erro
        </button>
        {showReinforcement && (
          <div className="mt-2 grid grid-cols-1 gap-2 rounded border border-slate-200 bg-white p-3 sm:grid-cols-2">
            <input
              value={block.reinforcementText}
              onChange={(e) => onChange({ reinforcementText: e.target.value })}
              placeholder="Texto da tela de reforço"
              className="border border-slate-300 px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={block.reinforcementAudioUrl}
              onChange={(e) => onChange({ reinforcementAudioUrl: e.target.value })}
              placeholder="URL do áudio de reforço (opcional)"
              className="border border-slate-300 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Bulk import */}
      <div>
        <button
          type="button"
          onClick={() => setShowBulk((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
        >
          {showBulk ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Importar itens em lote
        </button>
        {showBulk && (
          <div className="mt-2 space-y-2 rounded border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-500">
              Formato: <code className="rounded bg-slate-100 px-1">palavra | opções | correta | imageUrl | audioPalavra | audioSoletracao</code>
            </p>
            <textarea
              rows={4}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={"Anzol | A,N,Z,O,L | A | | | \nSal | S,A,L | A | | | "}
              className="w-full border border-slate-300 px-3 py-2 text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={applyBulk}
              className="border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Aplicar importação
            </button>
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {block.rows.map((row, idx) => (
          <div key={row.id} className="space-y-1.5 rounded border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500">
                {idx + 1}
              </span>
              <input
                value={row.label}
                onChange={(e) => updateRow(row.id, { label: e.target.value })}
                placeholder="Palavra (ex.: Anzol)"
                className="min-w-0 flex-1 border border-slate-200 px-2 py-1 text-xs focus:outline-none"
              />
              <input
                value={row.optionsText}
                onChange={(e) => updateRow(row.id, { optionsText: e.target.value })}
                placeholder="Opções: A, N, Z, O, L"
                className="min-w-0 flex-1 border border-slate-200 px-2 py-1 text-xs focus:outline-none"
              />
              <input
                value={row.correctOption}
                maxLength={1}
                onChange={(e) => updateRow(row.id, { correctOption: e.target.value.toUpperCase() })}
                placeholder="✓"
                className="w-10 border border-emerald-300 bg-emerald-50 px-2 py-1 text-center text-xs font-bold focus:outline-none"
                title="Letra correta"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={block.rows.length <= 1}
                className="rounded p-1 text-slate-300 hover:text-red-500 disabled:opacity-30"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5 pl-7 sm:grid-cols-3">
              <input
                value={row.imageUrl}
                onChange={(e) => updateRow(row.id, { imageUrl: e.target.value })}
                placeholder="URL da imagem (opcional)"
                className="border border-slate-200 px-2 py-1 text-xs focus:outline-none"
              />
              <input
                value={row.wordAudioUrl}
                onChange={(e) => updateRow(row.id, { wordAudioUrl: e.target.value })}
                placeholder="Áudio da palavra (opcional)"
                className="border border-slate-200 px-2 py-1 text-xs focus:outline-none"
              />
              <input
                value={row.spellingAudioUrl}
                onChange={(e) => updateRow(row.id, { spellingAudioUrl: e.target.value })}
                placeholder="Áudio soletrando (opcional)"
                className="border border-slate-200 px-2 py-1 text-xs focus:outline-none"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="flex w-full items-center justify-center gap-1.5 border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-slate-500 hover:text-slate-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar item
        </button>
      </div>
    </div>
  );
}

// ─── Block body dispatcher ────────────────────────────────────────────────────

function BlockBody({
  block,
  onChange,
}: {
  block: LessonBlock;
  onChange: (updates: Partial<LessonBlock>) => void;
}) {
  if (block.type === "text") {
    return <TextBlockEditor block={block} onChange={(u) => onChange(u)} />;
  }
  if (block.type === "image" || block.type === "video" || block.type === "audio") {
    return <MediaBlockEditor block={block} onChange={(u) => onChange(u)} />;
  }
  if (block.type === "exercise-mark-images") {
    return <ExerciseMarkImagesEditor block={block} onChange={(u) => onChange(u)} />;
  }
  if (block.type === "exercise-match-letter") {
    return <ExerciseMatchLetterEditor block={block} onChange={(u) => onChange(u)} />;
  }
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LessonBlockEditorProps {
  blocks: LessonBlock[];
  onChange: (blocks: LessonBlock[]) => void;
}

export default function LessonBlockEditor({ blocks, onChange }: LessonBlockEditorProps) {
  const insert = (atIndex: number, type: LessonBlock["type"]) => {
    const next = [...blocks];
    next.splice(atIndex, 0, makeDefaultBlock(type));
    onChange(next);
  };

  const update = (id: string, updates: Partial<LessonBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...updates } as LessonBlock) : b)));
  };

  const remove = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const moveUp = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx <= 0) return;
    const next = [...blocks];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0 || idx >= blocks.length - 1) return;
    const next = [...blocks];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-0">
      {blocks.length === 0 && (
        <div className="mb-3 rounded border-2 border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
          Nenhum bloco ainda. Use o botão abaixo para adicionar conteúdo à aula.
        </div>
      )}

      {blocks.map((block, idx) => (
        <div key={block.id}>
          {idx > 0 && <InsertLine onInsert={(type) => insert(idx, type)} />}
          <BlockWrapper
            block={block}
            isFirst={idx === 0}
            isLast={idx === blocks.length - 1}
            onMoveUp={() => moveUp(block.id)}
            onMoveDown={() => moveDown(block.id)}
            onDelete={() => remove(block.id)}
          >
            <BlockBody block={block} onChange={(u) => update(block.id, u)} />
          </BlockWrapper>
        </div>
      ))}

      <div className="mt-3">
        <AddBlockMenu onSelect={(type) => insert(blocks.length, type)} />
      </div>
    </div>
  );
}
