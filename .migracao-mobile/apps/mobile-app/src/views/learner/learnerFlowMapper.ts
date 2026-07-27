import { getHintSlugForTemplate } from "./hintVideos";

export type LearnerMediaKind = "video" | "audio" | "image" | null;
export type LearnerScreenTemplate =
  | "default"
  | "exercise-match-letter"
  | "exercise-mark-images"
  | "locked";

export interface LearnerExerciseItem {
  id: string;
  label: string;
  imageUrl: string | null;
  audioUrl: string | null;
  wordAudioUrl: string | null;
  spellingAudioUrl: string | null;
  options: string[];
  correctOptions: string[];
  isCorrectTarget: boolean;
}

export interface LearnerErrorReinforcementConfig {
  instructionText: string | null;
  instructionAudioUrl: string | null;
  autoReturnMs: number;
  preserveProgress: boolean;
}

export interface LearnerExerciseConfig {
  template: Exclude<LearnerScreenTemplate, "default" | "locked">;
  targetLetter: string | null;
  instructionText: string | null;
  instructionAudioUrl: string | null;
  expectedSelections: number | null;
  maxAttemptsBeforeLock: number;
  progressiveUnlock: boolean;
  successFeedback: string | null;
  errorFeedback: string | null;
  errorReinforcement: LearnerErrorReinforcementConfig | null;
  items: LearnerExerciseItem[];
}

export interface LearnerFlowActivity {
  id: string;
  title: string;
  educatorGuidance: string | null;
  learnerSpeech: string | null;
  narrationAudioUrl: string | null;
  mediaUrl: string | null;
  mediaKind: LearnerMediaKind;
  completionMessage: string | null;
  screenTemplate: LearnerScreenTemplate;
  lockReason: string | null;
  lockMessage: string | null;
  lockAudioUrl: string | null;
  exercise: LearnerExerciseConfig | null;
}

export interface LearnerFlowScreen {
  id: string;
  title: string;
  educatorGuidance: string | null;
  learnerSpeech: string | null;
  narrationAudioUrl: string | null;
  mediaUrl: string | null;
  mediaKind: LearnerMediaKind;
  highlightMessage: string | null;
  followUpActivity: LearnerFlowActivity | null;
  screenTemplate: LearnerScreenTemplate;
  lockReason: string | null;
  lockMessage: string | null;
  lockAudioUrl: string | null;
  exercise: LearnerExerciseConfig | null;
  hintVideoUrl: string | null;
}

export interface LearnerFlowLesson {
  id: string;
  /** ID da primeira Activity real do unit — usado para gravar e checar progresso. */
  progressId: string;
  title: string;
  objective: string;
  moduleLabel: string;
  moduleTitle: string;
  stageNumber: number;
  screens: LearnerFlowScreen[];
  conclusionTitle: string;
  conclusionMessage: string;
  accessStatus: "locked" | "available";
  progressStatus: "not_started" | "in_progress" | "completed";
  attemptCount: number;
  pointsAwarded: number;
}

export interface LearnerFlowModule {
  id: string;
  title: string;
  subtitle: string;
  lessons: LearnerFlowLesson[];
}

interface PainelAsset {
  id: string;
  activity_id?: string;
  kind?: string;
  storage_path?: string;
  sourceUrl?: string;
  title: string | null;
  created_at?: string;
}

interface PainelActivityAsset {
  role: string | null;
  asset: PainelAsset;
}

interface PainelActivity {
  id: string;
  module_id?: string;
  order?: number;
  sort_order?: number;
  title: string | null;
  is_published?: boolean;
  prompt?: string;
  instructions?: string | null;
  content?: Record<string, unknown> | null;
  instructorGuidance?: string | null;
  learnerGuidance?: string | null;
  hint_video_id?: string | null;
  assets: PainelActivityAsset[];
}

interface PainelLearningUnit {
  id: string;
  slug?: string;
  theme_id?: string;
  stage_id?: string | null;
  stage_number?: number;
  order?: number;
  sort_order?: number;
  is_active?: boolean;
  title: string;
  description: string | null;
  activities: PainelActivity[];
}

interface PainelTheme {
  id: string;
  slug?: string;
  title?: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
  description: string | null;
  learningUnits?: PainelLearningUnit[];
}

interface PainelBlueprint {
  id: string;
  module_code?: string | null;
  stage_tag?: string | null;
  slug?: string;
  title?: string;
}

interface PainelMediaLibraryItem {
  id: string;
  slug?: string;
  public_url?: string | null;
  storage_path?: string | null;
}

interface PainelStage {
  id: string;
  theme_id?: string;
  stage_number?: number;
  title?: string;
  is_active?: boolean;
}

export interface PainelConteudoResponse {
  themes: PainelTheme[];
  stages?: PainelStage[];
  modules?: PainelLearningUnit[];
  activities?: PainelActivity[];
  assets?: PainelAsset[];
  blueprints?: PainelBlueprint[];
  mediaLibrary?: PainelMediaLibraryItem[];
}

interface ParsedInstructionBundle {
  educatorGuidance: string | null;
  learnerSpeech: string | null;
  narrationAudioUrl: string | null;
  screenTemplate: LearnerScreenTemplate;
  lockReason: string | null;
  lockMessage: string | null;
  lockAudioUrl: string | null;
  exercise: LearnerExerciseConfig | null;
}

interface ActivityAssetReference {
  url: string;
  kind: LearnerMediaKind;
}

const DEMO_CONTENT_PATTERN =
  /\b(demo|e2e)\b|demo mvp|aula padrao|marcar letra \d{8}|marcar imagens \d{8}|\d{8}-\d{6}/i;

function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function containsDemoContent(...values: unknown[]): boolean {
  return values.some((value) =>
    DEMO_CONTENT_PATTERN.test(normalizeSearchText(value)),
  );
}

function isDemoTheme(theme: PainelTheme): boolean {
  return containsDemoContent(
    theme.id,
    theme.slug,
    theme.title,
    theme.name,
    theme.description,
  );
}

function isDemoModule(moduleItem: PainelLearningUnit): boolean {
  return containsDemoContent(
    moduleItem.id,
    moduleItem.slug,
    moduleItem.title,
    moduleItem.description,
  );
}

function isDemoActivity(activity: PainelActivity): boolean {
  return containsDemoContent(
    activity.id,
    activity.title,
    activity.prompt,
    activity.instructions,
    activity.instructorGuidance,
    activity.learnerGuidance,
  );
}

