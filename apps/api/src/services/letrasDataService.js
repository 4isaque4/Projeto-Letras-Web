import { isSupabaseConfigured, supabaseAdmin } from "../lib/supabase.js";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const MOBILE_PASSWORD_KEY_LENGTH = 64;
const OPTIONAL_SOURCE_ERROR_CODES = new Set(["PGRST205", "42P01"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVITY_TYPES = new Set(["video", "quiz", "audio", "letra"]);
const ASSET_KINDS = new Set(["png", "mp4", "mp3", "jpg"]);
const ASSET_STATUSES = new Set(["rascunho", "publicado", "arquivado"]);
const ASSET_KIND_BY_EXTENSION = new Map([
  ["png", "png"],
  ["jpg", "jpg"],
  ["jpeg", "jpg"],
  ["mp4", "mp4"],
  ["mp3", "mp3"],
]);
const MIME_BY_ASSET_KIND = {
  png: "image/png",
  jpg: "image/jpeg",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
};

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);
const monorepoRootPath = resolve(currentDirPath, "..", "..", "..");
const DEFAULT_BLUEPRINTS_MANIFEST_PATH = resolve(
  monorepoRootPath,
  "assets",
  "mobile",
  "etapa-1",
  "manifest.json",
);

function requireSupabase() {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    throw new HttpError(
      500,
      "Supabase nao configurado. Preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no apps/api/.env.",
    );
  }

  return supabaseAdmin;
}

async function runQuery(queryPromise, contextMessage) {
  const { data, error } = await queryPromise;
  if (error) {
    throw new HttpError(500, `${contextMessage}: ${error.message}`);
  }

  return data ?? [];
}

