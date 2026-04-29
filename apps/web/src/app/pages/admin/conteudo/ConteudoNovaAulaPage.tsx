import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  Plus,
  Volume2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import StateDisplay from "../../../components/StateDisplay";
import { apiGet } from "../../../core/api/client";
import { useAuth } from "../../../core/auth/AuthProvider";
import { env } from "../../../core/config/env";
import { ActivityType, AssetKind, AssetStatus, ModuleItem } from "./cmsTypes";
import { formatBytes, inferAssetKindFromFile, inferAssetKindFromPath } from "./cmsUtils";
import { useConteudoData } from "./useConteudoData";

const STEPS = [
  "1. Tema e aula",
  "2. Telas base",
  "3. Conteúdo",
  "4. Mídias",
  "5. Publicar",
] as const;

const STEP_HELPERS: Record<number, string> = {
  0: "Escolha em qual tema essa aula vai ficar e dê um nome ao módulo e à aula.",
  1: "Selecione as telas prontas (blueprints) que servem de base visual desta aula.",
  2: "Monte o conteúdo da aula: instrução para o aluno, modelo da tela e itens do exercício.",
  3: "Envie imagens, audios ou videos de apoio. Links manuais sao opcionais: use biblioteca ou upload.",
  4: "Revise tudo e publique. Ao publicar, a aula já aparece no aplicativo dos alfabetizandos.",
};

const DRAFT_STORAGE_KEY = "conteudo-nova-aula-draft-v3";
const STAGE_OPTIONS = [
  { value: "1", label: "Etapa 1" },
  { value: "2", label: "Etapa 2" },
  { value: "3", label: "Etapa 3" },
] as const;
const SUPABASE_PUBLIC_BUCKET = "letras-assets";
const NON_VISUAL_BLUEPRINT_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "ogg",
  "m4a",
  "aac",
  "mp4",
  "webm",
  "mov",
  "avi",
  "mkv",
  "json",
  "txt",
  "md",
  "pdf",
]);

type ScreenTemplate = "default" | "exercise-match-letter" | "exercise-mark-images" | "locked";

const SCREEN_TEMPLATE_LABELS: Record<ScreenTemplate, string> = {
  default: "Padrao (texto e midia)",
  "exercise-match-letter": "Marcar letra correta",
  "exercise-mark-images": "Marcar imagens corretas",
  locked: "Tela bloqueada",
};

interface MatchLetterRow {
  id: string;
  label: string;
  imageUrl: string;
  audioUrl: string;
  wordAudioUrl: string;
  spellingAudioUrl: string;
  optionsText: string;
  correctOption: string;
  notes: string;
}

interface MarkImageRow {
  id: string;
  label: string;
  imageUrl: string;
  audioUrl: string;
  isCorrectTarget: boolean;
  notes: string;
}

interface ExerciseRowPayload {
  id: string;
  label: string;
  imageUrl: string | null;
  audioUrl: string | null;
  audioText?: string | null;
  wordAudioUrl?: string | null;
  spellingAudioUrl?: string | null;
  spellingText?: string | null;
  options?: string[];
  correctOptions?: string[];
  isCorrectTarget?: boolean;
  notes?: string | null;
}

interface LearnerListItem {
  id: string;
  nome: string;
  tutorId?: string | null;
  tutorNome?: string | null;
}

interface LearnersResponse {
  total?: number;
  items?: LearnerListItem[];
}

const INITIAL_MATCH_ROWS: MatchLetterRow[] = [
  {
    id: "match-1",
    label: "Anzol",
    imageUrl: "",
    audioUrl: "",
    wordAudioUrl: "",
    spellingAudioUrl: "",
    optionsText: "A, N, Z, O, L",
    correctOption: "A",
    notes: "",
  },
  {
    id: "match-2",
    label: "Sal",
    imageUrl: "",
    audioUrl: "",
    wordAudioUrl: "",
    spellingAudioUrl: "",
    optionsText: "S, A, L",
    correctOption: "A",
    notes: "",
  },
  {
    id: "match-3",
    label: "Rato",
    imageUrl: "",
    audioUrl: "",
    wordAudioUrl: "",
    spellingAudioUrl: "",
    optionsText: "R, A, T, O",
    correctOption: "A",
    notes: "",
  },
];

const INITIAL_MARK_ROWS: MarkImageRow[] = [
  {
    id: "mark-1",
    label: "Abelha",
    imageUrl: "",
    audioUrl: "",
    isCorrectTarget: true,
    notes: "",
  },
  {
    id: "mark-2",
    label: "Girafa",
    imageUrl: "",
    audioUrl: "",
    isCorrectTarget: false,
    notes: "",
  },
  {
    id: "mark-3",
    label: "Abacate",
    imageUrl: "",
    audioUrl: "",
    isCorrectTarget: true,
    notes: "",
  },
];

function buildId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSingleLetter(value: string) {
  const token = value.trim().toUpperCase();
  return token.slice(0, 1);
}

function splitTokens(value: string) {
  return value
    .split(/[,\s]+/g)
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
}

function buildSpellingHintFromLabel(value: string) {
  const letters = String(value ?? "")
    .trim()
    .toUpperCase()
    .split("")
    .filter((char) => /[A-Z]/.test(char));
  return letters.length > 0 ? letters.join(", ") : null;
}

function parseBooleanToken(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "sim", "s", "yes", "y", "x"].includes(normalized);
}

function parseMatchRowsImport(raw: string, targetLetter: string): MatchLetterRow[] {
  const fallbackLetter = normalizeSingleLetter(targetLetter) || "A";
  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const [
      labelRaw = "",
      optionsRaw = "",
      correctRaw = "",
      imageRaw = "",
      audioRaw = "",
      spellingAudioRaw = "",
    ] = line.split("|").map((token) => token.trim());
    const options = splitTokens(optionsRaw);
    const firstOption = options[0] || fallbackLetter;
    const normalizedWordAudio = audioRaw;
    const normalizedSpellingAudio = spellingAudioRaw;
    return {
      id: buildId("match"),
      label: labelRaw || "Item",
      imageUrl: imageRaw,
      audioUrl: normalizedWordAudio,
      wordAudioUrl: normalizedWordAudio,
      spellingAudioUrl: normalizedSpellingAudio,
      optionsText: optionsRaw || fallbackLetter,
      correctOption: normalizeSingleLetter(correctRaw || firstOption || fallbackLetter) || fallbackLetter,
      notes: "",
    };
  });
}

function parseMarkRowsImport(raw: string): MarkImageRow[] {
  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const [labelRaw = "", correctRaw = "", imageRaw = "", audioRaw = ""] = line
      .split("|")
      .map((token) => token.trim());
    return {
      id: buildId("mark"),
      label: labelRaw || "Item",
      imageUrl: imageRaw,
      audioUrl: audioRaw,
      isCorrectTarget: parseBooleanToken(correctRaw),
      notes: "",
    };
  });
}

function toPositiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function normalizeThemeSlug(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeCompareText(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

function extractFileExtension(pathValue: string) {
  const sanitized = String(pathValue ?? "").split("#")[0].split("?")[0];
  const extension = sanitized.split(".").pop()?.trim().toLowerCase() ?? "";
  return extension;
}

function isNonVisualBlueprintAsset(pathValue: string) {
  const extension = extractFileExtension(pathValue);
  if (!extension) {
    return false;
  }
  return NON_VISUAL_BLUEPRINT_EXTENSIONS.has(extension);
}

function isLocalObjectUrl(value: string) {
  return String(value ?? "").trim().startsWith("blob:");
}

function sanitizeAssetReference(value: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }
  return isLocalObjectUrl(normalized) ? "" : normalized;
}

function isMobileBlueprintReference(svgPath: string) {
  return /^mobile:\/\//i.test(String(svgPath ?? "").trim());
}

function getBlueprintPreviewFallbackMessage(svgPath: string) {
  if (isMobileBlueprintReference(svgPath)) {
    return "Sem miniatura web para mobile://. Reimporte a tela com arquivo de imagem/SVG para ver preview.";
  }
  return "Sem preview visual";
}

function resolveAssetImageUrl(path: string) {
  const normalized = String(path ?? "").trim();
  if (!normalized) {
    return "";
  }
  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("blob:") || normalized.startsWith("data:")) {
    return normalized;
  }
  const supabaseBaseUrl = String(env.supabaseUrl ?? "").trim().replace(/\/+$/, "");
  const cleaned = normalized.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!supabaseBaseUrl) {
    return cleaned ? `/${encodeURI(cleaned)}` : "";
  }
  if (cleaned.startsWith("storage/v1/object/public/")) {
    return `${supabaseBaseUrl}/${encodeURI(cleaned)}`;
  }
  return `${supabaseBaseUrl}/storage/v1/object/public/${SUPABASE_PUBLIC_BUCKET}/${encodeURI(cleaned)}`;
}

function getAssetDisplayName(path: string) {
  const normalized = String(path ?? "").trim();
  if (!normalized) {
    return "";
  }
  try {
    const withoutQuery = normalized.split("?")[0] || normalized;
    const parts = withoutQuery.split("/").filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || normalized);
  } catch {
    return normalized;
  }
}

function resolveBlueprintPreviewUrl(svgPath: string) {
  const normalized = String(svgPath ?? "").trim();
  if (!normalized) {
    return "";
  }

  if (isMobileBlueprintReference(normalized)) {
    return "";
  }

  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("data:")) {
    return normalized;
  }

  const normalizedPath = normalized
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");

  const supabaseBaseUrl = String(env.supabaseUrl ?? "").trim().replace(/\/+$/, "");
  const encodedPath = encodeURI(normalizedPath);

  if (
    supabaseBaseUrl &&
    (normalizedPath.startsWith("storage/v1/object/public/") ||
      normalizedPath.startsWith(`/${SUPABASE_PUBLIC_BUCKET}/`))
  ) {
    const trimmedStoragePath = normalizedPath.startsWith("/") ? normalizedPath.slice(1) : normalizedPath;
    return `${supabaseBaseUrl}/${encodeURI(trimmedStoragePath)}`;
  }

  if (supabaseBaseUrl && normalizedPath.startsWith(`${SUPABASE_PUBLIC_BUCKET}/`)) {
    return `${supabaseBaseUrl}/storage/v1/object/public/${encodedPath}`;
  }

  if (supabaseBaseUrl && /^(acervo|conteudo|blueprints)\//i.test(normalizedPath)) {
    return `${supabaseBaseUrl}/storage/v1/object/public/${SUPABASE_PUBLIC_BUCKET}/${encodedPath}`;
  }

  return normalizedPath ? `/${encodeURI(normalizedPath)}` : "";
}

function normalizeMatchRows(rows: MatchLetterRow[], targetLetter: string): ExerciseRowPayload[] {
  const normalizedTarget = normalizeSingleLetter(targetLetter);
  return rows
    .map((row, index) => {
      const options = splitTokens(row.optionsText);
      const normalizedCorrect = normalizeSingleLetter(row.correctOption || normalizedTarget || "");
      const fallbackLabel = `Item ${index + 1}`;
      const fallbackOptions =
        options.length > 0
          ? options
          : normalizedTarget
            ? [normalizedTarget]
            : normalizedCorrect
              ? [normalizedCorrect]
              : ["A"];
      const normalizedWordAudioUrl =
        sanitizeAssetReference(row.wordAudioUrl) || sanitizeAssetReference(row.audioUrl) || null;
      const normalizedSpellingAudioUrl = sanitizeAssetReference(row.spellingAudioUrl) || null;
      return {
        id: row.id || buildId("match"),
        label: row.label.trim() || fallbackLabel,
        imageUrl: sanitizeAssetReference(row.imageUrl) || null,
        audioUrl: normalizedWordAudioUrl,
        audioText: normalizedWordAudioUrl ? null : row.label.trim() || fallbackLabel,
        wordAudioUrl: normalizedWordAudioUrl,
        spellingAudioUrl: normalizedSpellingAudioUrl,
        spellingText: normalizedSpellingAudioUrl ? null : buildSpellingHintFromLabel(row.label),
        options: fallbackOptions,
        correctOptions: normalizedCorrect ? [normalizedCorrect] : [fallbackOptions[0]],
        notes: row.notes?.trim() || null,
      };
    })
    .filter((row) => Boolean(row.label));
}

function normalizeMarkRows(rows: MarkImageRow[]): ExerciseRowPayload[] {
  return rows
    .map((row, index) => ({
      id: row.id || buildId("mark"),
      label: row.label.trim() || `Item ${index + 1}`,
      imageUrl: sanitizeAssetReference(row.imageUrl) || null,
      audioUrl: sanitizeAssetReference(row.audioUrl) || null,
      audioText: sanitizeAssetReference(row.audioUrl) ? null : row.label.trim() || `Item ${index + 1}`,
      isCorrectTarget: row.isCorrectTarget,
      notes: row.notes?.trim() || null,
    }))
    .filter((row) => Boolean(row.label));
}

interface BuildInstructionsInput {
  screenTemplate: ScreenTemplate;
  orientationTutor: string;
  orientationStudent: string;
  lockReason: string;
  lockMessage: string;
  lockAudioUrl: string;
  exerciseInstructionText: string;
  exerciseInstructionAudioUrl: string;
  reinforcementText: string;
  reinforcementAudioUrl: string;
  reinforcementAutoReturnMs: number;
  reinforcementPreserveProgress: boolean;
  targetLetter: string;
  maxAttemptsBeforeLock: number;
  expectedSelections: number;
  progressiveUnlock: boolean;
  matchRowsPayload: ExerciseRowPayload[];
  markRowsPayload: ExerciseRowPayload[];
}

type ThemeEntryMode = "existing" | "new";
type AudioFieldTarget = "lock" | "exercise" | "reinforcement";