export function getLearnerVisibleExerciseLabel(
  label: string,
  itemIndex: number,
): string | null {
  const normalized = normalizeSearchText(label);
  const leaksAnswer =
    /^imagem\s+(correta|distratora|errada)$/.test(normalized) ||
    /^opcao\s+(correta|distratora|errada)\s*\d*$/.test(normalized) ||
    /(^|\s)(correta|distratora|errada)($|\s)/.test(normalized);

  if (leaksAnswer) {
    return null;
  }

  return label.trim() || `Imagem ${itemIndex + 1}`;
}

function compareWithIdTieBreaker(
  firstValue: number,
  secondValue: number,
  firstId: string | null | undefined,
  secondId: string | null | undefined,
): number {
  const primaryDiff = Number(firstValue) - Number(secondValue);
  if (primaryDiff !== 0) return primaryDiff;
  return String(firstId || "").localeCompare(String(secondId || ""));
}

function mapAssetKind(kind: string | null | undefined): LearnerMediaKind {
  const normalized = String(kind || "")
    .trim()
    .toLowerCase();
  if (["video", "mp4"].includes(normalized)) return "video";
  if (["audio", "mp3"].includes(normalized)) return "audio";
  if (["image", "gif", "svg", "png", "jpg", "jpeg"].includes(normalized))
    return "image";
  return null;
}

function mapAssetKindByUrl(url: string | null | undefined): LearnerMediaKind {
  const normalized = String(url || "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  const cleanPath = normalized.split("?")[0].split("#")[0];
  if (/\.(mp4|mov|m4v|webm|ogv)$/i.test(cleanPath)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg|oga)$/i.test(cleanPath)) return "audio";
  if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(cleanPath)) return "image";
  return null;
}

function resolveAssetKind(
  kind: string | null | undefined,
  url: string | null | undefined,
): LearnerMediaKind {
  const kindFromField = mapAssetKind(kind);
  const kindFromUrl = mapAssetKindByUrl(url);
  if (!kindFromField) return kindFromUrl;
  if (!kindFromUrl) return kindFromField;
  return kindFromField === kindFromUrl ? kindFromField : kindFromUrl;
}

function toOptionalText(value: unknown): string | null {
  const text = sanitizeText(String(value ?? "").trim());
  return text.length > 0 ? text : null;
}

function normalizeLetterToken(value: unknown): string | null {
  const asText = toOptionalText(value);
  if (!asText) return null;
  return asText.replace(/\s+/g, "").toUpperCase();
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeLetterToken(item))
    .filter((item): item is string => Boolean(item));
}

function normalizeExerciseTemplate(
  value: unknown,
): LearnerExerciseConfig["template"] | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;

  if (
    [
      "exercise-match-letter",
      "match-letter",
      "mark-letter-box",
      "marcar-quadrado-letra",
      "modelo-ensino-1",
      "rn121",
    ].includes(normalized)
  ) {
    return "exercise-match-letter";
  }

  if (
    [
      "exercise-mark-images",
      "mark-images",
      "marcar-caixas",
      "marcar-caixas-imagens",
      "modelo-exercicio-marcar-caixas",
      "rn123",
    ].includes(normalized)
  ) {
    return "exercise-mark-images";
  }

  return null;
}

function normalizeScreenTemplate(value: unknown): LearnerScreenTemplate {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return "default";

  if (
    ["locked", "locked-screen", "tela-bloqueada", "rn119", "rn120"].includes(
      normalized,
    )
  ) {
    return "locked";
  }

  const exerciseTemplate = normalizeExerciseTemplate(value);
  if (exerciseTemplate === "exercise-match-letter")
    return "exercise-match-letter";
  if (exerciseTemplate === "exercise-mark-images")
    return "exercise-mark-images";

  return "default";
}

function looksLikeStructuredJson(text: string): boolean {
  const normalized = String(text || "").trim();
  if (!normalized.startsWith("{") || !normalized.endsWith("}")) {
    return false;
  }
  return normalized.includes(":") && normalized.includes('"');
}

function tryParseInstructionJsonObject(
  rawValue: string,
): Record<string, unknown> | null {
  const normalized = String(rawValue || "").trim();
  if (!looksLikeStructuredJson(normalized)) {
    return null;
  }

  const parseCandidate = (candidate: string) => {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  };

  const direct = parseCandidate(normalized);
  if (direct) {
    return direct;
  }

  const withoutFence = normalized
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const normalizedQuotes = withoutFence
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
  const withoutTrailingCommas = normalizedQuotes.replace(/,\s*([}\]])/g, "$1");
  return parseCandidate(withoutTrailingCommas);
}

function buildLegacyGuidance(
  instructions: string,
): Pick<ParsedInstructionBundle, "educatorGuidance" | "learnerSpeech"> {
  const normalized = String(instructions || "").trim();
  if (!normalized) {
    return {
      educatorGuidance: null,
      learnerSpeech: null,
    };
  }

  const parts = normalized
    .split(/\n{2,}/g)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      educatorGuidance: null,
      learnerSpeech: null,
    };
  }

  return {
    educatorGuidance: parts[0] || null,
    learnerSpeech: parts[1] || null,
  };
}

function normalizeExerciseItem(
  rawItem: unknown,
  itemIndex: number,
  template: LearnerExerciseConfig["template"],
  targetLetter: string | null,
): LearnerExerciseItem | null {
  if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
    return null;
  }

  const item = rawItem as Record<string, unknown>;
  const id = toOptionalText(item.id) || `item-${itemIndex + 1}`;
  const label =
    toOptionalText(item.label) ||
    toOptionalText(item.word) ||
    toOptionalText(item.title) ||
    `Item ${itemIndex + 1}`;
  const imageUrl =
    toOptionalText(item.imageUrl) ||
    toOptionalText(item.image) ||
    toOptionalText(item.storagePath);
  const wordAudioUrl =
    toOptionalText(item.wordAudioUrl) ||
    toOptionalText(item.audioUrl) ||
    toOptionalText(item.audio);
  const spellingAudioUrl =
    toOptionalText(item.spellingAudioUrl) ||
    toOptionalText(item.lettersAudioUrl) ||
    toOptionalText(item.spellAudioUrl);
  const audioUrl = wordAudioUrl;

  const optionsFromArray = normalizeStringList(item.options);
  const optionsFromText = toOptionalText(item.optionsText)
    ? String(item.optionsText)
        .split(/[,\s]+/g)
        .map((token) => normalizeLetterToken(token))
        .filter((token): token is string => Boolean(token))
    : [];
  const options = [...new Set([...optionsFromArray, ...optionsFromText])];

  const answerCandidate =
    normalizeLetterToken(item.answer) ||
    normalizeLetterToken(item.correctOption) ||
    normalizeLetterToken(item.correctLetter);
  const correctFromArray = normalizeStringList(item.correctOptions);
  const correctOptions = [
    ...new Set([
      ...(answerCandidate ? [answerCandidate] : []),
      ...correctFromArray,
    ]),
  ];

  const startsWithTarget =
    targetLetter && label.length > 0
      ? label.toUpperCase().startsWith(targetLetter)
      : false;
  // "isCorrect" é o nome de campo gravado pelo editor de blocos (schema
  // letras-stage2-v1, ainda a maioria do conteúdo publicado); "isCorrectTarget"
  // é o nome usado internamente aqui e no editor v2. Sem este fallback, todo
  // item de exercise-mark-images cai no heurístico startsWithTarget — que é
  // sempre falso nesse template (sem letraAlvo), travando o exercício inteiro.
  const explicitTarget =
    typeof item.isCorrectTarget === "boolean"
      ? item.isCorrectTarget
      : typeof item.isCorrect === "boolean"
        ? item.isCorrect
        : startsWithTarget;

  const fallbackOptions =
    template === "exercise-match-letter"
      ? [
          ...new Set([
            ...(options.length > 0 ? options : []),
            ...(targetLetter ? [targetLetter] : []),
          ]),
        ]
      : options;

  return {
    id,
    label,
    imageUrl,
    audioUrl,
    wordAudioUrl,
    spellingAudioUrl,
    options: fallbackOptions,
    correctOptions:
      correctOptions.length > 0
        ? correctOptions
        : targetLetter
          ? [targetLetter]
          : [],
    isCorrectTarget: explicitTarget,
  };
}