function isOptionalSourceMissing(error) {
  if (!error) {
    return false;
  }

  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();

  if (OPTIONAL_SOURCE_ERROR_CODES.has(code)) {
    return true;
  }

  return (
    message.includes("could not find the table") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

async function runOptionalQuery(queryPromise, contextMessage) {
  const { data, error } = await queryPromise;
  if (error) {
    if (isOptionalSourceMissing(error)) {
      return [];
    }

    throw new HttpError(500, `${contextMessage}: ${error.message}`);
  }

  return data ?? [];
}

function dedupeById(primaryItems, secondaryItems) {
  const itemsById = new Map();

  for (const item of primaryItems) {
    itemsById.set(String(item.id), item);
  }

  for (const item of secondaryItems) {
    const key = String(item.id);
    if (!itemsById.has(key)) {
      itemsById.set(key, item);
    }
  }

  return [...itemsById.values()];
}

function dedupeByKey(primaryItems, secondaryItems, buildKey) {
  const itemsByKey = new Map();

  for (const item of primaryItems) {
    itemsByKey.set(buildKey(item), item);
  }

  for (const item of secondaryItems) {
    const key = buildKey(item);
    if (!itemsByKey.has(key)) {
      itemsByKey.set(key, item);
    }
  }

  return [...itemsByKey.values()];
}

function toSet(values) {
  return new Set((values ?? []).map((value) => String(value)));
}

function isUuid(value) {
  return UUID_PATTERN.test(String(value ?? "").trim());
}

function splitIdsByUuid(ids) {
  const uuidIds = [];
  const nonUuidIds = [];

  for (const rawId of ids ?? []) {
    const id = String(rawId ?? "").trim();
    if (!id) {
      continue;
    }

    if (isUuid(id)) {
      uuidIds.push(id);
    } else {
      nonUuidIds.push(id);
    }
  }

  return { uuidIds, nonUuidIds };
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function mapMobileCompletionStatus(status) {
  switch (status) {
    case "COMPLETED":
      return "concluido";
    case "IN_PROGRESS":
      return "em_andamento";
    default:
      return "nao_iniciado";
  }
}

function mapMobileActivityType(type) {
  switch (type) {
    case "SPEAKING":
      return "audio";
    case "MATCHING":
    case "WRITING":
      return "quiz";
    case "READING":
    default:
      return "letra";
  }
}

function mapPanelActivityTypeToMobile(type) {
  switch (String(type ?? "").toLowerCase()) {
    case "audio":
      return "SPEAKING";
    case "quiz":
      return "MATCHING";
    case "video":
    case "letra":
    default:
      return "READING";
  }
}

function canonicalTutorIdFromMobileEducator(item) {
  const supabaseAuthUserId = normalizeText(item?.supabaseAuthUserId);
  if (supabaseAuthUserId) {
    return supabaseAuthUserId;
  }

  return normalizeText(item?.id);
}

function buildMobileTutorIdentityMap(educators) {
  const identityMap = new Map();

  for (const educator of educators ?? []) {
    const rawId = normalizeText(educator?.id);
    const canonicalId = canonicalTutorIdFromMobileEducator(educator);

    if (!rawId && !canonicalId) {
      continue;
    }

    if (rawId) {
      identityMap.set(rawId, canonicalId || rawId);
    }

    if (canonicalId) {
      identityMap.set(canonicalId, canonicalId);
    }
  }

  return identityMap;
}

function hashMobilePassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, MOBILE_PASSWORD_KEY_LENGTH).toString("hex");
  return `${salt}:${key}`;
}

function logMobileSyncWarning(context, error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[mobile-sync] ${context}: ${message}`);
}

export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function formatDateTime(value) {
  const parsed = parseDate(value);
  if (!parsed) {
    return "";
  }

  return parsed.toLocaleString("pt-BR");
}

export function formatRelativeTime(value) {
  const parsed = parseDate(value);
  if (!parsed) {
    return "Sem registro";
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return "Agora";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export function daysSince(value) {
  const parsed = parseDate(value);
  if (!parsed) {
    return Number.POSITIVE_INFINITY;
  }

  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function normalizeNullableText(value) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.floor(parsed);
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }

  return fallback;
}

function normalizeSlug(value, fallback) {
  const normalized = slugify(value);
  if (normalized.length > 0) {
    return normalized;
  }
  return slugify(fallback) || `item-${Date.now()}`;
}

async function resolveUniqueThemeSlug(client, preferredSlug) {
  const baseSlug = normalizeSlug(preferredSlug, "tema");

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate = `${baseSlug}${suffix}`.slice(0, 80);
    const { data, error } = await client
      .from("learning_themes")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new HttpError(500, `Falha ao validar nome interno do tema: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`.slice(0, 80);
}

function normalizeAssetKindInput(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "jpeg") {
    return "jpg";
  }

  return ASSET_KINDS.has(normalized) ? normalized : null;
}

function normalizeAssetStatusInput(value, fallback = "rascunho") {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return ASSET_STATUSES.has(normalized) ? normalized : fallback;
}

function detectAssetKindFromUpload({ mimeType, fileName }) {
  const normalizedMime = normalizeText(mimeType).toLowerCase();
  if (normalizedMime.startsWith("image/png")) {
    return "png";
  }
  if (normalizedMime.startsWith("image/jpeg")) {
    return "jpg";
  }
  if (normalizedMime.startsWith("video/mp4")) {
    return "mp4";
  }
  if (normalizedMime.startsWith("audio/mpeg") || normalizedMime.startsWith("audio/mp3")) {
    return "mp3";
  }

  const extension = normalizeText(fileName).split(".").pop()?.toLowerCase() ?? "";
  return ASSET_KIND_BY_EXTENSION.get(extension) ?? null;
}

function detectUploadFileExtension(fileName, mimeType, kind) {
  const fromName = normalizeText(fileName).split(".").pop()?.toLowerCase() ?? "";
  if (ASSET_KIND_BY_EXTENSION.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  const fromMime = detectAssetKindFromUpload({ mimeType, fileName: "" });
  if (fromMime) {
    return fromMime;
  }

  return kind;
}

function sanitizeStorageFolder(value) {
  const normalized = normalizeText(value).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return "";
  }

  const safeParts = normalized
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && /^[a-zA-Z0-9_-]{1,64}$/.test(part));

  return safeParts.join("/");
}

function buildStorageObjectPath({ extension, folder }) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeFolder = sanitizeStorageFolder(folder) || "conteudo";
  return `${safeFolder}/${year}/${month}/${randomUUID()}.${extension}`;
}

function titleFromFileName(fileName) {
  const safeName = normalizeText(fileName);
  if (!safeName) {
    return "Arquivo de conteudo";
  }

  const baseName = safeName.replace(/\.[^/.]+$/, "").trim();
  return baseName || "Arquivo de conteudo";
}

function buildStoragePublicUrl(objectPath) {
  const forcedBaseUrl = normalizeText(env.supabaseStoragePublicBaseUrl).replace(/\/+$/, "");
  if (forcedBaseUrl) {
    return `${forcedBaseUrl}/${objectPath}`;
  }

  const normalizedSupabaseUrl = normalizeText(env.supabaseUrl).replace(/\/+$/, "");
  const normalizedBucket = normalizeText(env.supabaseStorageBucket) || "letras-assets";
  return `${normalizedSupabaseUrl}/storage/v1/object/public/${normalizedBucket}/${objectPath}`;
}

async function uploadBufferToStorage({ buffer, mimeType, objectPath }) {
  const client = requireSupabase();
  const bucket = normalizeText(env.supabaseStorageBucket) || "letras-assets";

  async function tryUpload() {
    return client.storage.from(bucket).upload(objectPath, buffer, {
      contentType: mimeType,
      upsert: false,
    });
  }

  let { error } = await tryUpload();

  if (error) {
    const lowerMessage = String(error.message ?? "").toLowerCase();
    if (lowerMessage.includes("bucket") && lowerMessage.includes("not found")) {
      const { error: createError } = await client.storage.createBucket(bucket, {
        public: true,
      });
      if (createError) {
        throw new HttpError(
          400,
          `Bucket '${bucket}' nao encontrado e nao foi possivel criar automaticamente: ${createError.message}`,
        );
      }

      const retry = await tryUpload();
      error = retry.error;
      if (error) {
        throw new HttpError(500, `Falha no upload para o Storage: ${error.message}`);
      }
    } else {
      throw new HttpError(500, `Falha no upload para o Storage: ${error.message}`);
    }
  }

  return {
    bucket,
    objectPath,
    publicUrl: buildStoragePublicUrl(objectPath),
  };
}

function normalizeUploadMetadata(metadata, defaultMetadata) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return { ...defaultMetadata, ...metadata };
  }
  return defaultMetadata;
}

function mapAssetToUploadPayload(assetRow, fallback) {
  if (!assetRow) {
    return {
      id: `upload-${randomUUID()}`,
      key: null,
      kind: fallback.kind,
      title: fallback.title,
      sourceUrl: fallback.sourceUrl,
      mimeType: fallback.mimeType,
      originalFileName: fallback.originalFileName,
      bytes: fallback.bytes,
      createdByEducatorId: fallback.createdByEducatorId,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    id: String(assetRow.id),
    key: String(assetRow.id),
    kind: String(assetRow.kind),
    title: fallback.title,
    sourceUrl: String(assetRow.storage_path),
    mimeType: String(assetRow.mime_type),
    originalFileName: fallback.originalFileName,
    bytes: fallback.bytes,
    createdByEducatorId: fallback.createdByEducatorId,
    createdAt: assetRow.created_at ?? new Date().toISOString(),
  };
}

async function registerSyncEvent({
  sourcePlatform = "web",
  eventType,
  entityType,
  entityId,
  payload,
}) {
  const client = requireSupabase();
  const syncPayload = {
    source_platform: sourcePlatform,
    event_type: normalizeText(eventType) || "event",
    entity_type: normalizeText(entityType) || "entity",
    entity_id: normalizeText(entityId) || "unknown",
    payload: payload && typeof payload === "object" ? payload : {},
  };

  const { error } = await client.from("sync_events").insert(syncPayload);
  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(500, `Falha ao registrar evento de sincronizacao: ${error.message}`);
  }
}

async function getMobileEducators({ ids } = {}) {
  const client = requireSupabase();
  let query = client
    .from("Educator")
    .select("id, name, email, cpf, phoneDigits, supabaseAuthUserId, createdAt, updatedAt");

  if (ids) {
    if (ids.length === 0) {
      return [];
    }
    query = query.in("id", ids);
  }

  return runOptionalQuery(query, "Falha ao listar educadores do schema mobile");
}

async function getMobileLearners({ ids, educatorIds } = {}) {
  const client = requireSupabase();
  let query = client
    .from("LearnerProfile")
    .select("id, displayName, notes, educatorId, createdAt, updatedAt");

  if (ids) {
    if (ids.length === 0) {
      return [];
    }
    query = query.in("id", ids);
  }

  if (educatorIds) {
    if (educatorIds.length === 0) {
      return [];
    }
    query = query.in("educatorId", educatorIds);
  }

  return runOptionalQuery(query, "Falha ao listar alfabetizandos do schema mobile");
}

async function getMobileCompletions({ learnerProfileIds } = {}) {
  const client = requireSupabase();
  let query = client
    .from("Completion")
    .select(
      "id, learnerProfileId, activityId, status, score, elapsedSeconds, completedAt, createdAt, updatedAt",
    );

  if (learnerProfileIds) {
    if (learnerProfileIds.length === 0) {
      return [];
    }
    query = query.in("learnerProfileId", learnerProfileIds);
  }

  return runOptionalQuery(query, "Falha ao listar progresso do schema mobile");
}

async function getMobileThemes({ ids } = {}) {
  const client = requireSupabase();
  let query = client.from("Theme").select("id, name, description, createdAt, updatedAt");

  if (ids) {
    if (ids.length === 0) {
      return [];
    }
    query = query.in("id", ids);
  }

  return runOptionalQuery(query, "Falha ao listar temas do schema mobile");
}

async function getMobileLearningUnits({ ids } = {}) {
  const client = requireSupabase();
  let query = client
    .from("LearningUnit")
    .select("id, themeId, title, description, order, createdAt, updatedAt");

  if (ids) {
    if (ids.length === 0) {
      return [];
    }
    query = query.in("id", ids);
  }

  return runOptionalQuery(query, "Falha ao listar unidades do schema mobile");
}

async function getMobileActivities({ ids } = {}) {
  const client = requireSupabase();
  let query = client
    .from("Activity")
    .select("id, learningUnitId, prompt, content, order, type, createdAt, updatedAt");

  if (ids) {
    if (ids.length === 0) {
      return [];
    }
    query = query.in("id", ids);
  }

  return runOptionalQuery(query, "Falha ao listar atividades do schema mobile");
}

function mapMobileEducatorToProfile(item) {
  const canonicalId = canonicalTutorIdFromMobileEducator(item) || String(item.id);

  return {
    id: canonicalId,
    full_name: item.name,
    role: "tutor",
    phone: item.phoneDigits ?? "",
    cpf: item.cpf ?? "",
    metadata: {
      source: "mobile_api",
      email: item.email ?? "",
      mobileEducatorId: item.id,
      supabaseAuthUserId: item.supabaseAuthUserId ?? null,
    },
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function mapMobileLearnerToProfile(item) {
  return {
    id: item.id,
    full_name: item.displayName,
    role: "alfabetizando",
    phone: "",
    cpf: "",
    metadata: {
      source: "mobile_api",
      notes: item.notes ?? "",
      educatorId: item.educatorId ?? null,
    },
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function mapMobileLearnerToLink(item, tutorIdentityMap) {
  const rawTutorId = normalizeText(item.educatorId);
  const canonicalTutorId =
    (rawTutorId && tutorIdentityMap?.get(rawTutorId)) || rawTutorId || "";

  return {
    id: `mobile-link-${canonicalTutorId}-${item.id}`,
    tutor_id: canonicalTutorId,
    student_id: item.id,
    status: "confirmado",
    requested_by: canonicalTutorId,
    requested_at: item.createdAt,
    decided_by: canonicalTutorId,
    decided_at: item.updatedAt ?? item.createdAt,
    reason: "Vinculo derivado do app mobile.",
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function mapMobileCompletionToProgress(item) {
  const completedAt = item.completedAt ?? null;

  return {
    id: `mobile-progress-${item.id}`,
    student_id: item.learnerProfileId,
    activity_id: item.activityId,
    status: mapMobileCompletionStatus(item.status),
    attempts: item.elapsedSeconds ? 1 : 0,
    score: item.score ?? null,
    source_platform: "mobile",
    last_interacted_at: item.updatedAt ?? item.createdAt,
    completed_at: completedAt,
    metadata: {
      source: "mobile_api",
      elapsedSeconds: item.elapsedSeconds ?? null,
    },
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function mapMobileThemeToTheme(item, index) {
  return {
    id: item.id,
    slug: slugify(item.name) || `tema-mobile-${index + 1}`,
    title: item.name,
    description: item.description ?? "",
    sort_order: index,
    is_active: true,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function mapMobileUnitToModule(item) {
  const order = Number.isFinite(Number(item.order)) ? Number(item.order) : 0;

  return {
    id: item.id,
    theme_id: item.themeId,
    stage_number: Math.max(order + 1, 1),
    title: item.title,
    description: item.description ?? "",
    sort_order: order,
    is_active: true,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function mapMobileActivityToActivity(item) {
  const order = Number.isFinite(Number(item.order)) ? Number(item.order) : 0;
  const content = typeof item.content === "object" && item.content ? item.content : null;
  const instructions =
    typeof content?.instructions === "string" && content.instructions.trim().length > 0
      ? content.instructions.trim()
      : null;

  return {
    id: item.id,
    module_id: item.learningUnitId,
    type: mapMobileActivityType(item.type),
    title: item.prompt,
    instructions,
    sort_order: order,
    is_published: true,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export async function getProfiles({ role, ids } = {}) {
  if (ids && ids.length === 0) {
    return [];
  }

  const { uuidIds } = splitIdsByUuid(ids);
  const client = requireSupabase();
  const shouldQueryPanelProfiles = !ids || uuidIds.length > 0;

  const shouldLoadMobileEducators = !role || role === "tutor";
  const shouldLoadMobileLearners = !role || role === "alfabetizando";

  const [profiles, mobileEducators, mobileLearners] = await Promise.all([
    shouldQueryPanelProfiles
      ? (() => {
          let query = client
            .from("profiles")
            .select("id, full_name, role, phone, cpf, metadata, created_at, updated_at");

          if (role) {
            query = query.eq("role", role);
          }

          if (ids) {
            query = query.in("id", uuidIds);
          }

          return runQuery(query, "Falha ao listar perfis");
        })()
      : Promise.resolve([]),
    shouldLoadMobileEducators ? getMobileEducators({ ids }) : Promise.resolve([]),
    shouldLoadMobileLearners ? getMobileLearners({ ids }) : Promise.resolve([]),
  ]);

  let merged = profiles;

  if (shouldLoadMobileEducators) {
    merged = dedupeById(merged, mobileEducators.map(mapMobileEducatorToProfile));
  }

  if (shouldLoadMobileLearners) {
    merged = dedupeById(merged, mobileLearners.map(mapMobileLearnerToProfile));
  }

  if (ids) {
    const allowedIds = toSet(ids);
    merged = merged.filter((item) => allowedIds.has(String(item.id)));
  }

  if (role) {
    merged = merged.filter((item) => item.role === role);
  }

  return merged;
}

export async function getTutorStudentLinks({ tutorIds, studentIds, statuses } = {}) {
  if ((tutorIds && tutorIds.length === 0) || (studentIds && studentIds.length === 0) || (statuses && statuses.length === 0)) {
    return [];
  }

  const { uuidIds: uuidTutorIds } = splitIdsByUuid(tutorIds);
  const { uuidIds: uuidStudentIds } = splitIdsByUuid(studentIds);
  const shouldQueryPanelLinks =
    (!tutorIds || uuidTutorIds.length > 0) && (!studentIds || uuidStudentIds.length > 0);

  const client = requireSupabase();
  const canIncludeMobileLinks = !statuses || statuses.includes("confirmado");
  if (!canIncludeMobileLinks) {
    if (!shouldQueryPanelLinks) {
      return [];
    }

    let query = client
      .from("tutor_student_links")
      .select(
        "id, tutor_id, student_id, status, requested_by, requested_at, decided_by, decided_at, reason, created_at, updated_at",
      );

    if (tutorIds) {
      query = query.in("tutor_id", uuidTutorIds);
    }

    if (studentIds) {
      query = query.in("student_id", uuidStudentIds);
    }

    if (statuses) {
      query = query.in("status", statuses);
    }

    return runQuery(query, "Falha ao listar vinculos");
  }

  const mobileEducators = await getMobileEducators();
  const tutorIdentityMap = buildMobileTutorIdentityMap(mobileEducators);
  const normalizedTutorIds = tutorIds?.map((value) => normalizeText(value)).filter(Boolean) ?? null;

  const mobileEducatorIds =
    normalizedTutorIds && normalizedTutorIds.length > 0
      ? mobileEducators
          .filter((item) => {
            const rawId = normalizeText(item.id);
            const canonicalId = canonicalTutorIdFromMobileEducator(item);

            return normalizedTutorIds.includes(rawId) || normalizedTutorIds.includes(canonicalId);
          })
          .map((item) => item.id)
      : tutorIds;

  const [links, mobileLearners] = await Promise.all([
    shouldQueryPanelLinks
      ? (() => {
          let query = client
            .from("tutor_student_links")
            .select(
              "id, tutor_id, student_id, status, requested_by, requested_at, decided_by, decided_at, reason, created_at, updated_at",
            );

          if (tutorIds) {
            query = query.in("tutor_id", uuidTutorIds);
          }

          if (studentIds) {
            query = query.in("student_id", uuidStudentIds);
          }

          if (statuses) {
            query = query.in("status", statuses);
          }

          return runQuery(query, "Falha ao listar vinculos");
        })()
      : Promise.resolve([]),
    getMobileLearners({ ids: studentIds, educatorIds: mobileEducatorIds }),
  ]);

  const filteredMobileLearners = mobileLearners.filter((item) => normalizeText(item.educatorId));
  let mobileLinks = filteredMobileLearners.map((item) => mapMobileLearnerToLink(item, tutorIdentityMap));

  if (normalizedTutorIds && normalizedTutorIds.length > 0) {
    const allowedTutorIds = new Set(normalizedTutorIds);
    mobileLinks = mobileLinks.filter((item) => allowedTutorIds.has(normalizeText(item.tutor_id)));
  }

  return dedupeByKey(links, mobileLinks, (item) => `${item.tutor_id}:${item.student_id}`);
}

export async function getActivityProgress({ studentIds } = {}) {
  if (studentIds && studentIds.length === 0) {
    return [];
  }

  const { uuidIds } = splitIdsByUuid(studentIds);
  const shouldQueryPanelProgress = !studentIds || uuidIds.length > 0;
  const client = requireSupabase();
  const [progressRows, mobileCompletions] = await Promise.all([
    shouldQueryPanelProgress
      ? (() => {
          let query = client
            .from("activity_progress")
            .select(
              "id, student_id, activity_id, status, attempts, score, source_platform, last_interacted_at, completed_at, metadata, created_at, updated_at",
            );

          if (studentIds) {
            query = query.in("student_id", uuidIds);
          }

          return runQuery(query, "Falha ao listar progresso");
        })()
      : Promise.resolve([]),
    getMobileCompletions({ learnerProfileIds: studentIds }),
  ]);

  const mobileProgressRows = mobileCompletions.map(mapMobileCompletionToProgress);
  return dedupeByKey(progressRows, mobileProgressRows, (item) => `${item.student_id}:${item.activity_id}`);
}

export async function getLearningActivities({ ids } = {}) {
  if (ids && ids.length === 0) {
    return [];
  }

  const { uuidIds } = splitIdsByUuid(ids);
  const shouldQueryPanelActivities = !ids || uuidIds.length > 0;
  const client = requireSupabase();
  const [activities, mobileActivities] = await Promise.all([
    shouldQueryPanelActivities
      ? (() => {
          let query = client
            .from("learning_activities")
            .select("id, module_id, type, title, instructions, sort_order, is_published, created_at, updated_at");

          if (ids) {
            query = query.in("id", uuidIds);
          }

          return runQuery(query, "Falha ao listar atividades");
        })()
      : Promise.resolve([]),
    getMobileActivities({ ids }),
  ]);

  return dedupeById(activities, mobileActivities.map(mapMobileActivityToActivity));
}

export async function getLearningModules({ ids } = {}) {
  if (ids && ids.length === 0) {
    return [];
  }

  const { uuidIds } = splitIdsByUuid(ids);
  const shouldQueryPanelModules = !ids || uuidIds.length > 0;
  const client = requireSupabase();
  const [modules, mobileUnits] = await Promise.all([
    shouldQueryPanelModules
      ? (() => {
          let query = client
            .from("learning_modules")
            .select("id, theme_id, stage_number, title, description, sort_order, is_active, created_at, updated_at");

          if (ids) {
            query = query.in("id", uuidIds);
          }

          return runQuery(query, "Falha ao listar modulos");
        })()
      : Promise.resolve([]),
    getMobileLearningUnits({ ids }),
  ]);

  return dedupeById(modules, mobileUnits.map(mapMobileUnitToModule));
}

export async function getLearningThemes() {
  const client = requireSupabase();
  const [themes, mobileThemes] = await Promise.all([
    runQuery(
      client
        .from("learning_themes")
        .select("id, slug, title, description, sort_order, is_active, created_at, updated_at")
        .order("sort_order", { ascending: true }),
      "Falha ao listar temas",
    ),
    getMobileThemes(),
  ]);

  const merged = dedupeById(themes, mobileThemes.map(mapMobileThemeToTheme));
  return merged.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
}

export async function getContentAssets() {
  const client = requireSupabase();
  return runQuery(
    client
      .from("content_assets")
      .select("id, activity_id, kind, storage_path, mime_type, status, metadata, created_at, updated_at")
      .order("created_at", { ascending: false }),
    "Falha ao listar assets",
  );
}

export async function getSyncEvents({ limit = 100 } = {}) {
  const client = requireSupabase();
  return runQuery(
    client
      .from("sync_events")
      .select("id, source_platform, event_type, entity_type, entity_id, payload, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    "Falha ao listar eventos de sincronizacao",
  );
}

export async function getMobileScreenBlueprints() {
  const client = requireSupabase();
  return runQuery(
    client
      .from("mobile_screen_blueprints")
      .select("id, slug, title, svg_path, stage_tag, module_code, is_active, created_at, updated_at")
      .order("created_at", { ascending: false }),
    "Falha ao listar blueprints mobile",
  );
}

async function ensureThemeExists(themeId) {
  if (!isUuid(themeId)) {
    throw new HttpError(
      400,
      "Tema invalido para cadastro no CMS. Selecione um tema criado no painel web.",
    );
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("learning_themes")
    .select("id")
    .eq("id", themeId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, `Falha ao validar tema: ${error.message}`);
  }

  if (!data?.id) {
    throw new HttpError(400, "Tema informado nao existe.");
  }
}

async function ensureModuleExists(moduleId) {
  if (!isUuid(moduleId)) {
    throw new HttpError(
      400,
      "Modulo invalido para cadastro no CMS. Selecione um modulo criado no painel web.",
    );
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("learning_modules")
    .select("id")
    .eq("id", moduleId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, `Falha ao validar modulo: ${error.message}`);
  }

  if (!data?.id) {
    throw new HttpError(400, "Modulo informado nao existe.");
  }
}

async function ensureActivityExists(activityId) {
  if (!isUuid(activityId)) {
    throw new HttpError(
      400,
      "Atividade invalida para vincular arquivo. Selecione uma atividade criada no CMS web.",
    );
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("learning_activities")
    .select("id")
    .eq("id", activityId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, `Falha ao validar atividade: ${error.message}`);
  }

  if (!data?.id) {
    throw new HttpError(400, "Atividade informada nao existe.");
  }
}

async function getPanelThemeById(themeId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("learning_themes")
    .select("id, title, description, created_at, updated_at")
    .eq("id", String(themeId))
    .maybeSingle();

  if (error) {
    throw new HttpError(500, `Falha ao carregar tema para sync mobile: ${error.message}`);
  }

  return data ?? null;
}

async function getPanelModuleById(moduleId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("learning_modules")
    .select("id, theme_id, stage_number, title, description, sort_order, created_at, updated_at")
    .eq("id", String(moduleId))
    .maybeSingle();

  if (error) {
    throw new HttpError(500, `Falha ao carregar modulo para sync mobile: ${error.message}`);
  }

  return data ?? null;
}

async function getPanelActivityById(activityId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("learning_activities")
    .select("id, module_id, type, title, instructions, sort_order, created_at, updated_at")
    .eq("id", String(activityId))
    .maybeSingle();

  if (error) {
    throw new HttpError(500, `Falha ao carregar atividade para sync mobile: ${error.message}`);
  }

  return data ?? null;
}

async function upsertMobileThemeFromPanel(themeRow) {
  if (!themeRow?.id) {
    return;
  }

  const client = requireSupabase();
  const payload = {
    id: String(themeRow.id),
    name: normalizeText(themeRow.title) || "Tema",
    description: normalizeNullableText(themeRow.description),
    createdAt: themeRow.created_at ?? new Date().toISOString(),
    updatedAt: themeRow.updated_at ?? new Date().toISOString(),
  };

  const { error } = await client.from("Theme").upsert(payload, { onConflict: "id" });
  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(500, `Falha ao sincronizar tema no schema mobile: ${error.message}`);
  }
}

async function upsertMobileLearningUnitFromPanel(moduleRow) {
  if (!moduleRow?.id) {
    return;
  }

  const theme = await getPanelThemeById(moduleRow.theme_id);
  if (theme) {
    await upsertMobileThemeFromPanel(theme);
  }

  const client = requireSupabase();
  const fallbackOrder = Math.max(normalizeInteger(moduleRow.stage_number, 1) - 1, 0);
  const payload = {
    id: String(moduleRow.id),
    themeId: String(moduleRow.theme_id),
    title: normalizeText(moduleRow.title) || "Modulo",
    description: normalizeNullableText(moduleRow.description),
    order: Math.max(normalizeInteger(moduleRow.sort_order, fallbackOrder), 0),
    createdAt: moduleRow.created_at ?? new Date().toISOString(),
    updatedAt: moduleRow.updated_at ?? new Date().toISOString(),
  };

  const { error } = await client.from("LearningUnit").upsert(payload, { onConflict: "id" });
  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(500, `Falha ao sincronizar modulo no schema mobile: ${error.message}`);
  }
}

async function upsertMobileActivityFromPanel(activityRow) {
  if (!activityRow?.id) {
    return;
  }

  const module = await getPanelModuleById(activityRow.module_id);
  if (module) {
    await upsertMobileLearningUnitFromPanel(module);
  }

  const client = requireSupabase();
  const baseContent = {};
  const instructions = normalizeNullableText(activityRow.instructions);
  if (instructions) {
    baseContent.instructions = instructions;
  }

  const payload = {
    id: String(activityRow.id),
    learningUnitId: String(activityRow.module_id),
    prompt: normalizeText(activityRow.title) || "Atividade",
    content: Object.keys(baseContent).length > 0 ? baseContent : null,
    order: Math.max(normalizeInteger(activityRow.sort_order, 0), 0),
    type: mapPanelActivityTypeToMobile(activityRow.type),
    createdAt: activityRow.created_at ?? new Date().toISOString(),
    updatedAt: activityRow.updated_at ?? new Date().toISOString(),
  };

  const { error } = await client.from("Activity").upsert(payload, { onConflict: "id" });
  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(500, `Falha ao sincronizar atividade no schema mobile: ${error.message}`);
  }
}

async function appendAssetToMobileActivity(assetRow) {
  if (!assetRow?.activity_id) {
    return;
  }

  const activity = await getPanelActivityById(assetRow.activity_id);
  if (activity) {
    await upsertMobileActivityFromPanel(activity);
  }

  const client = requireSupabase();
  const { data: mobileActivity, error: readError } = await client
    .from("Activity")
    .select("id, content")
    .eq("id", String(assetRow.activity_id))
    .maybeSingle();

  if (readError) {
    if (isOptionalSourceMissing(readError)) {
      return;
    }
    throw new HttpError(500, `Falha ao carregar activity mobile para asset: ${readError.message}`);
  }

  if (!mobileActivity?.id) {
    return;
  }

  const currentContent =
    mobileActivity.content &&
    typeof mobileActivity.content === "object" &&
    !Array.isArray(mobileActivity.content)
      ? { ...mobileActivity.content }
      : {};

  const currentAssets = Array.isArray(currentContent.assets)
    ? currentContent.assets.filter(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      )
    : [];

  const nextAsset = {
    id: String(assetRow.id),
    kind: String(assetRow.kind),
    storagePath: String(assetRow.storage_path),
    mimeType: String(assetRow.mime_type),
    status: String(assetRow.status),
    metadata:
      assetRow.metadata && typeof assetRow.metadata === "object" && !Array.isArray(assetRow.metadata)
        ? assetRow.metadata
        : {},
    createdAt: assetRow.created_at ?? new Date().toISOString(),
  };

  const nextAssets = currentAssets.filter((item) => String(item.id ?? "") !== String(nextAsset.id));
  nextAssets.push(nextAsset);

  const nextContent = {
    ...currentContent,
    assets: nextAssets,
  };

  const { error: updateError } = await client
    .from("Activity")
    .update({ content: nextContent, updatedAt: new Date().toISOString() })
    .eq("id", String(assetRow.activity_id));

  if (updateError && !isOptionalSourceMissing(updateError)) {
    throw new HttpError(500, `Falha ao anexar asset na activity mobile: ${updateError.message}`);
  }
}

export async function createLearningTheme({
  title,
  description,
  slug,
  sortOrder,
  isActive,
}) {
  const client = requireSupabase();
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) {
    throw new HttpError(400, "Titulo do tema e obrigatorio.");
  }

  const requestedSlug = normalizeSlug(slug, normalizedTitle);
  const uniqueSlug = await resolveUniqueThemeSlug(client, requestedSlug);

  const payload = {
    slug: uniqueSlug,
    title: normalizedTitle,
    description: normalizeNullableText(description),
    sort_order: normalizeInteger(sortOrder, 0),
    is_active: normalizeBoolean(isActive, true),
  };

  const { data, error } = await client
    .from("learning_themes")
    .insert(payload)
    .select("id, slug, title, description, sort_order, is_active, created_at, updated_at")
    .single();

  if (error) {
    const normalizedMessage = String(error.message ?? "").toLowerCase();
    if (
      String(error.code ?? "") === "23505" ||
      normalizedMessage.includes("learning_themes_slug_key")
    ) {
      throw new HttpError(
        400,
        "Ja existe um tema muito parecido com este nome. Tente alterar o titulo do tema.",
      );
    }
    throw new HttpError(400, `Falha ao criar tema: ${error.message}`);
  }

  await runBestEffortMobileSync("sync createLearningTheme to mobile schema", () =>
    upsertMobileThemeFromPanel(data),
  );

  await runBestEffortMobileSync("sync_event createLearningTheme", () =>
    registerSyncEvent({
      eventType: "content.theme.created",
      entityType: "learning_theme",
      entityId: data.id,
      payload: data,
    }),
  );

  return data;
}

export async function createLearningModule({
  themeId,
  title,
  description,
  stageNumber,
  sortOrder,
  isActive,
}) {
  const client = requireSupabase();
  const normalizedThemeId = normalizeText(themeId);
  const normalizedTitle = normalizeText(title);
  if (!normalizedThemeId) {
    throw new HttpError(400, "themeId e obrigatorio.");
  }
  if (!normalizedTitle) {
    throw new HttpError(400, "Titulo do modulo e obrigatorio.");
  }

  await ensureThemeExists(normalizedThemeId);

  const payload = {
    theme_id: normalizedThemeId,
    stage_number: Math.max(1, normalizeInteger(stageNumber, 1)),
    title: normalizedTitle,
    description: normalizeNullableText(description),
    sort_order: normalizeInteger(sortOrder, 0),
    is_active: normalizeBoolean(isActive, true),
  };

  const { data, error } = await client
    .from("learning_modules")
    .insert(payload)
    .select("id, theme_id, stage_number, title, description, sort_order, is_active, created_at, updated_at")
    .single();

  if (error) {
    throw new HttpError(400, `Falha ao criar modulo: ${error.message}`);
  }

  await runBestEffortMobileSync("sync createLearningModule to mobile schema", () =>
    upsertMobileLearningUnitFromPanel(data),
  );

  await runBestEffortMobileSync("sync_event createLearningModule", () =>
    registerSyncEvent({
      eventType: "content.module.created",
      entityType: "learning_module",
      entityId: data.id,
      payload: data,
    }),
  );

  return data;
}

export async function createLearningActivity({
  moduleId,
  type,
  title,
  instructions,
  sortOrder,
  isPublished,
}) {
  const client = requireSupabase();
  const normalizedModuleId = normalizeText(moduleId);
  const normalizedTitle = normalizeText(title);
  const normalizedType = normalizeText(type).toLowerCase();

  if (!normalizedModuleId) {
    throw new HttpError(400, "moduleId e obrigatorio.");
  }
  if (!normalizedTitle) {
    throw new HttpError(400, "Titulo da atividade e obrigatorio.");
  }
  if (!ACTIVITY_TYPES.has(normalizedType)) {
    throw new HttpError(400, "Tipo de atividade invalido. Use: video, quiz, audio ou letra.");
  }

  await ensureModuleExists(normalizedModuleId);

  const payload = {
    module_id: normalizedModuleId,
    type: normalizedType,
    title: normalizedTitle,
    instructions: normalizeNullableText(instructions),
    sort_order: normalizeInteger(sortOrder, 0),
    is_published: normalizeBoolean(isPublished, false),
  };

  const { data, error } = await client
    .from("learning_activities")
    .insert(payload)
    .select("id, module_id, type, title, instructions, sort_order, is_published, created_at, updated_at")
    .single();

  if (error) {
    throw new HttpError(400, `Falha ao criar atividade: ${error.message}`);
  }

  await runBestEffortMobileSync("sync createLearningActivity to mobile schema", () =>
    upsertMobileActivityFromPanel(data),
  );

  await runBestEffortMobileSync("sync_event createLearningActivity", () =>
    registerSyncEvent({
      eventType: "content.activity.created",
      entityType: "learning_activity",
      entityId: data.id,
      payload: data,
    }),
  );

  return data;
}

export async function createContentAsset({
  activityId,
  kind,
  storagePath,
  mimeType,
  status,
  metadata,
}) {
  const client = requireSupabase();
  const normalizedActivityId = normalizeText(activityId);
  const normalizedKind = normalizeAssetKindInput(kind);
  const normalizedPath = normalizeText(storagePath);
  const normalizedMimeType = normalizeText(mimeType);
  const normalizedStatus = normalizeAssetStatusInput(status, "rascunho");

  if (!normalizedActivityId) {
    throw new HttpError(400, "activityId e obrigatorio.");
  }
  if (!normalizedKind) {
    throw new HttpError(400, "Tipo de asset invalido. Use: png, mp4, mp3 ou jpg.");
  }
  if (!normalizedPath) {
    throw new HttpError(400, "Caminho/URL do asset e obrigatorio.");
  }
  if (!normalizedMimeType) {
    throw new HttpError(400, "mimeType e obrigatorio.");
  }
  await ensureActivityExists(normalizedActivityId);

  const safeMetadata =
    metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

  const payload = {
    activity_id: normalizedActivityId,
    kind: normalizedKind,
    storage_path: normalizedPath,
    mime_type: normalizedMimeType,
    status: normalizedStatus,
    metadata: safeMetadata,
  };

  const { data, error } = await client
    .from("content_assets")
    .insert(payload)
    .select("id, activity_id, kind, storage_path, mime_type, status, metadata, created_at, updated_at")
    .single();

  if (error) {
    throw new HttpError(400, `Falha ao criar asset: ${error.message}`);
  }

  await runBestEffortMobileSync("sync createContentAsset to mobile schema", () =>
    appendAssetToMobileActivity(data),
  );

  await runBestEffortMobileSync("sync_event createContentAsset", () =>
    registerSyncEvent({
      eventType: "content.asset.created",
      entityType: "content_asset",
      entityId: data.id,
      payload: data,
    }),
  );

  return data;
}

export async function uploadContentAssetFile({
  fileBuffer,
  originalName,
  mimeType,
  bytes,
  activityId,
  kind,
  status,
  metadata,
  title,
  createdByEducatorId,
  folder,
}) {
  if (!fileBuffer || bytes <= 0) {
    throw new HttpError(400, "Arquivo nao enviado. Use o campo 'file'.");
  }

  const normalizedActivityId = normalizeText(activityId);
  const detectedKind =
    normalizeAssetKindInput(kind) ||
    detectAssetKindFromUpload({
      mimeType,
      fileName: originalName,
    });

  if (!detectedKind) {
    throw new HttpError(
      400,
      "Tipo de arquivo nao suportado. Envie PNG, JPG, MP4 ou MP3.",
    );
  }

  const resolvedMimeType =
    normalizeText(mimeType).toLowerCase() ||
    MIME_BY_ASSET_KIND[detectedKind] ||
    "application/octet-stream";
  const extension = detectUploadFileExtension(originalName, resolvedMimeType, detectedKind);
  const resolvedTitle = normalizeText(title) || titleFromFileName(originalName);
  const objectPath = buildStorageObjectPath({
    extension,
    folder: folder || (normalizedActivityId ? "conteudo" : "perfil"),
  });

  const storage = await uploadBufferToStorage({
    buffer: fileBuffer,
    mimeType: resolvedMimeType,
    objectPath,
  });

  const defaultMetadata = {
    objectPath: storage.objectPath,
    bucket: storage.bucket,
    originalFileName: normalizeText(originalName) || null,
    title: resolvedTitle,
    bytes,
    uploadedAt: new Date().toISOString(),
  };
  const mergedMetadata = normalizeUploadMetadata(metadata, defaultMetadata);

  let assetRow = null;
  if (normalizedActivityId) {
    const normalizedStatus = normalizeAssetStatusInput(status, "rascunho");
    assetRow = await createContentAsset({
      activityId: normalizedActivityId,
      kind: detectedKind,
      storagePath: storage.publicUrl,
      mimeType: resolvedMimeType,
      status: normalizedStatus,
      metadata: mergedMetadata,
    });
  } else {
    await runBestEffortMobileSync("sync_event uploadContentAssetFile", () =>
      registerSyncEvent({
        eventType: "content.asset.uploaded",
        entityType: "storage_object",
        entityId: storage.objectPath,
        payload: {
          kind: detectedKind,
          sourceUrl: storage.publicUrl,
          mimeType: resolvedMimeType,
          bytes,
        },
      }),
    );
  }

  return {
    asset: mapAssetToUploadPayload(assetRow, {
      kind: detectedKind,
      title: resolvedTitle,
      sourceUrl: storage.publicUrl,
      mimeType: resolvedMimeType,
      originalFileName: normalizeText(originalName) || null,
      bytes,
      createdByEducatorId: normalizeNullableText(createdByEducatorId),
    }),
    storage,
    vinculado: Boolean(assetRow),
  };
}

export async function createMobileScreenBlueprint({
  slug,
  title,
  svgPath,
  stageTag,
  moduleCode,
  isActive,
}) {
  const client = requireSupabase();
  const normalizedTitle = normalizeText(title);
  const normalizedSvgPath = normalizeText(svgPath);
  const normalizedSlug = normalizeSlug(slug, normalizedTitle || normalizedSvgPath || "tela");

  if (!normalizedTitle) {
    throw new HttpError(400, "Titulo da tela e obrigatorio.");
  }
  if (!normalizedSvgPath) {
    throw new HttpError(400, "svgPath e obrigatorio.");
  }

  const payload = {
    slug: normalizedSlug,
    title: normalizedTitle,
    svg_path: normalizedSvgPath,
    stage_tag: normalizeNullableText(stageTag),
    module_code: normalizeNullableText(moduleCode),
    is_active: normalizeBoolean(isActive, true),
  };

  const { data, error } = await client
    .from("mobile_screen_blueprints")
    .upsert(payload, { onConflict: "slug" })
    .select("id, slug, title, svg_path, stage_tag, module_code, is_active, created_at, updated_at")
    .single();

  if (error) {
    throw new HttpError(400, `Falha ao criar blueprint mobile: ${error.message}`);
  }

  await runBestEffortMobileSync("sync_event createMobileScreenBlueprint", () =>
    registerSyncEvent({
      eventType: "content.blueprint.created",
      entityType: "mobile_screen_blueprint",
      entityId: data.id,
      payload: data,
    }),
  );

  return data;
}

export async function updateMobileScreenBlueprint({
  blueprintId,
  slug,
  title,
  svgPath,
  stageTag,
  moduleCode,
  isActive,
}) {
  const client = requireSupabase();
  const normalizedBlueprintId = normalizeText(blueprintId);
  if (!isUuid(normalizedBlueprintId)) {
    throw new HttpError(400, "blueprintId invalido.");
  }

  const payload = {};
  if (title !== undefined) {
    const normalizedTitle = normalizeText(title);
    if (!normalizedTitle) {
      throw new HttpError(400, "Titulo da tela nao pode ficar vazio.");
    }
    payload.title = normalizedTitle;
  }

  if (slug !== undefined) {
    payload.slug = normalizeSlug(slug, payload.title || "tela");
  }

  if (svgPath !== undefined) {
    const normalizedSvgPath = normalizeText(svgPath);
    if (!normalizedSvgPath) {
      throw new HttpError(400, "svgPath nao pode ficar vazio.");
    }
    payload.svg_path = normalizedSvgPath;
  }

  if (stageTag !== undefined) {
    payload.stage_tag = normalizeNullableText(stageTag);
  }

  if (moduleCode !== undefined) {
    payload.module_code = normalizeNullableText(moduleCode);
  }

  if (isActive !== undefined) {
    payload.is_active = normalizeBoolean(isActive, true);
  }

  if (Object.keys(payload).length === 0) {
    throw new HttpError(400, "Nenhum campo valido para atualizar.");
  }

  const { data, error } = await client
    .from("mobile_screen_blueprints")
    .update(payload)
    .eq("id", normalizedBlueprintId)
    .select("id, slug, title, svg_path, stage_tag, module_code, is_active, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new HttpError(400, `Falha ao atualizar blueprint mobile: ${error.message}`);
  }

  if (!data) {
    throw new HttpError(404, "Blueprint mobile nao encontrado.");
  }

  await runBestEffortMobileSync("sync_event updateMobileScreenBlueprint", () =>
    registerSyncEvent({
      eventType: "content.blueprint.updated",
      entityType: "mobile_screen_blueprint",
      entityId: data.id,
      payload: data,
    }),
  );

  return data;
}

export async function importMobileBlueprintsFromManifest({ manifestPath } = {}) {
  const client = requireSupabase();
  const resolvedManifestPath = normalizeText(manifestPath)
    ? resolve(monorepoRootPath, normalizeText(manifestPath))
    : DEFAULT_BLUEPRINTS_MANIFEST_PATH;

  let parsedManifest;
  try {
    const raw = await readFile(resolvedManifestPath, "utf8");
    parsedManifest = JSON.parse(raw);
  } catch (error) {
    throw new HttpError(400, `Falha ao ler manifest de telas: ${error instanceof Error ? error.message : error}`);
  }

  const screens = Array.isArray(parsedManifest?.screens) ? parsedManifest.screens : [];
  if (screens.length === 0) {
    return {
      imported: 0,
      items: [],
      manifestPath: resolvedManifestPath,
    };
  }

  const rows = screens
    .map((screen, index) => {
      const title = normalizeText(screen?.title);
      const svgPath = normalizeText(screen?.svgPath);
      if (!title || !svgPath) {
        return null;
      }

      return {
        slug: normalizeSlug(screen?.slug, `${title}-${index + 1}`),
        title,
        svg_path: svgPath,
        stage_tag: normalizeNullableText(screen?.stageTag),
        module_code: normalizeNullableText(screen?.moduleCode),
        is_active: true,
      };
    })
    .filter(Boolean);

  if (rows.length === 0) {
    return {
      imported: 0,
      items: [],
      manifestPath: resolvedManifestPath,
    };
  }

  const { data, error } = await client
    .from("mobile_screen_blueprints")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug, title, svg_path, stage_tag, module_code, is_active, created_at, updated_at");

  if (error) {
    throw new HttpError(400, `Falha ao importar blueprints do manifest: ${error.message}`);
  }

  await runBestEffortMobileSync("sync_event importMobileBlueprintsFromManifest", () =>
    registerSyncEvent({
      eventType: "content.blueprint.imported",
      entityType: "mobile_screen_blueprint",
      entityId: `batch-${Date.now()}`,
      payload: {
        manifestPath: resolvedManifestPath,
        imported: data?.length ?? 0,
      },
    }),
  );

  return {
    imported: data?.length ?? 0,
    items: data ?? [],
    manifestPath: resolvedManifestPath,
  };
}

function normalizeDigits(value, maxLength) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 0 ? digits.slice(0, maxLength) : null;
}

async function upsertMobileEducatorRecord({ id, fullName, email, cpf, phone, password }) {
  const client = requireSupabase();
  const basePayload = {
    id: String(id),
    name: normalizeText(fullName) || "Educador",
    email: normalizeText(email).toLowerCase() || null,
    cpf: normalizeDigits(cpf, 11),
    phoneDigits: normalizeDigits(phone, 11),
    supabaseAuthUserId: String(id),
    passwordHash: normalizeText(password) ? hashMobilePassword(password) : null,
  };

  const { error } = await client.from("Educator").upsert(basePayload, { onConflict: "id" });

  if (!error) {
    return;
  }

  if (isOptionalSourceMissing(error)) {
    return;
  }

  const normalizedErrorMessage = String(error.message ?? "").toLowerCase();
  const isUniqueViolation = String(error.code ?? "") === "23505";

  const canFallbackToSupabaseAuthUpdate =
    isUniqueViolation &&
    Boolean(basePayload.supabaseAuthUserId) &&
    normalizedErrorMessage.includes("educator_supabaseauthuserid_key");
  const canFallbackToEmailUpdate =
    isUniqueViolation &&
    Boolean(basePayload.email) &&
    normalizedErrorMessage.includes("educator_email_key");
  const canFallbackToCpfUpdate =
    isUniqueViolation && Boolean(basePayload.cpf) && normalizedErrorMessage.includes("educator_cpf_key");

  if (!canFallbackToSupabaseAuthUpdate && !canFallbackToEmailUpdate && !canFallbackToCpfUpdate) {
    throw new HttpError(500, `Falha ao sincronizar educador no schema mobile: ${error.message}`);
  }

  let updateQuery = client.from("Educator").update({
    name: basePayload.name,
    email: basePayload.email,
    cpf: basePayload.cpf,
    phoneDigits: basePayload.phoneDigits,
    supabaseAuthUserId: basePayload.supabaseAuthUserId,
    ...(basePayload.passwordHash ? { passwordHash: basePayload.passwordHash } : {}),
  });

  if (canFallbackToSupabaseAuthUpdate) {
    updateQuery = updateQuery.eq("supabaseAuthUserId", basePayload.supabaseAuthUserId);
  } else if (canFallbackToCpfUpdate) {
    updateQuery = updateQuery.eq("cpf", basePayload.cpf);
  } else {
    updateQuery = updateQuery.eq("email", basePayload.email);
  }

  const { error: updateError } = await updateQuery;

  if (updateError && !isOptionalSourceMissing(updateError)) {
    throw new HttpError(
      500,
      `Falha ao sincronizar educador por email no schema mobile: ${updateError.message}`,
    );
  }
}

async function upsertMobileLearnerRecord({ id, fullName, notes, educatorId }) {
  const client = requireSupabase();
  const payload = {
    id: String(id),
    displayName: normalizeText(fullName) || "Alfabetizando",
    notes: normalizeText(notes) || null,
    educatorId: normalizeText(educatorId) || null,
  };

  const { error } = await client.from("LearnerProfile").upsert(payload, { onConflict: "id" });

  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(500, `Falha ao sincronizar alfabetizando no schema mobile: ${error.message}`);
  }
}

async function getProfileById(profileId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, role, phone, cpf, metadata")
    .eq("id", String(profileId))
    .maybeSingle();

  if (error) {
    throw new HttpError(500, `Falha ao buscar perfil ${profileId}: ${error.message}`);
  }

  return data ?? null;
}

async function syncPanelProfileToMobile({ profile, email, password }) {
  if (!profile) {
    return;
  }

  if (profile.role === "tutor") {
    await upsertMobileEducatorRecord({
      id: profile.id,
      fullName: profile.full_name,
      email,
      cpf: profile.cpf,
      phone: profile.phone,
      password,
    });
    return;
  }

  if (profile.role === "alfabetizando") {
    const notes =
      typeof profile.metadata?.notes === "string" && profile.metadata.notes.trim().length > 0
        ? profile.metadata.notes
        : null;

    await upsertMobileLearnerRecord({
      id: profile.id,
      fullName: profile.full_name,
      notes,
    });
  }
}

async function syncPanelLinkToMobile({ tutorId, studentId, status }) {
  const [tutorProfile, studentProfile] = await Promise.all([getProfileById(tutorId), getProfileById(studentId)]);

  if (tutorProfile) {
    await syncPanelProfileToMobile({
      profile: tutorProfile,
      email: tutorProfile.metadata?.email ?? "",
      password: "",
    });
  }

  if (studentProfile) {
    await syncPanelProfileToMobile({
      profile: studentProfile,
      email: studentProfile.metadata?.email ?? "",
      password: "",
    });
  }

  if (!studentProfile) {
    return;
  }

  const client = requireSupabase();
  let nextEducatorId = null;

  if (status === "confirmado") {
    const normalizedTutorId = normalizeText(tutorId);
    const educatorById = await runOptionalQuery(
      client.from("Educator").select("id").eq("id", normalizedTutorId).limit(1),
      "Falha ao resolver educador mobile por id",
    );

    if (educatorById.length > 0) {
      nextEducatorId = String(educatorById[0].id);
    } else {
      const educatorByAuthUser = await runOptionalQuery(
        client
          .from("Educator")
          .select("id")
          .eq("supabaseAuthUserId", normalizedTutorId)
          .limit(1),
        "Falha ao resolver educador mobile por supabaseAuthUserId",
      );

      nextEducatorId =
        educatorByAuthUser.length > 0 ? String(educatorByAuthUser[0].id) : normalizedTutorId;
    }
  }

  const { error } = await client
    .from("LearnerProfile")
    .update({ educatorId: nextEducatorId })
    .eq("id", String(studentId));

  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(500, `Falha ao sincronizar vinculo no schema mobile: ${error.message}`);
  }
}

async function runBestEffortMobileSync(context, operation) {
  try {
    await operation();
  } catch (error) {
    logMobileSyncWarning(context, error);
  }
}

export async function createAuthUserWithProfile({
  email,
  password,
  fullName,
  phone,
  cpf,
  role,
}) {
  const client = requireSupabase();

  const normalizedEmail = normalizeText(email).toLowerCase();
  const normalizedPassword = normalizeText(password);
  const normalizedName = normalizeText(fullName);

  if (!normalizedName) {
    throw new HttpError(400, "O campo 'fullName' e obrigatorio.");
  }

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new HttpError(400, "O campo 'email' deve ser valido.");
  }

  if (normalizedPassword.length < 6) {
    throw new HttpError(400, "A senha deve ter pelo menos 6 caracteres.");
  }

  const { data: userData, error: userError } = await client.auth.admin.createUser({
    email: normalizedEmail,
    password: normalizedPassword,
    email_confirm: true,
    user_metadata: {
      full_name: normalizedName,
      role,
    },
  });

  if (userError) {
    throw new HttpError(400, `Falha ao criar usuario: ${userError.message}`);
  }

  const userId = userData?.user?.id;
  if (!userId) {
    throw new HttpError(500, "Nao foi possivel obter o usuario criado.");
  }

  const { data: profileData, error: profileError } = await client
    .from("profiles")
    .update({
      full_name: normalizedName,
      phone: normalizeText(phone) || null,
      cpf: normalizeText(cpf) || null,
      role,
    })
    .eq("id", userId)
    .select("id, full_name, role, phone, cpf, metadata, created_at, updated_at")
    .single();

  if (profileError) {
    throw new HttpError(500, `Usuario criado, mas perfil nao atualizado: ${profileError.message}`);
  }

  await runBestEffortMobileSync("sync profile after createAuthUserWithProfile", () =>
    syncPanelProfileToMobile({
      profile: profileData,
      email: normalizedEmail,
      password: normalizedPassword,
    }),
  );

  return profileData;
}

export async function createTutorStudentLink({
  tutorId,
  studentId,
  status = "pendente",
  requestedBy,
  reason,
}) {
  const client = requireSupabase();

  const payload = {
    tutor_id: normalizeText(tutorId),
    student_id: normalizeText(studentId),
    status,
    requested_by: normalizeText(requestedBy) || null,
    reason: normalizeText(reason) || null,
  };

  if (!payload.tutor_id || !payload.student_id) {
    throw new HttpError(400, "Os campos 'tutorId' e 'studentId' sao obrigatorios.");
  }

  const { data, error } = await client
    .from("tutor_student_links")
    .insert(payload)
    .select(
      "id, tutor_id, student_id, status, requested_by, requested_at, decided_by, decided_at, reason, created_at, updated_at",
    )
    .single();

  if (error) {
    throw new HttpError(400, `Falha ao criar vinculo: ${error.message}`);
  }

  await runBestEffortMobileSync("sync link after createTutorStudentLink", () =>
    syncPanelLinkToMobile({
      tutorId: data.tutor_id,
      studentId: data.student_id,
      status: data.status,
    }),
  );

  return data;
}

export async function updateTutorStudentLink(id, updates) {
  const client = requireSupabase();
  const linkId = normalizeText(id);

  if (!linkId) {
    throw new HttpError(400, "ID do vinculo invalido.");
  }

  const payload = {
    status: updates.status,
    reason: normalizeText(updates.reason) || null,
    decided_by: normalizeText(updates.decidedBy) || null,
    decided_at: updates.status === "confirmado" || updates.status === "negado" ? new Date().toISOString() : null,
  };

  const { data, error } = await client
    .from("tutor_student_links")
    .update(payload)
    .eq("id", linkId)
    .select(
      "id, tutor_id, student_id, status, requested_by, requested_at, decided_by, decided_at, reason, created_at, updated_at",
    )
    .single();

  if (error) {
    throw new HttpError(400, `Falha ao atualizar vinculo: ${error.message}`);
  }

  await runBestEffortMobileSync("sync link after updateTutorStudentLink", () =>
    syncPanelLinkToMobile({
      tutorId: data.tutor_id,
      studentId: data.student_id,
      status: data.status,
    }),
  );

  return data;
}

export function toHttpError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  return new HttpError(500, error instanceof Error ? error.message : "Erro interno inesperado.");
}