interface WizardDraftPayload {
  step: number;
  themeEntryMode: ThemeEntryMode;
  themeId: string;
  newThemeName: string;
  moduleTitle: string;
  moduleDescription: string;
  stageNumber: string;
  lessonTitle: string;
  previewName: string;
  selectedLearnerId: string;
  selectedBlueprintIds: string[];
  orientationTutor: string;
  orientationStudent: string;
  activityType: ActivityType;
  screenTemplate: ScreenTemplate;
  lockReason: string;
  lockMessage: string;
  lockAudioUrl: string;
  exerciseInstructionText: string;
  exerciseInstructionAudioUrl: string;
  reinforcementText: string;
  reinforcementAudioUrl: string;
  reinforcementAutoReturnMs: string;
  reinforcementPreserveProgress: boolean;
  targetLetter: string;
  maxAttemptsBeforeLock: string;
  expectedSelections: string;
  progressiveUnlock: boolean;
  matchRows: MatchLetterRow[];
  markRows: MarkImageRow[];
  matchRowsBulkInput: string;
  markRowsBulkInput: string;
  isPublished: boolean;
  assetLink: string;
  assetKind: AssetKind;
  assetStatus: AssetStatus;
  assetSearch: string;
}

function buildInstructionsPayload(input: BuildInstructionsInput) {
  const tutorText = input.orientationTutor.trim();
  const studentText = input.orientationStudent.trim();
  const lockReason = input.lockReason.trim() || "pedido_ajuda";
  const lockMessage = input.lockMessage.trim() || null;
  const lockAudioUrl = input.lockAudioUrl.trim() || null;

  if (input.screenTemplate === "default") {
    const plainText = [tutorText, studentText].filter(Boolean).join("\n\n");
    return plainText || undefined;
  }

  const basePayload: Record<string, unknown> = {
    schema: "letras-stage2-v1",
    screenTemplate: input.screenTemplate,
    educatorGuidance: tutorText || null,
    learnerSpeech: studentText || null,
    lockReason,
    lockMessage,
    lockAudioUrl,
  };

  if (input.screenTemplate === "locked") {
    return JSON.stringify(basePayload, null, 2);
  }

  if (input.screenTemplate === "exercise-match-letter") {
    basePayload.exercise = {
      template: "exercise-match-letter",
      targetLetter: normalizeSingleLetter(input.targetLetter) || null,
      instructionText: input.exerciseInstructionText.trim() || null,
      instructionAudioUrl: input.exerciseInstructionAudioUrl.trim() || null,
      expectedSelections: 1,
      maxAttemptsBeforeLock: input.maxAttemptsBeforeLock,
      progressiveUnlock: input.progressiveUnlock,
      items: input.matchRowsPayload,
      successFeedback: "Resposta correta. Continue para o proximo item.",
      errorFeedback: "Resposta incorreta. Tente novamente.",
      feedbackFlow: {
        onError: {
          mode: "reinforcement-screen",
          instructionText: input.reinforcementText.trim() || null,
          instructionAudioUrl: input.reinforcementAudioUrl.trim() || null,
          autoReturnMs: input.reinforcementAutoReturnMs,
          preserveProgress: input.reinforcementPreserveProgress,
        },
      },
    };
    return JSON.stringify(basePayload, null, 2);
  }

  basePayload.exercise = {
    template: "exercise-mark-images",
    targetLetter: normalizeSingleLetter(input.targetLetter) || null,
    instructionText: input.exerciseInstructionText.trim() || null,
    instructionAudioUrl: input.exerciseInstructionAudioUrl.trim() || null,
    expectedSelections: input.expectedSelections,
    maxAttemptsBeforeLock: input.maxAttemptsBeforeLock,
    progressiveUnlock: false,
    items: input.markRowsPayload,
    successFeedback: "Muito bem! Avance para a tela seguinte.",
    errorFeedback: "Selecao incorreta. Ajuste as caixas e tente novamente.",
  };
  return JSON.stringify(basePayload, null, 2);
}

function buildDraftFromActivity(
  activity: { id: string; module_id: string; title: string; type: ActivityType; instructions?: string | null; is_published?: boolean },
  moduleItem: { id: string; theme_id: string; title: string; stage_number: number; description?: string | null } | null,
): WizardDraftPayload {
  const fallback: WizardDraftPayload = {
    step: 0,
    themeEntryMode: "existing",
    themeId: moduleItem?.theme_id || "",
    newThemeName: "",
    moduleTitle: moduleItem?.title || "",
    moduleDescription: moduleItem?.description || "",
    stageNumber: String(moduleItem?.stage_number ?? 1),
    lessonTitle: activity.title || "",
    previewName: "Maria Silva",
    selectedLearnerId: "",
    selectedBlueprintIds: [],
    orientationTutor: "",
    orientationStudent: "",
    activityType: activity.type,
    screenTemplate: "default",
    lockReason: "pedido_ajuda",
    lockMessage: "",
    lockAudioUrl: "",
    exerciseInstructionText: "",
    exerciseInstructionAudioUrl: "",
    reinforcementText: "Vamos reforcar esse passo e tentar novamente.",
    reinforcementAudioUrl: "",
    reinforcementAutoReturnMs: "2500",
    reinforcementPreserveProgress: true,
    targetLetter: "A",
    maxAttemptsBeforeLock: "3",
    expectedSelections: "2",
    progressiveUnlock: false,
    matchRows: INITIAL_MATCH_ROWS,
    markRows: INITIAL_MARK_ROWS,
    matchRowsBulkInput: "",
    markRowsBulkInput: "",
    isPublished: Boolean(activity.is_published),
    assetLink: "",
    assetKind: "png",
    assetStatus: "publicado",
    assetSearch: "",
  };

  const raw = String(activity.instructions ?? "").trim();
  if (!raw) {
    return fallback;
  }

  if (!raw.startsWith("{")) {
    const lines = raw.split(/\n\s*\n/);
    return {
      ...fallback,
      orientationTutor: lines[0] || "",
      orientationStudent: lines.slice(1).join("\n\n") || "",
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...fallback, orientationTutor: raw };
  }

  const screenTemplate = (parsed.screenTemplate as ScreenTemplate) || "default";
  const educatorGuidance = typeof parsed.educatorGuidance === "string" ? parsed.educatorGuidance : "";
  const learnerSpeech = typeof parsed.learnerSpeech === "string" ? parsed.learnerSpeech : "";
  const lockReason = typeof parsed.lockReason === "string" ? parsed.lockReason : "pedido_ajuda";
  const lockMessage = typeof parsed.lockMessage === "string" ? parsed.lockMessage : "";
  const lockAudioUrl = typeof parsed.lockAudioUrl === "string" ? parsed.lockAudioUrl : "";

  const draft: WizardDraftPayload = {
    ...fallback,
    screenTemplate,
    orientationTutor: educatorGuidance,
    orientationStudent: learnerSpeech,
    lockReason,
    lockMessage,
    lockAudioUrl,
  };

  const exercise = parsed.exercise as Record<string, unknown> | undefined;
  if (!exercise) {
    return draft;
  }

  const targetLetter = typeof exercise.targetLetter === "string" ? exercise.targetLetter : "A";
  const instructionText = typeof exercise.instructionText === "string" ? exercise.instructionText : "";
  const instructionAudioUrl =
    typeof exercise.instructionAudioUrl === "string" ? exercise.instructionAudioUrl : "";
  const expectedSelections = Number.isFinite(exercise.expectedSelections)
    ? String(exercise.expectedSelections)
    : "2";
  const maxAttemptsBeforeLock = Number.isFinite(exercise.maxAttemptsBeforeLock)
    ? String(exercise.maxAttemptsBeforeLock)
    : "3";
  const progressiveUnlock = Boolean(exercise.progressiveUnlock);
  const items = Array.isArray(exercise.items) ? (exercise.items as Record<string, unknown>[]) : [];

  draft.targetLetter = targetLetter || "A";
  draft.exerciseInstructionText = instructionText;
  draft.exerciseInstructionAudioUrl = instructionAudioUrl;
  draft.expectedSelections = expectedSelections;
  draft.maxAttemptsBeforeLock = maxAttemptsBeforeLock;
  draft.progressiveUnlock = progressiveUnlock;

  const feedbackFlow = exercise.feedbackFlow as { onError?: Record<string, unknown> } | undefined;
  const onError = feedbackFlow?.onError;
  if (onError) {
    draft.reinforcementText =
      typeof onError.instructionText === "string" ? onError.instructionText : draft.reinforcementText;
    draft.reinforcementAudioUrl =
      typeof onError.instructionAudioUrl === "string" ? onError.instructionAudioUrl : "";
    draft.reinforcementAutoReturnMs = Number.isFinite(onError.autoReturnMs)
      ? String(onError.autoReturnMs)
      : "2500";
    draft.reinforcementPreserveProgress = onError.preserveProgress !== false;
  }

  if (screenTemplate === "exercise-match-letter") {
    draft.matchRows = items.map((item, index) => {
      const options = Array.isArray(item.options) ? (item.options as string[]) : [];
      const correctOptions = Array.isArray(item.correctOptions) ? (item.correctOptions as string[]) : [];
      return {
        id: String(item.id ?? `match-${index + 1}`),
        label: String(item.label ?? `Item ${index + 1}`),
        imageUrl: String(item.imageUrl ?? ""),
        audioUrl: String(item.audioUrl ?? ""),
        wordAudioUrl: String(item.wordAudioUrl ?? item.audioUrl ?? ""),
        spellingAudioUrl: String(item.spellingAudioUrl ?? ""),
        optionsText: options.join(", "),
        correctOption: correctOptions[0] ?? targetLetter ?? "A",
        notes: typeof item.notes === "string" ? item.notes : "",
      };
    });
    if (draft.matchRows.length === 0) {
      draft.matchRows = INITIAL_MATCH_ROWS;
    }
  }

  if (screenTemplate === "exercise-mark-images") {
    draft.markRows = items.map((item, index) => ({
      id: String(item.id ?? `mark-${index + 1}`),
      label: String(item.label ?? `Item ${index + 1}`),
      imageUrl: String(item.imageUrl ?? ""),
      audioUrl: String(item.audioUrl ?? ""),
      isCorrectTarget: Boolean(item.isCorrectTarget),
      notes: typeof item.notes === "string" ? item.notes : "",
    }));
    if (draft.markRows.length === 0) {
      draft.markRows = INITIAL_MARK_ROWS;
    }
  }

  return draft;
}