function normalizeErrorReinforcementConfig(
  value: unknown,
): LearnerErrorReinforcementConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const mode = String(payload.mode ?? "")
    .trim()
    .toLowerCase();
  if (mode && mode !== "reinforcement-screen") {
    return null;
  }

  const autoReturnRaw = Number(
    payload.autoReturnMs ?? payload.durationMs ?? payload.returnMs ?? 2500,
  );
  const autoReturnMs =
    Number.isFinite(autoReturnRaw) && autoReturnRaw >= 500
      ? Math.floor(autoReturnRaw)
      : 2500;

  return {
    instructionText:
      toOptionalText(payload.instructionText) ||
      toOptionalText(payload.message) ||
      null,
    instructionAudioUrl:
      toOptionalText(payload.instructionAudioUrl) ||
      toOptionalText(payload.audioUrl) ||
      null,
    autoReturnMs,
    preserveProgress: payload.preserveProgress !== false,
  };
}

function normalizeExerciseConfig(
  rawExercise: unknown,
): LearnerExerciseConfig | null {
  if (
    !rawExercise ||
    typeof rawExercise !== "object" ||
    Array.isArray(rawExercise)
  ) {
    return null;
  }

  const exercise = rawExercise as Record<string, unknown>;
  const template = normalizeExerciseTemplate(exercise.template);
  if (!template) {
    return null;
  }

  const targetLetter =
    normalizeLetterToken(exercise.targetLetter) ||
    normalizeLetterToken(exercise.letter) ||
    null;
  const expectedSelectionsRaw = Number(
    exercise.expectedSelections ?? exercise.requiredSelections ?? null,
  );
  const expectedSelections =
    Number.isFinite(expectedSelectionsRaw) && expectedSelectionsRaw > 0
      ? Math.floor(expectedSelectionsRaw)
      : null;
  const attemptsRaw = Number(
    exercise.maxAttemptsBeforeLock ?? exercise.maxAttempts ?? 3,
  );
  const maxAttemptsBeforeLock =
    Number.isFinite(attemptsRaw) && attemptsRaw > 0
      ? Math.floor(attemptsRaw)
      : 3;
  const progressiveUnlock =
    typeof exercise.progressiveUnlock === "boolean"
      ? exercise.progressiveUnlock
      : false;

  const rawItems = Array.isArray(exercise.items) ? exercise.items : [];
  const items = rawItems
    .map((rawItem, itemIndex) =>
      normalizeExerciseItem(rawItem, itemIndex, template, targetLetter),
    )
    .filter((item): item is LearnerExerciseItem => Boolean(item));

  if (items.length === 0) {
    return null;
  }

  const inferredExpectedSelections =
    template === "exercise-mark-images"
      ? items.filter((item) => item.isCorrectTarget).length ||
        expectedSelections ||
        1
      : expectedSelections || 1;

  const feedbackFlow =
    exercise.feedbackFlow &&
    typeof exercise.feedbackFlow === "object" &&
    !Array.isArray(exercise.feedbackFlow)
      ? (exercise.feedbackFlow as Record<string, unknown>)
      : null;
  const errorReinforcement = normalizeErrorReinforcementConfig(
    feedbackFlow?.onError ??
      exercise.errorReinforcement ??
      exercise.reinforcement,
  );

  return {
    template,
    targetLetter,
    instructionText:
      toOptionalText(exercise.instructionText) ||
      toOptionalText(exercise.instruction),
    instructionAudioUrl:
      toOptionalText(exercise.instructionAudioUrl) ||
      toOptionalText(exercise.audioUrl) ||
      null,
    expectedSelections: inferredExpectedSelections,
    maxAttemptsBeforeLock,
    progressiveUnlock,
    successFeedback: toOptionalText(exercise.successFeedback),
    errorFeedback: toOptionalText(exercise.errorFeedback),
    errorReinforcement,
    items,
  };
}

function hydrateExerciseWithAssets(
  exercise: LearnerExerciseConfig | null,
  assetReferences: ActivityAssetReference[],
): LearnerExerciseConfig | null {
  if (!exercise) return null;

  const audioUrls = assetReferences
    .filter((asset) => asset.kind === "audio")
    .map((asset) => asset.url);
  const imageUrls = assetReferences
    .filter((asset) => asset.kind === "image")
    .map((asset) => asset.url);

  let imageCursor = 0;
  let audioCursor = 0;
  const nextItems = exercise.items.map((item) => {
    const nextImage = item.imageUrl || imageUrls[imageCursor] || null;
    if (!item.imageUrl && nextImage) {
      imageCursor += 1;
    }

    const nextWordAudio =
      item.wordAudioUrl || item.audioUrl || audioUrls[audioCursor] || null;
    if (!item.wordAudioUrl && !item.audioUrl && nextWordAudio) {
      audioCursor += 1;
    }
    const nextSpellingAudio = item.spellingAudioUrl || null;

    return {
      ...item,
      imageUrl: nextImage,
      audioUrl: nextWordAudio,
      wordAudioUrl: nextWordAudio,
      spellingAudioUrl: nextSpellingAudio,
    };
  });

  return {
    ...exercise,
    instructionAudioUrl:
      exercise.instructionAudioUrl || audioUrls[audioCursor] || null,
    items: nextItems,
  };
}

function parseGuidance(
  instructions: string | null | undefined,
  assetReferences: ActivityAssetReference[] = [],
): ParsedInstructionBundle {
  const normalized = String(instructions || "").trim();
  if (!normalized) {
    return {
      educatorGuidance: null,
      learnerSpeech: null,
      narrationAudioUrl: null,
      screenTemplate: "default",
      lockReason: null,
      lockMessage: null,
      lockAudioUrl: null,
      exercise: null,
    };
  }

  const parsed = tryParseInstructionJsonObject(normalized);
  if (parsed) {
    const screenTemplate = normalizeScreenTemplate(
      parsed.screenTemplate ?? parsed.template,
    );
    const legacyGuidance = buildLegacyGuidance(
      [
        toOptionalText(parsed.educatorGuidance) ||
          toOptionalText(parsed.orientacaoAlfabetizador) ||
          "",
        toOptionalText(parsed.learnerSpeech) ||
          toOptionalText(parsed.orientacaoAlfabetizando) ||
          "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
    const explicitEducator =
      toOptionalText(parsed.educatorGuidance) ||
      toOptionalText(parsed.orientacaoAlfabetizador);
    const explicitLearner =
      toOptionalText(parsed.learnerSpeech) ||
      toOptionalText(parsed.orientacaoAlfabetizando);
    const narrationAudioUrl =
      toOptionalText(parsed.narrationAudioUrl) ||
      toOptionalText(parsed.audioNarrationUrl) ||
      null;
    const lockReason =
      toOptionalText(parsed.lockReason) ||
      toOptionalText(parsed.blockReason) ||
      null;
    const lockMessage =
      toOptionalText(parsed.lockMessage) ||
      toOptionalText(parsed.blockMessage) ||
      null;
    const lockAudioUrl =
      toOptionalText(parsed.lockAudioUrl) ||
      toOptionalText(parsed.blockAudioUrl) ||
      null;
    const parsedExercise = normalizeExerciseConfig(
      parsed.exercise ?? parsed.interaction,
    );

    return {
      educatorGuidance: explicitEducator ?? legacyGuidance.educatorGuidance,
      learnerSpeech: explicitLearner ?? legacyGuidance.learnerSpeech,
      narrationAudioUrl,
      screenTemplate:
        parsedExercise?.template === "exercise-match-letter"
          ? "exercise-match-letter"
          : parsedExercise?.template === "exercise-mark-images"
            ? "exercise-mark-images"
            : screenTemplate,
      lockReason,
      lockMessage,
      lockAudioUrl,
      exercise: hydrateExerciseWithAssets(parsedExercise, assetReferences),
    };
  }

  if (looksLikeStructuredJson(normalized)) {
    return {
      educatorGuidance: null,
      learnerSpeech: null,
      narrationAudioUrl: null,
      screenTemplate: "default",
      lockReason: null,
      lockMessage: null,
      lockAudioUrl: null,
      exercise: null,
    };
  }

  const legacy = buildLegacyGuidance(normalized);
  return {
    educatorGuidance: legacy.educatorGuidance,
    learnerSpeech: legacy.learnerSpeech,
    narrationAudioUrl: null,
    screenTemplate: "default",
    lockReason: null,
    lockMessage: null,
    lockAudioUrl: null,
    exercise: null,
  };
}

function getActivityInstructions(activity: PainelActivity): string | null {
  const directInstructions = toOptionalText(activity.instructions);
  if (directInstructions) return directInstructions;

  const content = activity.content;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return null;
  }

  return toOptionalText(content.instructions);
}

function mergeAudioIntoFollowingExercise(
  blocks: Record<string, unknown>[],
): Record<string, unknown>[] {
  // Quando um bloco do tipo audio precede um bloco de exercicio, fundimos o
  // audio na instrucao do proprio exercicio (instructionAudioUrl) e descartamos
  // a tela standalone. Evita duplicar o "Ouca o audio" em uma tela exclusiva
  // quando o speaker do exercicio ja serve para reouvir a mesma orientacao.
  const result: Record<string, unknown>[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockType = String(block.type ?? "")
      .trim()
      .toLowerCase();

    if (blockType !== "audio") {
      result.push(block);
      continue;
    }

    const audioUrl =
      toOptionalText(block.audioUrl) ||
      toOptionalText(block.sourceUrl) ||
      toOptionalText(block.mediaUrl);
    const next = blocks[i + 1];
    const nextType = next
      ? String(next.type ?? "")
          .trim()
          .toLowerCase()
      : "";
    const isNextExercise = nextType.startsWith("exercise-");

    if (!audioUrl) {
      // Bloco de audio sem URL — preserva o bloco sem audioUrl para manter
      // a contagem de screens e evitar deslocamento de screenIndex.
      result.push({ ...block, audioUrl: null });
      continue;
    }
    if (!isNextExercise || !next) {
      result.push(block);
      continue;
    }

    const existingExercise =
      next.exercise &&
      typeof next.exercise === "object" &&
      !Array.isArray(next.exercise)
        ? (next.exercise as Record<string, unknown>)
        : {};
    const existingExerciseAudio = toOptionalText(
      existingExercise.instructionAudioUrl,
    );
    const existingBlockAudio =
      toOptionalText(next.instructionAudioUrl) ||
      toOptionalText(next.instrAudioUrl);

    result.push({
      ...next,
      instructionAudioUrl: existingBlockAudio || audioUrl,
      exercise: existingExerciseAudio
        ? existingExercise
        : { ...existingExercise, instructionAudioUrl: audioUrl },
    });
    i += 1;
  }
  return result;
}

function getCompositeBlocks(
  instructions: string | null | undefined,
): Record<string, unknown>[] | null {
  const parsed = tryParseInstructionJsonObject(
    String(instructions || "").trim(),
  );
  if (!parsed) return null;

  const template = String(parsed.screenTemplate ?? parsed.template ?? "")
    .trim()
    .toLowerCase();
  const blocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
  if (template !== "composite" || blocks.length === 0) {
    return null;
  }

  // Blocos marcados como audience=educator sao orientacoes para o alfabetizador
  // e nao devem virar telas do fluxo do alfabetizando.
  const filtered = blocks.filter((block): block is Record<string, unknown> => {
    if (!block || typeof block !== "object" || Array.isArray(block))
      return false;
    const audience = String((block as Record<string, unknown>).audience ?? "")
      .trim()
      .toLowerCase();
    return (
      audience !== "educator" &&
      audience !== "tutor" &&
      audience !== "alfabetizador"
    );
  });

  return mergeAudioIntoFollowingExercise(filtered);
}

function buildBlockExercisePayload(
  block: Record<string, unknown>,
): Record<string, unknown> | null {
  const blockType = toOptionalText(block.type);
  const rawExercise =
    block.exercise &&
    typeof block.exercise === "object" &&
    !Array.isArray(block.exercise)
      ? { ...(block.exercise as Record<string, unknown>) }
      : {};
  const template = normalizeExerciseTemplate(rawExercise.template ?? blockType);
  if (!template) {
    return null;
  }

  const instructionText =
    toOptionalText(block.instructionText) || toOptionalText(block.instrText);
  const instructionAudioUrl =
    toOptionalText(block.instructionAudioUrl) ||
    toOptionalText(block.instrAudioUrl);
  const targetLetter =
    normalizeLetterToken(block.targetLetter) ||
    normalizeLetterToken(block.letraAlvo);

  return {
    ...rawExercise,
    template,
    targetLetter: rawExercise.targetLetter ?? targetLetter,
    instructionText: rawExercise.instructionText ?? instructionText,
    instructionAudioUrl: rawExercise.instructionAudioUrl ?? instructionAudioUrl,
    expectedSelections:
      rawExercise.expectedSelections ?? block.expectedSelections,
    progressiveUnlock: rawExercise.progressiveUnlock ?? block.progressiveUnlock,
  };
}

function mapCompositeBlockToScreen(
  activity: PainelActivity,
  block: Record<string, unknown>,
  blockIndex: number,
  assetReferences: ActivityAssetReference[],
): LearnerFlowScreen {
  const blockType = toOptionalText(block.type) || "default";
  const audience = String(block.audience ?? "")
    .trim()
    .toLowerCase();
  const content = toOptionalText(block.content);
  const caption = toOptionalText(block.caption);
  const label = toOptionalText(block.label);
  const instructionText =
    toOptionalText(block.instructionText) ||
    toOptionalText(block.instrText) ||
    (blockType === "text" && audience !== "educator" ? content : null) ||
    (blockType === "image" || blockType === "gif" ? caption : null) ||
    (blockType === "audio" ? label : null);
  const notes = toOptionalText(block.notes);
  const exercisePayload = buildBlockExercisePayload(block);
  const guidancePayload = {
    screenTemplate: blockType,
    educatorGuidance:
      notes ||
      (blockType === "text" && audience === "educator" ? content : null) ||
      instructionText ||
      normalizeText(activity.prompt, ""),
    learnerSpeech: instructionText || null,
    exercise: exercisePayload,
  };
  const guidance = parseGuidance(
    JSON.stringify(guidancePayload),
    assetReferences,
  );
  const mediaUrl =
    toOptionalText(block.videoUrl) ||
    toOptionalText(block.imageUrl) ||
    toOptionalText(block.audioUrl) ||
    toOptionalText(block.url) ||
    toOptionalText(block.sourceUrl) ||
    toOptionalText(block.mediaUrl);
  const normalizedBlockType = String(blockType || "")
    .trim()
    .toLowerCase();
  const fallbackTitleByType = (() => {
    if (exercisePayload?.template === "exercise-match-letter")
      return "Encontre a letra";
    if (exercisePayload?.template === "exercise-mark-images")
      return "Marque as imagens";
    if (normalizedBlockType === "video") {
      return blockIndex === 0 ? "Vídeo de abertura" : "Vídeo da aula";
    }
    if (normalizedBlockType === "image" || normalizedBlockType === "gif")
      return "Observe a imagem";
    if (normalizedBlockType === "audio") return "Ouça o áudio";
    if (normalizedBlockType === "text") return "Leia com atenção";
    return null;
  })();

  const title =
    toOptionalText(block.title) ||
    fallbackTitleByType ||
    `Tela ${blockIndex + 1}`;

  const blockNarrationAudioUrl =
    normalizedBlockType === "text"
      ? toOptionalText(block.narrationAudioUrl) ||
        toOptionalText(block.audioNarrationUrl) ||
        null
      : null;

  return {
    id: `${activity.id}-${toOptionalText(block.id) || `bloco-${blockIndex + 1}`}`,
    title,
    educatorGuidance: guidance.educatorGuidance,
    learnerSpeech: guidance.learnerSpeech,
    narrationAudioUrl: blockNarrationAudioUrl ?? guidance.narrationAudioUrl,
    mediaUrl,
    mediaKind: resolveAssetKind(blockType, mediaUrl),
    highlightMessage: null,
    followUpActivity: null,
    screenTemplate: guidance.screenTemplate,
    lockReason: guidance.lockReason,
    lockMessage: guidance.lockMessage,
    lockAudioUrl: guidance.lockAudioUrl,
    exercise: guidance.exercise,
    hintVideoUrl: null,
  };
}

function sanitizeText(text: string): string {
  // Remove U+FFFD (replacement character) que aparece quando o banco tem
  // bytes UTF-8 corrompidos. Substitui por string vazia para não exibir
  // caixinhas no app mobile.
  return text
    .replace(/�/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeText(
  value: string | null | undefined,
  fallback: string,
): string {
  const text = sanitizeText(String(value || "").trim());
  return text.length > 0 ? text : fallback;
}

function buildLessonObjective(
  description: string | null | undefined,
  firstScreen: LearnerFlowScreen | null | undefined,
): string {
  const candidates = [
    toOptionalText(description),
    toOptionalText(firstScreen?.exercise?.instructionText),
    toOptionalText(firstScreen?.educatorGuidance),
    toOptionalText(firstScreen?.learnerSpeech),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (looksLikeStructuredJson(candidate)) continue;
    return candidate;
  }

  return "Objetivo da aula em configuração.";
}

function withSequentialModuleLabels(
  modules: LearnerFlowModule[],
): LearnerFlowModule[] {
  return modules.map((moduleItem, moduleIndex) => {
    const moduleLabel = `MÓDULO ${moduleIndex + 1}`;
    return {
      ...moduleItem,
      lessons: moduleItem.lessons.map((lesson) => ({
        ...lesson,
        moduleLabel,
      })),
    };
  });
}

function buildFallbackModules(): LearnerFlowModule[] {
  return [];
}

function isActiveContent(
  value: { is_active?: boolean } | null | undefined,
): boolean {
  return value?.is_active !== false;
}

function isPublishedActivity(
  value: { is_published?: boolean } | null | undefined,
): boolean {
  return value?.is_published !== false;
}

// Vídeo de orientação de abertura de etapa (kind=intro-etapa no CMS), buscado
// direto no payload já carregado — sem round-trip extra. Usado pela tela
// "Etapa 1 - Orientações" (card de vídeo opcional, RN do Figma: assistir NÃO é
// obrigatório). slug é o identificador estável cadastrado no painel.
export function resolveMediaUrlBySlug(
  payload: PainelConteudoResponse,
  slug: string,
): string | null {
  const media = (payload.mediaLibrary || []).find((item) => item.slug === slug);
  return media ? media.public_url || media.storage_path || null : null;
}

function resolveHintVideoUrl(
  hintVideoId: string | null | undefined,
  mediaById: Map<string, PainelMediaLibraryItem>,
  mediaBySlug: Map<string, PainelMediaLibraryItem>,
  screenTemplate: LearnerScreenTemplate | null = null,
): string | null {
  // 1) Vínculo explícito feito no painel web: o autor escolheu a dica desta
  //    atividade. Tem prioridade absoluta. URL vem do media_library.
  if (hintVideoId) {
    const media = mediaById.get(hintVideoId);
    if (media) return media.public_url || media.storage_path || null;
  }
  // 2) Fallback por tipo de tela: slug → URL no media_library (CMS).
  //    Sem slug para o template (ex.: achar-a-letra) ou slug ausente da
  //    biblioteca → retorna null e o card "Está com dúvidas?" não aparece.
  const slug = getHintSlugForTemplate(screenTemplate);
  if (!slug) return null;
  const media = mediaBySlug.get(slug);
  return media ? media.public_url || media.storage_path || null : null;
}

// Resolve o número da etapa do módulo: prioriza o vínculo forte stage_id →
// learning_stages (via payload.stages) e cai para stage_number (legado). Sem
// resolução retorna null — a aula é então excluída do fluxo do alfabetizando
// (nunca mais o antigo default silencioso "2").
function buildStageNumberByStageId(
  payload: PainelConteudoResponse,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const stage of payload.stages || []) {
    if (stage.id && typeof stage.stage_number === "number") {
      map.set(stage.id, stage.stage_number);
    }
  }
  return map;
}

function resolveUnitStageNumber(
  unit: PainelLearningUnit,
  stageNumberByStageId: Map<string, number>,
): number | null {
  if (unit.stage_id && stageNumberByStageId.has(unit.stage_id)) {
    return stageNumberByStageId.get(unit.stage_id) ?? null;
  }
  if (typeof unit.stage_number === "number") return unit.stage_number;
  return null;
}

export function mapPainelToModules(
  payload: PainelConteudoResponse,
): LearnerFlowModule[] {
  const stageNumberByStageId = buildStageNumberByStageId(payload);
  const mediaById = new Map<string, PainelMediaLibraryItem>();
  for (const item of payload.mediaLibrary || []) {
    if (item.id) mediaById.set(item.id, item);
  }

  const mediaBySlug = new Map<string, PainelMediaLibraryItem>();
  for (const item of payload.mediaLibrary || []) {
    if (item.slug) mediaBySlug.set(item.slug, item);
  }

  const themes = [...(payload.themes || [])]
    .filter((theme) => isActiveContent(theme) && !isDemoTheme(theme))
    .sort((a, b) =>
      compareWithIdTieBreaker(a.sort_order ?? 0, b.sort_order ?? 0, a.id, b.id),
    );
  if (themes.length === 0) {
    return [];
  }

  const hasNestedShape = themes.some(
    (theme) =>
      Array.isArray(theme.learningUnits) && theme.learningUnits.length > 0,
  );

  if (hasNestedShape) {
    const mappedNested = themes.map((theme, themeIndex) => {
      const learningUnits = [...(theme.learningUnits || [])]
        .sort((a, b) =>
          compareWithIdTieBreaker(
            a.order ?? a.sort_order ?? 0,
            b.order ?? b.sort_order ?? 0,
            a.id,
            b.id,
          ),
        )
        .filter(
          (unit) =>
            isActiveContent(unit) &&
            !isDemoModule(unit) &&
            (unit.activities || []).some(
              (activity) =>
                isPublishedActivity(activity) && !isDemoActivity(activity),
            ),
        );

      const lessons: LearnerFlowLesson[] = learningUnits
        .map((unit): LearnerFlowLesson | null => {
          const stageNumber = resolveUnitStageNumber(
            unit,
            stageNumberByStageId,
          );
          if (stageNumber === null) {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.warn(
                `[learnerFlow] módulo ${unit.id} sem etapa resolvível — excluído do fluxo.`,
              );
            }
            return null;
          }

          const activities = [...(unit.activities || [])]
            .filter(
              (activity) =>
                isPublishedActivity(activity) && !isDemoActivity(activity),
            )
            .sort((a, b) =>
              compareWithIdTieBreaker(
                a.order ?? a.sort_order ?? 0,
                b.order ?? b.sort_order ?? 0,
                a.id,
                b.id,
              ),
            );

          const screens: LearnerFlowScreen[] = activities.flatMap(
            (activity, activityIndex): LearnerFlowScreen[] => {
              const normalizedAssets = (activity.assets || [])
                .map((item) => item.asset)
                .filter((item): item is PainelAsset =>
                  Boolean(item && (item.sourceUrl || item.storage_path)),
                );
              const assetReferences: ActivityAssetReference[] = normalizedAssets
                .map((asset) => {
                  const url = asset.sourceUrl || asset.storage_path || null;
                  if (!url) return null;
                  return {
                    url,
                    kind: resolveAssetKind(asset.kind, url),
                  };
                })
                .filter((item): item is ActivityAssetReference =>
                  Boolean(item),
                );

              const mainAsset = normalizedAssets[0] ?? null;
              const followUpAsset = normalizedAssets[1] ?? null;
              const instructions = getActivityInstructions(activity);
              const compositeBlocks = getCompositeBlocks(instructions);
              if (compositeBlocks) {
                return compositeBlocks.map((block, blockIndex) => {
                  const mappedScreen = mapCompositeBlockToScreen(
                    activity,
                    block,
                    blockIndex,
                    assetReferences,
                  );
                  return {
                    ...mappedScreen,
                    hintVideoUrl: resolveHintVideoUrl(
                      activity.hint_video_id,
                      mediaById,
                      mediaBySlug,
                      mappedScreen.screenTemplate,
                    ),
                  };
                });
              }

              const guidanceFromInstruction = parseGuidance(
                instructions,
                assetReferences,
              );

              return [
                {
                  id: activity.id,
                  title: normalizeText(
                    activity.title,
                    normalizeText(activity.prompt, `Tela ${activityIndex + 1}`),
                  ),
                  educatorGuidance:
                    normalizeText(
                      activity.instructorGuidance,
                      guidanceFromInstruction.educatorGuidance ||
                        normalizeText(activity.prompt, ""),
                    ).trim() || null,
                  learnerSpeech:
                    normalizeText(
                      activity.learnerGuidance,
                      guidanceFromInstruction.learnerSpeech || "",
                    ).trim() || null,
                  narrationAudioUrl: guidanceFromInstruction.narrationAudioUrl,
                  mediaUrl:
                    mainAsset?.sourceUrl || mainAsset?.storage_path || null,
                  mediaKind: resolveAssetKind(
                    mainAsset?.kind,
                    mainAsset?.sourceUrl || mainAsset?.storage_path || null,
                  ),
                  highlightMessage:
                    activityIndex === Math.floor((activities.length - 1) / 2) &&
                    activities.length > 2
                      ? "Metade da aula! Continue assim!"
                      : null,
                  hintVideoUrl: resolveHintVideoUrl(
                    activity.hint_video_id,
                    mediaById,
                    mediaBySlug,
                    guidanceFromInstruction.screenTemplate,
                  ),
                  followUpActivity: followUpAsset
                    ? ({
                        id: `${activity.id}-followup`,
                        title: `Atividade - ${normalizeText(activity.title, `Tela ${activityIndex + 1}`)}`,
                        educatorGuidance:
                          normalizeText(
                            activity.instructorGuidance,
                            guidanceFromInstruction.educatorGuidance || "",
                          ).trim() || null,
                        learnerSpeech:
                          normalizeText(
                            activity.learnerGuidance,
                            guidanceFromInstruction.learnerSpeech || "",
                          ).trim() || null,
                        narrationAudioUrl: null,
                        mediaUrl:
                          followUpAsset.sourceUrl ||
                          followUpAsset.storage_path ||
                          null,
                        mediaKind: resolveAssetKind(
                          followUpAsset.kind,
                          followUpAsset.sourceUrl ||
                            followUpAsset.storage_path ||
                            null,
                        ),
                        completionMessage:
                          "Muito bem! Continue para a próxima etapa da aula.",
                        screenTemplate: "default",
                        lockReason: null,
                        lockMessage: null,
                        lockAudioUrl: null,
                        exercise: null,
                      } as LearnerFlowActivity)
                    : null,
                  screenTemplate: guidanceFromInstruction.screenTemplate,
                  lockReason: guidanceFromInstruction.lockReason,
                  lockMessage: guidanceFromInstruction.lockMessage,
                  lockAudioUrl: guidanceFromInstruction.lockAudioUrl,
                  exercise: guidanceFromInstruction.exercise,
                },
              ];
            },
          );

          const fallbackScreen: LearnerFlowScreen = {
            id: `${unit.id}-screen-1`,
            title: normalizeText(unit.title, "Aula"),
            educatorGuidance: normalizeText(
              unit.description,
              "Siga a orientação desta aula.",
            ).trim(),
            learnerSpeech: null,
            narrationAudioUrl: null,
            mediaUrl: null,
            mediaKind: null,
            highlightMessage: null,
            followUpActivity: null,
            screenTemplate: "default",
            lockReason: null,
            lockMessage: null,
            lockAudioUrl: null,
            exercise: null,
            hintVideoUrl: null,
          };

          const safeScreens = screens.length > 0 ? screens : [fallbackScreen];

          return {
            id: unit.id,
            progressId: activities[0]?.id ?? unit.id,
            title: normalizeText(unit.title, "Aula"),
            objective: buildLessonObjective(unit.description, safeScreens[0]),
            moduleLabel: `MÓDULO ${themeIndex + 1}`,
            moduleTitle: normalizeText(theme.name || theme.title, "Módulo"),
            stageNumber,
            screens: safeScreens,
            conclusionTitle: "Aula Concluída!",
            conclusionMessage:
              "Parabéns! Você concluiu esta aula. Continue praticando para avançar no módulo.",
            accessStatus: "available",
            progressStatus: "not_started",
            attemptCount: 0,
            pointsAwarded: 0,
          };
        })
        .filter((lesson): lesson is LearnerFlowLesson => lesson !== null);

      return {
        id: theme.id,
        title: normalizeText(
          theme.name || theme.title,
          `Módulo ${themeIndex + 1}`,
        ),
        subtitle: `${lessons.length} ${lessons.length === 1 ? "aula disponível" : "aulas disponíveis"}`,
        lessons,
      };
    });

    const modulesWithLessons = mappedNested.filter(
      (item) => item.lessons.length > 0,
    );
    return modulesWithLessons.length > 0
      ? withSequentialModuleLabels(modulesWithLessons)
      : [];
  }

  const modules = payload.modules || [];
  const activities = (payload.activities || []).filter(
    (activity) => isPublishedActivity(activity) && !isDemoActivity(activity),
  );
  const assets = payload.assets || [];
  const blueprints = payload.blueprints || [];

  const activitiesByModule = new Map<string, PainelActivity[]>();
  for (const activity of activities) {
    const key = String(activity.module_id || "").trim();
    if (!key) continue;
    const bucket = activitiesByModule.get(key) ?? [];
    bucket.push(activity);
    activitiesByModule.set(key, bucket);
  }

  for (const [moduleId, bucket] of activitiesByModule.entries()) {
    bucket.sort((a, b) =>
      compareWithIdTieBreaker(
        a.order ?? a.sort_order ?? 0,
        b.order ?? b.sort_order ?? 0,
        a.id,
        b.id,
      ),
    );
    activitiesByModule.set(moduleId, bucket);
  }

  const assetsByActivity = new Map<string, PainelAsset[]>();
  for (const asset of assets) {
    const key = String(asset.activity_id || "").trim();
    if (!key) continue;
    const bucket = assetsByActivity.get(key) ?? [];
    bucket.push(asset);
    assetsByActivity.set(key, bucket);
  }

  for (const [activityId, bucket] of assetsByActivity.entries()) {
    bucket.sort((a, b) => {
      const createdAtDiff =
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime();
      if (createdAtDiff !== 0) return createdAtDiff;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
    assetsByActivity.set(activityId, bucket);
  }

  const blueprintsByModule = new Map<string, PainelBlueprint[]>();
  for (const blueprint of blueprints) {
    if (!blueprint?.module_code) continue;
    const key = String(blueprint.module_code).trim();
    if (!key) continue;
    const bucket = blueprintsByModule.get(key) ?? [];
    bucket.push(blueprint);
    blueprintsByModule.set(key, bucket);
  }

  const mappedFlat = themes
    .map((theme, themeIndex) => {
      const units = modules
        .filter(
          (unit) =>
            unit.theme_id === theme.id &&
            isActiveContent(unit) &&
            !isDemoModule(unit),
        )
        .filter((unit) => (activitiesByModule.get(unit.id) ?? []).length > 0)
        .sort((a, b) => {
          const stageDiff = compareWithIdTieBreaker(
            a.stage_number ?? 0,
            b.stage_number ?? 0,
            a.id,
            b.id,
          );
          if (stageDiff !== 0) return stageDiff;
          return compareWithIdTieBreaker(
            a.order ?? a.sort_order ?? 0,
            b.order ?? b.sort_order ?? 0,
            a.id,
            b.id,
          );
        });

      const lessons: LearnerFlowLesson[] = units
        .map((unit, unitIndex): LearnerFlowLesson | null => {
          const stageNumber = resolveUnitStageNumber(
            unit,
            stageNumberByStageId,
          );
          if (stageNumber === null) {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.warn(
                `[learnerFlow] módulo ${unit.id} sem etapa resolvível — excluído do fluxo.`,
              );
            }
            return null;
          }

          const unitActivities = activitiesByModule.get(unit.id) ?? [];
          const linkedBlueprints = blueprintsByModule.get(unit.id) ?? [];

          const screens: LearnerFlowScreen[] = unitActivities.flatMap(
            (activity, activityIndex): LearnerFlowScreen[] => {
              const activityAssets = assetsByActivity.get(activity.id) ?? [];
              const assetReferences: ActivityAssetReference[] = activityAssets
                .map((asset) => {
                  const url = asset.sourceUrl || asset.storage_path || null;
                  if (!url) return null;
                  return {
                    url,
                    kind: resolveAssetKind(asset.kind, url),
                  };
                })
                .filter((item): item is ActivityAssetReference =>
                  Boolean(item),
                );
              const mainAsset = activityAssets[0] ?? null;
              const followUpAsset = activityAssets[1] ?? null;
              const instructions = getActivityInstructions(activity);
              const compositeBlocks = getCompositeBlocks(instructions);
              if (compositeBlocks) {
                return compositeBlocks.map((block, blockIndex) => {
                  const mappedScreen = mapCompositeBlockToScreen(
                    activity,
                    block,
                    blockIndex,
                    assetReferences,
                  );
                  return {
                    ...mappedScreen,
                    hintVideoUrl: resolveHintVideoUrl(
                      activity.hint_video_id,
                      mediaById,
                      mediaBySlug,
                      mappedScreen.screenTemplate,
                    ),
                  };
                });
              }

              const guidanceFromInstruction = parseGuidance(
                instructions,
                assetReferences,
              );

              return [
                {
                  id: activity.id,
                  title: normalizeText(
                    activity.title,
                    `Tela ${activityIndex + 1}`,
                  ),
                  educatorGuidance: guidanceFromInstruction.educatorGuidance,
                  learnerSpeech: guidanceFromInstruction.learnerSpeech,
                  narrationAudioUrl: guidanceFromInstruction.narrationAudioUrl,
                  mediaUrl:
                    mainAsset?.sourceUrl || mainAsset?.storage_path || null,
                  mediaKind: resolveAssetKind(
                    mainAsset?.kind,
                    mainAsset?.sourceUrl || mainAsset?.storage_path || null,
                  ),
                  highlightMessage:
                    activityIndex ===
                      Math.floor((unitActivities.length - 1) / 2) &&
                    unitActivities.length > 2
                      ? "Metade da aula! Continue assim!"
                      : null,
                  hintVideoUrl: resolveHintVideoUrl(
                    activity.hint_video_id,
                    mediaById,
                    mediaBySlug,
                    guidanceFromInstruction.screenTemplate,
                  ),
                  followUpActivity: followUpAsset
                    ? ({
                        id: `${activity.id}-followup`,
                        title: `Atividade - ${normalizeText(activity.title, `Tela ${activityIndex + 1}`)}`,
                        educatorGuidance:
                          guidanceFromInstruction.educatorGuidance,
                        learnerSpeech: guidanceFromInstruction.learnerSpeech,
                        narrationAudioUrl: null,
                        mediaUrl:
                          followUpAsset.sourceUrl ||
                          followUpAsset.storage_path ||
                          null,
                        mediaKind: resolveAssetKind(
                          followUpAsset.kind,
                          followUpAsset.sourceUrl ||
                            followUpAsset.storage_path ||
                            null,
                        ),
                        completionMessage:
                          "Muito bem! Continue para a próxima etapa da aula.",
                        screenTemplate: "default",
                        lockReason: null,
                        lockMessage: null,
                        lockAudioUrl: null,
                        exercise: null,
                      } as LearnerFlowActivity)
                    : null,
                  screenTemplate: guidanceFromInstruction.screenTemplate,
                  lockReason: guidanceFromInstruction.lockReason,
                  lockMessage: guidanceFromInstruction.lockMessage,
                  lockAudioUrl: guidanceFromInstruction.lockAudioUrl,
                  exercise: guidanceFromInstruction.exercise,
                },
              ];
            },
          );

          const fallbackScreen: LearnerFlowScreen = {
            id: `${unit.id}-screen-1`,
            title: normalizeText(unit.title, `Aula ${unitIndex + 1}`),
            educatorGuidance: normalizeText(
              unit.description,
              "Adicione atividades nesta aula para montar as telas do fluxo mobile.",
            ),
            learnerSpeech: null,
            narrationAudioUrl: null,
            mediaUrl: null,
            mediaKind: null,
            highlightMessage:
              linkedBlueprints.length > 0
                ? `${linkedBlueprints.length} tela(s) base vinculada(s)`
                : null,
            followUpActivity: null,
            screenTemplate: "default",
            lockReason: null,
            lockMessage: null,
            lockAudioUrl: null,
            exercise: null,
            hintVideoUrl: null,
          };

          const safeScreens = screens.length > 0 ? screens : [fallbackScreen];
          const primaryActivityTitle = unitActivities[0]?.title;

          return {
            id: unit.id,
            progressId: unitActivities[0]?.id ?? unit.id,
            title: normalizeText(
              primaryActivityTitle,
              normalizeText(unit.title, "Aula"),
            ),
            objective: buildLessonObjective(unit.description, safeScreens[0]),
            moduleLabel: `MÓDULO ${themeIndex + 1}`,
            moduleTitle: normalizeText(theme.title || theme.name, "Módulo"),
            stageNumber,
            screens: safeScreens,
            conclusionTitle: "Aula Concluída!",
            conclusionMessage:
              "Parabéns! Você concluiu esta aula. Continue praticando para avançar no módulo.",
            accessStatus: "available",
            progressStatus: "not_started",
            attemptCount: 0,
            pointsAwarded: 0,
          };
        })
        .filter((lesson): lesson is LearnerFlowLesson => lesson !== null);

      return {
        id: theme.id,
        title: normalizeText(
          theme.title || theme.name,
          `Módulo ${themeIndex + 1}`,
        ),
        subtitle: `${lessons.length} ${lessons.length === 1 ? "aula disponível" : "aulas disponíveis"}`,
        lessons,
      };
    })
    .filter((item) => item.lessons.length > 0);

  return mappedFlat.length > 0 ? withSequentialModuleLabels(mappedFlat) : [];
}