export default function ConteudoNovaAulaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingActivityId = searchParams.get("id") || null;
  const { user } = useAuth();
  const {
    data,
    loading,
    error,
    busy,
    feedback,
    createTheme,
    createModule,
    updateModule,
    createActivity,
    updateActivity,
    uploadAsset,
    saveAssetLink,
    updateBlueprint,
    cmsThemes,
    cmsModules,
  } = useConteudoData();

  const [step, setStep] = useState(0);
  const [themeEntryMode, setThemeEntryMode] = useState<ThemeEntryMode>("existing");
  const [themeId, setThemeId] = useState("");
  const [newThemeName, setNewThemeName] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [stageNumber, setStageNumber] = useState("1");
  const [lessonTitle, setLessonTitle] = useState("");
  const [previewName, setPreviewName] = useState("Maria Silva");
  const [learners, setLearners] = useState<LearnerListItem[]>([]);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [learnersError, setLearnersError] = useState("");
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [selectedBlueprintIds, setSelectedBlueprintIds] = useState<string[]>([]);
  const [orientationTutor, setOrientationTutor] = useState("");
  const [orientationStudent, setOrientationStudent] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("video");
  const [screenTemplate, setScreenTemplate] = useState<ScreenTemplate>("default");
  const [lockReason, setLockReason] = useState("pedido_ajuda");
  const [lockMessage, setLockMessage] = useState("");
  const [lockAudioUrl, setLockAudioUrl] = useState("");
  const [exerciseInstructionText, setExerciseInstructionText] = useState("");
  const [exerciseInstructionAudioUrl, setExerciseInstructionAudioUrl] = useState("");
  const [reinforcementText, setReinforcementText] = useState(
    "Vamos reforcar esse passo e tentar novamente.",
  );
  const [reinforcementAudioUrl, setReinforcementAudioUrl] = useState("");
  const [reinforcementAutoReturnMs, setReinforcementAutoReturnMs] = useState("2500");
  const [reinforcementPreserveProgress, setReinforcementPreserveProgress] = useState(true);
  const [targetLetter, setTargetLetter] = useState("A");
  const [maxAttemptsBeforeLock, setMaxAttemptsBeforeLock] = useState("3");
  const [expectedSelections, setExpectedSelections] = useState("2");
  const [progressiveUnlock, setProgressiveUnlock] = useState(true);
  const [matchRows, setMatchRows] = useState<MatchLetterRow[]>(INITIAL_MATCH_ROWS);
  const [markRows, setMarkRows] = useState<MarkImageRow[]>(INITIAL_MARK_ROWS);
  const [matchRowsBulkInput, setMatchRowsBulkInput] = useState("");
  const [markRowsBulkInput, setMarkRowsBulkInput] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetLink, setAssetLink] = useState("");
  const [assetKind, setAssetKind] = useState<AssetKind>("png");
  const [assetStatus, setAssetStatus] = useState<AssetStatus>("publicado");
  const [assetSearch, setAssetSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");
  const [wizardDone, setWizardDone] = useState(false);
  const [assetPreviewUrl, setAssetPreviewUrl] = useState("");
  const [blueprintPreviewErrors, setBlueprintPreviewErrors] = useState<Record<string, true>>({});
  const [pendingDraft, setPendingDraft] = useState<WizardDraftPayload | null>(null);
  const [draftGateReleased, setDraftGateReleased] = useState(false);
  const [pendingTemplateUploads, setPendingTemplateUploads] = useState<Record<string, File>>({});
  const pendingTemplateUploadsRef = useRef<Record<string, File>>({});

  const clearSavedDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // noop
    }
  };

  const applyDraftPayload = (draft: WizardDraftPayload) => {
    setStep(Math.max(0, Math.min(draft.step ?? 0, STEPS.length - 1)));
    setThemeEntryMode(draft.themeEntryMode === "new" ? "new" : "existing");
    setThemeId(draft.themeId || "");
    setNewThemeName(draft.newThemeName || "");
    setModuleTitle(draft.moduleTitle || "");
    setModuleDescription(draft.moduleDescription || "");
    setStageNumber(STAGE_OPTIONS.some((item) => item.value === draft.stageNumber) ? draft.stageNumber : "1");
    setLessonTitle(draft.lessonTitle || "");
    setPreviewName(draft.previewName || "Maria Silva");
    setSelectedLearnerId(draft.selectedLearnerId || "");
    setSelectedBlueprintIds(Array.isArray(draft.selectedBlueprintIds) ? draft.selectedBlueprintIds : []);
    setOrientationTutor(draft.orientationTutor || "");
    setOrientationStudent(draft.orientationStudent || "");
    setActivityType(draft.activityType || "video");
    setScreenTemplate(draft.screenTemplate || "default");
    setLockReason(draft.lockReason || "pedido_ajuda");
    setLockMessage(draft.lockMessage || "");
    setLockAudioUrl(draft.lockAudioUrl || "");
    setExerciseInstructionText(draft.exerciseInstructionText || "");
    setExerciseInstructionAudioUrl(draft.exerciseInstructionAudioUrl || "");
    setReinforcementText(draft.reinforcementText || "Vamos reforcar esse passo e tentar novamente.");
    setReinforcementAudioUrl(draft.reinforcementAudioUrl || "");
    setReinforcementAutoReturnMs(draft.reinforcementAutoReturnMs || "2500");
    setReinforcementPreserveProgress(Boolean(draft.reinforcementPreserveProgress));
    setTargetLetter(draft.targetLetter || "A");
    setMaxAttemptsBeforeLock(draft.maxAttemptsBeforeLock || "3");
    setExpectedSelections(draft.expectedSelections || "2");
    setProgressiveUnlock(Boolean(draft.progressiveUnlock));
    setMatchRows(Array.isArray(draft.matchRows) && draft.matchRows.length > 0 ? draft.matchRows : INITIAL_MATCH_ROWS);
    setMarkRows(Array.isArray(draft.markRows) && draft.markRows.length > 0 ? draft.markRows : INITIAL_MARK_ROWS);
    setMatchRowsBulkInput(draft.matchRowsBulkInput || "");
    setMarkRowsBulkInput(draft.markRowsBulkInput || "");
    setIsPublished(Boolean(draft.isPublished));
    setAssetLink(draft.assetLink || "");
    setAssetKind(draft.assetKind || "png");
    setAssetStatus(draft.assetStatus || "publicado");
    setAssetSearch(draft.assetSearch || "");
    setAssetFile(null);
    setLocalError("");
  };

  useEffect(() => {
    if (screenTemplate === "exercise-match-letter" || screenTemplate === "exercise-mark-images") {
      if (activityType !== "letra") {
        setActivityType("letra");
      }
      return;
    }
    if (screenTemplate === "locked" && activityType === "letra") {
      setActivityType("audio");
    }
  }, [screenTemplate, activityType]);

  useEffect(() => {
    if (cmsThemes.length === 0) {
      setThemeEntryMode("new");
      setThemeId("");
      return;
    }

    if (themeEntryMode === "existing" && !themeId && newThemeName.trim()) {
      setThemeEntryMode("new");
    }
  }, [cmsThemes.length, newThemeName, themeEntryMode, themeId]);

  useEffect(() => {
    if (editingActivityId) {
      setDraftGateReleased(true);
      setPendingDraft(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) {
        setDraftGateReleased(true);
        return;
      }

      const parsed = JSON.parse(raw) as { payload?: WizardDraftPayload };
      if (!parsed?.payload) {
        setDraftGateReleased(true);
        return;
      }

      setPendingDraft(parsed.payload);
      setDraftGateReleased(false);
    } catch {
      setDraftGateReleased(true);
    }
  }, [editingActivityId]);

  const [editHydrated, setEditHydrated] = useState(false);
  useEffect(() => {
    if (!editingActivityId || editHydrated || loading) {
      return;
    }
    const activity = data.activities.find((item) => item.id === editingActivityId);
    if (!activity) {
      return;
    }
    const moduleItem = data.modules.find((item) => item.id === activity.module_id) ?? null;
    const draft = buildDraftFromActivity(activity, moduleItem);
    applyDraftPayload(draft);
    setEditHydrated(true);
  }, [editingActivityId, editHydrated, loading, data.activities, data.modules]);

  useEffect(() => {
    pendingTemplateUploadsRef.current = pendingTemplateUploads;
  }, [pendingTemplateUploads]);

  useEffect(() => {
    return () => {
      for (const objectUrl of Object.keys(pendingTemplateUploadsRef.current)) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadLearners = async () => {
      if (!user) {
        return;
      }

      try {
        setLearnersLoading(true);
        setLearnersError("");
        const tutorFilter =
          user.role === "tutor" ? `?tutorId=${encodeURIComponent(user.id)}` : "";
        const response = (await apiGet(`/cadastros/alfabetizandos${tutorFilter}`)) as LearnersResponse;
        if (!active) {
          return;
        }
        const items = Array.isArray(response.items) ? response.items : [];
        setLearners(items);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setLearnersError(
          loadError instanceof Error ? loadError.message : "Falha ao carregar alfabetizandos para preview.",
        );
      } finally {
        if (active) {
          setLearnersLoading(false);
        }
      }
    };

    loadLearners();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (learners.length === 0) {
      return;
    }

    if (!selectedLearnerId) {
      const firstLearner = learners[0];
      if (firstLearner) {
        setSelectedLearnerId(firstLearner.id);
        if (firstLearner.nome) {
          setPreviewName(firstLearner.nome);
        }
      }
      return;
    }

    const selected = learners.find((item) => item.id === selectedLearnerId);
    if (selected?.nome) {
      setPreviewName(selected.nome);
    }
  }, [learners, selectedLearnerId]);

  const selectedBlueprints = useMemo(
    () => data.blueprints.filter((item) => selectedBlueprintIds.includes(item.id)),
    [data.blueprints, selectedBlueprintIds],
  );

  const stageScopedBlueprints = useMemo(() => {
    const stageTag = `etapa-${toPositiveInteger(stageNumber, 1)}`;
    const matching = data.blueprints.filter((item) =>
      String(item.stage_tag || "").toLowerCase().includes(stageTag),
    );
    return matching.length > 0 ? matching : data.blueprints;
  }, [data.blueprints, stageNumber]);

  const stageScopedBlueprintsVisible = useMemo(() => {
    const visualItems = stageScopedBlueprints.filter(
      (item) => !isNonVisualBlueprintAsset(item.svg_path),
    );
    return visualItems.length > 0 ? visualItems : stageScopedBlueprints;
  }, [stageScopedBlueprints]);

  const hiddenNonVisualBlueprintCount = useMemo(() => {
    if (stageScopedBlueprintsVisible.length >= stageScopedBlueprints.length) {
      return 0;
    }
    return stageScopedBlueprints.length - stageScopedBlueprintsVisible.length;
  }, [stageScopedBlueprints.length, stageScopedBlueprintsVisible.length]);

  const selectedThemeForAssets = useMemo(() => {
    if (themeId) {
      return cmsThemes.find((item) => item.id === themeId) ?? null;
    }

    const candidateTitle = newThemeName.trim().toLowerCase();
    if (!candidateTitle) {
      return null;
    }

    return cmsThemes.find((item) => item.title.trim().toLowerCase() === candidateTitle) ?? null;
  }, [cmsThemes, newThemeName, themeId]);
  const selectedThemeSlugForAssets = useMemo(() => {
    if (!selectedThemeForAssets) {
      return "";
    }
    return (
      selectedThemeForAssets.slug?.trim() ||
      normalizeThemeSlug(selectedThemeForAssets.title || "") ||
      selectedThemeForAssets.id
    );
  }, [selectedThemeForAssets]);
  const selectedThemeTitleForAssets = useMemo(
    () => normalizeCompareText(selectedThemeForAssets?.title || ""),
    [selectedThemeForAssets],
  );

  const modulesById = useMemo(() => new Map(data.modules.map((item) => [item.id, item])), [data.modules]);
  const activitiesById = useMemo(
    () => new Map(data.activities.map((item) => [item.id, item])),
    [data.activities],
  );

  const themeScopedAssets = useMemo(() => {
    if (!selectedThemeForAssets) {
      return data.assets.filter((asset) => asset.status !== "arquivado");
    }

    return data.assets.filter((asset) => {
      if (asset.status === "arquivado") {
        return false;
      }

      if (asset.activity_id) {
        const linkedActivity = activitiesById.get(asset.activity_id);
        if (!linkedActivity) {
          return false;
        }
        const linkedModule = modulesById.get(linkedActivity.module_id);
        return linkedModule?.theme_id === selectedThemeForAssets.id;
      }

      const metadata =
        asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata)
          ? (asset.metadata as Record<string, unknown>)
          : null;
      const metadataThemeId =
        metadata && typeof metadata.themeId === "string" ? metadata.themeId.trim() : "";
      if (metadataThemeId && metadataThemeId === selectedThemeForAssets.id) {
        return true;
      }

      const metadataThemeSlug =
        metadata && typeof metadata.themeSlug === "string" ? metadata.themeSlug.trim().toLowerCase() : "";
      if (metadataThemeSlug && metadataThemeSlug === selectedThemeSlugForAssets.toLowerCase()) {
        return true;
      }

      const metadataThemeTitle =
        metadata && typeof metadata.themeTitle === "string"
          ? normalizeCompareText(metadata.themeTitle)
          : "";
      if (metadataThemeTitle && metadataThemeTitle === selectedThemeTitleForAssets) {
        return true;
      }

      const storagePathLower = asset.storage_path.toLowerCase();
      if (selectedThemeSlugForAssets) {
        const slugLower = selectedThemeSlugForAssets.toLowerCase();
        if (
          storagePathLower.includes(`/acervo/${slugLower}/`) ||
          storagePathLower.includes(`/conteudo/importados-etapa-2/${slugLower}/`)
        ) {
          return true;
        }
      }

      return false;
    });
  }, [
    activitiesById,
    data.assets,
    modulesById,
    selectedThemeForAssets,
    selectedThemeSlugForAssets,
    selectedThemeTitleForAssets,
  ]);

  const imageLibraryAssets = useMemo(
    () => themeScopedAssets.filter((asset) => asset.kind === "png" || asset.kind === "jpg"),
    [themeScopedAssets],
  );
  const audioLibraryAssets = useMemo(
    () => themeScopedAssets.filter((asset) => asset.kind === "mp3"),
    [themeScopedAssets],
  );
  const filteredAssetsLibrary = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    if (!query) {
      return themeScopedAssets.slice(0, 24);
    }

    return themeScopedAssets
      .filter((asset) => asset.storage_path.toLowerCase().includes(query))
      .slice(0, 24);
  }, [assetSearch, themeScopedAssets]);

  const matchRowsPayload = useMemo(() => normalizeMatchRows(matchRows, targetLetter), [matchRows, targetLetter]);
  const markRowsPayload = useMemo(() => normalizeMarkRows(markRows), [markRows]);
  const maxAttemptsValue = useMemo(() => toPositiveInteger(maxAttemptsBeforeLock, 3), [maxAttemptsBeforeLock]);
  const expectedSelectionsValue = useMemo(() => toPositiveInteger(expectedSelections, 1), [expectedSelections]);
  const reinforcementAutoReturnValue = useMemo(
    () => toPositiveInteger(reinforcementAutoReturnMs, 2500),
    [reinforcementAutoReturnMs],
  );
  const pendingTemplateUploadsCount = useMemo(() => {
    const references = new Set<string>();
    const collect = (value: string) => {
      const normalized = String(value ?? "").trim();
      if (isLocalObjectUrl(normalized)) {
        references.add(normalized);
      }
    };

    collect(lockAudioUrl);
    collect(exerciseInstructionAudioUrl);
    collect(reinforcementAudioUrl);

    for (const row of matchRows) {
      collect(row.imageUrl);
      collect(row.audioUrl);
      collect(row.wordAudioUrl);
      collect(row.spellingAudioUrl);
    }

    for (const row of markRows) {
      collect(row.imageUrl);
      collect(row.audioUrl);
    }

    return references.size;
  }, [
    exerciseInstructionAudioUrl,
    lockAudioUrl,
    markRows,
    matchRows,
    reinforcementAudioUrl,
  ]);

  const instructionsPayloadPreview = useMemo(
    () =>
      buildInstructionsPayload({
        screenTemplate,
        orientationTutor,
        orientationStudent,
        lockReason,
        lockMessage,
        lockAudioUrl,
        exerciseInstructionText,
        exerciseInstructionAudioUrl,
        reinforcementText,
        reinforcementAudioUrl,
        reinforcementAutoReturnMs: reinforcementAutoReturnValue,
        reinforcementPreserveProgress,
        targetLetter,
        maxAttemptsBeforeLock: maxAttemptsValue,
        expectedSelections: expectedSelectionsValue,
        progressiveUnlock,
        matchRowsPayload,
        markRowsPayload,
      }),
    [
      exerciseInstructionAudioUrl,
      exerciseInstructionText,
      expectedSelectionsValue,
      lockAudioUrl,
      lockMessage,
      lockReason,
      markRowsPayload,
      matchRowsPayload,
      maxAttemptsValue,
      orientationStudent,
      orientationTutor,
      progressiveUnlock,
      reinforcementAudioUrl,
      reinforcementAutoReturnValue,
      reinforcementPreserveProgress,
      reinforcementText,
      screenTemplate,
      targetLetter,
    ],
  );

  const draftPayload = useMemo<WizardDraftPayload>(
    () => ({
      step,
      themeEntryMode,
      themeId,
      newThemeName,
      moduleTitle,
      moduleDescription,
      stageNumber,
      lessonTitle,
      previewName,
      selectedLearnerId,
      selectedBlueprintIds,
      orientationTutor,
      orientationStudent,
      activityType,
      screenTemplate,
      lockReason,
      lockMessage,
      lockAudioUrl,
      exerciseInstructionText,
      exerciseInstructionAudioUrl,
      reinforcementText,
      reinforcementAudioUrl,
      reinforcementAutoReturnMs,
      reinforcementPreserveProgress,
      targetLetter,
      maxAttemptsBeforeLock,
      expectedSelections,
      progressiveUnlock,
      matchRows,
      markRows,
      matchRowsBulkInput,
      markRowsBulkInput,
      isPublished,
      assetLink,
      assetKind,
      assetStatus,
      assetSearch,
    }),
    [
      activityType,
      assetKind,
      assetLink,
      assetSearch,
      assetStatus,
      exerciseInstructionAudioUrl,
      exerciseInstructionText,
      expectedSelections,
      isPublished,
      lessonTitle,
      lockAudioUrl,
      lockMessage,
      lockReason,
      markRows,
      markRowsBulkInput,
      matchRows,
      matchRowsBulkInput,
      maxAttemptsBeforeLock,
      moduleDescription,
      moduleTitle,
      newThemeName,
      orientationStudent,
      orientationTutor,
      previewName,
      progressiveUnlock,
      reinforcementAudioUrl,
      reinforcementAutoReturnMs,
      reinforcementPreserveProgress,
      reinforcementText,
      screenTemplate,
      selectedBlueprintIds,
      selectedLearnerId,
      stageNumber,
      step,
      targetLetter,
      themeEntryMode,
      themeId,
    ],
  );

  const hasWizardProgress = useMemo(() => {
    return (
      step > 0 ||
      Boolean(themeId) ||
      Boolean(newThemeName.trim()) ||
      Boolean(moduleTitle.trim()) ||
      Boolean(moduleDescription.trim()) ||
      Boolean(lessonTitle.trim()) ||
      Boolean(selectedBlueprintIds.length) ||
      Boolean(orientationTutor.trim()) ||
      Boolean(orientationStudent.trim()) ||
      Boolean(lockMessage.trim()) ||
      Boolean(lockAudioUrl.trim()) ||
      Boolean(exerciseInstructionText.trim()) ||
      Boolean(exerciseInstructionAudioUrl.trim()) ||
      Boolean(reinforcementAudioUrl.trim()) ||
      Boolean(assetLink.trim()) ||
      Boolean(assetFile) ||
      screenTemplate !== "default" ||
      activityType !== "video"
    );
  }, [
    activityType,
    assetFile,
    assetLink,
    exerciseInstructionAudioUrl,
    exerciseInstructionText,
    lessonTitle,
    lockAudioUrl,
    lockMessage,
    moduleDescription,
    moduleTitle,
    newThemeName,
    orientationStudent,
    orientationTutor,
    reinforcementAudioUrl,
    screenTemplate,
    selectedBlueprintIds.length,
    step,
    themeId,
  ]);

  useEffect(() => {
    if (!draftGateReleased || wizardDone || editingActivityId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            payload: draftPayload,
          }),
        );
      } catch {
        // noop
      }
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftGateReleased, draftPayload, wizardDone]);

  useEffect(() => {
    if (!hasWizardProgress || wizardDone) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [hasWizardProgress, wizardDone]);

  useEffect(() => {
    if (!assetFile) {
      setAssetPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(assetFile);
    setAssetPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [assetFile]);

  if (loading) {
    return <StateDisplay type="loading" />;
  }

  if (error) {
    return <StateDisplay type="error" message={error} />;
  }

  const selectedThemeTitle =
    themeEntryMode === "existing"
      ? cmsThemes.find((item) => item.id === themeId)?.title || ""
      : newThemeName.trim();
  const previewMediaUrl = assetFile ? assetPreviewUrl : assetLink.trim();
  const previewMediaKind = assetFile
    ? inferAssetKindFromFile(assetFile) ?? assetKind
    : inferAssetKindFromPath(assetLink) ?? assetKind;
  const currentStepLabel = STEPS[step];
  const isMatchLetterPreview = screenTemplate === "exercise-match-letter";
  const selectedThemeSlug = selectedThemeSlugForAssets;
  const selectedThemeFolder = selectedThemeSlug ? `acervo/${selectedThemeSlug}` : undefined;
  const selectedThemeMetadata = selectedThemeForAssets
    ? {
        themeId: selectedThemeForAssets.id,
        themeTitle: selectedThemeForAssets.title,
        themeSlug: selectedThemeSlug,
      }
    : {};
  const selectedBlueprintPreview = selectedBlueprints[0] ?? null;
  const selectedBlueprintPreviewUrl = selectedBlueprintPreview
    ? resolveBlueprintPreviewUrl(selectedBlueprintPreview.svg_path)
    : "";

  const toggleBlueprint = (blueprintId: string) => {
    setSelectedBlueprintIds((previous) => {
      if (previous.includes(blueprintId)) {
        return previous.filter((item) => item !== blueprintId);
      }
      const selectedBlueprint = data.blueprints.find((item) => item.id === blueprintId);
      if (!lessonTitle.trim() && selectedBlueprint?.title) {
        setLessonTitle(selectedBlueprint.title);
      }
      return [...previous, blueprintId];
    });
  };

  const resolveTheme = async () => {
    if (themeEntryMode === "existing" && themeId) {
      return cmsThemes.find((item) => item.id === themeId) ?? null;
    }

    const candidate = newThemeName.trim();
    if (!candidate) {
      return null;
    }

    const created = await createTheme({ title: candidate });
    return created;
  };

  const validateTemplateStep = () => {
    if (screenTemplate === "default") {
      if (!orientationTutor.trim() && !orientationStudent.trim()) {
        return "Inclua ao menos uma orientacao para registrar a aula.";
      }
      return null;
    }

    if (screenTemplate === "locked") {
      if (!lockReason.trim() && !orientationTutor.trim() && !lockMessage.trim()) {
        return "Informe o motivo do bloqueio ou uma orientacao para a tela bloqueada.";
      }
      return null;
    }

    if (!targetLetter.trim()) {
      return "Informe a letra alvo usada no exercicio.";
    }

    if (screenTemplate === "exercise-match-letter") {
      if (matchRowsPayload.length === 0) {
        return "Adicione ao menos um item no exercicio de marcar letra.";
      }
      const hasInvalidRow = matchRowsPayload.some(
        (row) => !row.options || row.options.length === 0 || !row.correctOptions || row.correctOptions.length === 0,
      );
      if (hasInvalidRow) {
        return "Cada item precisa ter opcoes e uma resposta correta no modelo de marcar letra.";
      }
      if (reinforcementAutoReturnValue < 500) {
        return "A tela de reforco precisa de pelo menos 500ms para retorno automatico.";
      }
      return null;
    }

    if (markRowsPayload.length < 2) {
      return "Adicione pelo menos 2 imagens no exercicio de marcar caixas.";
    }

    if (expectedSelectionsValue > markRowsPayload.length) {
      return "A quantidade esperada de selecoes nao pode ser maior que o total de caixas.";
    }

    const totalCorretos = markRowsPayload.filter((row) => row.isCorrectTarget).length;
    if (totalCorretos < expectedSelectionsValue) {
      return "Marque imagens corretas suficientes para o total de selecoes solicitado.";
    }

    return null;
  };

  const validateCurrentStep = () => {
    setLocalError("");

    if (step === 0) {
      if (themeEntryMode === "existing") {
        if (!themeId) {
          setLocalError("Selecione um tema existente para continuar.");
          return false;
        }
      } else if (!newThemeName.trim()) {
        setLocalError("Informe o nome do novo tema.");
        return false;
      }
      if (!moduleTitle.trim()) {
        setLocalError("Informe o nome do modulo.");
        return false;
      }
      if (!lessonTitle.trim()) {
        setLocalError("Informe o nome da aula.");
        return false;
      }
    }

    if (step === 2) {
      const templateError = validateTemplateStep();
      if (templateError) {
        setLocalError(templateError);
        return false;
      }
    }

    return true;
  };

  const goNext = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setStep((previous) => Math.min(previous + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setLocalError("");
    setStep((previous) => Math.max(previous - 1, 0));
  };

  const restorePendingDraft = () => {
    if (!pendingDraft) {
      setDraftGateReleased(true);
      return;
    }
    applyDraftPayload(pendingDraft);
    setPendingDraft(null);
    setDraftGateReleased(true);
    setLocalError("");
  };

  const discardPendingDraft = () => {
    clearSavedDraft();
    setPendingDraft(null);
    setDraftGateReleased(true);
  };

  const handleCancelWizard = () => {
    if (hasWizardProgress && !wizardDone) {
      const confirmed = window.confirm(
        "Voce tem alteracoes em andamento. Deseja realmente sair da criacao da aula?",
      );
      if (!confirmed) {
        return;
      }
    }
    navigate("/admin/conteudo");
  };

  const markBlueprintPreviewError = (blueprintId: string) => {
    setBlueprintPreviewErrors((previous) => {
      if (previous[blueprintId]) {
        return previous;
      }
      return { ...previous, [blueprintId]: true };
    });
  };

  const registerPendingTemplateUpload = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPendingTemplateUploads((previous) => ({ ...previous, [objectUrl]: file }));
    return objectUrl;
  };

  const releasePendingTemplateUpload = (value: string) => {
    const normalized = String(value ?? "").trim();
    if (!isLocalObjectUrl(normalized)) {
      return;
    }

    setPendingTemplateUploads((previous) => {
      if (!previous[normalized]) {
        return previous;
      }
      const next = { ...previous };
      delete next[normalized];
      return next;
    });
    URL.revokeObjectURL(normalized);
  };

  const clearPendingTemplateUploads = () => {
    setPendingTemplateUploads((previous) => {
      for (const objectUrl of Object.keys(previous)) {
        URL.revokeObjectURL(objectUrl);
      }
      return {};
    });
  };

  const applyAudioValueToField = (target: AudioFieldTarget, value: string) => {
    const nextValue = value.trim();
    const previousValue =
      target === "lock" ? lockAudioUrl : target === "exercise" ? exerciseInstructionAudioUrl : reinforcementAudioUrl;
    if (previousValue !== nextValue) {
      releasePendingTemplateUpload(previousValue);
    }
    if (target === "lock") {
      setLockAudioUrl(nextValue);
      return;
    }
    if (target === "exercise") {
      setExerciseInstructionAudioUrl(nextValue);
      return;
    }
    setReinforcementAudioUrl(nextValue);
  };

  const onUploadAudioField = (target: AudioFieldTarget, file: File | null) => {
    if (!file) {
      return;
    }

    const previousValue =
      target === "lock" ? lockAudioUrl : target === "exercise" ? exerciseInstructionAudioUrl : reinforcementAudioUrl;
    releasePendingTemplateUpload(previousValue);
    const objectUrl = registerPendingTemplateUpload(file);
    applyAudioValueToField(target, objectUrl);
    setLocalError("");
  };

  const renderAudioFieldInput = (
    label: string,
    target: AudioFieldTarget,
    value: string,
    placeholder: string,
  ) => (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase text-slate-600">{label}</label>
      <input
        value={value}
        onChange={(event) => applyAudioValueToField(target, event.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 bg-white px-3 py-1.5 text-sm"
      />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <select
          value=""
          onChange={(event) => {
            if (event.target.value) {
              applyAudioValueToField(target, event.target.value);
            }
          }}
          className="border border-slate-300 bg-white px-2 py-1.5 text-xs"
        >
          <option value="">Usar audio da biblioteca</option>
          {audioLibraryAssets.map((asset) => (
            <option key={`${target}-audio-field-${asset.id}`} value={asset.storage_path}>
              {getAssetDisplayName(asset.storage_path)}
            </option>
          ))}
        </select>
        <label className="cursor-pointer border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
          Enviar audio
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(event) => void onUploadAudioField(target, event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    </div>
  );

  const updateMatchRow = (rowId: string, field: keyof MatchLetterRow, value: string) => {
    setMatchRows((previous) =>
      previous.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  };

  const updateMarkRow = (rowId: string, field: keyof MarkImageRow, value: string | boolean) => {
    setMarkRows((previous) =>
      previous.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const applyAssetToLessonMedia = (storagePath: string) => {
    if (!storagePath) {
      return;
    }
    const inferred = inferAssetKindFromPath(storagePath);
    if (inferred) {
      setAssetKind(inferred);
    }
    setAssetLink(storagePath);
    setAssetFile(null);
  };

  const onUploadMatchRowMedia = (
    rowId: string,
    file: File | null,
    field: "imageUrl" | "audioUrl" | "wordAudioUrl" | "spellingAudioUrl",
  ) => {
    if (!file) {
      return;
    }

    const objectUrl = registerPendingTemplateUpload(file);
    if (field === "wordAudioUrl") {
      updateMatchRow(rowId, "wordAudioUrl", objectUrl);
      updateMatchRow(rowId, "audioUrl", objectUrl);
    } else if (field === "audioUrl") {
      updateMatchRow(rowId, "audioUrl", objectUrl);
      updateMatchRow(rowId, "wordAudioUrl", objectUrl);
    } else {
      updateMatchRow(rowId, field, objectUrl);
    }
    setLocalError("");
  };

  const onUploadMarkRowMedia = (
    rowId: string,
    file: File | null,
    field: "imageUrl" | "audioUrl",
  ) => {
    if (!file) {
      return;
    }

    const objectUrl = registerPendingTemplateUpload(file);
    updateMarkRow(rowId, field, objectUrl);
    setLocalError("");
  };

  const applyMatchRowsBulk = () => {
    const parsedRows = parseMatchRowsImport(matchRowsBulkInput, targetLetter);
    if (parsedRows.length === 0) {
      setLocalError("Nenhuma linha valida para importar no modelo de marcar letra.");
      return;
    }
    matchRows.forEach((row) => {
      releasePendingTemplateUpload(row.imageUrl);
      releasePendingTemplateUpload(row.audioUrl);
      releasePendingTemplateUpload(row.wordAudioUrl);
      releasePendingTemplateUpload(row.spellingAudioUrl);
    });
    setMatchRows(parsedRows);
    setLocalError("");
  };

  const applyMarkRowsBulk = () => {
    const parsedRows = parseMarkRowsImport(markRowsBulkInput);
    if (parsedRows.length === 0) {
      setLocalError("Nenhuma linha valida para importar no modelo de marcar imagens.");
      return;
    }
    markRows.forEach((row) => {
      releasePendingTemplateUpload(row.imageUrl);
      releasePendingTemplateUpload(row.audioUrl);
    });
    setMarkRows(parsedRows);
    setLocalError("");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!validateCurrentStep()) {
      return;
    }

    try {
      setSubmitting(true);

      const resolvedTheme = await resolveTheme();
      if (!resolvedTheme) {
        setLocalError("Nao foi possivel definir o tema desta aula.");
        return;
      }

      const normalizedModuleTitle = moduleTitle.trim();
      const normalizedModuleDescription = moduleDescription.trim();
      const resolvedStageNumber = toPositiveInteger(stageNumber, 1);
      const sameThemeAndStageModules = cmsModules.filter(
        (item) =>
          item.theme_id === resolvedTheme.id &&
          Number(item.stage_number ?? 1) === resolvedStageNumber,
      );
      const existingExactModule =
        sameThemeAndStageModules.find(
          (item) => normalizeCompareText(item.title) === normalizeCompareText(normalizedModuleTitle),
        ) ?? null;

      let targetModule: ModuleItem | null = existingExactModule ?? sameThemeAndStageModules[0] ?? null;

      if (!targetModule) {
        targetModule = await createModule({
          themeId: resolvedTheme.id,
          title: normalizedModuleTitle,
          description: normalizedModuleDescription || undefined,
          stageNumber: resolvedStageNumber,
        });

        if (!targetModule) {
          return;
        }
      } else {
        const shouldUpdateModuleTitle =
          normalizeCompareText(targetModule.title) !== normalizeCompareText(normalizedModuleTitle);
        const shouldUpdateModuleDescription =
          (targetModule.description ?? "").trim() !== normalizedModuleDescription;

        if (shouldUpdateModuleTitle || shouldUpdateModuleDescription) {
          const updated = await updateModule({
            moduleId: targetModule.id,
            title: normalizedModuleTitle,
            description: normalizedModuleDescription || undefined,
            stageNumber: resolvedStageNumber,
          });
          if (!updated) {
            return;
          }
        }
      }

      const instructions = buildInstructionsPayload({
        screenTemplate,
        orientationTutor,
        orientationStudent,
        lockReason,
        lockMessage,
        lockAudioUrl,
        exerciseInstructionText,
        exerciseInstructionAudioUrl,
        reinforcementText,
        reinforcementAudioUrl,
        reinforcementAutoReturnMs: reinforcementAutoReturnValue,
        reinforcementPreserveProgress,
        targetLetter,
        maxAttemptsBeforeLock: maxAttemptsValue,
        expectedSelections: expectedSelectionsValue,
        progressiveUnlock,
        matchRowsPayload,
        markRowsPayload,
      });

      let activityId: string | null = null;
      if (editingActivityId) {
        const updated = await updateActivity({
          activityId: editingActivityId,
          moduleId: targetModule.id,
          title: lessonTitle.trim(),
          type: activityType,
          instructions: instructions || undefined,
          isPublished,
        });
        if (!updated) {
          return;
        }
        activityId = editingActivityId;
      } else {
        const created = await createActivity({
          moduleId: targetModule.id,
          title: lessonTitle.trim(),
          type: activityType,
          instructions: instructions || undefined,
          isPublished,
        });
        if (!created) {
          return;
        }
        activityId = created.id;
      }

      const hasPendingTemplateUploads = pendingTemplateUploadsCount > 0;
      if (hasPendingTemplateUploads) {
        const uploadCache = new Map<string, string>();

        const resolveLocalReference = async (
          sourceValue: string,
          fallbackKind: AssetKind,
          metadata: Record<string, unknown>,
        ) => {
          const normalizedValue = String(sourceValue ?? "").trim();
          if (!isLocalObjectUrl(normalizedValue)) {
            return normalizedValue;
          }

          if (uploadCache.has(normalizedValue)) {
            return uploadCache.get(normalizedValue) || "";
          }

          const pendingFile = pendingTemplateUploads[normalizedValue];
          if (!pendingFile) {
            uploadCache.set(normalizedValue, "");
            return "";
          }

          const uploaded = await uploadAsset({
            activityId,
            file: pendingFile,
            kind: inferAssetKindFromFile(pendingFile) ?? fallbackKind,
            status: assetStatus,
            title: pendingFile.name.replace(/\.[^/.]+$/, ""),
            folder: selectedThemeFolder,
            metadata: {
              source: "wizard-template-upload-on-submit",
              screenTemplate,
              ...selectedThemeMetadata,
              ...metadata,
            },
          });

          if (!uploaded?.sourceUrl) {
            throw new Error("Falha ao enviar midia do conteudo. Revise os uploads e tente novamente.");
          }

          uploadCache.set(normalizedValue, uploaded.sourceUrl);
          return uploaded.sourceUrl;
        };

        const resolvedLockAudioUrl = await resolveLocalReference(lockAudioUrl, "mp3", {
          targetField: "lockAudioUrl",
        });
        const resolvedExerciseInstructionAudioUrl = await resolveLocalReference(
          exerciseInstructionAudioUrl,
          "mp3",
          { targetField: "exerciseInstructionAudioUrl" },
        );
        const resolvedReinforcementAudioUrl = await resolveLocalReference(reinforcementAudioUrl, "mp3", {
          targetField: "reinforcementAudioUrl",
        });

        const resolvedMatchRows: MatchLetterRow[] = [];
        for (const row of matchRows) {
          const resolvedImageUrl = await resolveLocalReference(row.imageUrl, "png", {
            rowId: row.id,
            rowLabel: row.label,
            targetField: "imageUrl",
          });
          const resolvedWordAudioUrl = await resolveLocalReference(
            row.wordAudioUrl || row.audioUrl,
            "mp3",
            {
              rowId: row.id,
              rowLabel: row.label,
              targetField: "wordAudioUrl",
            },
          );
          const resolvedSpellingAudioUrl = await resolveLocalReference(row.spellingAudioUrl, "mp3", {
            rowId: row.id,
            rowLabel: row.label,
            targetField: "spellingAudioUrl",
          });

          resolvedMatchRows.push({
            ...row,
            imageUrl: resolvedImageUrl,
            audioUrl: resolvedWordAudioUrl,
            wordAudioUrl: resolvedWordAudioUrl,
            spellingAudioUrl: resolvedSpellingAudioUrl,
          });
        }

        const resolvedMarkRows: MarkImageRow[] = [];
        for (const row of markRows) {
          const resolvedImageUrl = await resolveLocalReference(row.imageUrl, "png", {
            rowId: row.id,
            rowLabel: row.label,
            targetField: "imageUrl",
          });
          const resolvedAudioUrl = await resolveLocalReference(row.audioUrl, "mp3", {
            rowId: row.id,
            rowLabel: row.label,
            targetField: "audioUrl",
          });

          resolvedMarkRows.push({
            ...row,
            imageUrl: resolvedImageUrl,
            audioUrl: resolvedAudioUrl,
          });
        }

        const resolvedInstructions = buildInstructionsPayload({
          screenTemplate,
          orientationTutor,
          orientationStudent,
          lockReason,
          lockMessage,
          lockAudioUrl: resolvedLockAudioUrl,
          exerciseInstructionText,
          exerciseInstructionAudioUrl: resolvedExerciseInstructionAudioUrl,
          reinforcementText,
          reinforcementAudioUrl: resolvedReinforcementAudioUrl,
          reinforcementAutoReturnMs: reinforcementAutoReturnValue,
          reinforcementPreserveProgress,
          targetLetter,
          maxAttemptsBeforeLock: maxAttemptsValue,
          expectedSelections: expectedSelectionsValue,
          progressiveUnlock,
          matchRowsPayload: normalizeMatchRows(resolvedMatchRows, targetLetter),
          markRowsPayload: normalizeMarkRows(resolvedMarkRows),
        });

        const activityPatched = await updateActivity({
          activityId,
          moduleId: targetModule.id,
          title: lessonTitle.trim(),
          type: activityType,
          instructions: resolvedInstructions || undefined,
          isPublished,
        });

        if (!activityPatched) {
          return;
        }

        setLockAudioUrl(resolvedLockAudioUrl);
        setExerciseInstructionAudioUrl(resolvedExerciseInstructionAudioUrl);
        setReinforcementAudioUrl(resolvedReinforcementAudioUrl);
        setMatchRows(resolvedMatchRows);
        setMarkRows(resolvedMarkRows);
        clearPendingTemplateUploads();
      }

      for (const blueprint of selectedBlueprints) {
        await updateBlueprint(blueprint.id, {
          moduleCode: targetModule.id,
          stageTag: blueprint.stage_tag || "etapa-2-aulas",
        });
      }

      if (assetFile) {
        const guessedKind = inferAssetKindFromFile(assetFile) ?? assetKind;
        await uploadAsset({
          activityId,
          file: assetFile,
          kind: guessedKind,
          status: assetStatus,
          folder: selectedThemeFolder,
          metadata: { source: "wizard-step4-upload", screenTemplate, ...selectedThemeMetadata },
        });
      } else if (assetLink.trim()) {
        const inferredKind = inferAssetKindFromPath(assetLink.trim()) ?? assetKind;
        await saveAssetLink({
          activityId,
          kind: inferredKind,
          status: assetStatus,
          storagePath: assetLink.trim(),
          mimeType:
            inferredKind === "mp4"
              ? "video/mp4"
              : inferredKind === "mp3"
                ? "audio/mpeg"
                : inferredKind === "png"
                  ? "image/png"
                  : "image/jpeg",
          metadata: { source: "wizard-link", screenTemplate, ...selectedThemeMetadata },
        });
      }

      clearSavedDraft();
      clearPendingTemplateUploads();
      setWizardDone(true);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Falha ao salvar a aula. Tente novamente.";
      setLocalError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderTemplateEditor = () => {
    if (screenTemplate === "locked") {
      return (
        <div className="space-y-3 border border-red-200 bg-red-50/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <Lock className="h-4 w-4" />
            Tela bloqueada
          </div>
          <input
            value={lockReason}
            onChange={(event) => setLockReason(event.target.value)}
            placeholder="Ex.: pedido_ajuda ou 3_tentativas_sem_acerto"
            className="w-full border border-red-200 bg-white px-3 py-2 text-sm"
          />
          <input
            value={lockMessage}
            onChange={(event) => setLockMessage(event.target.value)}
            placeholder="Mensagem para o alfabetizando quando a tela travar"
            className="w-full border border-red-200 bg-white px-3 py-2 text-sm"
          />
          {renderAudioFieldInput(
            "Audio de bloqueio (opcional)",
            "lock",
            lockAudioUrl,
            "Link manual de audio de bloqueio (opcional)",
          )}
          <p className="text-xs text-red-700">
            O mobile mostrara a tela travada e impedira o avancar ate liberacao do alfabetizador.
          </p>
        </div>
      );
    }

    if (screenTemplate === "exercise-match-letter") {
      return (
        <div className="space-y-4 border border-slate-300 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Letra alvo</label>
              <input
                value={targetLetter}
                maxLength={1}
                onChange={(event) => setTargetLetter(event.target.value.toUpperCase())}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Max tentativas</label>
              <input
                type="number"
                min={1}
                value={maxAttemptsBeforeLock}
                onChange={(event) => setMaxAttemptsBeforeLock(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="md:col-span-2 flex items-center gap-2 border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={progressiveUnlock}
                onChange={(event) => setProgressiveUnlock(event.target.checked)}
              />
              Liberar itens em ordem (sequencial)
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={exerciseInstructionText}
              onChange={(event) => setExerciseInstructionText(event.target.value)}
              placeholder="Instrucao do audio (ex.: Marque a caixa da letra A)"
              className="w-full border border-slate-300 px-3 py-2 text-sm"
            />
            {renderAudioFieldInput(
              "Audio instrucional (opcional)",
              "exercise",
              exerciseInstructionAudioUrl,
              "Link manual de audio instrucional (opcional)",
            )}
          </div>

          <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-700">Fluxo de reforco</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                value={reinforcementText}
                onChange={(event) => setReinforcementText(event.target.value)}
                placeholder="Texto da tela de reforco em caso de erro"
                className="w-full border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              {renderAudioFieldInput(
                "Audio de reforco (opcional)",
                "reinforcement",
                reinforcementAudioUrl,
                "Link manual de audio de reforco (opcional)",
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                type="number"
                min={500}
                step={100}
                value={reinforcementAutoReturnMs}
                onChange={(event) => setReinforcementAutoReturnMs(event.target.value)}
                className="w-full border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={reinforcementPreserveProgress}
                  onChange={(event) => setReinforcementPreserveProgress(event.target.checked)}
                />
                Preservar progresso ao voltar para a tela de exercicio
              </label>
            </div>
          </div>

          <details className="rounded border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase text-slate-700">
              Importar itens em lote (opcional)
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-slate-600">
                Formato: <code>palavra|opcoes|correta|imageUrl|audioPalavra|audioSoletracao</code>
              </p>
              <textarea
                rows={4}
                value={matchRowsBulkInput}
                onChange={(event) => setMatchRowsBulkInput(event.target.value)}
                placeholder={
                  "Anzol|A,N,Z,O,L|A|https://.../anzol.png|https://.../anzol-palavra.mp3|https://.../anzol-soletrar.mp3\nSal|S,A,L|A|https://.../sal.png|https://.../sal-palavra.mp3|"
                }
                className="w-full border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={applyMatchRowsBulk}
                  className="inline-flex items-center gap-1 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Aplicar importacao
                </button>
              </div>
            </div>
          </details>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Itens do exercicio</p>
              <button
                type="button"
                onClick={() =>
                  setMatchRows((previous) => [
                    ...previous,
                    {
                      id: buildId("match"),
                      label: "",
                      imageUrl: "",
                      audioUrl: "",
                      wordAudioUrl: "",
                      spellingAudioUrl: "",
                      optionsText: "",
                      correctOption: targetLetter || "A",
                      notes: "",
                    },
                  ])
                }
                className="inline-flex items-center gap-1 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar item
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Biblioteca filtrada por tema: {selectedThemeForAssets?.title || "todos os temas"}
            </p>
            <p className="text-[11px] text-slate-500">
              Audio manual e opcional. Priorize biblioteca ou upload para a palavra inteira e para a soletracao.
            </p>
            {pendingTemplateUploadsCount > 0 ? (
              <p className="text-[11px] text-sky-700">
                {pendingTemplateUploadsCount} arquivo(s) pendente(s). O envio final acontece ao salvar a aula.
              </p>
            ) : null}

            {matchRows.map((row, index) => (
              <div key={row.id} className="space-y-2 border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                  <input
                    value={row.label}
                    onChange={(event) => updateMatchRow(row.id, "label", event.target.value)}
                    placeholder={`Palavra ${index + 1}`}
                    className="border border-slate-300 px-2 py-1.5 text-xs"
                  />
                    <button
                      type="button"
                      onClick={() =>
                        setMatchRows((previous) => {
                          const targetRow = previous.find((item) => item.id === row.id);
                          if (targetRow) {
                            releasePendingTemplateUpload(targetRow.imageUrl);
                            releasePendingTemplateUpload(targetRow.audioUrl);
                            releasePendingTemplateUpload(targetRow.wordAudioUrl);
                            releasePendingTemplateUpload(targetRow.spellingAudioUrl);
                          }
                          return previous.filter((item) => item.id !== row.id);
                        })
                      }
                      disabled={matchRows.length <= 1}
                      className="border border-red-200 bg-white px-2 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"
                    >
                    Remover
                  </button>
                </div>

                <div className="grid grid-cols-[64px_1fr] items-start gap-2">
                  {row.imageUrl ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded border border-slate-200 bg-white">
                      <img
                        src={resolveAssetImageUrl(row.imageUrl)}
                        alt={row.label || `Imagem ${index + 1}`}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.visibility = "hidden";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-[10px] text-slate-400">
                      sem imagem
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      value={row.imageUrl}
                      onChange={(event) => updateMatchRow(row.id, "imageUrl", event.target.value)}
                      placeholder="Imagem (link manual opcional)"
                      className="w-full border border-slate-300 px-2 py-1.5 text-xs"
                    />
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <select
                        value=""
                        onChange={(event) => {
                          if (event.target.value) {
                            updateMatchRow(row.id, "imageUrl", event.target.value);
                          }
                        }}
                        className="border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="">Usar imagem da biblioteca</option>
                        {imageLibraryAssets.map((asset) => (
                          <option key={`${row.id}-img-${asset.id}`} value={asset.storage_path}>
                            {getAssetDisplayName(asset.storage_path)}
                          </option>
                        ))}
                      </select>
                      <label className="cursor-pointer border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                        Enviar imagem
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) =>
                            void onUploadMatchRowMedia(
                              row.id,
                              event.target.files?.[0] ?? null,
                              "imageUrl",
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-slate-600">Audio da palavra inteira</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input
                      value={row.wordAudioUrl}
                      onChange={(event) => {
                        updateMatchRow(row.id, "wordAudioUrl", event.target.value);
                        updateMatchRow(row.id, "audioUrl", event.target.value);
                      }}
                      placeholder="Audio da palavra (link manual opcional)"
                      className="border border-slate-300 px-2 py-1.5 text-xs"
                    />
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <select
                        value=""
                        onChange={(event) => {
                          if (event.target.value) {
                            updateMatchRow(row.id, "wordAudioUrl", event.target.value);
                            updateMatchRow(row.id, "audioUrl", event.target.value);
                          }
                        }}
                        className="border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="">Usar audio da biblioteca</option>
                        {audioLibraryAssets.map((asset) => (
                          <option key={`${row.id}-word-aud-${asset.id}`} value={asset.storage_path}>
                            {asset.storage_path.split("/").pop() || asset.storage_path}
                          </option>
                        ))}
                      </select>
                      <label className="cursor-pointer border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                        Enviar audio
                        <input
                          type="file"
                          accept="audio/*"
                          className="sr-only"
                          onChange={(event) =>
                            void onUploadMatchRowMedia(
                              row.id,
                              event.target.files?.[0] ?? null,
                              "wordAudioUrl",
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-slate-600">
                    Audio de soletracao (letra por letra)
                  </p>
                  <input
                    value={row.spellingAudioUrl}
                    onChange={(event) => updateMatchRow(row.id, "spellingAudioUrl", event.target.value)}
                    placeholder="Audio da soletracao (link manual opcional)"
                    className="border border-slate-300 px-2 py-1.5 text-xs"
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <select
                      value=""
                      onChange={(event) => {
                        if (event.target.value) {
                          updateMatchRow(row.id, "spellingAudioUrl", event.target.value);
                        }
                      }}
                      className="border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="">Usar audio da biblioteca</option>
                      {audioLibraryAssets.map((asset) => (
                        <option key={`${row.id}-aud-${asset.id}`} value={asset.storage_path}>
                          {asset.storage_path.split("/").pop() || asset.storage_path}
                        </option>
                      ))}
                    </select>
                    <label className="cursor-pointer border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                      Enviar audio
                      <input
                        type="file"
                        accept="audio/*"
                        className="sr-only"
                        onChange={(event) =>
                          void onUploadMatchRowMedia(
                            row.id,
                            event.target.files?.[0] ?? null,
                            "spellingAudioUrl",
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px]">
                  <input
                    value={row.optionsText}
                    onChange={(event) => updateMatchRow(row.id, "optionsText", event.target.value)}
                    placeholder="Opcoes (ex.: A, N, Z, O, L)"
                    className="border border-slate-300 px-2 py-1.5 text-xs"
                  />
                  <input
                    value={row.correctOption}
                    maxLength={1}
                    onChange={(event) =>
                      updateMatchRow(row.id, "correctOption", event.target.value.toUpperCase())
                    }
                    placeholder="Correta"
                    className="border border-slate-300 px-2 py-1.5 text-xs"
                  />
                </div>
                <textarea
                  value={row.notes}
                  onChange={(event) => updateMatchRow(row.id, "notes", event.target.value)}
                  rows={2}
                  placeholder="Observacao livre para este item (explicacao, dica, contexto pedagogico)"
                  className="w-full border border-slate-300 bg-white px-2 py-1.5 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (screenTemplate === "exercise-mark-images") {
      return (
        <div className="space-y-4 border border-slate-300 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Letra alvo</label>
              <input
                value={targetLetter}
                maxLength={1}
                onChange={(event) => setTargetLetter(event.target.value.toUpperCase())}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Selecoes exigidas</label>
              <input
                type="number"
                min={1}
                value={expectedSelections}
                onChange={(event) => setExpectedSelections(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Max tentativas</label>
              <input
                type="number"
                min={1}
                value={maxAttemptsBeforeLock}
                onChange={(event) => setMaxAttemptsBeforeLock(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  setMarkRows((previous) => [
                    ...previous,
                    {
                      id: buildId("mark"),
                      label: "",
                      imageUrl: "",
                      audioUrl: "",
                      isCorrectTarget: false,
                      notes: "",
                    },
                  ])
                }
                className="inline-flex items-center gap-1 border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar caixa
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={exerciseInstructionText}
              onChange={(event) => setExerciseInstructionText(event.target.value)}
              placeholder="Instrucao do audio (ex.: Marque as imagens que comecam com a letra A)"
              className="w-full border border-slate-300 px-3 py-2 text-sm"
            />
            {renderAudioFieldInput(
              "Audio instrucional (opcional)",
              "exercise",
              exerciseInstructionAudioUrl,
              "Link manual de audio instrucional (opcional)",
            )}
          </div>

          <details className="rounded border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase text-slate-700">
              Importar caixas em lote (opcional)
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-slate-600">
                Formato: <code>rotulo|correta(1/0)|imageUrl|audioUrl</code>
              </p>
              <textarea
                rows={4}
                value={markRowsBulkInput}
                onChange={(event) => setMarkRowsBulkInput(event.target.value)}
                placeholder={"Abelha|1|https://.../abelha.png|\nGirafa|0|https://.../girafa.png|"}
                className="w-full border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={applyMarkRowsBulk}
                  className="inline-flex items-center gap-1 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Aplicar importacao
                </button>
              </div>
            </div>
          </details>

          <div className="space-y-3">
            {pendingTemplateUploadsCount > 0 ? (
              <p className="text-[11px] text-sky-700">
                {pendingTemplateUploadsCount} arquivo(s) pendente(s). O envio final acontece ao salvar a aula.
              </p>
            ) : null}
            {markRows.map((row, index) => (
              <div key={row.id} className="space-y-2 border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                  <input
                    value={row.label}
                    onChange={(event) => updateMarkRow(row.id, "label", event.target.value)}
                    placeholder={`Imagem ${index + 1}`}
                    className="border border-slate-300 px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMarkRows((previous) => {
                        const targetRow = previous.find((item) => item.id === row.id);
                        if (targetRow) {
                          releasePendingTemplateUpload(targetRow.imageUrl);
                          releasePendingTemplateUpload(targetRow.audioUrl);
                        }
                        return previous.filter((item) => item.id !== row.id);
                      })
                    }
                    disabled={markRows.length <= 2}
                    className="border border-red-200 bg-white px-2 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"
                  >
                    Remover
                  </button>
                </div>

                <div className="grid grid-cols-[64px_1fr] items-start gap-2">
                  {row.imageUrl ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded border border-slate-200 bg-white">
                      <img
                        src={resolveAssetImageUrl(row.imageUrl)}
                        alt={row.label || `Imagem ${index + 1}`}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.visibility = "hidden";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-[10px] text-slate-400">
                      sem imagem
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      value={row.imageUrl}
                      onChange={(event) => updateMarkRow(row.id, "imageUrl", event.target.value)}
                      placeholder="Imagem (link manual opcional)"
                      className="w-full border border-slate-300 px-2 py-1.5 text-xs"
                    />
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <select
                        value=""
                        onChange={(event) => {
                          if (event.target.value) {
                            updateMarkRow(row.id, "imageUrl", event.target.value);
                          }
                        }}
                        className="border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="">Usar imagem da biblioteca</option>
                        {imageLibraryAssets.map((asset) => (
                          <option key={`${row.id}-mark-img-${asset.id}`} value={asset.storage_path}>
                            {getAssetDisplayName(asset.storage_path)}
                          </option>
                        ))}
                      </select>
                      <label className="cursor-pointer border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                        Enviar imagem
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) =>
                            void onUploadMarkRowMedia(
                              row.id,
                              event.target.files?.[0] ?? null,
                              "imageUrl",
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    value={row.audioUrl}
                    onChange={(event) => updateMarkRow(row.id, "audioUrl", event.target.value)}
                    placeholder="Audio (link manual opcional)"
                    className="border border-slate-300 px-2 py-1.5 text-xs"
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <select
                      value=""
                      onChange={(event) => {
                        if (event.target.value) {
                          updateMarkRow(row.id, "audioUrl", event.target.value);
                        }
                      }}
                      className="border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="">Usar audio da biblioteca</option>
                      {audioLibraryAssets.map((asset) => (
                        <option key={`${row.id}-mark-aud-${asset.id}`} value={asset.storage_path}>
                          {asset.storage_path.split("/").pop() || asset.storage_path}
                        </option>
                      ))}
                    </select>
                    <label className="cursor-pointer border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                      Enviar audio
                      <input
                        type="file"
                        accept="audio/*"
                        className="sr-only"
                        onChange={(event) =>
                          void onUploadMarkRowMedia(
                            row.id,
                            event.target.files?.[0] ?? null,
                            "audioUrl",
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                <label className="flex items-center gap-2 border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={row.isCorrectTarget}
                    onChange={(event) => updateMarkRow(row.id, "isCorrectTarget", event.target.checked)}
                  />
                  Esta imagem conta como resposta correta
                </label>

                <textarea
                  value={row.notes}
                  onChange={(event) => updateMarkRow(row.id, "notes", event.target.value)}
                  rows={2}
                  placeholder="Observacao livre para este item (explicacao, dica, contexto pedagogico)"
                  className="w-full border border-slate-300 bg-white px-2 py-1.5 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderStep = () => {
    if (step === 0) {
      const hasThemes = cmsThemes.length > 0;
      return (
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold text-slate-900">Dados da aula</h2>
          <p className="text-sm text-slate-600">
            Escolha em qual <strong>tema</strong> (universo de interesse do alfabetizando: animais, comida, profissões, etc.) e <strong>módulo</strong> (estrutura didática) essa aula vai ficar. Se ainda não existe um tema, crie um aqui mesmo.
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-3 border border-slate-300 bg-white p-4">
              <label className="block text-sm font-semibold text-slate-700">
                Tema <span className="text-red-600">*</span>
              </label>

              {hasThemes ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setThemeEntryMode("existing")}
                    className={`border px-3 py-2 text-xs font-semibold ${
                      themeEntryMode === "existing"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Tema existente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeEntryMode("new");
                      setThemeId("");
                    }}
                    className={`border px-3 py-2 text-xs font-semibold ${
                      themeEntryMode === "new"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Novo tema
                  </button>
                </div>
              ) : (
                <p className="border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  Ainda nao existe nenhum tema. Cadastre o primeiro tema abaixo.
                </p>
              )}

              {themeEntryMode === "existing" && hasThemes ? (
                <select
                  value={themeId}
                  onChange={(event) => {
                    setThemeId(event.target.value);
                    if (event.target.value) {
                      setNewThemeName("");
                    }
                  }}
                  className="w-full border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Escolher tema existente</option>
                  {cmsThemes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.title}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={newThemeName}
                  onChange={(event) => {
                    setNewThemeName(event.target.value);
                    if (event.target.value) {
                      setThemeId("");
                      setThemeEntryMode("new");
                    }
                  }}
                  placeholder="Ex.: Animais, Comida, Profissoes, Zona rural"
                  className="w-full border border-slate-300 px-3 py-2 text-sm"
                />
              )}
              <p className="text-xs text-slate-500">
                Dica: o tema é o <strong>universo de interesse do alfabetizando</strong> — use algo que ele goste (animais, comida, profissões). A etapa didática vai no nome do módulo ao lado, não aqui.
              </p>
            </div>

            <div className="space-y-2 border border-slate-300 bg-white p-4">
              <label className="block text-sm font-semibold text-slate-700">Modulo</label>
              <input
                value={moduleTitle}
                onChange={(event) => setModuleTitle(event.target.value)}
                placeholder="Ex.: ETAPA 2 - Orientacao e Exercicios"
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={moduleDescription}
                onChange={(event) => setModuleDescription(event.target.value)}
                placeholder="Resumo do modulo"
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
              <label className="block text-sm font-semibold text-slate-700">Etapa</label>
              <select
                value={stageNumber}
                onChange={(event) => setStageNumber(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              >
                {STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 border border-slate-300 bg-white p-4">
              <label className="block text-sm font-semibold text-slate-700">Nome da aula</label>
              <input
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
                placeholder="Ex.: Modelo de exercicio - letra A"
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />

              <label className="block text-sm font-semibold text-slate-700">Tipo da atividade</label>
              <select
                value={activityType}
                onChange={(event) => setActivityType(event.target.value as ActivityType)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="quiz">Quiz</option>
                <option value="letra">Letra</option>
              </select>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(event) => setIsPublished(event.target.checked)}
                />
                Publicar atividade ao criar
              </label>
            </div>

            <div className="space-y-3 border border-slate-300 bg-white p-4">
              <label className="block text-sm font-semibold text-slate-700">
                Alfabetizando para preview
              </label>
              <select
                value={selectedLearnerId}
                onChange={(event) => setSelectedLearnerId(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">
                  {learnersLoading
                    ? "Carregando alfabetizandos..."
                    : learners.length > 0
                      ? "Escolher alfabetizando"
                      : "Nenhum alfabetizando disponivel"}
                </option>
                {learners.map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.nome}
                    {learner.tutorNome ? ` - ${learner.tutorNome}` : ""}
                  </option>
                ))}
              </select>
              {learnersError ? (
                <p className="text-xs text-red-700">{learnersError}</p>
              ) : null}
              <input
                value={previewName}
                onChange={(event) => setPreviewName(event.target.value)}
                placeholder="Nome exibido no preview"
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-slate-500">
                Admin visualiza todos os alfabetizandos. No perfil alfabetizador, a lista mostra apenas os vinculados.
              </p>
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                Perfil da tela: <strong>Alfabetizando</strong>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold text-slate-900">Telas base</h2>
          <p className="text-sm text-slate-600">
            Telas base sao modelos visuais prontos para acelerar a aula. Se quiser montar do zero, voce pode deixar sem selecionar e seguir.
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="border border-slate-300 bg-white p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Para que serve tela base?</p>
              <p className="mt-1">
                Define a estrutura visual (posicao de imagens, caixas e botoes). O conteudo e as midias continuam sendo editados nos proximos passos.
              </p>
            </div>
            <div className="border border-slate-300 bg-white p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Nao encontrou uma tela pronta?</p>
              <p className="mt-1">Importe telas criadas pelo alfabetizador em arquivos de imagem/SVG e reutilize no wizard.</p>
              <button
                type="button"
                onClick={() => navigate("/admin/conteudo/importar-telas")}
                className="mt-2 inline-flex items-center gap-1 border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Importar telas agora
              </button>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Exibindo telas da {STAGE_OPTIONS.find((item) => item.value === stageNumber)?.label || "Etapa"} quando disponivel.
          </div>

          {selectedBlueprintIds.length > 0 ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBlueprintIds([])}
                className="border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Limpar selecao de telas
              </button>
            </div>
          ) : null}

          {hiddenNonVisualBlueprintCount > 0 ? (
            <p className="text-xs text-slate-500">
              {hiddenNonVisualBlueprintCount} arquivo(s) de audio/video foram ocultados desta selecao para ficar mais clara.
            </p>
          ) : null}

          {stageScopedBlueprintsVisible.length === 0 ? (
            <StateDisplay type="empty" message="Nenhuma tela base importada. Use 'Importar telas' antes." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {stageScopedBlueprintsVisible.map((blueprint) => {
                const selected = selectedBlueprintIds.includes(blueprint.id);
                const previewUrl = resolveBlueprintPreviewUrl(blueprint.svg_path);
                const previewUnavailable = !previewUrl || Boolean(blueprintPreviewErrors[blueprint.id]);
                return (
                  <button
                    key={blueprint.id}
                    type="button"
                    onClick={() => toggleBlueprint(blueprint.id)}
                    className={`border p-4 text-left transition ${
                      selected
                        ? "border-slate-900 bg-slate-100"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="mb-2 rounded border border-slate-200 bg-white p-1">
                      {previewUnavailable ? (
                        <div className="flex h-24 items-center justify-center px-2 text-center text-[11px] text-slate-500">
                          {getBlueprintPreviewFallbackMessage(blueprint.svg_path)}
                        </div>
                      ) : (
                        <img
                          src={previewUrl}
                          alt={blueprint.title}
                          className="h-24 w-full rounded object-contain"
                          loading="lazy"
                          onError={() => markBlueprintPreviewError(blueprint.id)}
                        />
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{blueprint.title}</p>
                        <p className="text-xs text-slate-600">{blueprint.svg_path}</p>
                        <p className="mt-1 text-xs text-slate-500">{blueprint.stage_tag || "Sem etapa"}</p>
                      </div>
                      {selected ? <Check className="h-4 w-4 text-slate-900" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase text-slate-700">Preview da tela selecionada</p>
            {selectedBlueprintPreview ? (
              selectedBlueprintPreviewUrl && !blueprintPreviewErrors[selectedBlueprintPreview.id] ? (
                <img
                  src={selectedBlueprintPreviewUrl}
                  alt={selectedBlueprintPreview.title}
                  className="mt-2 h-52 w-full rounded border border-slate-200 bg-slate-50 object-contain"
                  onError={() => markBlueprintPreviewError(selectedBlueprintPreview.id)}
                />
              ) : (
                <div className="mt-2 flex h-52 flex-col items-center justify-center gap-2 rounded border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-xs text-slate-500">
                  <p>{getBlueprintPreviewFallbackMessage(selectedBlueprintPreview.svg_path)}</p>
                  {isMobileBlueprintReference(selectedBlueprintPreview.svg_path) ? (
                    <button
                      type="button"
                      onClick={() => navigate("/admin/conteudo/importar-telas")}
                      className="border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      Importar tela com preview
                    </button>
                  ) : null}
                </div>
              )
            ) : (
              <div className="mt-2 flex h-52 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                Selecione uma tela para ver o preview ampliado.
              </div>
            )}
            {selectedBlueprintPreview ? (
              <div className="mt-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-900">{selectedBlueprintPreview.title}</p>
                <p>{selectedBlueprintPreview.stage_tag || "Sem etapa"}</p>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold text-slate-900">Orientacoes</h2>
          <p className="text-sm text-slate-600">
            Defina textos de apoio e o modelo da tela (padrao, marcar letra, marcar imagens ou bloqueada).
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 border border-slate-300 bg-white p-4">
              <label className="block text-sm font-semibold text-slate-700">Orientacao para o alfabetizador</label>
              <textarea
                value={orientationTutor}
                onChange={(event) => setOrientationTutor(event.target.value)}
                rows={4}
                placeholder="Ex.: Oriente o alfabetizando sobre a atividade."
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2 border border-slate-300 bg-white p-4">
              <label className="block text-sm font-semibold text-slate-700">Fala sugerida para o alfabetizando</label>
              <textarea
                value={orientationStudent}
                onChange={(event) => setOrientationStudent(event.target.value)}
                rows={4}
                placeholder="Ex.: Escute o audio e marque a resposta correta."
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 border border-slate-300 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-700">Modelo da tela</label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <button
                type="button"
                onClick={() => setScreenTemplate("default")}
                className={`border px-3 py-2 text-sm font-medium ${
                  screenTemplate === "default"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Padrao (texto e midia)
              </button>
              <button
                type="button"
                onClick={() => setScreenTemplate("exercise-match-letter")}
                className={`border px-3 py-2 text-sm font-medium ${
                  screenTemplate === "exercise-match-letter"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Marcar letra correta
              </button>
              <button
                type="button"
                onClick={() => setScreenTemplate("exercise-mark-images")}
                className={`border px-3 py-2 text-sm font-medium ${
                  screenTemplate === "exercise-mark-images"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                Marcar imagens corretas
              </button>
              <button
                type="button"
                onClick={() => setScreenTemplate("locked")}
                className={`border px-3 py-2 text-sm font-medium ${
                  screenTemplate === "locked"
                    ? "border-red-700 bg-red-700 text-white"
                    : "border-red-200 bg-white text-red-700"
                }`}
              >
                Tela bloqueada
              </button>
            </div>
          </div>

          {renderTemplateEditor()}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold text-slate-900">Midias</h2>
          <p className="text-sm text-slate-600">
            Upload de apoio da atividade com deteccao automatica de tipo. Voce pode usar arquivo, link manual ou selecionar da biblioteca salva.
          </p>

          <div className="space-y-3 border border-slate-300 bg-white p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <select
                value={assetStatus}
                onChange={(event) => setAssetStatus(event.target.value as AssetStatus)}
                className="border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="publicado">Publicado</option>
                <option value="rascunho">Rascunho</option>
                <option value="arquivado">Arquivado</option>
              </select>
              <div className="flex flex-wrap items-center gap-2 border border-slate-300 bg-white px-3 py-2 md:col-span-2">
                <label className="cursor-pointer border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  Imagem
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setAssetFile(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>
                <label className="cursor-pointer border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                  Audio
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => setAssetFile(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>
                <label className="cursor-pointer border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                  Video
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(event) => setAssetFile(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>
                <span className="max-w-[240px] truncate text-xs text-slate-600">
                  {assetFile ? assetFile.name : "Nenhum arquivo"}
                </span>
              </div>
            </div>
            <input
              value={assetLink}
              onChange={(event) => {
                const nextValue = event.target.value;
                const inferred = inferAssetKindFromPath(nextValue);
                if (inferred) {
                  setAssetKind(inferred);
                }
                setAssetLink(nextValue);
              }}
              placeholder="Link manual (opcional)"
              className="w-full border border-slate-300 px-3 py-2 text-sm"
            />
            {assetFile ? (
              <div className="flex items-start gap-3 rounded border border-slate-200 bg-slate-50 p-2">
                {(() => {
                  const previewKind = inferAssetKindFromFile(assetFile);
                  if (!assetPreviewUrl) {
                    return (
                      <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-[10px] text-slate-500">
                        {previewKind ?? "arquivo"}
                      </div>
                    );
                  }
                  if (assetFile.type.startsWith("image/")) {
                    return (
                      <img
                        src={assetPreviewUrl}
                        alt={assetFile.name}
                        className="h-20 w-20 rounded border border-slate-200 object-cover"
                      />
                    );
                  }
                  if (previewKind === "mp4") {
                    return <video src={assetPreviewUrl} className="h-20 w-32 rounded border border-slate-200 bg-black" muted />;
                  }
                  if (previewKind === "mp3") {
                    return <audio src={assetPreviewUrl} controls className="w-48" />;
                  }
                  return (
                    <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-slate-300 bg-white text-[10px] text-slate-500">
                      {previewKind ?? "arquivo"}
                    </div>
                  );
                })()}
                <div className="flex-1 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">{assetFile.name}</p>
                  <p>
                    {formatBytes(assetFile.size)} • Tipo detectado:{" "}
                    {inferAssetKindFromFile(assetFile) ?? "nao identificado"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                O tipo do arquivo e detectado automaticamente no upload. URL manual continua opcional.
              </p>
            )}

            <div className="space-y-2 border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-xs font-semibold uppercase text-slate-700">
                  Biblioteca de midias salvas
                </p>
                <p className="text-[11px] text-slate-500">
                  Tema atual: {selectedThemeForAssets?.title || "todos os temas"}
                </p>
                <input
                  value={assetSearch}
                  onChange={(event) => setAssetSearch(event.target.value)}
                  placeholder="Buscar por nome do arquivo"
                  className="w-full border border-slate-300 bg-white px-2 py-1.5 text-xs md:w-72"
                />
              </div>
              {filteredAssetsLibrary.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhuma midia encontrada para o filtro.</p>
              ) : (
                <div className="grid max-h-72 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAssetsLibrary.map((asset) => {
                    const isImage = ["png", "webp", "svg"].includes(asset.kind);
                    const isVideo = asset.kind === "mp4";
                    const isAudio = asset.kind === "mp3";
                    const displayName = getAssetDisplayName(asset.storage_path);
                    return (
                      <button
                        key={`wizard-library-${asset.id}`}
                        type="button"
                        onClick={() => applyAssetToLessonMedia(asset.storage_path)}
                        className="flex items-center gap-2 border border-slate-200 bg-white p-2 text-left text-xs hover:border-slate-400"
                      >
                        {isImage ? (
                          <img
                            src={resolveAssetImageUrl(asset.storage_path)}
                            alt={displayName}
                            className="h-12 w-12 shrink-0 rounded border border-slate-200 object-cover"
                            onError={(event) => {
                              event.currentTarget.style.visibility = "hidden";
                            }}
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
                            {isVideo ? "video" : isAudio ? "audio" : asset.kind}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-800">{displayName}</p>
                          <p className="truncate text-[10px] uppercase text-slate-500">{asset.kind}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-4xl font-semibold text-slate-900">Revisar e publicar</h2>
        <p className="text-sm text-slate-600">
          Confira o resumo abaixo. Ao clicar em <strong>{editingActivityId ? "Salvar alteracoes" : "Criar aula"}</strong>, o conteúdo {editingActivityId ? "atualizado" : "já"} fica disponível no app.
        </p>

        <div className="space-y-2 border border-slate-300 bg-white p-4 text-sm text-slate-700">
          <p>
            <strong>Tema:</strong> {selectedThemeTitle || "-"}
          </p>
          <p>
            <strong>Modulo:</strong> {moduleTitle || "-"}
          </p>
          <p>
            <strong>Aula:</strong> {lessonTitle || "-"}
          </p>
          <p>
            <strong>Tipo:</strong> {activityType}
          </p>
          <p>
            <strong>Template:</strong> {SCREEN_TEMPLATE_LABELS[screenTemplate]}
          </p>
          <p>
            <strong>Telas selecionadas:</strong> {selectedBlueprintIds.length}
          </p>
          <p>
            <strong>Orientacao alfabetizador:</strong> {orientationTutor || "-"}
          </p>
          <p>
            <strong>Orientacao alfabetizando:</strong> {orientationStudent || "-"}
          </p>
          <p>
            <strong>Motivo bloqueio:</strong> {lockReason || "-"}
          </p>
          <p>
            <strong>Mensagem bloqueio:</strong> {lockMessage || "-"}
          </p>
          <p>
            <strong>Midia:</strong> {assetFile ? assetFile.name : assetLink || "Sem midia"}
          </p>
          <p>
            <strong>Alfabetizando (preview):</strong> {previewName || "-"}
          </p>
        </div>

        {instructionsPayloadPreview ? (
          <div className="space-y-2 border border-slate-300 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
              Payload de instrucoes (gravado em learning_activities.instructions)
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-emerald-200">
              {instructionsPayloadPreview}
            </pre>
          </div>
        ) : null}
      </div>
    );
  };

  const renderPreviewBody = () => {
    if (screenTemplate === "locked") {
      return (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <div className="mb-2 flex items-center gap-1 font-semibold">
            <Lock className="h-3.5 w-3.5" />
            Tela bloqueada
          </div>
          <p>{lockMessage || lockReason || "pedido_ajuda"}</p>
          {lockAudioUrl ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-red-700">
              <Volume2 className="h-3.5 w-3.5" />
              Audio de bloqueio configurado
            </p>
          ) : null}
          <p className="mt-1">Somente o alfabetizador podera desbloquear esta tela.</p>
        </div>
      );
    }

    if (screenTemplate === "exercise-match-letter") {
      return (
        <div className="space-y-2 rounded border border-emerald-200 bg-emerald-50/40 p-2.5">
          <div className="flex items-center justify-between">
            <img src="/logo-letras.svg" alt="Letras" className="h-3.5 w-auto object-contain" />
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-600">
              <Volume2 className="h-3.5 w-3.5" />
            </span>
          </div>

          <p className="text-[11px] font-semibold text-emerald-700">
            {exerciseInstructionText || "Marque a caixa da letra correta"}
          </p>

          <div className="space-y-2">
            {matchRowsPayload.slice(0, 4).map((row, index) => {
              const placeholders = Math.max(3, Math.min(6, (row.label || "").replace(/\s+/g, "").length || 3));
              const showOptions = index === 0;
              const rowLabel = row.label?.trim() || `Item ${index + 1}`;
              const hasWordAudio = Boolean(row.wordAudioUrl || row.audioUrl || row.audioText);
              const hasSpellingAudio = Boolean(row.spellingAudioUrl || row.spellingText);
              const rowImageUrl = row.imageUrl ? resolveAssetImageUrl(row.imageUrl) : "";
              return (
                <div key={row.id} className="rounded border border-slate-200 bg-white p-2">
                  <div className="grid grid-cols-[36px_1fr] items-start gap-2">
                    {rowImageUrl ? (
                      <img
                        src={rowImageUrl}
                        alt={rowLabel}
                        className="h-9 w-9 rounded border border-slate-200 object-cover"
                        onError={(event) => {
                          event.currentTarget.style.visibility = "hidden";
                        }}
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 bg-slate-100 text-[9px] text-slate-500">
                        IMG
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <p className="break-words text-[11px] font-semibold text-slate-800">{rowLabel}</p>
                        {hasWordAudio || hasSpellingAudio ? (
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-600">
                            <Volume2 className="h-2.5 w-2.5" />
                          </span>
                        ) : null}
                      </div>

                      {showOptions ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {(row.options || []).slice(0, 5).map((option) => (
                            <span
                              key={`${row.id}-${option}`}
                              className={`inline-flex h-5 min-w-5 items-center justify-center border px-1 text-[10px] font-semibold ${
                                row.correctOptions?.includes(option)
                                  ? "border-emerald-500 bg-emerald-100 text-emerald-700"
                                  : "border-slate-300 bg-white text-slate-600"
                              }`}
                            >
                              {option}
                            </span>
                          ))}
                          <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500 bg-emerald-500 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: placeholders }).map((_, slot) => (
                            <span
                              key={`${row.id}-placeholder-${slot}`}
                              className="inline-flex h-5 min-w-5 items-center justify-center border border-slate-300 bg-white px-1 text-[10px] text-slate-400"
                            >
                              &nbsp;
                            </span>
                          ))}
                        </div>
                      )}

                      {row.notes ? (
                        <p className="break-words text-[10px] italic text-slate-500">{row.notes}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded border border-sky-300 bg-sky-50 p-2 text-[10px] text-sky-700">
            <p className="font-semibold">Reforco no erro</p>
            <p className="break-words">{reinforcementText || "Sem texto de reforco."}</p>
            <p>Retorno: {reinforcementAutoReturnValue}ms</p>
          </div>
        </div>
      );
    }

    if (screenTemplate === "exercise-mark-images") {
      return (
        <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-slate-800">
              {exerciseInstructionText || `Marque ${expectedSelectionsValue} imagem(ns) da letra ${targetLetter || "A"}`}
            </p>
            {exerciseInstructionAudioUrl ? <Volume2 className="h-3.5 w-3.5 text-slate-500" /> : null}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {markRowsPayload.slice(0, 6).map((row) => (
              <div
                key={row.id}
                className={`rounded border px-1.5 py-2 text-center text-[11px] ${
                  row.isCorrectTarget
                    ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                    : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                {row.imageUrl ? (
                  <img
                    src={resolveAssetImageUrl(row.imageUrl)}
                    alt={row.label}
                    className="mx-auto mb-1 h-10 w-10 rounded border border-slate-200 object-cover"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                  />
                ) : (
                  <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-100 text-[10px] text-slate-500">
                    IMG
                  </div>
                )}
                <p className="break-words">{row.label}</p>
                {row.notes ? (
                  <p className="mt-1 text-[10px] italic text-slate-500">{row.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="rounded border border-slate-200 bg-slate-50 p-2">
          <p className="text-[11px] font-semibold text-slate-700">Orientacoes</p>
          <p className="mt-1 text-[11px] text-slate-600">
            {orientationTutor.trim() || "Sem orientacao para alfabetizador."}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {orientationStudent.trim() || "Sem fala sugerida para alfabetizando."}
          </p>
        </div>

        <div className="rounded border border-slate-200 bg-slate-50 p-2">
          <p className="text-[11px] font-semibold text-slate-700">Midia da etapa</p>
          {!previewMediaUrl ? (
            <p className="mt-1 text-[11px] text-slate-600">Nenhuma midia selecionada.</p>
          ) : previewMediaKind === "mp4" ? (
            <video src={previewMediaUrl} controls className="mt-1 h-28 w-full rounded border border-slate-200 bg-black" />
          ) : previewMediaKind === "mp3" ? (
            <audio src={previewMediaUrl} controls className="mt-1 w-full" />
          ) : (
            <img src={previewMediaUrl} alt="Preview da midia" className="mt-1 h-28 w-full rounded border border-slate-200 object-cover" />
          )}
        </div>
      </>
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {editingActivityId ? (
        <div className="flex items-center justify-between border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <span>
            <strong className="mr-1">Editando aula:</strong>
            {lessonTitle || editingActivityId}
          </span>
          <button
            type="button"
            onClick={() => navigate("/admin/conteudo")}
            className="border border-emerald-600 bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
          >
            Sair do modo edicao
          </button>
        </div>
      ) : null}
      <div className="flex items-start justify-between">
        <button
          type="button"
          onClick={handleCancelWizard}
          className="text-sm text-slate-700 hover:underline"
        >
          Cancelar
        </button>
        <div className="text-right text-sm text-slate-600">
          <p>{selectedBlueprintIds.length} bloco(s)</p>
          <p>{assetFile || assetLink ? 1 : 0} midia(s)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-6 border border-slate-300 bg-slate-50 p-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Passo {Math.min(step + 1, STEPS.length)} de {STEPS.length}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {STEPS.map((label, index) => {
                const active = step === index;
                const done = step > index;
                const canJump = index <= step;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canJump}
                      onClick={() => setStep(index)}
                      className={`inline-flex items-center gap-2 border px-2 py-1.5 text-left transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : done
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-white text-slate-500"
                      } ${canJump ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center border border-current text-xs font-semibold">
                        {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                    {index < STEPS.length - 1 ? (
                      <div className={`h-px w-5 ${step > index ? "bg-emerald-400" : "bg-slate-300"}`} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {feedback ? (
            <div
              className={`border px-4 py-3 text-sm ${
                feedback.type === "ok"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-red-300 bg-red-50 text-red-700"
              }`}
            >
              {feedback.text}
            </div>
          ) : null}

          {pendingDraft && !draftGateReleased ? (
            <div className="space-y-2 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Rascunho encontrado</p>
              <p>Existe um preenchimento anterior salvo neste navegador. Voce quer restaurar?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={restorePendingDraft}
                  className="border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Restaurar rascunho
                </button>
                <button
                  type="button"
                  onClick={discardPendingDraft}
                  className="border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Descartar rascunho
                </button>
              </div>
            </div>
          ) : null}

          {STEP_HELPERS[step] && !wizardDone ? (
            <div className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <strong className="mr-1 text-slate-900">Este passo:</strong>
              {STEP_HELPERS[step]}
            </div>
          ) : null}

          {localError ? (
            <div className="flex items-start gap-2 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong className="mr-1">Corrija antes de avançar:</strong>
                {localError}
              </span>
            </div>
          ) : null}

          {wizardDone ? (
            <div className="space-y-4 border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
              <p className="text-lg font-semibold">Aula criada com sucesso!</p>
              <p className="text-sm">
                A aula já está disponível no aplicativo dos alfabetizandos. Abra o <strong>Mobile de teste</strong> ao lado para validar.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/admin/conteudo")}
                  className="border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Voltar ao painel
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/mobile/modulos")}
                  className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                >
                  Abrir mobile de teste
                </button>
              </div>
            </div>
          ) : (
            <>
              {renderStep()}

              <div className="flex items-center justify-between border-t border-slate-300 pt-4">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0}
                  className="inline-flex items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>

                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Proximo
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || Boolean(busy)}
                    className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {submitting
                      ? editingActivityId
                        ? "Salvando..."
                        : "Publicando..."
                      : editingActivityId
                        ? "Salvar alteracoes"
                        : "Criar aula"}
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4 border border-slate-300 bg-white p-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-slate-700" />
              <p className="text-sm font-semibold text-slate-900">Preview mobile</p>
            </div>
            <span className="border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {currentStepLabel}
            </span>
          </div>

          <div className="mx-auto w-[280px] rounded-[30px] border-[6px] border-slate-900 bg-white px-3 pb-4 pt-5">
            {isMatchLetterPreview ? (
              <div className="space-y-2 rounded border border-slate-200 bg-white p-2.5">
                {renderPreviewBody()}
                <div className="pt-1 text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  <span className="inline-flex items-center gap-1">
                    AVANCAR
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[11px] font-medium text-slate-700">
                  Tela do Alfabetizando
                </div>

                <div className="space-y-3 rounded border border-slate-200 bg-white p-3">
                  <div>
                    <p className="text-[11px] text-slate-500">Tema</p>
                    <p className="text-xs font-semibold text-slate-900">{selectedThemeTitle || "Tema em definicao"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Modulo</p>
                    <p className="text-sm font-semibold text-slate-900">{moduleTitle || "Novo modulo"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Aula</p>
                    <p className="text-sm text-slate-800">{lessonTitle || "Nova aula"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] text-slate-500">Alfabetizando</p>
                      <p className="text-xs text-slate-800">{previewName || "Alfabetizando"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Template</p>
                      <p className="text-xs text-slate-800">{SCREEN_TEMPLATE_LABELS[screenTemplate]}</p>
                    </div>
                  </div>

                  {renderPreviewBody()}

                  {selectedBlueprints.length > 0 ? (
                    <div className="rounded border border-slate-200 bg-slate-50 p-2">
                      <p className="text-[11px] font-semibold text-slate-700">Tela base selecionada</p>
                      {selectedBlueprintPreview && selectedBlueprintPreviewUrl && !blueprintPreviewErrors[selectedBlueprintPreview.id] ? (
                        <img
                          src={selectedBlueprintPreviewUrl}
                          alt={selectedBlueprintPreview.title}
                          className="mt-1 h-24 w-full rounded border border-slate-200 bg-white object-contain"
                          onError={() => markBlueprintPreviewError(selectedBlueprintPreview.id)}
                        />
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-600">
                          {getBlueprintPreviewFallbackMessage(selectedBlueprintPreview?.svg_path || "")}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-700">
                        {selectedBlueprintPreview?.title || selectedBlueprints[0]?.title || "Tela vinculada"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {selectedBlueprints.length} tela(s) vinculada(s)
                      </p>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </form>
  );
}


