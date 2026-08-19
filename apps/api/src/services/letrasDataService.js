import { isSupabaseConfigured, supabaseAdmin } from "../lib/supabase.js";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

export class HttpError extends Error {
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
const ASSET_KINDS = new Set(["png", "jpg", "gif", "mp4", "mp3", "wav"]);
const ASSET_STATUSES = new Set(["rascunho", "publicado", "arquivado"]);
const ACTIVITY_PROGRESS_STATUSES = new Set([
  "nao_iniciado",
  "em_andamento",
  "travado",
  "concluido",
]);
const SUPPORT_REQUEST_STATUSES = new Set(["aberto", "em_atendimento", "resolvido", "cancelado"]);
const SUPPORT_REQUEST_PRIORITIES = new Set(["baixa", "media", "alta", "critica"]);
const NOTIFICATION_TYPES = new Set([
  "support_request",
  "progress_locked",
  "link_pending",
  "system",
  "deadline_alert",
  "score_event",
  "recognition",
  "link_denied",
  "link_transferred",
  "photo_sent",
  "photo_approved",
]);
const SYSTEM_SETTINGS_EVENT_TYPE = "system.settings.updated";
const SYSTEM_SETTINGS_ENTITY_TYPE = "system_settings";
const DEFAULT_SYSTEM_SETTINGS = Object.freeze({
  errorBlockLimit: 3,
  inactivityDays: 7,
});
const ASSET_KIND_BY_EXTENSION = new Map([
  ["png", "png"],
  ["jpg", "jpg"],
  ["jpeg", "jpg"],
  ["gif", "gif"],
  ["mp4", "mp4"],
  ["mp3", "mp3"],
  ["wav", "wav"],
]);
const MIME_BY_ASSET_KIND = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);
// De apps/api/src/services ate a raiz do monorepo sao quatro niveis. Antes
// eram tres, o que parava em apps/ — por isso os caminhos padrao de import
// (manifest de blueprint e conteudos das telas) nunca resolviam.
const monorepoRootPath = resolve(currentDirPath, "..", "..", "..", "..");
// Os conteudos viviam no repositorio letras-mobile-ref ate a consolidacao;
// agora vivem neste monorepo.
const mobileRefRootPath = monorepoRootPath;
const DEFAULT_BLUEPRINTS_MANIFEST_PATH = resolve(
  monorepoRootPath,
  "assets",
  "mobile",
  "etapa-1",
  "manifest.json",
);
const DEFAULT_STAGE_TWO_CONTENTS_DIRECTORY_PATH = resolve(
  mobileRefRootPath,
  "docs",
  "Conteudos das telas",
);
const ALLOWED_CONTENT_IMPORT_ROOTS = [monorepoRootPath, mobileRefRootPath].map((item) => resolve(item));

let supabaseAdminOverrideForTests = null;

export function __setSupabaseAdminForTests(client) {
  supabaseAdminOverrideForTests = client;
}

function requireSupabase() {
  if (supabaseAdminOverrideForTests) {
    return supabaseAdminOverrideForTests;
  }

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

function chunkArray(values, chunkSize = 100) {
  const items = Array.isArray(values) ? values : [];
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

async function deleteRowsByIds(client, tableName, ids, contextMessage) {
  const normalizedIds = (ids ?? []).map((value) => String(value ?? "").trim()).filter(Boolean);
  if (normalizedIds.length === 0) {
    return 0;
  }

  for (const batch of chunkArray(normalizedIds)) {
    const { error } = await client.from(tableName).delete().in("id", batch);
    if (error && !isOptionalSourceMissing(error)) {
      throw new HttpError(400, `${contextMessage}: ${error.message}`);
    }
  }

  return normalizedIds.length;
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
    case "LOCKED":
    case "TRAVADO":
      return "travado";
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

function normalizeSystemSettingsPayload(rawSettings) {
  const settings =
    rawSettings && typeof rawSettings === "object" && !Array.isArray(rawSettings)
      ? rawSettings
      : {};

  return {
    errorBlockLimit: Math.max(
      1,
      normalizeInteger(settings.errorBlockLimit, DEFAULT_SYSTEM_SETTINGS.errorBlockLimit),
    ),
    inactivityDays: Math.max(
      1,
      normalizeInteger(settings.inactivityDays, DEFAULT_SYSTEM_SETTINGS.inactivityDays),
    ),
  };
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
  if (normalizedMime.startsWith("image/gif")) {
    return "gif";
  }
  if (normalizedMime.startsWith("video/mp4")) {
    return "mp4";
  }
  if (normalizedMime.startsWith("audio/mpeg") || normalizedMime.startsWith("audio/mp3")) {
    return "mp3";
  }
  if (
    normalizedMime.startsWith("audio/wav") ||
    normalizedMime.startsWith("audio/wave") ||
    normalizedMime.startsWith("audio/x-wav") ||
    normalizedMime.startsWith("audio/vnd.wave")
  ) {
    return "wav";
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

function isPathInsideRoot(rootPath, targetPath) {
  const relativePath = relative(rootPath, targetPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function resolveAllowedContentImportDirectory(directoryPath) {
  const requestedPath = normalizeText(directoryPath);
  const resolvedDirectoryPath = requestedPath
    ? resolve(monorepoRootPath, requestedPath)
    : DEFAULT_STAGE_TWO_CONTENTS_DIRECTORY_PATH;

  const isAllowed = ALLOWED_CONTENT_IMPORT_ROOTS.some((rootPath) =>
    isPathInsideRoot(rootPath, resolvedDirectoryPath),
  );

  if (!isAllowed) {
    throw new HttpError(
      400,
      `Diretorio fora das areas permitidas. Use uma pasta dentro de: ${ALLOWED_CONTENT_IMPORT_ROOTS.join(" | ")}`,
    );
  }

  return resolvedDirectoryPath;
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

export async function getMobileLearners({ ids, educatorIds } = {}) {
  const client = requireSupabase();
  let query = client
    .from("LearnerProfile")
    .select("id, displayName, notes, educatorId, cpfOrPassport, phoneDigits, createdAt, updatedAt");

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
    phone: item.phoneDigits ?? "",
    cpf: item.cpfOrPassport ?? "",
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

  const mobileEducatorProfiles = shouldLoadMobileEducators
    ? mobileEducators.map(mapMobileEducatorToProfile)
    : [];
  const mobileEducatorById = new Map(
    mobileEducatorProfiles.map((item) => [String(item.id), item]),
  );

  let merged = profiles.map((profile) => {
    if (profile.role !== "tutor") {
      return profile;
    }

    const mobileMirror = mobileEducatorById.get(String(profile.id));
    if (!mobileMirror) {
      return profile;
    }

    const panelMetadata =
      profile.metadata && typeof profile.metadata === "object" && !Array.isArray(profile.metadata)
        ? profile.metadata
        : {};
    const mobileMetadata =
      mobileMirror.metadata &&
      typeof mobileMirror.metadata === "object" &&
      !Array.isArray(mobileMirror.metadata)
        ? mobileMirror.metadata
        : {};
    const panelEmail =
      typeof panelMetadata.email === "string" && panelMetadata.email.trim().length > 0
        ? panelMetadata.email.trim()
        : "";

    return {
      ...profile,
      metadata: {
        ...mobileMetadata,
        ...panelMetadata,
        email: panelEmail || mobileMetadata.email || "",
      },
    };
  });

  if (shouldLoadMobileEducators) {
    merged = dedupeById(merged, mobileEducatorProfiles);
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

// ---------------------------------------------------------------------------
// Status por etapa do alfabetizando (fonte da verdade do gate Etapa 1/Etapa 2
// e do espelhamento). Computado na leitura, sem tabela nova. Escopado por tema.
// ---------------------------------------------------------------------------

function groupByKey(items, keyFn) {
  const map = new Map();
  for (const item of items ?? []) {
    const key = keyFn(item);
    if (key == null) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

// Resolve o número da etapa de um módulo: prioriza o vínculo forte
// stage_id → learning_stages e cai para stage_number (legado) quando não há.
function resolveModuleStageNumber(module, stageNumberByStageId) {
  const stageId = normalizeNullableText(module?.stage_id);
  if (stageId && stageNumberByStageId.has(stageId)) {
    return stageNumberByStageId.get(stageId);
  }
  const legacy = Number(module?.stage_number);
  return Number.isFinite(legacy) ? legacy : null;
}

// Deriva o tema do alfabetizando pelo tema mais frequente entre as atividades
// em que ele tem progresso (o tema é travado durante a jornada — CLAUDE.md).
function resolveThemeIdFromProgress(progressRows, activityThemeById) {
  const counts = new Map();
  for (const row of progressRows ?? []) {
    const themeId = activityThemeById.get(row.activity_id);
    if (!themeId) continue;
    counts.set(themeId, (counts.get(themeId) ?? 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [themeId, count] of counts) {
    if (count > bestCount) {
      best = themeId;
      bestCount = count;
    }
  }
  return best;
}

// Puro/síncrono: monta o rollup por etapa a partir de dados já carregados
// (etapas ativas, módulos ativos, atividades publicadas e progresso do aluno).
// Reutilizado pelo endpoint individual e pelo enriquecimento em lote da lista.
//
// `approvedStageNumbers` (Set<number>): decisão do usuário em 2026-08-19 — a
// conclusão da Etapa 1 NÃO libera a Etapa 2 sozinha, o alfabetizador precisa
// aprovar explicitamente (ver learner_stage_approvals). Só a transição pra
// fora da PRIMEIRA etapa exige essa aprovação; as demais (2→3) continuam
// automáticas por conclusão, como já era.
function buildStageStatus({ stages, modules, activities, progressRows, approvedStageNumbers }) {
  const approvedStages =
    approvedStageNumbers instanceof Set ? approvedStageNumbers : new Set(approvedStageNumbers ?? []);
  const stageNumberByStageId = new Map(
    (stages ?? []).map((stage) => [stage.id, Number(stage.stage_number)]),
  );
  const stageNumberByModuleId = new Map(
    (modules ?? []).map((module) => [module.id, resolveModuleStageNumber(module, stageNumberByStageId)]),
  );

  const completedActivityIds = new Set(
    (progressRows ?? [])
      .filter((row) => row.status === "concluido")
      .map((row) => row.activity_id),
  );

  // Atividades publicadas agrupadas por número de etapa (via módulo).
  const activityIdsByStageNumber = new Map();
  for (const activity of activities ?? []) {
    const stageNumber = stageNumberByModuleId.get(activity.module_id);
    if (stageNumber == null) continue;
    if (!activityIdsByStageNumber.has(stageNumber)) activityIdsByStageNumber.set(stageNumber, []);
    activityIdsByStageNumber.get(stageNumber).push(activity.id);
  }

  const orderedStages = [...(stages ?? [])].sort(
    (a, b) => Number(a.stage_number) - Number(b.stage_number),
  );

  // Uma etapa desbloqueia se é a menor OU todas as anteriores estão concluídas
  // (e, especificamente pra sair da 1ª etapa, se ela já foi aprovada).
  let allPreviousCompleted = true;
  const firstStageNumber = orderedStages.length > 0 ? Number(orderedStages[0].stage_number) : null;
  const stageStatuses = orderedStages.map((stage, index) => {
    const stageNumber = Number(stage.stage_number);
    const stageActivityIds = activityIdsByStageNumber.get(stageNumber) ?? [];
    const stageCompletedIds = stageActivityIds.filter((id) => completedActivityIds.has(id));
    const totalActivities = stageActivityIds.length;
    const completed = totalActivities > 0 && stageCompletedIds.length === totalActivities;
    const firstStageApproved = firstStageNumber != null && approvedStages.has(firstStageNumber);
    const requiresFirstStageApproval = index === 1;
    const unlocked = allPreviousCompleted && (!requiresFirstStageApproval || firstStageApproved);
    allPreviousCompleted = allPreviousCompleted && completed;
    return {
      stageId: stage.id,
      stageNumber,
      title: stage.title ?? null,
      totalActivities,
      completedCount: stageCompletedIds.length,
      completed,
      unlocked,
      completedActivityIds: stageCompletedIds,
      approved: index === 0 ? firstStageApproved : null,
      pendingApproval: index === 0 ? completed && !firstStageApproved : false,
    };
  });

  const firstStage = stageStatuses[0] ?? null;
  // Etapa 1 = menor etapa ativa. Tema sem atividades na Etapa 1 ⇒ false (mirror
  // travado por padrão seguro).
  const etapa1Completed = Boolean(firstStage?.completed);
  const etapa1Approved = Boolean(firstStage?.approved);
  const unlockedStageNumbers = stageStatuses.filter((s) => s.unlocked).map((s) => s.stageNumber);
  const currentStageNumber =
    unlockedStageNumbers.length > 0 ? Math.max(...unlockedStageNumbers) : firstStage?.stageNumber ?? 1;

  return {
    stages: stageStatuses,
    etapa1Completed,
    etapa1Approved,
    // Espelhamento também exige a aprovação — não faz sentido o alfabetizador
    // acompanhar a Etapa 2 remotamente antes de ter liberado essa transição.
    mirrorUnlocked: etapa1Approved,
    currentStageNumber,
  };
}

// Aprovações de transição de etapa já registradas para 1 aluno em 1 tema.
async function getLearnerStageApprovals({ studentId, themeId }) {
  const client = requireSupabase();
  const rows = await runOptionalQuery(
    client
      .from("learner_stage_approvals")
      .select("stage_number")
      .eq("student_id", studentId)
      .eq("theme_id", themeId),
    "Falha ao listar aprovacoes de etapa",
  );
  return new Set((rows ?? []).map((row) => Number(row.stage_number)));
}

// Aprovações de VÁRIOS alunos de uma vez (para o enriquecimento em lote).
async function getLearnerStageApprovalsMap({ studentIds }) {
  const client = requireSupabase();
  if (!studentIds || studentIds.length === 0) return new Map();
  const rows = await runOptionalQuery(
    client
      .from("learner_stage_approvals")
      .select("student_id, theme_id, stage_number")
      .in("student_id", studentIds),
    "Falha ao listar aprovacoes de etapa",
  );
  const map = new Map();
  for (const row of rows ?? []) {
    const key = `${row.student_id}:${row.theme_id}`;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(Number(row.stage_number));
  }
  return map;
}

// Aprova explicitamente a transição de UMA etapa para a seguinte (decisão do
// usuário, 2026-08-19: conclusão da Etapa 1 sozinha não libera a Etapa 2).
// Idempotente via unique constraint (student_id, theme_id, stage_number).
export async function approveLearnerStage({ studentId, themeId, stageNumber, educatorId }) {
  const client = requireSupabase();
  const normalizedStudentId = normalizeText(studentId);
  const normalizedThemeId = normalizeText(themeId);
  const normalizedStageNumber = Number(stageNumber);
  if (!normalizedStudentId) throw new HttpError(400, "studentId e obrigatorio.");
  if (!normalizedThemeId) throw new HttpError(400, "themeId e obrigatorio.");
  if (!Number.isFinite(normalizedStageNumber)) throw new HttpError(400, "stageNumber e obrigatorio.");

  const { data, error } = await client
    .from("learner_stage_approvals")
    .upsert(
      {
        student_id: normalizedStudentId,
        theme_id: normalizedThemeId,
        stage_number: normalizedStageNumber,
        approved_by: normalizeNullableText(educatorId),
        approved_at: new Date().toISOString(),
      },
      { onConflict: "student_id,theme_id,stage_number", ignoreDuplicates: true },
    )
    .select("id, student_id, theme_id, stage_number, approved_by, approved_at")
    .maybeSingle();

  if (error) {
    throw new HttpError(400, `Falha ao aprovar etapa: ${error.message}`);
  }

  await runBestEffortMobileSync("register stage approval sync event", () =>
    registerSyncEvent({
      sourcePlatform: "web",
      eventType: "stage.approved",
      entityType: "learner_stage_approval",
      entityId: normalizedStudentId,
      payload: { studentId: normalizedStudentId, themeId: normalizedThemeId, stageNumber: normalizedStageNumber, educatorId: normalizeNullableText(educatorId) },
    }),
  );

  return computeLearnerStageStatus({ learnerProfileId: normalizedStudentId, themeId: normalizedThemeId });
}

// Status por etapa de UM alfabetizando dentro de UM tema. Wrapper de leitura
// usado pelo endpoint GET /painel/learners/:id/stage-status e por
// maybeCreditStageCompletion (crédito de pontos escopado por tema).
export async function computeLearnerStageStatus({ learnerProfileId, themeId } = {}) {
  const client = requireSupabase();
  const normalizedLearnerId = normalizeText(learnerProfileId);
  const normalizedThemeId = normalizeText(themeId);
  if (!normalizedLearnerId) throw new HttpError(400, "learnerProfileId e obrigatorio.");
  if (!normalizedThemeId) throw new HttpError(400, "themeId e obrigatorio.");

  const [stages, modules] = await Promise.all([
    runQuery(
      client
        .from("learning_stages")
        .select("id, stage_number, title, sort_order")
        .eq("theme_id", normalizedThemeId)
        .neq("is_active", false)
        .order("stage_number", { ascending: true }),
      "Falha ao listar etapas do tema",
    ),
    runQuery(
      client
        .from("learning_modules")
        .select("id, stage_id, stage_number")
        .eq("theme_id", normalizedThemeId)
        .neq("is_active", false),
      "Falha ao listar modulos do tema",
    ),
  ]);

  const moduleIds = modules.map((m) => m.id);
  const activities = moduleIds.length
    ? await runQuery(
        client
          .from("learning_activities")
          .select("id, module_id")
          .in("module_id", moduleIds)
          .neq("is_published", false),
        "Falha ao listar atividades do tema",
      )
    : [];

  const [progressRows, approvedStageNumbers] = await Promise.all([
    getActivityProgress({ studentIds: [normalizedLearnerId] }),
    getLearnerStageApprovals({ studentId: normalizedLearnerId, themeId: normalizedThemeId }),
  ]);

  return {
    learnerProfileId: normalizedLearnerId,
    themeId: normalizedThemeId,
    ...buildStageStatus({ stages, modules, activities, progressRows, approvedStageNumbers }),
  };
}

// Status por etapa de VÁRIOS alfabetizandos de uma vez (enriquecimento da lista
// da home do educador). Carrega o currículo publicado uma única vez (sem N+1) e
// resolve o tema de cada aluno pelo tema atribuído no perfil
// (assignedThemeIdByLearner: Map learnerId → themeId) com fallback para o
// progresso. Aceita progressRows já carregado para não re-consultar o progresso.
export async function computeLearnerStageStatusMap({
  learnerProfileIds,
  progressRows,
  assignedThemeIdByLearner,
} = {}) {
  const client = requireSupabase();
  const ids = [...new Set((learnerProfileIds ?? []).map((id) => normalizeText(id)).filter(Boolean))];
  const result = new Map();
  if (ids.length === 0) return result;

  const [rows, approvalsByStudentTheme] = await Promise.all([
    progressRows ?? getActivityProgress({ studentIds: ids }),
    getLearnerStageApprovalsMap({ studentIds: ids }),
  ]);

  const [stages, modules, themes] = await Promise.all([
    runQuery(
      client
        .from("learning_stages")
        .select("id, theme_id, stage_number, title, sort_order")
        .neq("is_active", false),
      "Falha ao listar etapas",
    ),
    runQuery(
      client
        .from("learning_modules")
        .select("id, theme_id, stage_id, stage_number")
        .neq("is_active", false),
      "Falha ao listar modulos",
    ),
    runQuery(client.from("learning_themes").select("id"), "Falha ao listar temas"),
  ]);
  const knownThemeIds = new Set(themes.map((t) => normalizeText(t.id)));

  const moduleIds = modules.map((m) => m.id);
  const activities = moduleIds.length
    ? await runQuery(
        client
          .from("learning_activities")
          .select("id, module_id")
          .in("module_id", moduleIds)
          .neq("is_published", false),
        "Falha ao listar atividades",
      )
    : [];

  const moduleThemeById = new Map(modules.map((m) => [m.id, normalizeNullableText(m.theme_id)]));
  const activityThemeById = new Map(
    activities.map((a) => [a.id, moduleThemeById.get(a.module_id) ?? null]),
  );

  const stagesByTheme = groupByKey(stages, (s) => normalizeNullableText(s.theme_id));
  const modulesByTheme = groupByKey(modules, (m) => normalizeNullableText(m.theme_id));
  const activitiesByTheme = groupByKey(activities, (a) => activityThemeById.get(a.id));

  const progressByStudent = groupByKey(rows, (row) => normalizeText(row.student_id));

  for (const learnerId of ids) {
    const learnerProgress = progressByStudent.get(learnerId) ?? [];
    // Tema atribuído vale só se existir em learning_themes (ids legados do
    // schema mobile gravados em metadata não resolvem e caem no fallback).
    const assignedThemeId = normalizeNullableText(assignedThemeIdByLearner?.get(learnerId));
    const themeId =
      assignedThemeId && knownThemeIds.has(assignedThemeId)
        ? assignedThemeId
        : resolveThemeIdFromProgress(learnerProgress, activityThemeById);
    if (!themeId) {
      // Sem tema resolvível (aluno sem progresso ou módulos legados sem
      // theme_id): default seguro — mirror travado, começando na Etapa 1.
      result.set(learnerId, {
        learnerProfileId: learnerId,
        themeId: null,
        stages: [],
        etapa1Completed: false,
        mirrorUnlocked: false,
        currentStageNumber: 1,
      });
      continue;
    }
    result.set(learnerId, {
      learnerProfileId: learnerId,
      themeId,
      ...buildStageStatus({
        stages: stagesByTheme.get(themeId) ?? [],
        modules: modulesByTheme.get(themeId) ?? [],
        activities: activitiesByTheme.get(themeId) ?? [],
        progressRows: learnerProgress,
        approvedStageNumbers: approvalsByStudentTheme.get(`${learnerId}:${themeId}`),
      }),
    });
  }

  return result;
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
            .select("id, module_id, type, title, instructions, sort_order, is_published, hint_video_id, created_at, updated_at");

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

export async function getPanelLearningActivities({ ids, publishedOnly = false } = {}) {
  if (ids && ids.length === 0) {
    return [];
  }

  const { uuidIds } = splitIdsByUuid(ids);
  if (ids && uuidIds.length === 0) {
    return [];
  }

  const client = requireSupabase();
  let query = client
    .from("learning_activities")
    .select("id, module_id, type, title, instructions, sort_order, is_published, hint_video_id, created_at, updated_at");

  if (ids) {
    query = query.in("id", uuidIds);
  }

  if (publishedOnly) {
    query = query.neq("is_published", false);
  }

  return runQuery(query, "Falha ao listar atividades do CMS");
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
            .select("id, theme_id, stage_number, stage_id, intro_video_id, title, description, sort_order, is_active, created_at, updated_at");

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

export async function getPanelLearningModules({ ids } = {}) {
  if (ids && ids.length === 0) {
    return [];
  }

  const { uuidIds } = splitIdsByUuid(ids);
  if (ids && uuidIds.length === 0) {
    return [];
  }

  const client = requireSupabase();
  let query = client
    .from("learning_modules")
    .select("id, theme_id, stage_number, title, description, sort_order, is_active, created_at, updated_at");

  if (ids) {
    query = query.in("id", uuidIds);
  }

  return runQuery(query, "Falha ao listar modulos do CMS");
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

export async function getPanelLearningThemes({ ids } = {}) {
  if (ids && ids.length === 0) {
    return [];
  }

  const { uuidIds } = splitIdsByUuid(ids);
  if (ids && uuidIds.length === 0) {
    return [];
  }

  const client = requireSupabase();
  let query = client
    .from("learning_themes")
    .select("id, slug, title, description, sort_order, is_active, created_at, updated_at")
    .order("sort_order", { ascending: true });

  if (ids) {
    query = query.in("id", uuidIds);
  }

  return runQuery(query, "Falha ao listar temas do CMS");
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

const MEDIA_LIBRARY_SELECT =
  "id, slug, title, description, kind, bucket, storage_path, public_url, duration_sec, tags, metadata, is_active, created_at, updated_at";

const LEARNING_STAGES_SELECT =
  "id, theme_id, stage_number, title, description, intro_video_id, sort_order, is_active, metadata, created_at, updated_at";

export async function getMediaLibrary({ kind } = {}) {
  const client = requireSupabase();
  let query = client
    .from("media_library")
    .select(MEDIA_LIBRARY_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (kind) {
    query = query.eq("kind", normalizeText(kind));
  }

  return runQuery(query, "Falha ao listar biblioteca de midias");
}

export async function createMediaLibraryItem({
  slug,
  title,
  description,
  kind,
  bucket,
  storagePath,
  publicUrl,
  durationSec,
  tags,
  metadata,
}) {
  const client = requireSupabase();
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) throw new HttpError(400, "Titulo e obrigatorio.");

  const payload = {
    title: normalizedTitle,
    description: normalizeNullableText(description),
    kind: normalizeText(kind) || "geral",
    bucket: normalizeText(bucket) || "cms-videos",
    storage_path: normalizeNullableText(storagePath),
    public_url: normalizeNullableText(publicUrl),
    duration_sec: durationSec !== undefined ? normalizeInteger(durationSec, null) : null,
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    is_active: true,
  };

  const normalizedSlug = slug ? normalizeText(slug) : null;
  if (normalizedSlug) payload.slug = normalizedSlug;

  const { data, error } = await client
    .from("media_library")
    .insert(payload)
    .select(MEDIA_LIBRARY_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") throw new HttpError(400, "Ja existe um item de midia com este slug.");
    throw new HttpError(400, `Falha ao criar item de midia: ${error.message}`);
  }
  return data;
}

export async function updateMediaLibraryItem({
  mediaId,
  slug,
  title,
  description,
  kind,
  bucket,
  storagePath,
  publicUrl,
  durationSec,
  tags,
  metadata,
  isActive,
}) {
  const client = requireSupabase();
  const normalizedId = normalizeText(mediaId);
  if (!isUuid(normalizedId)) throw new HttpError(400, "mediaId invalido.");

  const payload = {};
  if (slug !== undefined) payload.slug = normalizeNullableText(slug);
  if (title !== undefined) {
    const t = normalizeText(title);
    if (!t) throw new HttpError(400, "Titulo nao pode ficar vazio.");
    payload.title = t;
  }
  if (description !== undefined) payload.description = normalizeNullableText(description);
  if (kind !== undefined) payload.kind = normalizeText(kind) || "geral";
  if (bucket !== undefined) payload.bucket = normalizeText(bucket) || "cms-videos";
  if (storagePath !== undefined) payload.storage_path = normalizeNullableText(storagePath);
  if (publicUrl !== undefined) payload.public_url = normalizeNullableText(publicUrl);
  if (durationSec !== undefined) payload.duration_sec = normalizeInteger(durationSec, null);
  if (tags !== undefined) payload.tags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (metadata !== undefined) payload.metadata = metadata && typeof metadata === "object" ? metadata : {};
  if (isActive !== undefined) payload.is_active = normalizeBoolean(isActive, true);

  if (Object.keys(payload).length === 0) throw new HttpError(400, "Nenhum campo valido para atualizar.");

  const { data, error } = await client
    .from("media_library")
    .update(payload)
    .eq("id", normalizedId)
    .select(MEDIA_LIBRARY_SELECT)
    .maybeSingle();

  if (error) throw new HttpError(400, `Falha ao atualizar item de midia: ${error.message}`);
  if (!data) throw new HttpError(404, "Item de midia nao encontrado.");
  return data;
}

export async function deleteMediaLibraryItem({ mediaId }) {
  const client = requireSupabase();
  const normalizedId = normalizeText(mediaId);
  if (!isUuid(normalizedId)) throw new HttpError(400, "mediaId invalido.");

  const { error } = await client.from("media_library").delete().eq("id", normalizedId);
  if (error) throw new HttpError(400, `Falha ao deletar item de midia: ${error.message}`);
  return { id: normalizedId, deleted: true };
}

export async function getLearningStages({ themeId } = {}) {
  const client = requireSupabase();
  let query = client
    .from("learning_stages")
    .select(LEARNING_STAGES_SELECT)
    .order("sort_order", { ascending: true });

  if (themeId) query = query.eq("theme_id", normalizeText(themeId));

  return runQuery(query, "Falha ao listar etapas");
}

export async function createLearningStage({
  themeId,
  stageNumber,
  title,
  description,
  introVideoId,
  sortOrder,
  isActive,
}) {
  const client = requireSupabase();
  const normalizedThemeId = normalizeText(themeId);
  const normalizedTitle = normalizeText(title);
  if (!normalizedThemeId) throw new HttpError(400, "themeId e obrigatorio.");
  if (!normalizedTitle) throw new HttpError(400, "Titulo da etapa e obrigatorio.");
  if (!stageNumber) throw new HttpError(400, "stageNumber e obrigatorio.");

  await ensureThemeExists(normalizedThemeId);

  const payload = {
    theme_id: normalizedThemeId,
    stage_number: Math.max(1, normalizeInteger(stageNumber, 1)),
    title: normalizedTitle,
    description: normalizeNullableText(description),
    intro_video_id: introVideoId ? normalizeText(introVideoId) : null,
    sort_order: normalizeInteger(sortOrder, 0),
    is_active: normalizeBoolean(isActive, true),
  };

  const { data, error } = await client
    .from("learning_stages")
    .insert(payload)
    .select(LEARNING_STAGES_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") throw new HttpError(400, "Ja existe uma etapa com este numero para este tema.");
    throw new HttpError(400, `Falha ao criar etapa: ${error.message}`);
  }
  return data;
}

export async function updateLearningStage({
  stageId,
  title,
  description,
  introVideoId,
  sortOrder,
  isActive,
}) {
  const client = requireSupabase();
  const normalizedId = normalizeText(stageId);
  if (!isUuid(normalizedId)) throw new HttpError(400, "stageId invalido.");

  const payload = {};
  if (title !== undefined) {
    const t = normalizeText(title);
    if (!t) throw new HttpError(400, "Titulo nao pode ficar vazio.");
    payload.title = t;
  }
  if (description !== undefined) payload.description = normalizeNullableText(description);
  if (introVideoId !== undefined) payload.intro_video_id = introVideoId ? normalizeText(introVideoId) : null;
  if (sortOrder !== undefined) payload.sort_order = normalizeInteger(sortOrder, 0);
  if (isActive !== undefined) payload.is_active = normalizeBoolean(isActive, true);

  if (Object.keys(payload).length === 0) throw new HttpError(400, "Nenhum campo valido para atualizar.");

  const { data, error } = await client
    .from("learning_stages")
    .update(payload)
    .eq("id", normalizedId)
    .select(LEARNING_STAGES_SELECT)
    .maybeSingle();

  if (error) throw new HttpError(400, `Falha ao atualizar etapa: ${error.message}`);
  if (!data) throw new HttpError(404, "Etapa nao encontrada.");
  return data;
}

export async function deleteLearningStage({ stageId }) {
  const client = requireSupabase();
  const normalizedId = normalizeText(stageId);
  if (!isUuid(normalizedId)) throw new HttpError(400, "stageId invalido.");

  const { error } = await client.from("learning_stages").delete().eq("id", normalizedId);
  if (error) throw new HttpError(400, `Falha ao deletar etapa: ${error.message}`);
  return { id: normalizedId, deleted: true };
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

function normalizeSupportStatus(value, fallback = "aberto") {
  const normalized = normalizeText(value).toLowerCase();
  return SUPPORT_REQUEST_STATUSES.has(normalized) ? normalized : fallback;
}

function normalizeSupportPriority(value, fallback = "alta") {
  const normalized = normalizeText(value).toLowerCase();
  return SUPPORT_REQUEST_PRIORITIES.has(normalized) ? normalized : fallback;
}

function normalizeNotificationType(value, fallback = "system") {
  const normalized = normalizeText(value).toLowerCase();
  return NOTIFICATION_TYPES.has(normalized) ? normalized : fallback;
}

async function resolveTutorIdForStudent(studentId) {
  const client = requireSupabase();
  const normalizedStudentId = normalizeText(studentId);
  if (!normalizedStudentId) {
    return null;
  }

  if (isUuid(normalizedStudentId)) {
    const { data, error } = await client
      .from("tutor_student_links")
      .select("tutor_id, status, requested_at, updated_at")
      .eq("student_id", normalizedStudentId)
      .in("status", ["confirmado", "pendente"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && !isOptionalSourceMissing(error)) {
      throw new HttpError(500, `Falha ao buscar tutor do alfabetizando: ${error.message}`);
    }

    return normalizeNullableText(data?.tutor_id);
  }

  const { data, error } = await client
    .from("LearnerProfile")
    .select("educatorId")
    .eq("id", normalizedStudentId)
    .maybeSingle();

  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(500, `Falha ao buscar tutor mobile do alfabetizando: ${error.message}`);
  }

  return normalizeNullableText(data?.educatorId);
}

export async function createEducatorNotification({
  recipientId,
  recipientRole = "tutor",
  type = "system",
  title,
  body,
  sourceEntityType,
  sourceEntityId,
  payload,
} = {}) {
  const client = requireSupabase();
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) {
    throw new HttpError(400, "Titulo da notificacao e obrigatorio.");
  }

  const notificationPayload = {
    recipient_id: normalizeNullableText(recipientId),
    recipient_role: normalizeText(recipientRole).toLowerCase() || "tutor",
    type: normalizeNotificationType(type),
    title: normalizedTitle,
    body: normalizeNullableText(body),
    source_entity_type: normalizeNullableText(sourceEntityType),
    source_entity_id: normalizeNullableText(sourceEntityId),
    payload: payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {},
  };

  const { data, error } = await client
    .from("educator_notifications")
    .insert(notificationPayload)
    .select("id, recipient_id, recipient_role, type, title, body, source_entity_type, source_entity_id, payload, read_at, created_at, updated_at")
    .single();

  if (error) {
    throw new HttpError(400, `Falha ao criar notificacao: ${error.message}`);
  }

  await runBestEffortMobileSync("register notification event", () =>
    registerSyncEvent({
      sourcePlatform: "backend",
      eventType: "notification.created",
      entityType: "educator_notification",
      entityId: data.id,
      payload: {
        type: data.type,
        recipientId: data.recipient_id,
        sourceEntityType: data.source_entity_type,
        sourceEntityId: data.source_entity_id,
      },
    }),
  );

  return data;
}

export async function getEducatorNotifications({
  recipientId,
  recipientRole,
  unreadOnly = false,
  limit = 50,
} = {}) {
  const client = requireSupabase();
  let query = client
    .from("educator_notifications")
    .select("id, recipient_id, recipient_role, type, title, body, source_entity_type, source_entity_id, payload, read_at, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(normalizeInteger(limit, 50), 1), 200));

  const normalizedRecipientId = normalizeText(recipientId);
  if (normalizedRecipientId) {
    query = query.eq("recipient_id", normalizedRecipientId);
  }

  const normalizedRole = normalizeText(recipientRole).toLowerCase();
  if (normalizedRole) {
    query = query.eq("recipient_role", normalizedRole);
  }

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  return runOptionalQuery(query, "Falha ao listar notificacoes");
}

export async function markEducatorNotificationRead(notificationId) {
  const client = requireSupabase();
  const normalizedId = normalizeText(notificationId);
  if (!normalizedId) {
    throw new HttpError(400, "ID da notificacao e obrigatorio.");
  }

  const { data, error } = await client
    .from("educator_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", normalizedId)
    .select("id, recipient_id, recipient_role, type, title, body, source_entity_type, source_entity_id, payload, read_at, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new HttpError(400, `Falha ao marcar notificacao como lida: ${error.message}`);
  }

  if (!data) {
    throw new HttpError(404, "Notificacao nao encontrada.");
  }

  return data;
}

// ---------------------------------------------------------------------------
// Pontuação do alfabetizador — ledger de eventos (RN085/RN093/RN096)
// ---------------------------------------------------------------------------

// RN085: créditos por alfabetizando que conclui cada etapa.
const STAGE_COMPLETION_POINTS = Object.freeze({ 1: 10, 2: 15, 3: 25 });
// RN096: "PESSOA QUE TRANSFORMA PESSOA!" tem 26 letras (com "!"); a primeira é
// gratuita e cada 200 pontos forma uma nova (5.000 pontos fecham a frase).
const SCORE_PHRASE_TOTAL_LETTERS = 26;
const SCORE_POINTS_PER_LETTER = 200;
// RN085: bônus por avanço do alfabetizando após pedido de apoio ou bloqueio
// preventivo de tela — em até 1 hora (+3), 24 horas (+2) ou 3 dias (+1).
const SUPPORT_BONUS_WINDOWS = Object.freeze([
  { maxMs: 60 * 60 * 1000, points: 3 },
  { maxMs: 24 * 60 * 60 * 1000, points: 2 },
  { maxMs: 3 * 24 * 60 * 60 * 1000, points: 1 },
]);
// RN085: -3 quando o alfabetizando não avança da tela de dúvida em 5 dias,
// -3 a cada novos 5 dias, com teto de 30 pontos de perda por episódio.
const INACTIVITY_PENALTY_POINTS = -3;
const INACTIVITY_PERIOD_MS = 5 * 24 * 60 * 60 * 1000;
const INACTIVITY_PENALTY_CAP = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function lettersUnlockedFromScore(totalScore) {
  const safeTotal = Math.max(0, Number(totalScore) || 0);
  return Math.min(SCORE_PHRASE_TOTAL_LETTERS, 1 + Math.floor(safeTotal / SCORE_POINTS_PER_LETTER));
}

function formatNotificationStamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function resolveStudentDisplayInfo(studentId) {
  const client = requireSupabase();
  const normalizedId = normalizeText(studentId);
  if (!normalizedId) {
    return { name: "Alfabetizando", cpf: null };
  }

  if (isUuid(normalizedId)) {
    const { data } = await client
      .from("profiles")
      .select("full_name, cpf")
      .eq("id", normalizedId)
      .maybeSingle();
    if (data?.full_name) {
      return { name: data.full_name, cpf: normalizeNullableText(data.cpf) };
    }
  }

  const { data: mobileLearner, error } = await client
    .from("LearnerProfile")
    .select("displayName, cpf")
    .eq("id", normalizedId)
    .maybeSingle();
  if (error && !isOptionalSourceMissing(error)) {
    return { name: "Alfabetizando", cpf: null };
  }

  return {
    name: normalizeText(mobileLearner?.displayName) || "Alfabetizando",
    cpf: normalizeNullableText(mobileLearner?.cpf),
  };
}

async function resolveEducatorDisplayName(educatorId) {
  const client = requireSupabase();
  const normalizedId = normalizeText(educatorId);
  if (!normalizedId) {
    return "Alfabetizador";
  }

  if (isUuid(normalizedId)) {
    const { data } = await client
      .from("profiles")
      .select("full_name")
      .eq("id", normalizedId)
      .maybeSingle();
    if (data?.full_name) {
      return data.full_name;
    }
  }

  const { data: mobileEducator, error } = await client
    .from("Educator")
    .select("name")
    .eq("id", normalizedId)
    .maybeSingle();
  if (error && !isOptionalSourceMissing(error)) {
    return "Alfabetizador";
  }

  return normalizeText(mobileEducator?.name) || "Alfabetizador";
}

// Fonte canônica de pontos do alfabetizando (RN085/RN096). Usada pelo ranking
// e pelo extrato de pontos do painel — nunca somar `activity_progress.score`
// para exibir pontuação: aquele campo guarda score bruto da atividade (ex.:
// acerto de quiz), não os pontos de gamificação.
export async function getLearnerScoreEvents({ studentIds } = {}) {
  const client = requireSupabase();
  let query = client
    .from("learner_score_events")
    .select("id, student_id, activity_id, event_type, points, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (studentIds) {
    if (studentIds.length === 0) return [];
    query = query.in("student_id", studentIds);
  }

  return runOptionalQuery(query, "Falha ao listar eventos de pontuacao dos alfabetizandos");
}

// Fonte canônica de pontos do alfabetizador (RN085/RN093/RN096), espelhando
// getEducatorScoreSummary mas para múltiplos educadores de uma vez.
export async function getEducatorScoreEvents({ educatorIds } = {}) {
  const client = requireSupabase();
  let query = client
    .from("educator_score_events")
    .select("id, educator_id, student_id, event_type, stage_number, points, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (educatorIds) {
    if (educatorIds.length === 0) return [];
    query = query.in("educator_id", educatorIds);
  }

  return runOptionalQuery(query, "Falha ao listar eventos de pontuacao dos alfabetizadores");
}

export async function getEducatorScoreSummary(educatorId) {
  const client = requireSupabase();
  const normalizedId = normalizeText(educatorId);
  if (!normalizedId) {
    throw new HttpError(400, "educatorId e obrigatorio.");
  }

  // limit alto o suficiente para o horizonte do MVP; o PostgREST corta em 1000.
  const events = await runOptionalQuery(
    client
      .from("educator_score_events")
      .select("id, educator_id, student_id, event_type, stage_number, points, payload, created_at")
      .eq("educator_id", normalizedId)
      .order("created_at", { ascending: false })
      .limit(1000),
    "Falha ao listar eventos de pontuacao",
  );

  const totalScore = (events ?? []).reduce((sum, event) => sum + (Number(event.points) || 0), 0);
  return {
    totalScore,
    lettersUnlocked: lettersUnlockedFromScore(totalScore),
    events: events ?? [],
  };
}

// Registra um evento no ledger de pontos. Idempotente via dedupe_key (retorna
// null quando o evento já existe ou a migration ainda não foi aplicada).
export async function recordEducatorScoreEvent({
  educatorId,
  studentId,
  eventType,
  stageNumber,
  points,
  dedupeKey,
  payload,
} = {}) {
  const client = requireSupabase();
  const normalizedEducatorId = normalizeText(educatorId);
  const normalizedPoints = Math.trunc(Number(points));
  if (!normalizedEducatorId || !Number.isFinite(normalizedPoints) || normalizedPoints === 0) {
    return null;
  }

  const { data, error } = await client
    .from("educator_score_events")
    .insert({
      educator_id: normalizedEducatorId,
      student_id: normalizeNullableText(studentId),
      event_type: normalizeText(eventType) || "adjustment",
      stage_number: Number.isFinite(Number(stageNumber)) ? Number(stageNumber) : null,
      points: normalizedPoints,
      dedupe_key: normalizeNullableText(dedupeKey),
      payload: payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {},
    })
    .select("id, educator_id, student_id, event_type, stage_number, points, payload, created_at")
    .single();

  if (error) {
    // 23505 = dedupe_key repetido: evento já registrado.
    if (error.code === "23505" || isOptionalSourceMissing(error)) {
      return null;
    }
    throw new HttpError(400, `Falha ao registrar evento de pontuacao: ${error.message}`);
  }

  await runBestEffortMobileSync("notify score event", () => notifyScoreEvent(data));
  return data;
}

// RN093 "Pontuação ganha ou perdida" + "Reconhecimento" (nova letra da frase).
async function notifyScoreEvent(scoreEvent) {
  const { name } = await resolveStudentDisplayInfo(scoreEvent.student_id);
  const gained = scoreEvent.points > 0;
  const stamp = formatNotificationStamp(new Date(scoreEvent.created_at ?? Date.now()));
  const title = gained
    ? `Você ganhou + ${scoreEvent.points} ${scoreEvent.points === 1 ? "ponto" : "pontos"}`
    : `Você perdeu ${Math.abs(scoreEvent.points)} pontos`;

  let body;
  if (scoreEvent.event_type === "stage_completed") {
    body = `${name} concluiu a Etapa ${scoreEvent.stage_number} da alfabetização. ${stamp}.`;
  } else if (scoreEvent.event_type === "support_bonus") {
    body = `${name} avançou após o pedido de apoio ou bloqueio de tela. ${stamp}.`;
  } else if (scoreEvent.event_type === "inactivity_penalty") {
    body = `${name} segue sem avanço na tela de dúvida. ${stamp}.`;
  } else {
    body = `${name}. ${stamp}.`;
  }

  await createEducatorNotification({
    recipientId: scoreEvent.educator_id,
    recipientRole: "tutor",
    type: "score_event",
    title,
    body,
    sourceEntityType: "educator_score_event",
    sourceEntityId: scoreEvent.id,
    payload: {
      studentId: scoreEvent.student_id,
      points: scoreEvent.points,
      eventType: scoreEvent.event_type,
    },
  });

  if (gained) {
    const { totalScore } = await getEducatorScoreSummary(scoreEvent.educator_id);
    const lettersBefore = lettersUnlockedFromScore(totalScore - scoreEvent.points);
    const lettersAfter = lettersUnlockedFromScore(totalScore);
    if (lettersAfter > lettersBefore) {
      await createEducatorNotification({
        recipientId: scoreEvent.educator_id,
        recipientRole: "tutor",
        type: "recognition",
        title: "Parabéns! Você completou mais uma letra da sua meta.",
        sourceEntityType: "educator_score_event",
        sourceEntityId: scoreEvent.id,
        payload: { lettersUnlocked: lettersAfter },
      });
    }
  }
}

// RN085: quando todas as atividades publicadas da etapa da atividade recém
// concluída ficam "concluido", credita +10/+15/+25 ao alfabetizador vinculado.
async function maybeCreditStageCompletion({ studentId, activityId }) {
  const client = requireSupabase();
  const normalizedStudentId = normalizeText(studentId);
  const normalizedActivityId = normalizeText(activityId);
  if (!normalizedStudentId || !isUuid(normalizedActivityId)) {
    return null;
  }

  const { data: activity } = await client
    .from("learning_activities")
    .select("id, module_id")
    .eq("id", normalizedActivityId)
    .maybeSingle();
  if (!activity?.module_id) {
    return null;
  }

  // Escopo por tema (corrige o bug cross-theme): a etapa é resolvida DENTRO do
  // tema do módulo da atividade concluída — nunca somando atividades de temas
  // distintos que compartilham o mesmo stage_number.
  const { data: module } = await client
    .from("learning_modules")
    .select("id, theme_id, stage_id, stage_number")
    .eq("id", activity.module_id)
    .maybeSingle();
  const themeId = normalizeNullableText(module?.theme_id);
  if (!themeId) {
    return null;
  }

  let stageNumber = Number(module?.stage_number);
  const stageId = normalizeNullableText(module?.stage_id);
  if (stageId) {
    const { data: stage } = await client
      .from("learning_stages")
      .select("stage_number")
      .eq("id", stageId)
      .maybeSingle();
    if (stage?.stage_number != null) {
      stageNumber = Number(stage.stage_number);
    }
  }
  if (!STAGE_COMPLETION_POINTS[stageNumber]) {
    return null;
  }

  const status = await computeLearnerStageStatus({
    learnerProfileId: normalizedStudentId,
    themeId,
  });
  const stageStatus = status.stages.find((s) => s.stageNumber === stageNumber);
  if (!stageStatus?.completed) {
    return null;
  }

  const tutorId = await resolveTutorIdForStudent(normalizedStudentId);
  if (!tutorId) {
    return null;
  }

  const event = await recordEducatorScoreEvent({
    educatorId: tutorId,
    studentId: normalizedStudentId,
    eventType: "stage_completed",
    stageNumber,
    points: STAGE_COMPLETION_POINTS[stageNumber],
    dedupeKey: `stage:${tutorId}:${normalizedStudentId}:${stageNumber}`,
    payload: { activityId: normalizedActivityId, themeId },
  });

  // recordEducatorScoreEvent retorna null em dedupe (etapa já creditada): só
  // sinalizamos conclusão fresca uma vez — evita sync/realtime duplicados.
  if (!event) {
    return null;
  }

  await runBestEffortMobileSync("register stage completed sync event", () =>
    registerSyncEvent({
      sourcePlatform: "mobile",
      eventType: "stage.completed",
      entityType: "learner_stage",
      entityId: normalizedStudentId,
      payload: { studentId: normalizedStudentId, tutorId, themeId, stageNumber },
    }),
  );

  // `points` viaja junto porque a tela de celebração da etapa (RN048) precisa
  // dizer quantos pontos o alfabetizador acumulou. Sem isto ela caía no
  // fallback `/painel/score/<alfabetizando>`, que lê learner_score_events — e
  // a conclusão de etapa credita educator_score_events (do TUTOR), então a
  // tela sempre exibia "acumulou 0 pontos".
  return {
    studentId: normalizedStudentId,
    tutorId,
    themeId,
    stageNumber,
    points: STAGE_COMPLETION_POINTS[stageNumber],
  };
}

// RN085: bônus por avanço do alfabetizando após o gatilho mais recente de
// pedido de apoio ou bloqueio preventivo de tela, dentro das janelas 1h/24h/3d.
// Idempotente por gatilho (um bônus por pedido/bloqueio).
async function maybeCreditSupportBonus({ studentId }) {
  const client = requireSupabase();
  const normalizedStudentId = normalizeText(studentId);
  if (!normalizedStudentId) {
    return;
  }

  const nowMs = Date.now();
  const windowStartIso = new Date(
    nowMs - SUPPORT_BONUS_WINDOWS[SUPPORT_BONUS_WINDOWS.length - 1].maxMs,
  ).toISOString();

  let trigger = null;
  const { data: supportRequest, error: supportError } = await client
    .from("support_requests")
    .select("id, tutor_id, requested_at")
    .eq("student_id", normalizedStudentId)
    .gte("requested_at", windowStartIso)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (supportError && !isOptionalSourceMissing(supportError)) {
    return;
  }

  if (supportRequest?.requested_at) {
    trigger = {
      dedupeKey: `support_bonus:${supportRequest.id}`,
      triggeredBy: "support_request",
      sourceId: supportRequest.id,
      startedAt: supportRequest.requested_at,
      tutorId: supportRequest.tutor_id,
    };
  } else {
    const { data: lockNotification, error: lockError } = await client
      .from("educator_notifications")
      .select("id, recipient_id, created_at")
      .eq("type", "progress_locked")
      .eq("payload->>studentId", normalizedStudentId)
      .gte("created_at", windowStartIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lockError && !isOptionalSourceMissing(lockError)) {
      return;
    }
    if (lockNotification?.created_at) {
      trigger = {
        dedupeKey: `lock_bonus:${lockNotification.id}`,
        triggeredBy: "progress_locked",
        sourceId: lockNotification.id,
        startedAt: lockNotification.created_at,
        tutorId: lockNotification.recipient_id,
      };
    }
  }

  if (!trigger) {
    return;
  }

  const elapsedMs = nowMs - new Date(trigger.startedAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return;
  }
  const bonusWindow = SUPPORT_BONUS_WINDOWS.find((window) => elapsedMs <= window.maxMs);
  if (!bonusWindow) {
    return;
  }

  const tutorId =
    normalizeNullableText(trigger.tutorId) || (await resolveTutorIdForStudent(normalizedStudentId));
  if (!tutorId) {
    return;
  }

  await recordEducatorScoreEvent({
    educatorId: tutorId,
    studentId: normalizedStudentId,
    eventType: "support_bonus",
    points: bonusWindow.points,
    dedupeKey: trigger.dedupeKey,
    payload: {
      triggeredBy: trigger.triggeredBy,
      sourceId: trigger.sourceId,
      elapsedMs,
    },
  });
}

async function createDeadlineAlertIfMissing({ request, tutorId, kind, deadlineMs, studentName }) {
  const client = requireSupabase();
  const { data: existing, error } = await client
    .from("educator_notifications")
    .select("id")
    .eq("type", "deadline_alert")
    .eq("source_entity_id", request.id)
    .eq("payload->>alertKind", kind)
    .limit(1)
    .maybeSingle();
  if (existing || (error && !isOptionalSourceMissing(error))) {
    return false;
  }

  const deadline = new Date(deadlineMs);
  const pad = (value) => String(value).padStart(2, "0");
  // Copy fiel ao protótipo "Notificações" do Figma.
  const body = `Você tem até as ${pad(deadline.getHours())}:${pad(deadline.getMinutes())} horas do dia ${pad(deadline.getDate())}/${pad(deadline.getMonth() + 1)}/${deadline.getFullYear()} para dar apoio ao ${studentName} e não perder ponto.`;

  await createEducatorNotification({
    recipientId: tutorId,
    recipientRole: "tutor",
    type: "deadline_alert",
    title: "Alerta de prazo",
    body,
    sourceEntityType: "support_request",
    sourceEntityId: request.id,
    payload: {
      alertKind: kind,
      studentId: request.student_id,
      deadlineAt: deadline.toISOString(),
    },
  });
  return true;
}

// Varredura periódica (RN085/RN093): para cada pedido de apoio em aberto sem
// avanço do alfabetizando, emite os alertas de prazo (faltando 3 dias e 24h do
// fim do prazo de 5 dias) e lança os débitos de -3 a cada 5 dias (teto 30).
export async function runScoringDeadlineSweep() {
  const client = requireSupabase();
  const summary = { checked: 0, alerts: 0, penalties: 0 };
  const nowMs = Date.now();

  const requests = await runOptionalQuery(
    client
      .from("support_requests")
      .select("id, student_id, tutor_id, requested_at, status")
      .in("status", ["aberto", "em_atendimento"])
      .order("requested_at", { ascending: true })
      .limit(200),
    "Falha ao listar pedidos de ajuda para varredura de prazos",
  );

  for (const request of requests ?? []) {
    const requestedAtMs = new Date(request.requested_at).getTime();
    if (!Number.isFinite(requestedAtMs)) {
      continue;
    }

    const tutorId =
      normalizeNullableText(request.tutor_id) ||
      (await resolveTutorIdForStudent(request.student_id));
    if (!tutorId) {
      continue;
    }
    summary.checked += 1;

    // Avanço = qualquer progresso não-travado do aluno após o pedido.
    const progressRows = await getActivityProgress({ studentIds: [request.student_id] });
    const advanced = progressRows.some((row) => {
      if (row.status !== "em_andamento" && row.status !== "concluido") {
        return false;
      }
      const interactedAtMs = new Date(
        row.last_interacted_at ?? row.updated_at ?? row.completed_at ?? 0,
      ).getTime();
      return Number.isFinite(interactedAtMs) && interactedAtMs > requestedAtMs;
    });
    if (advanced) {
      continue;
    }

    const deadlineMs = requestedAtMs + INACTIVITY_PERIOD_MS;
    const { name: studentName } = await resolveStudentDisplayInfo(request.student_id);

    const alerts = [
      { kind: "3d", dueMs: deadlineMs - 3 * DAY_MS },
      { kind: "24h", dueMs: deadlineMs - DAY_MS },
    ];
    for (const alert of alerts) {
      if (nowMs < alert.dueMs || nowMs >= deadlineMs) {
        continue;
      }
      const created = await createDeadlineAlertIfMissing({
        request,
        tutorId,
        kind: alert.kind,
        deadlineMs,
        studentName,
      });
      if (created) {
        summary.alerts += 1;
      }
    }

    const maxPenaltyPeriods = Math.floor(INACTIVITY_PENALTY_CAP / Math.abs(INACTIVITY_PENALTY_POINTS));
    for (let period = 0; period < maxPenaltyPeriods; period += 1) {
      const dueMs = deadlineMs + period * INACTIVITY_PERIOD_MS;
      if (nowMs < dueMs) {
        break;
      }
      const event = await recordEducatorScoreEvent({
        educatorId: tutorId,
        studentId: request.student_id,
        eventType: "inactivity_penalty",
        points: INACTIVITY_PENALTY_POINTS,
        dedupeKey: `inactivity:${request.id}:${period}`,
        payload: { supportRequestId: request.id, period },
      });
      if (event) {
        summary.penalties += 1;
      }
    }
  }

  return summary;
}

// RN104: ao vincular o alfabetizando a um novo alfabetizador, notifica o(s)
// antigo(s) com a mensagem padrão da regra (adaptada: a RN grafa "O
// alfabetizador [nome]" mas o contexto é o alfabetizando revinculado).
async function notifyPreviousEducatorsOfNewLink(link) {
  const client = requireSupabase();
  const { data: previousLinks, error } = await client
    .from("tutor_student_links")
    .select("id, tutor_id, status")
    .eq("student_id", link.student_id)
    .neq("tutor_id", link.tutor_id)
    .eq("status", "confirmado");
  if (error && !isOptionalSourceMissing(error)) {
    return;
  }

  const previousTutorIds = [
    ...new Set((previousLinks ?? []).map((item) => normalizeText(item.tutor_id)).filter(Boolean)),
  ];
  if (previousTutorIds.length === 0) {
    return;
  }

  const { name, cpf } = await resolveStudentDisplayInfo(link.student_id);
  const registration = cpf || "não informado";
  const body = `O alfabetizando ${name}, CPF ou passaporte de número ${registration}, foi vinculado a outro alfabetizador. Caso realmente não tenha mudado, pedimos que descadastre o alfabetizando do seu sistema. Caso seja você a dar continuidade ao processo de alfabetização, entre em contato com o alfabetizando para regularizar a situação.`;

  for (const previousTutorId of previousTutorIds) {
    await createEducatorNotification({
      recipientId: previousTutorId,
      recipientRole: "tutor",
      type: "link_transferred",
      title: "Alfabetizando vinculado a outro alfabetizador",
      body,
      sourceEntityType: "tutor_student_link",
      sourceEntityId: link.id,
      payload: { studentId: link.student_id, newTutorId: link.tutor_id },
    });
  }
}

// RN099: na recusa do vínculo, o alfabetizando e a administração recebem
// notificação com o motivo. (O mobile do aluno também exibe o motivo via
// polling de GET /cadastros/sessoes-confirmacao/:id.)
async function notifyLinkDenied(link) {
  const [{ name: studentName }, educatorName] = await Promise.all([
    resolveStudentDisplayInfo(link.student_id),
    resolveEducatorDisplayName(link.tutor_id),
  ]);
  const reason = normalizeText(link.reason) || "Motivo não informado";

  await createEducatorNotification({
    recipientRole: "admin",
    type: "link_denied",
    title: "Vinculação não confirmada",
    body: `O alfabetizador ${educatorName} não confirmou o vínculo com ${studentName}. Motivo: ${reason}.`,
    sourceEntityType: "tutor_student_link",
    sourceEntityId: link.id,
    payload: { studentId: link.student_id, tutorId: link.tutor_id, reason },
  });

  await createEducatorNotification({
    recipientId: link.student_id,
    recipientRole: "alfabetizando",
    type: "link_denied",
    title: "Vinculação não confirmada",
    body: `O alfabetizador ${educatorName} não confirmou a sua vinculação. Motivo: ${reason}.`,
    sourceEntityType: "tutor_student_link",
    sourceEntityId: link.id,
    payload: { tutorId: link.tutor_id, reason },
  });
}

export async function getSupportRequests({ statuses, tutorIds, studentIds, limit = 200 } = {}) {
  const client = requireSupabase();
  let query = client
    .from("support_requests")
    .select("id, student_id, tutor_id, activity_id, progress_id, current_view, current_activity_id, message, status, priority, source_platform, requested_at, resolved_at, resolved_by, resolution_reason, response_message, metadata, created_at, updated_at")
    .order("requested_at", { ascending: false })
    .limit(Math.min(Math.max(normalizeInteger(limit, 200), 1), 500));

  const normalizedStatuses = (statuses ?? []).map((item) => normalizeSupportStatus(item, "")).filter(Boolean);
  if (normalizedStatuses.length > 0) {
    query = query.in("status", normalizedStatuses);
  }

  const normalizedTutorIds = (tutorIds ?? []).map((item) => normalizeText(item)).filter(Boolean);
  if (normalizedTutorIds.length > 0) {
    query = query.in("tutor_id", normalizedTutorIds);
  }

  const normalizedStudentIds = (studentIds ?? []).map((item) => normalizeText(item)).filter(Boolean);
  if (normalizedStudentIds.length > 0) {
    query = query.in("student_id", normalizedStudentIds);
  }

  return runOptionalQuery(query, "Falha ao listar pedidos de ajuda");
}

async function findOpenSupportRequest({ studentId, activityId, currentActivityId, currentView }) {
  const client = requireSupabase();
  let query = client
    .from("support_requests")
    .select("id, student_id, tutor_id, activity_id, progress_id, current_view, current_activity_id, message, status, priority, source_platform, requested_at, resolved_at, resolved_by, resolution_reason, response_message, metadata, created_at, updated_at")
    .eq("student_id", studentId)
    .in("status", ["aberto", "em_atendimento"])
    .order("requested_at", { ascending: false })
    .limit(1);

  if (activityId) {
    query = query.eq("activity_id", activityId);
  } else if (currentActivityId) {
    query = query.eq("current_activity_id", currentActivityId);
  } else if (currentView) {
    query = query.eq("current_view", currentView);
  }

  const { data, error } = await query.maybeSingle();
  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(500, `Falha ao buscar pedido de ajuda aberto: ${error.message}`);
  }

  return data ?? null;
}

export async function createSupportRequest({
  learnerProfileId,
  studentId,
  tutorId,
  activityId,
  progressId,
  currentView,
  currentActivityId,
  message,
  priority,
  sourcePlatform = "mobile",
  metadata,
} = {}) {
  const client = requireSupabase();
  const normalizedStudentId = normalizeText(learnerProfileId || studentId);
  if (!normalizedStudentId) {
    throw new HttpError(400, "learnerProfileId e obrigatorio.");
  }

  const normalizedMessage = normalizeText(message) || "Preciso de ajuda para continuar.";
  const normalizedActivityId = normalizeNullableText(activityId);
  const normalizedCurrentActivityId = normalizeNullableText(currentActivityId);
  const normalizedCurrentView = normalizeNullableText(currentView);
  const resolvedTutorId = normalizeNullableText(tutorId) || (await resolveTutorIdForStudent(normalizedStudentId));

  const openRequest = await findOpenSupportRequest({
    studentId: normalizedStudentId,
    activityId: normalizedActivityId,
    currentActivityId: normalizedCurrentActivityId,
    currentView: normalizedCurrentView,
  });

  if (openRequest) {
    return {
      request: openRequest,
      duplicated: true,
    };
  }

  const payload = {
    student_id: normalizedStudentId,
    tutor_id: resolvedTutorId,
    activity_id: normalizedActivityId,
    progress_id: normalizeNullableText(progressId),
    current_view: normalizedCurrentView,
    current_activity_id: normalizedCurrentActivityId,
    message: normalizedMessage,
    priority: normalizeSupportPriority(priority),
    source_platform: normalizeText(sourcePlatform).toLowerCase() === "web" ? "web" : "mobile",
    metadata: metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {},
  };

  const { data, error } = await client
    .from("support_requests")
    .insert(payload)
    .select("id, student_id, tutor_id, activity_id, progress_id, current_view, current_activity_id, message, status, priority, source_platform, requested_at, resolved_at, resolved_by, resolution_reason, response_message, metadata, created_at, updated_at")
    .single();

  if (error) {
    throw new HttpError(400, `Falha ao criar pedido de ajuda: ${error.message}`);
  }

  await runBestEffortMobileSync("create support notification", () =>
    createEducatorNotification({
      recipientId: data.tutor_id,
      recipientRole: data.tutor_id ? "tutor" : "admin",
      type: "support_request",
      title: "Pedido de ajuda",
      body: normalizedMessage,
      sourceEntityType: "support_request",
      sourceEntityId: data.id,
      payload: {
        studentId: data.student_id,
        activityId: data.activity_id,
        currentView: data.current_view,
        currentActivityId: data.current_activity_id,
      },
    }),
  );

  await runBestEffortMobileSync("register support created event", () =>
    registerSyncEvent({
      sourcePlatform: data.source_platform,
      eventType: "support.created",
      entityType: "support_request",
      entityId: data.id,
      payload: {
        studentId: data.student_id,
        tutorId: data.tutor_id,
        activityId: data.activity_id,
        status: data.status,
      },
    }),
  );

  return {
    request: data,
    duplicated: false,
  };
}

export async function updateSupportRequestStatus({
  supportRequestId,
  status = "resolvido",
  resolvedBy,
  reason,
  responseMessage,
} = {}) {
  const client = requireSupabase();
  const normalizedId = normalizeText(supportRequestId);
  if (!normalizedId) {
    throw new HttpError(400, "ID do pedido de ajuda e obrigatorio.");
  }

  const normalizedStatus = normalizeSupportStatus(status, "resolvido");
  const payload = {
    status: normalizedStatus,
    resolved_by: normalizeNullableText(resolvedBy),
    resolution_reason: normalizeNullableText(reason),
    response_message: normalizeNullableText(responseMessage),
    resolved_at: normalizedStatus === "resolvido" || normalizedStatus === "cancelado" ? new Date().toISOString() : null,
  };

  const { data, error } = await client
    .from("support_requests")
    .update(payload)
    .eq("id", normalizedId)
    .select("id, student_id, tutor_id, activity_id, progress_id, current_view, current_activity_id, message, status, priority, source_platform, requested_at, resolved_at, resolved_by, resolution_reason, response_message, metadata, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new HttpError(400, `Falha ao atualizar pedido de ajuda: ${error.message}`);
  }

  if (!data) {
    throw new HttpError(404, "Pedido de ajuda nao encontrado.");
  }

  await runBestEffortMobileSync("register support resolved event", () =>
    registerSyncEvent({
      sourcePlatform: "web",
      eventType: normalizedStatus === "resolvido" ? "support.resolved" : "support.updated",
      entityType: "support_request",
      entityId: data.id,
      payload: {
        studentId: data.student_id,
        tutorId: data.tutor_id,
        activityId: data.activity_id,
        status: data.status,
      },
    }),
  );

  return data;
}

export async function setMobileLearnerSessionLockState(learnerProfileId, isLocked) {
  const client = requireSupabase();
  const normalizedLearnerId = normalizeText(learnerProfileId);
  if (!normalizedLearnerId) {
    return { skipped: true, reason: "learnerProfileId ausente." };
  }

  const { data: session, error: readError } = await client
    .from("LearnerSession")
    .select("id, learnerProfileId")
    .eq("learnerProfileId", normalizedLearnerId)
    .order("updatedAt", { ascending: false })
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) {
    if (isOptionalSourceMissing(readError)) {
      return { skipped: true, reason: "Schema mobile ausente." };
    }
    throw new HttpError(400, `Falha ao buscar sessao mobile: ${readError.message}`);
  }

  if (!session?.id) {
    return { skipped: true, reason: "Sessao mobile nao encontrada." };
  }

  const { data: existingState, error: stateReadError } = await client
    .from("SessionState")
    .select("id, sessionId")
    .eq("sessionId", session.id)
    .maybeSingle();

  if (stateReadError && !isOptionalSourceMissing(stateReadError)) {
    throw new HttpError(400, `Falha ao buscar estado da sessao mobile: ${stateReadError.message}`);
  }

  const statePayload = existingState?.id
    ? { isLocked: Boolean(isLocked) }
    : {
        id: randomUUID(),
        sessionId: session.id,
        currentView: "home",
        statePayload: {},
        isLocked: Boolean(isLocked),
      };

  const query = existingState?.id
    ? client.from("SessionState").update(statePayload).eq("id", existingState.id)
    : client.from("SessionState").insert(statePayload);

  const { data, error } = await query
    .select("id, sessionId, currentView, currentActivityId, statePayload, isLocked, createdAt, updatedAt")
    .single();

  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(400, `Falha ao atualizar bloqueio da sessao mobile: ${error.message}`);
  }

  return { state: data, skipped: false };
}

export async function getMobileLearnerSessionState(learnerProfileId) {
  const client = requireSupabase();
  const normalizedLearnerId = normalizeText(learnerProfileId);
  if (!normalizedLearnerId) {
    throw new HttpError(400, "learnerProfileId e obrigatorio.");
  }

  const { data: session, error } = await client
    .from("LearnerSession")
    .select("id, learnerProfileId, deviceId, connectedAt, createdAt, updatedAt")
    .eq("learnerProfileId", normalizedLearnerId)
    .order("updatedAt", { ascending: false })
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isOptionalSourceMissing(error)) {
      return null;
    }
    throw new HttpError(400, `Falha ao buscar sessao mobile: ${error.message}`);
  }

  if (!session?.id) {
    return null;
  }

  const { data: sessionState, error: stateError } = await client
    .from("SessionState")
    .select("id, sessionId, currentView, currentActivityId, statePayload, isLocked, createdAt, updatedAt")
    .eq("sessionId", session.id)
    .maybeSingle();

  if (stateError && !isOptionalSourceMissing(stateError)) {
    throw new HttpError(400, `Falha ao buscar estado da sessao mobile: ${stateError.message}`);
  }

  return {
    ...session,
    sessionState: sessionState ?? null,
  };
}

export async function getPanelSystemSettings() {
  const client = requireSupabase();
  const settingsEvents = await runOptionalQuery(
    client
      .from("sync_events")
      .select("entity_id, payload, created_at")
      .eq("event_type", SYSTEM_SETTINGS_EVENT_TYPE)
      .eq("entity_type", SYSTEM_SETTINGS_ENTITY_TYPE)
      .order("created_at", { ascending: false })
      .limit(1),
    "Falha ao buscar configuracoes do sistema",
  );

  const latestEvent = settingsEvents[0] ?? null;
  const rawPayload =
    latestEvent?.payload &&
    typeof latestEvent.payload === "object" &&
    !Array.isArray(latestEvent.payload)
      ? latestEvent.payload
      : {};
  const rawSettings =
    rawPayload.settings &&
    typeof rawPayload.settings === "object" &&
    !Array.isArray(rawPayload.settings)
      ? rawPayload.settings
      : rawPayload;

  return {
    ...normalizeSystemSettingsPayload(rawSettings),
    updatedAt: latestEvent?.created_at ?? null,
    updatedBy:
      typeof latestEvent?.entity_id === "string" && latestEvent.entity_id.trim().length > 0
        ? latestEvent.entity_id
        : null,
  };
}

export async function updatePanelSystemSettings({ errorBlockLimit, inactivityDays, updatedBy } = {}) {
  const nextSettings = normalizeSystemSettingsPayload({
    errorBlockLimit,
    inactivityDays,
  });
  const actor = normalizeText(updatedBy) || "sistema";

  await registerSyncEvent({
    sourcePlatform: "web",
    eventType: SYSTEM_SETTINGS_EVENT_TYPE,
    entityType: SYSTEM_SETTINGS_ENTITY_TYPE,
    entityId: actor,
    payload: {
      settings: nextSettings,
    },
  });

  return {
    ...nextSettings,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  };
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

async function removeAssetFromMobileActivity(activityId, assetId) {
  if (!activityId || !assetId) {
    return;
  }

  const client = requireSupabase();
  const { data: mobileActivity, error: readError } = await client
    .from("Activity")
    .select("id, content")
    .eq("id", String(activityId))
    .maybeSingle();

  if (readError) {
    if (isOptionalSourceMissing(readError)) {
      return;
    }
    throw new HttpError(500, `Falha ao carregar activity mobile para remover asset: ${readError.message}`);
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

  const nextAssets = currentAssets.filter((item) => String(item.id ?? "") !== String(assetId));
  if (nextAssets.length === currentAssets.length) {
    return;
  }

  const nextContent = {
    ...currentContent,
    assets: nextAssets,
  };

  const { error: updateError } = await client
    .from("Activity")
    .update({ content: nextContent, updatedAt: new Date().toISOString() })
    .eq("id", String(activityId));

  if (updateError && !isOptionalSourceMissing(updateError)) {
    throw new HttpError(500, `Falha ao remover asset da activity mobile: ${updateError.message}`);
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

export async function updateLearningTheme({
  themeId,
  title,
  description,
  slug,
  sortOrder,
  isActive,
}) {
  const client = requireSupabase();
  const normalizedThemeId = normalizeText(themeId);

  if (!isUuid(normalizedThemeId)) {
    throw new HttpError(400, "themeId invalido.");
  }

  const { data: existingTheme, error: readError } = await client
    .from("learning_themes")
    .select("id, slug, title, description, sort_order, is_active, created_at, updated_at")
    .eq("id", normalizedThemeId)
    .maybeSingle();

  if (readError) {
    throw new HttpError(400, `Falha ao buscar tema: ${readError.message}`);
  }

  if (!existingTheme) {
    throw new HttpError(404, "Tema nao encontrado.");
  }

  const payload = {};

  if (title !== undefined) {
    const normalizedTitle = normalizeText(title);
    if (!normalizedTitle) {
      throw new HttpError(400, "Titulo do tema nao pode ficar vazio.");
    }
    payload.title = normalizedTitle;
  }

  if (description !== undefined) {
    payload.description = normalizeNullableText(description);
  }

  if (slug !== undefined) {
    const normalizedSlugInput = normalizeText(slug);
    if (!normalizedSlugInput) {
      throw new HttpError(400, "Slug do tema nao pode ficar vazio.");
    }
    payload.slug = normalizeSlug(normalizedSlugInput, payload.title ?? existingTheme.title);
  }

  if (sortOrder !== undefined) {
    payload.sort_order = normalizeInteger(sortOrder, existingTheme.sort_order ?? 0);
  }

  if (isActive !== undefined) {
    payload.is_active = normalizeBoolean(isActive, existingTheme.is_active ?? true);
  }

  if (Object.keys(payload).length === 0) {
    throw new HttpError(400, "Nenhum campo valido para atualizar no tema.");
  }

  const { data, error } = await client
    .from("learning_themes")
    .update(payload)
    .eq("id", normalizedThemeId)
    .select("id, slug, title, description, sort_order, is_active, created_at, updated_at")
    .maybeSingle();

  if (error) {
    const normalizedMessage = String(error.message ?? "").toLowerCase();
    if (
      String(error.code ?? "") === "23505" ||
      normalizedMessage.includes("learning_themes_slug_key")
    ) {
      throw new HttpError(
        400,
        "Ja existe um tema com esse nome interno (slug). Escolha outro slug.",
      );
    }
    throw new HttpError(400, `Falha ao atualizar tema: ${error.message}`);
  }

  if (!data) {
    throw new HttpError(404, "Tema nao encontrado.");
  }

  await runBestEffortMobileSync("sync updateLearningTheme to mobile schema", () =>
    upsertMobileThemeFromPanel(data),
  );

  await runBestEffortMobileSync("sync_event updateLearningTheme", () =>
    registerSyncEvent({
      eventType: "content.theme.updated",
      entityType: "learning_theme",
      entityId: data.id,
      payload: data,
    }),
  );

  return data;
}

export async function deleteLearningTheme({ themeId }) {
  const client = requireSupabase();
  const normalizedThemeId = normalizeText(themeId);

  if (!isUuid(normalizedThemeId)) {
    throw new HttpError(400, "themeId invalido.");
  }

  const { data: existingTheme, error: readError } = await client
    .from("learning_themes")
    .select("id, slug, title")
    .eq("id", normalizedThemeId)
    .maybeSingle();

  if (readError) {
    throw new HttpError(400, `Falha ao buscar tema: ${readError.message}`);
  }

  if (!existingTheme) {
    throw new HttpError(404, "Tema nao encontrado.");
  }

  const { error } = await client.from("learning_themes").delete().eq("id", normalizedThemeId);
  if (error) {
    throw new HttpError(400, `Falha ao excluir tema: ${error.message}`);
  }

  await runBestEffortMobileSync("sync deleteLearningTheme from mobile schema", async () => {
    const { error: mobileError } = await client.from("Theme").delete().eq("id", normalizedThemeId);
    if (mobileError && !isOptionalSourceMissing(mobileError)) {
      throw new HttpError(500, `Falha ao remover tema no schema mobile: ${mobileError.message}`);
    }
  });

  await runBestEffortMobileSync("sync_event deleteLearningTheme", () =>
    registerSyncEvent({
      eventType: "content.theme.deleted",
      entityType: "learning_theme",
      entityId: existingTheme.id,
      payload: existingTheme,
    }),
  );

  return { id: existingTheme.id, deleted: true };
}

export async function createLearningModule({
  themeId,
  title,
  description,
  stageNumber,
  sortOrder,
  isActive,
  stageId,
  introVideoId,
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

  const resolvedStageNumber = Math.max(1, normalizeInteger(stageNumber, 1));
  const hasExplicitSortOrder =
    sortOrder !== undefined &&
    sortOrder !== null &&
    String(sortOrder).trim().length > 0;

  let resolvedSortOrder = 0;
  if (hasExplicitSortOrder) {
    resolvedSortOrder = normalizeInteger(sortOrder, 0);
  } else {
    const { data: moduleRows, error: readSortError } = await client
      .from("learning_modules")
      .select("sort_order")
      .eq("theme_id", normalizedThemeId)
      .eq("stage_number", resolvedStageNumber)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (readSortError) {
      throw new HttpError(400, `Falha ao definir ordem do modulo: ${readSortError.message}`);
    }

    const highestSortOrder = Number(moduleRows?.[0]?.sort_order ?? -1);
    resolvedSortOrder = Number.isFinite(highestSortOrder) ? highestSortOrder + 1 : 0;
  }

  const payload = {
    theme_id: normalizedThemeId,
    stage_number: resolvedStageNumber,
    title: normalizedTitle,
    description: normalizeNullableText(description),
    sort_order: resolvedSortOrder,
    is_active: normalizeBoolean(isActive, true),
    stage_id: stageId ? normalizeText(stageId) : null,
    intro_video_id: introVideoId ? normalizeText(introVideoId) : null,
  };

  const { data, error } = await client
    .from("learning_modules")
    .insert(payload)
    .select("id, theme_id, stage_number, stage_id, intro_video_id, title, description, sort_order, is_active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505" && String(error.message || "").includes("learning_modules_unique_per_stage")) {
      throw new HttpError(
        400,
        "Ja existe um modulo nesta etapa com a mesma ordem. Ajuste a etapa ou a ordem e tente novamente.",
      );
    }
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

export async function updateLearningModule({
  moduleId,
  themeId,
  title,
  description,
  stageNumber,
  sortOrder,
  isActive,
  stageId,
  introVideoId,
}) {
  const client = requireSupabase();
  const normalizedModuleId = normalizeText(moduleId);

  if (!isUuid(normalizedModuleId)) {
    throw new HttpError(400, "moduleId invalido.");
  }

  const { data: existingModule, error: readError } = await client
    .from("learning_modules")
    .select("id, theme_id, stage_number, title, description, sort_order, is_active, created_at, updated_at")
    .eq("id", normalizedModuleId)
    .maybeSingle();

  if (readError) {
    throw new HttpError(400, `Falha ao buscar modulo: ${readError.message}`);
  }

  if (!existingModule) {
    throw new HttpError(404, "Modulo nao encontrado.");
  }

  const payload = {};

  if (themeId !== undefined) {
    const normalizedThemeId = normalizeText(themeId);
    if (!normalizedThemeId) {
      throw new HttpError(400, "themeId nao pode ficar vazio.");
    }
    await ensureThemeExists(normalizedThemeId);
    payload.theme_id = normalizedThemeId;
  }

  if (title !== undefined) {
    const normalizedTitle = normalizeText(title);
    if (!normalizedTitle) {
      throw new HttpError(400, "Titulo do modulo nao pode ficar vazio.");
    }
    payload.title = normalizedTitle;
  }

  if (description !== undefined) {
    payload.description = normalizeNullableText(description);
  }

  if (stageNumber !== undefined) {
    payload.stage_number = Math.max(1, normalizeInteger(stageNumber, existingModule.stage_number ?? 1));
  }

  if (sortOrder !== undefined) {
    payload.sort_order = normalizeInteger(sortOrder, existingModule.sort_order ?? 0);
  }

  if (isActive !== undefined) {
    payload.is_active = normalizeBoolean(isActive, existingModule.is_active ?? true);
  }

  if (stageId !== undefined) {
    payload.stage_id = stageId ? normalizeText(stageId) : null;
  }

  if (introVideoId !== undefined) {
    payload.intro_video_id = introVideoId ? normalizeText(introVideoId) : null;
  }

  if (Object.keys(payload).length === 0) {
    throw new HttpError(400, "Nenhum campo valido para atualizar no modulo.");
  }

  const { data, error } = await client
    .from("learning_modules")
    .update(payload)
    .eq("id", normalizedModuleId)
    .select("id, theme_id, stage_number, stage_id, intro_video_id, title, description, sort_order, is_active, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new HttpError(400, `Falha ao atualizar modulo: ${error.message}`);
  }

  if (!data) {
    throw new HttpError(404, "Modulo nao encontrado.");
  }

  await runBestEffortMobileSync("sync updateLearningModule to mobile schema", () =>
    upsertMobileLearningUnitFromPanel(data),
  );

  await runBestEffortMobileSync("sync_event updateLearningModule", () =>
    registerSyncEvent({
      eventType: "content.module.updated",
      entityType: "learning_module",
      entityId: data.id,
      payload: data,
    }),
  );

  return data;
}

export async function deleteLearningModule({ moduleId }) {
  const client = requireSupabase();
  const normalizedModuleId = normalizeText(moduleId);

  if (!isUuid(normalizedModuleId)) {
    throw new HttpError(400, "moduleId invalido.");
  }

  const { data: existingModule, error: readError } = await client
    .from("learning_modules")
    .select("id, theme_id, title, stage_number")
    .eq("id", normalizedModuleId)
    .maybeSingle();

  if (readError) {
    throw new HttpError(400, `Falha ao buscar modulo: ${readError.message}`);
  }

  if (!existingModule) {
    throw new HttpError(404, "Modulo nao encontrado.");
  }

  const { error } = await client.from("learning_modules").delete().eq("id", normalizedModuleId);
  if (error) {
    throw new HttpError(400, `Falha ao excluir modulo: ${error.message}`);
  }

  await runBestEffortMobileSync("sync deleteLearningModule from mobile schema", async () => {
    const { error: mobileError } = await client.from("LearningUnit").delete().eq("id", normalizedModuleId);
    if (mobileError && !isOptionalSourceMissing(mobileError)) {
      throw new HttpError(500, `Falha ao remover modulo no schema mobile: ${mobileError.message}`);
    }
  });

  await runBestEffortMobileSync("sync_event deleteLearningModule", () =>
    registerSyncEvent({
      eventType: "content.module.deleted",
      entityType: "learning_module",
      entityId: existingModule.id,
      payload: existingModule,
    }),
  );

  return { id: existingModule.id, deleted: true };
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

  // Sem sortOrder explicito, o default sempre foi 0 — toda aula nova empatava
  // com as demais (a maioria do conteudo real nunca informa sortOrder) e a
  // ordem de exibicao virava um desempate por id (aleatorio), nao a ordem de
  // criacao (relatado como bug: "criei a letra U hoje e outra letra dias
  // atras" e a nova nao ficou por ultimo). Sem sortOrder informado, calcula
  // a proxima posicao (max atual do modulo + 1) para a aula nova sempre cair
  // no fim da trilha por padrao.
  let resolvedSortOrder = normalizeInteger(sortOrder, Number.NaN);
  if (!Number.isFinite(resolvedSortOrder)) {
    const { data: lastActivity, error: lastActivityError } = await client
      .from("learning_activities")
      .select("sort_order")
      .eq("module_id", normalizedModuleId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastActivityError) {
      throw new HttpError(400, `Falha ao calcular posicao da atividade: ${lastActivityError.message}`);
    }
    resolvedSortOrder = normalizeInteger(lastActivity?.sort_order, -1) + 1;
  }

  const payload = {
    module_id: normalizedModuleId,
    type: normalizedType,
    title: normalizedTitle,
    instructions: normalizeNullableText(instructions),
    sort_order: resolvedSortOrder,
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

export async function updateLearningActivity({
  activityId,
  moduleId,
  type,
  title,
  instructions,
  sortOrder,
  isPublished,
  hintVideoId,
}) {
  const client = requireSupabase();
  const normalizedActivityId = normalizeText(activityId);

  if (!isUuid(normalizedActivityId)) {
    throw new HttpError(400, "activityId invalido.");
  }

  const { data: existingActivity, error: readError } = await client
    .from("learning_activities")
    .select("id, module_id, type, title, instructions, sort_order, is_published, created_at, updated_at")
    .eq("id", normalizedActivityId)
    .maybeSingle();

  if (readError) {
    throw new HttpError(400, `Falha ao buscar atividade: ${readError.message}`);
  }

  if (!existingActivity) {
    throw new HttpError(404, "Atividade nao encontrada.");
  }

  const payload = {};

  if (moduleId !== undefined) {
    const normalizedModuleId = normalizeText(moduleId);
    if (!normalizedModuleId) {
      throw new HttpError(400, "moduleId nao pode ficar vazio.");
    }
    await ensureModuleExists(normalizedModuleId);
    payload.module_id = normalizedModuleId;
  }

  if (type !== undefined) {
    const normalizedType = normalizeText(type).toLowerCase();
    if (!ACTIVITY_TYPES.has(normalizedType)) {
      throw new HttpError(400, "Tipo de atividade invalido. Use: video, quiz, audio ou letra.");
    }
    payload.type = normalizedType;
  }

  if (title !== undefined) {
    const normalizedTitle = normalizeText(title);
    if (!normalizedTitle) {
      throw new HttpError(400, "Titulo da atividade nao pode ficar vazio.");
    }
    payload.title = normalizedTitle;
  }

  if (instructions !== undefined) {
    payload.instructions = normalizeNullableText(instructions);
  }

  if (sortOrder !== undefined) {
    payload.sort_order = normalizeInteger(sortOrder, existingActivity.sort_order ?? 0);
  }

  if (isPublished !== undefined) {
    payload.is_published = normalizeBoolean(isPublished, existingActivity.is_published ?? false);
  }

  if (hintVideoId !== undefined) {
    payload.hint_video_id = hintVideoId ? normalizeText(hintVideoId) : null;
  }

  if (Object.keys(payload).length === 0) {
    throw new HttpError(400, "Nenhum campo valido para atualizar na atividade.");
  }

  const { data, error } = await client
    .from("learning_activities")
    .update(payload)
    .eq("id", normalizedActivityId)
    .select("id, module_id, type, title, instructions, sort_order, is_published, hint_video_id, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new HttpError(400, `Falha ao atualizar atividade: ${error.message}`);
  }

  if (!data) {
    throw new HttpError(404, "Atividade nao encontrada.");
  }

  await runBestEffortMobileSync("sync updateLearningActivity to mobile schema", () =>
    upsertMobileActivityFromPanel(data),
  );

  await runBestEffortMobileSync("sync_event updateLearningActivity", () =>
    registerSyncEvent({
      eventType: "content.activity.updated",
      entityType: "learning_activity",
      entityId: data.id,
      payload: data,
    }),
  );

  return data;
}

export async function deleteLearningActivity({ activityId }) {
  const client = requireSupabase();
  const normalizedActivityId = normalizeText(activityId);

  if (!isUuid(normalizedActivityId)) {
    throw new HttpError(400, "activityId invalido.");
  }

  const { data: existingActivity, error: readError } = await client
    .from("learning_activities")
    .select("id, module_id, type, title")
    .eq("id", normalizedActivityId)
    .maybeSingle();

  if (readError) {
    throw new HttpError(400, `Falha ao buscar atividade: ${readError.message}`);
  }

  if (!existingActivity) {
    throw new HttpError(404, "Atividade nao encontrada.");
  }

  const { error } = await client.from("learning_activities").delete().eq("id", normalizedActivityId);
  if (error) {
    throw new HttpError(400, `Falha ao excluir atividade: ${error.message}`);
  }

  await runBestEffortMobileSync("sync deleteLearningActivity from mobile schema", async () => {
    const { error: mobileError } = await client.from("Activity").delete().eq("id", normalizedActivityId);
    if (mobileError && !isOptionalSourceMissing(mobileError)) {
      throw new HttpError(500, `Falha ao remover activity no schema mobile: ${mobileError.message}`);
    }
  });

  await runBestEffortMobileSync("sync_event deleteLearningActivity", () =>
    registerSyncEvent({
      eventType: "content.activity.deleted",
      entityType: "learning_activity",
      entityId: existingActivity.id,
      payload: existingActivity,
    }),
  );

  return { id: existingActivity.id, deleted: true };
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

  if (!normalizedKind) {
    throw new HttpError(400, "Tipo de asset invalido. Use: png, mp4, mp3, wav ou jpg.");
  }
  if (!normalizedPath) {
    throw new HttpError(400, "Caminho/URL do asset e obrigatorio.");
  }
  if (!normalizedMimeType) {
    throw new HttpError(400, "mimeType e obrigatorio.");
  }
  if (normalizedActivityId) {
    await ensureActivityExists(normalizedActivityId);
  }

  const safeMetadata =
    metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

  const payload = {
    activity_id: normalizedActivityId || null,
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

  await runBestEffortMobileSync("sync createContentAsset to mobile schema", async () => {
    if (data.activity_id) {
      await appendAssetToMobileActivity(data);
    }
  });

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

export async function updateContentAsset({
  assetId,
  activityId,
  kind,
  storagePath,
  mimeType,
  status,
  metadata,
}) {
  const client = requireSupabase();
  const normalizedAssetId = normalizeText(assetId);
  if (!isUuid(normalizedAssetId)) {
    throw new HttpError(400, "assetId invalido.");
  }

  const { data: existing, error: readError } = await client
    .from("content_assets")
    .select("id, activity_id, kind, storage_path, mime_type, status, metadata, created_at, updated_at")
    .eq("id", normalizedAssetId)
    .maybeSingle();

  if (readError) {
    throw new HttpError(400, `Falha ao buscar asset: ${readError.message}`);
  }

  if (!existing) {
    throw new HttpError(404, "Asset nao encontrado.");
  }

  const payload = {};
  if (activityId !== undefined) {
    const normalizedActivityId = normalizeText(activityId);
    if (normalizedActivityId) {
      await ensureActivityExists(normalizedActivityId);
    }
    payload.activity_id = normalizedActivityId || null;
  }

  if (kind !== undefined) {
    const normalizedKind = normalizeAssetKindInput(kind);
    if (!normalizedKind) {
      throw new HttpError(400, "Tipo de asset invalido. Use: png, mp4, mp3 ou jpg.");
    }
    payload.kind = normalizedKind;
  }

  if (storagePath !== undefined) {
    const normalizedPath = normalizeText(storagePath);
    if (!normalizedPath) {
      throw new HttpError(400, "storagePath nao pode ficar vazio.");
    }
    payload.storage_path = normalizedPath;
  }

  if (mimeType !== undefined) {
    const normalizedMimeType = normalizeText(mimeType);
    if (!normalizedMimeType) {
      throw new HttpError(400, "mimeType nao pode ficar vazio.");
    }
    payload.mime_type = normalizedMimeType;
  }

  if (status !== undefined) {
    payload.status = normalizeAssetStatusInput(status, existing.status || "rascunho");
  }

  if (metadata !== undefined) {
    payload.metadata =
      metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  }

  if (Object.keys(payload).length === 0) {
    throw new HttpError(400, "Nenhum campo valido para atualizar.");
  }

  const { data, error } = await client
    .from("content_assets")
    .update(payload)
    .eq("id", normalizedAssetId)
    .select("id, activity_id, kind, storage_path, mime_type, status, metadata, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new HttpError(400, `Falha ao atualizar asset: ${error.message}`);
  }

  if (!data) {
    throw new HttpError(404, "Asset nao encontrado.");
  }

  if (String(existing.activity_id || "") !== String(data.activity_id || "")) {
    await removeAssetFromMobileActivity(existing.activity_id, existing.id);
  }
  if (data.activity_id) {
    await appendAssetToMobileActivity(data);
  }

  await runBestEffortMobileSync("sync_event updateContentAsset", () =>
    registerSyncEvent({
      eventType: "content.asset.updated",
      entityType: "content_asset",
      entityId: data.id,
      payload: data,
    }),
  );

  return data;
}

export async function deleteContentAsset({ assetId }) {
  const client = requireSupabase();
  const normalizedAssetId = normalizeText(assetId);
  if (!isUuid(normalizedAssetId)) {
    throw new HttpError(400, "assetId invalido.");
  }

  const { data: existing, error: readError } = await client
    .from("content_assets")
    .select("id, activity_id, storage_path")
    .eq("id", normalizedAssetId)
    .maybeSingle();

  if (readError) {
    throw new HttpError(400, `Falha ao buscar asset: ${readError.message}`);
  }

  if (!existing) {
    throw new HttpError(404, "Asset nao encontrado.");
  }

  const { error } = await client.from("content_assets").delete().eq("id", normalizedAssetId);
  if (error) {
    throw new HttpError(400, `Falha ao excluir asset: ${error.message}`);
  }

  await removeAssetFromMobileActivity(existing.activity_id, existing.id);

  await runBestEffortMobileSync("sync_event deleteContentAsset", () =>
    registerSyncEvent({
      eventType: "content.asset.deleted",
      entityType: "content_asset",
      entityId: existing.id,
      payload: existing,
    }),
  );

  return { id: existing.id, deleted: true };
}

export async function resetCmsContent({ includeBlueprints = false } = {}) {
  const client = requireSupabase();
  const [themes, modules, activities, assets, blueprints] = await Promise.all([
    getPanelLearningThemes(),
    getPanelLearningModules(),
    getPanelLearningActivities(),
    getContentAssets(),
    includeBlueprints ? getMobileScreenBlueprints() : Promise.resolve([]),
  ]);

  const themeIds = themes.map((item) => item.id);
  const moduleIds = modules.map((item) => item.id);
  const activityIds = activities.map((item) => item.id);
  const assetIds = assets.map((item) => item.id);
  const blueprintIds = includeBlueprints ? blueprints.map((item) => item.id) : [];

  await deleteRowsByIds(client, "content_assets", assetIds, "Falha ao limpar midias do CMS");
  await deleteRowsByIds(client, "learning_themes", themeIds, "Falha ao limpar temas do CMS");

  if (includeBlueprints) {
    await deleteRowsByIds(
      client,
      "mobile_screen_blueprints",
      blueprintIds,
      "Falha ao limpar blueprints do CMS",
    );
  }

  await runBestEffortMobileSync("reset CMS content from mobile schema", async () => {
    await deleteRowsByIds(client, "Activity", activityIds, "Falha ao limpar activities no schema mobile");
    await deleteRowsByIds(
      client,
      "LearningUnit",
      moduleIds,
      "Falha ao limpar unidades no schema mobile",
    );
    await deleteRowsByIds(client, "Theme", themeIds, "Falha ao limpar temas no schema mobile");
  });

  await runBestEffortMobileSync("sync_event resetCmsContent", () =>
    registerSyncEvent({
      eventType: "content.cms.reset",
      entityType: "learning_content",
      entityId: "cms",
      payload: {
        deleted: {
          themes: themeIds.length,
          modules: moduleIds.length,
          activities: activityIds.length,
          assets: assetIds.length,
          blueprints: blueprintIds.length,
        },
      },
    }),
  );

  return {
    deleted: {
      themes: themeIds.length,
      modules: moduleIds.length,
      activities: activityIds.length,
      assets: assetIds.length,
      blueprints: blueprintIds.length,
    },
  };
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
      "Tipo de arquivo nao suportado. Envie PNG, JPG, MP4, MP3 ou WAV.",
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
    folder: folder || (normalizedActivityId ? "conteudo" : "acervo"),
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

  const normalizedStatus = normalizeAssetStatusInput(status, "rascunho");
  const assetRow = await createContentAsset({
    activityId: normalizedActivityId || null,
    kind: detectedKind,
    storagePath: storage.publicUrl,
    mimeType: resolvedMimeType,
    status: normalizedStatus,
    metadata: mergedMetadata,
  });

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
    cadastrado: Boolean(assetRow?.id),
    vinculado: Boolean(assetRow?.activity_id),
  };
}

export async function importContentAssetsFromDirectory({
  directoryPath,
  activityId,
  status,
  folder,
  metadata,
} = {}) {
  const resolvedDirectoryPath = resolveAllowedContentImportDirectory(directoryPath);
  const normalizedActivityId = normalizeText(activityId);
  const normalizedStatus = normalizeAssetStatusInput(status, "rascunho");
  const normalizedMetadata =
    metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

  if (normalizedActivityId) {
    await ensureActivityExists(normalizedActivityId);
  }

  let directoryEntries;
  try {
    directoryEntries = await readdir(resolvedDirectoryPath, { withFileTypes: true });
  } catch (error) {
    throw new HttpError(
      400,
      `Falha ao ler a pasta de conteudos: ${error instanceof Error ? error.message : error}`,
    );
  }

  const files = directoryEntries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const extension = normalizeText(entry.name).split(".").pop()?.toLowerCase() ?? "";
      const kind = ASSET_KIND_BY_EXTENSION.get(extension) ?? null;
      if (!kind) {
        return null;
      }

      return {
        fileName: entry.name,
        fullPath: resolve(resolvedDirectoryPath, entry.name),
        kind,
        mimeType: MIME_BY_ASSET_KIND[kind] || "application/octet-stream",
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.fileName.localeCompare(second.fileName, "pt-BR"));

  if (files.length === 0) {
    return {
      imported: 0,
      skipped: 0,
      items: [],
      skippedItems: [],
      directoryPath: resolvedDirectoryPath,
    };
  }

  const existingAssets = await getContentAssets();
  const importedSourcePaths = new Set(
    existingAssets
      .map((asset) => normalizeText(asset?.metadata?.sourceFilePath).toLowerCase())
      .filter(Boolean),
  );

  const items = [];
  const skippedItems = [];

  for (const file of files) {
    const sourcePathKey = file.fullPath.toLowerCase();
    if (importedSourcePaths.has(sourcePathKey)) {
      skippedItems.push({
        fileName: file.fileName,
        reason: "ja-importado",
      });
      continue;
    }

    const buffer = await readFile(file.fullPath);
    const uploaded = await uploadContentAssetFile({
      fileBuffer: buffer,
      originalName: file.fileName,
      mimeType: file.mimeType,
      bytes: buffer.byteLength,
      activityId: normalizedActivityId || null,
      kind: file.kind,
      status: normalizedStatus,
      title: titleFromFileName(file.fileName),
      folder: folder || "conteudo/importados-etapa-2",
      metadata: {
        ...normalizedMetadata,
        source: "directory-import",
        sourceDirectory: resolvedDirectoryPath,
        sourceFilePath: file.fullPath,
        sourceFileRelativePath: relative(resolvedDirectoryPath, file.fullPath).replace(/\\/g, "/"),
      },
    });

    importedSourcePaths.add(sourcePathKey);
    items.push({
      fileName: file.fileName,
      assetId: uploaded.asset?.id ?? null,
      storagePath: uploaded.storage?.publicUrl ?? null,
      linkedToActivity: Boolean(uploaded.vinculado),
    });
  }

  return {
    imported: items.length,
    skipped: skippedItems.length,
    items,
    skippedItems,
    directoryPath: resolvedDirectoryPath,
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

async function upsertMobileLearnerRecord({ id, fullName, notes, educatorId, cpf, phone }) {
  const client = requireSupabase();
  const payload = {
    id: String(id),
    displayName: normalizeText(fullName) || "Alfabetizando",
    notes: normalizeText(notes) || null,
    educatorId: normalizeText(educatorId) || null,
    cpfOrPassport: normalizeNullableText(cpf),
    phoneDigits: normalizeDigits(phone, 11),
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

async function resolveMobileEducatorByAnyId(candidateId) {
  const client = requireSupabase();
  const normalizedId = normalizeText(candidateId);
  if (!normalizedId) {
    return null;
  }

  const byId = await runOptionalQuery(
    client
      .from("Educator")
      .select("id, name, email, cpf, phoneDigits, supabaseAuthUserId, createdAt, updatedAt")
      .eq("id", normalizedId)
      .limit(1),
    "Falha ao buscar educador mobile por id",
  );

  if (byId.length > 0) {
    return byId[0];
  }

  const byAuthUserId = await runOptionalQuery(
    client
      .from("Educator")
      .select("id, name, email, cpf, phoneDigits, supabaseAuthUserId, createdAt, updatedAt")
      .eq("supabaseAuthUserId", normalizedId)
      .limit(1),
    "Falha ao buscar educador mobile por supabaseAuthUserId",
  );

  return byAuthUserId[0] ?? null;
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
      cpf: profile.cpf,
      phone: profile.phone,
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

// Localiza o id de um usuario de auth.users pelo e-mail. Usado para curar
// cadastros orfaos: tentativas anteriores criavam o usuario em auth mas
// falhavam ao gravar o profile, deixando o e-mail "ocupado" sem conta usavel.
async function findAuthUserIdByEmail(client, email) {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return null;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const users = data?.users ?? [];
    const found = users.find(
      (user) => String(user?.email || "").trim().toLowerCase() === target,
    );
    if (found) return found.id;
    // Para na primeira pagina vazia (nao assume que perPage foi respeitado).
    if (users.length === 0) break;
  }
  return null;
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

  // `profiles.cpf` tem unique constraint no banco (cobre alfabetizando,
  // alfabetizador e admin na mesma tabela), mas ela compara string exata —
  // "06604997111" e "066.049.971-11" contam como valores diferentes pro
  // Postgres, entao a constraint (e um .eq() ingenuo aqui) deixa passar uma
  // colisao real quando os dois cadastros usam formatacao diferente (caso
  // real encontrado: alfabetizando cadastrada com o mesmo CPF do proprio
  // alfabetizador, um em dígitos, outro pontuado). Por isso a comparacao e
  // feita em dígitos, no mesmo padrao ja usado em GET
  // /cadastros/alfabetizandos/buscar. Checar antes de criar o usuario em
  // auth.users tambem evita deixar um usuario orfao (sem profile) e um 500
  // generico no lugar de uma rejeicao clara.
  const normalizedCpfDigits = normalizeDigits(cpf, 11);
  if (normalizedCpfDigits) {
    const { data: cpfCandidates } = await client
      .from("profiles")
      .select("id, role, cpf")
      .not("cpf", "is", null);
    const existingCpfProfile = (cpfCandidates ?? []).find(
      (candidate) => normalizeDigits(candidate.cpf, 11) === normalizedCpfDigits,
    );
    if (existingCpfProfile) {
      throw new HttpError(
        409,
        existingCpfProfile.role === role
          ? "Ja existe um cadastro com este CPF."
          : `Este CPF ja esta cadastrado como ${existingCpfProfile.role}. Um mesmo CPF nao pode ter mais de um papel no sistema.`,
      );
    }
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

  let userId = userData?.user?.id;

  if (userError) {
    // O e-mail ja pode estar ocupado por um usuario de uma tentativa anterior
    // que falhou antes de gravar o profile (orfa). Se for esse o caso e o
    // usuario nao tiver profile, reaproveitamos o id para completar o cadastro
    // em vez de bloquear o recadastro. Se ja houver profile, e duplicata real.
    const isDuplicate =
      userError.status === 422 ||
      /already (been )?registered|already exists|email_exists|duplicate/i.test(
        userError.message || "",
      );

    if (!isDuplicate) {
      throw new HttpError(400, `Falha ao criar usuario: ${userError.message}`);
    }

    const existingId = await findAuthUserIdByEmail(client, normalizedEmail);
    if (!existingId) {
      throw new HttpError(400, `Falha ao criar usuario: ${userError.message}`);
    }

    const { data: existingProfile } = await client
      .from("profiles")
      .select("id")
      .eq("id", existingId)
      .maybeSingle();

    if (existingProfile) {
      throw new HttpError(409, "Ja existe um cadastro com este e-mail/CPF.");
    }

    userId = existingId;
  }

  if (!userId) {
    throw new HttpError(500, "Nao foi possivel obter o usuario criado.");
  }

  // Upsert (nao update): nao existe trigger que crie automaticamente a linha
  // em public.profiles ao criar o usuario em auth.users, entao um .update()
  // atinge 0 linhas e o .single() estoura PGRST116 ("Cannot coerce the result
  // to a single JSON object"). O upsert por id cria o perfil quando ausente e
  // atualiza quando ja existir (ex.: se um trigger for adicionado no futuro).
  const { data: profileData, error: profileError } = await client
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: normalizedName,
        // Telefone: apenas dígitos, máximo 11 (DDD + 9 dígitos).
        phone: normalizeDigits(phone, 11),
        cpf: normalizeText(cpf) || null,
        metadata: {
          email: normalizedEmail,
        },
        role,
      },
      { onConflict: "id" },
    )
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

export async function updateProfileRecord({
  profileId,
  role,
  fullName,
  email,
  phone,
  cpf,
  metadata,
}) {
  const client = requireSupabase();
  const normalizedProfileId = normalizeText(profileId);
  const normalizedRole = normalizeText(role).toLowerCase();

  if (!normalizedProfileId) {
    throw new HttpError(400, "ID do perfil invalido.");
  }

  if (normalizedRole && normalizedRole !== "tutor" && normalizedRole !== "alfabetizando") {
    throw new HttpError(400, "Role invalida. Use tutor ou alfabetizando.");
  }

  const hasAnyFieldToUpdate =
    fullName !== undefined ||
    email !== undefined ||
    phone !== undefined ||
    cpf !== undefined ||
    metadata !== undefined;

  if (!hasAnyFieldToUpdate) {
    throw new HttpError(400, "Nenhum campo valido para atualizar.");
  }

  if (isUuid(normalizedProfileId)) {
    const { data: existingProfile, error: readError } = await client
      .from("profiles")
      .select("id, full_name, role, phone, cpf, metadata, created_at, updated_at")
      .eq("id", normalizedProfileId)
      .maybeSingle();

    if (readError) {
      throw new HttpError(400, `Falha ao buscar perfil: ${readError.message}`);
    }

    // Sem linha em profiles: o registro pode existir apenas no schema mobile
    // (LearnerProfile/Educator sincronizados usam o mesmo id). Cai para os
    // caminhos mobile abaixo em vez de responder 404 direto.
    if (existingProfile) {

    const payload = {};

    if (normalizedRole && existingProfile.role !== normalizedRole) {
      payload.role = normalizedRole;
    }
    const currentMetadata =
      existingProfile.metadata &&
      typeof existingProfile.metadata === "object" &&
      !Array.isArray(existingProfile.metadata)
        ? existingProfile.metadata
        : {};
    let nextMetadata = { ...currentMetadata };
    let shouldUpdateMetadata = false;
    let normalizedEmailForSync =
      typeof currentMetadata.email === "string" ? currentMetadata.email.trim().toLowerCase() : "";

    if (fullName !== undefined) {
      const normalizedName = normalizeText(fullName);
      if (!normalizedName) {
        throw new HttpError(400, "Nome nao pode ficar vazio.");
      }
      payload.full_name = normalizedName;
    }

    if (phone !== undefined) {
      // Telefone: apenas dígitos, máximo 11 (DDD + 9 dígitos).
      payload.phone = normalizeDigits(phone, 11);
    }

    if (cpf !== undefined) {
      payload.cpf = normalizeNullableText(cpf);
    }

    if (email !== undefined) {
      const normalizedEmail = normalizeText(email).toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        throw new HttpError(400, "O campo 'email' deve ser valido.");
      }

      const { error: authError } = await client.auth.admin.updateUserById(normalizedProfileId, {
        email: normalizedEmail,
      });

      if (authError) {
        throw new HttpError(400, `Falha ao atualizar email de acesso: ${authError.message}`);
      }

      nextMetadata.email = normalizedEmail;
      normalizedEmailForSync = normalizedEmail;
      shouldUpdateMetadata = true;
    }

    if (metadata !== undefined) {
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        throw new HttpError(400, "metadata deve ser um objeto JSON valido.");
      }

      nextMetadata = {
        ...nextMetadata,
        ...metadata,
      };
      shouldUpdateMetadata = true;
    }

    if (email !== undefined) {
      nextMetadata.email = normalizedEmailForSync;
    }

    if (shouldUpdateMetadata) {
      payload.metadata = nextMetadata;
    }

    const { data, error } = await client
      .from("profiles")
      .update(payload)
      .eq("id", normalizedProfileId)
      .select("id, full_name, role, phone, cpf, metadata, created_at, updated_at")
      .maybeSingle();

    if (error) {
      throw new HttpError(400, `Falha ao atualizar perfil: ${error.message}`);
    }

    if (!data) {
      throw new HttpError(404, "Perfil nao encontrado.");
    }

    if (data.role === "tutor" || data.role === "alfabetizando") {
      await runBestEffortMobileSync("sync profile after updateProfileRecord", () =>
        syncPanelProfileToMobile({
          profile: data,
          email: normalizedEmailForSync || data.metadata?.email || "",
          password: "",
        }),
      );
    }

    return data;
    }
  }

  if (!normalizedRole) {
    throw new HttpError(
      400,
      "Informe a role (tutor ou alfabetizando) para atualizar este registro.",
    );
  }

  if (normalizedRole === "tutor") {
    const existingEducator = await resolveMobileEducatorByAnyId(normalizedProfileId);
    if (!existingEducator) {
      throw new HttpError(404, "Alfabetizador nao encontrado no schema mobile.");
    }

    const payload = {};

    if (fullName !== undefined) {
      const normalizedName = normalizeText(fullName);
      if (!normalizedName) {
        throw new HttpError(400, "Nome nao pode ficar vazio.");
      }
      payload.name = normalizedName;
    }

    if (email !== undefined) {
      const normalizedEmail = normalizeText(email).toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        throw new HttpError(400, "O campo 'email' deve ser valido.");
      }
      payload.email = normalizedEmail;
    }

    if (phone !== undefined) {
      payload.phoneDigits = normalizeNullableText(phone);
    }

    if (cpf !== undefined) {
      payload.cpf = normalizeNullableText(cpf);
    }

    if (Object.keys(payload).length === 0) {
      throw new HttpError(400, "Nenhum campo valido para atualizar.");
    }

    const { data, error } = await client
      .from("Educator")
      .update(payload)
      .eq("id", String(existingEducator.id))
      .select("id, name, email, cpf, phoneDigits, supabaseAuthUserId, createdAt, updatedAt")
      .maybeSingle();

    if (error && !isOptionalSourceMissing(error)) {
      throw new HttpError(400, `Falha ao atualizar alfabetizador mobile: ${error.message}`);
    }

    if (!data) {
      throw new HttpError(404, "Alfabetizador nao encontrado no schema mobile.");
    }

    return mapMobileEducatorToProfile(data);
  }

  const { data: existingLearner, error: readError } = await client
    .from("LearnerProfile")
    .select("id, displayName, notes, educatorId, cpfOrPassport, phoneDigits, createdAt, updatedAt")
    .eq("id", normalizedProfileId)
    .maybeSingle();

  if (readError && !isOptionalSourceMissing(readError)) {
    throw new HttpError(400, `Falha ao buscar alfabetizando mobile: ${readError.message}`);
  }

  if (!existingLearner) {
    throw new HttpError(404, "Alfabetizando nao encontrado no schema mobile.");
  }

  if (email !== undefined) {
    throw new HttpError(
      400,
      "Atualizacao de email nao suportada para alfabetizando no schema mobile sem perfil auth.",
    );
  }

  const payload = {};

  if (fullName !== undefined) {
    const normalizedName = normalizeText(fullName);
    if (!normalizedName) {
      throw new HttpError(400, "Nome nao pode ficar vazio.");
    }
    payload.displayName = normalizedName;
  }

  if (metadata !== undefined) {
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
      payload.notes = normalizeNullableText(metadata.notes);
    } else {
      throw new HttpError(400, "metadata deve ser um objeto JSON valido.");
    }
  }

  if (phone !== undefined) {
    payload.phoneDigits = normalizeDigits(phone, 11);
  }

  if (cpf !== undefined) {
    payload.cpfOrPassport = normalizeNullableText(cpf);
  }

  if (Object.keys(payload).length === 0) {
    throw new HttpError(400, "Nenhum campo valido para atualizar.");
  }

  const { data, error } = await client
    .from("LearnerProfile")
    .update(payload)
    .eq("id", normalizedProfileId)
    .select("id, displayName, notes, educatorId, cpfOrPassport, phoneDigits, createdAt, updatedAt")
    .maybeSingle();

  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(400, `Falha ao atualizar alfabetizando mobile: ${error.message}`);
  }

  if (!data) {
    throw new HttpError(404, "Alfabetizando nao encontrado no schema mobile.");
  }

  return mapMobileLearnerToProfile(data);
}

export async function deleteProfileRecord({ profileId, role }) {
  const client = requireSupabase();
  const normalizedProfileId = normalizeText(profileId);
  const normalizedRole = normalizeText(role).toLowerCase();

  if (!normalizedProfileId) {
    throw new HttpError(400, "ID do perfil invalido.");
  }

  if (normalizedRole && normalizedRole !== "tutor" && normalizedRole !== "alfabetizando") {
    throw new HttpError(400, "Role invalida. Use tutor ou alfabetizando.");
  }

  if (isUuid(normalizedProfileId)) {
    const { data: existingProfile, error: readError } = await client
      .from("profiles")
      .select("id, role")
      .eq("id", normalizedProfileId)
      .maybeSingle();

    if (readError) {
      throw new HttpError(400, `Falha ao buscar perfil: ${readError.message}`);
    }

    if (!existingProfile) {
      if (normalizedRole === "tutor") {
        const existingEducator = await resolveMobileEducatorByAnyId(normalizedProfileId);
        if (!existingEducator?.id) {
          throw new HttpError(404, "Perfil nao encontrado.");
        }

        const { error } = await client
          .from("Educator")
          .delete()
          .eq("id", String(existingEducator.id));

        if (error && !isOptionalSourceMissing(error)) {
          throw new HttpError(400, `Falha ao excluir alfabetizador mobile: ${error.message}`);
        }

        return { id: String(existingEducator.id), deleted: true };
      }

      if (normalizedRole === "alfabetizando") {
        const { data: existingLearner, error: mobileLearnerReadError } = await client
          .from("LearnerProfile")
          .select("id")
          .eq("id", normalizedProfileId)
          .maybeSingle();

        if (mobileLearnerReadError && !isOptionalSourceMissing(mobileLearnerReadError)) {
          throw new HttpError(
            400,
            `Falha ao buscar alfabetizando mobile: ${mobileLearnerReadError.message}`,
          );
        }

        if (!existingLearner) {
          throw new HttpError(404, "Perfil nao encontrado.");
        }

        const { error } = await client
          .from("LearnerProfile")
          .delete()
          .eq("id", normalizedProfileId);

        if (error && !isOptionalSourceMissing(error)) {
          throw new HttpError(400, `Falha ao excluir alfabetizando mobile: ${error.message}`);
        }

        return { id: normalizedProfileId, deleted: true };
      }

      throw new HttpError(404, "Perfil nao encontrado.");
    }

    if (normalizedRole && existingProfile.role !== normalizedRole) {
      throw new HttpError(
        400,
        `Perfil encontrado com role '${existingProfile.role}', diferente de '${normalizedRole}'.`,
      );
    }

    const { error: deleteAuthError } = await client.auth.admin.deleteUser(normalizedProfileId);
    if (deleteAuthError) {
      const message = String(deleteAuthError.message ?? "").toLowerCase();
      if (!message.includes("not found") && !message.includes("nao encontrado")) {
        throw new HttpError(400, `Falha ao excluir usuario auth: ${deleteAuthError.message}`);
      }

      const { error: fallbackDeleteError } = await client
        .from("profiles")
        .delete()
        .eq("id", normalizedProfileId);

      if (fallbackDeleteError) {
        throw new HttpError(400, `Falha ao excluir perfil: ${fallbackDeleteError.message}`);
      }
    }

    if (existingProfile.role === "tutor") {
      await runBestEffortMobileSync("delete tutor from mobile schema", async () => {
        const mobileEducator = await resolveMobileEducatorByAnyId(normalizedProfileId);
        if (!mobileEducator?.id) {
          return;
        }

        const { error } = await client
          .from("Educator")
          .delete()
          .eq("id", String(mobileEducator.id));

        if (error && !isOptionalSourceMissing(error)) {
          throw new HttpError(500, `Falha ao remover tutor no schema mobile: ${error.message}`);
        }
      });
    }

    if (existingProfile.role === "alfabetizando") {
      await runBestEffortMobileSync("delete learner from mobile schema", async () => {
        const { error } = await client
          .from("LearnerProfile")
          .delete()
          .eq("id", normalizedProfileId);

        if (error && !isOptionalSourceMissing(error)) {
          throw new HttpError(500, `Falha ao remover alfabetizando no schema mobile: ${error.message}`);
        }
      });
    }

    return { id: normalizedProfileId, deleted: true };
  }

  if (!normalizedRole) {
    throw new HttpError(
      400,
      "Para IDs nao UUID (schema mobile), informe a role (tutor ou alfabetizando).",
    );
  }

  if (normalizedRole === "tutor") {
    const existingEducator = await resolveMobileEducatorByAnyId(normalizedProfileId);
    if (!existingEducator?.id) {
      throw new HttpError(404, "Alfabetizador nao encontrado no schema mobile.");
    }

    const { error } = await client
      .from("Educator")
      .delete()
      .eq("id", String(existingEducator.id));

    if (error && !isOptionalSourceMissing(error)) {
      throw new HttpError(400, `Falha ao excluir alfabetizador mobile: ${error.message}`);
    }

    return { id: String(existingEducator.id), deleted: true };
  }

  const { data: existingLearner, error: readError } = await client
    .from("LearnerProfile")
    .select("id")
    .eq("id", normalizedProfileId)
    .maybeSingle();

  if (readError && !isOptionalSourceMissing(readError)) {
    throw new HttpError(400, `Falha ao buscar alfabetizando mobile: ${readError.message}`);
  }

  if (!existingLearner) {
    throw new HttpError(404, "Alfabetizando nao encontrado no schema mobile.");
  }

  const { error } = await client.from("LearnerProfile").delete().eq("id", normalizedProfileId);
  if (error && !isOptionalSourceMissing(error)) {
    throw new HttpError(400, `Falha ao excluir alfabetizando mobile: ${error.message}`);
  }

  return { id: normalizedProfileId, deleted: true };
}

// Recebe progresso vindo do app mobile (POST /painel/progress) e faz upsert
// na tabela canonica activity_progress. O mobile envia o status no formato do
// schema Prisma (IN_PROGRESS / COMPLETED); aqui mapeamos para o enum do painel
// (em_andamento / concluido). A escrita é tolerante a violacao de FK
// (student_id ou activity_id ainda nao sincronizados): nesse caso retornamos
// { skipped } para que o mobile nao quebre.
export async function upsertActivityProgressFromMobile({
  learnerProfileId,
  activityId,
  status,
  score,
  elapsedSeconds,
  attempts,
  errorsCount,
  maxAttempts,
  lockReason,
} = {}) {
  const client = requireSupabase();

  const normalizedLearnerId = normalizeText(learnerProfileId);
  const normalizedActivityId = normalizeText(activityId);
  if (!UUID_PATTERN.test(normalizedLearnerId)) {
    throw new HttpError(400, "learnerProfileId invalido (esperado UUID).");
  }
  if (!UUID_PATTERN.test(normalizedActivityId)) {
    throw new HttpError(400, "activityId invalido (esperado UUID).");
  }

  const mappedStatus = mapMobileCompletionStatus(String(status ?? "").toUpperCase());
  if (!ACTIVITY_PROGRESS_STATUSES.has(mappedStatus)) {
    throw new HttpError(400, "Status invalido. Use IN_PROGRESS, COMPLETED ou LOCKED.");
  }

  let normalizedScore = null;
  if (score !== undefined && score !== null) {
    const parsed = Number(score);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      throw new HttpError(400, "score deve estar entre 0 e 100.");
    }
    normalizedScore = parsed;
  }

  let normalizedElapsed = null;
  if (elapsedSeconds !== undefined && elapsedSeconds !== null) {
    const parsed = Number(elapsedSeconds);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new HttpError(400, "elapsedSeconds deve ser >= 0.");
    }
    normalizedElapsed = Math.floor(parsed);
  }

  let normalizedAttempts = null;
  if (attempts !== undefined && attempts !== null) {
    const parsed = Number(attempts);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new HttpError(400, "attempts deve ser >= 0.");
    }
    normalizedAttempts = Math.floor(parsed);
  }

  let normalizedErrors = null;
  if (errorsCount !== undefined && errorsCount !== null) {
    const parsed = Number(errorsCount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new HttpError(400, "errorsCount deve ser >= 0.");
    }
    normalizedErrors = Math.floor(parsed);
  }

  let normalizedMaxAttempts = null;
  if (maxAttempts !== undefined && maxAttempts !== null) {
    const parsed = Number(maxAttempts);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new HttpError(400, "maxAttempts deve ser >= 0.");
    }
    normalizedMaxAttempts = Math.floor(parsed);
  }

  const normalizedLockReason = normalizeNullableText(lockReason);

  // Nunca deixa um IN_PROGRESS (ou LOCKED) sobrescrever uma atividade ja
  // concluida. Sem esta guarda, o foco de uma tela seguinte do mesmo
  // exercicio composto (ou uma reentrada indevida na aula) reabre
  // "em_andamento" o que o aluno ja tinha terminado, e a aula nunca fecha
  // do ponto de vista de quem acompanha o progresso.
  if (mappedStatus !== "concluido") {
    const { data: existing } = await client
      .from("activity_progress")
      .select(
        "id, student_id, activity_id, status, attempts, score, source_platform, last_interacted_at, completed_at, metadata, created_at, updated_at",
      )
      .eq("student_id", normalizedLearnerId)
      .eq("activity_id", normalizedActivityId)
      .maybeSingle();

    if (existing?.status === "concluido") {
      return {
        skipped: true,
        reason: "Atividade ja concluida; gravacao de status anterior ignorada.",
        progress: existing,
      };
    }
  }

  const nowIso = new Date().toISOString();
  const payload = {
    student_id: normalizedLearnerId,
    activity_id: normalizedActivityId,
    status: mappedStatus,
    source_platform: "mobile",
    last_interacted_at: nowIso,
    completed_at: mappedStatus === "concluido" ? nowIso : null,
    metadata: {
      source: "mobile_api",
      ...(normalizedElapsed !== null ? { elapsedSeconds: normalizedElapsed } : {}),
      ...(normalizedErrors !== null ? { errorsCount: normalizedErrors } : {}),
      ...(normalizedMaxAttempts !== null ? { maxAttempts: normalizedMaxAttempts } : {}),
      ...(normalizedLockReason ? { lockReason: normalizedLockReason } : {}),
    },
    ...(normalizedScore !== null ? { score: normalizedScore } : {}),
    ...(normalizedAttempts !== null ? { attempts: normalizedAttempts } : {}),
  };

  const { data, error } = await client
    .from("activity_progress")
    .upsert(payload, { onConflict: "student_id,activity_id" })
    .select(
      "id, student_id, activity_id, status, attempts, score, source_platform, last_interacted_at, completed_at, metadata, created_at, updated_at",
    )
    .single();

  if (error) {
    // 23503 = foreign_key_violation: ocorre quando o LearnerProfile do mobile
    // ainda nao tem profile espelhado, ou a activity_id nao existe no CMS.
    if (error.code === "23503") {
      return {
        skipped: true,
        reason: "FK violation (perfil ou aula nao sincronizados no painel).",
      };
    }
    throw new HttpError(400, `Falha ao gravar progresso: ${error.message}`);
  }

  await runBestEffortMobileSync("register mobile progress upsert event", () =>
    registerSyncEvent({
      sourcePlatform: "mobile",
      eventType: mappedStatus === "travado" ? "progress.locked" : "activity.progress.updated",
      entityType: "activity_progress",
      entityId: data.id,
      payload: {
        studentId: data.student_id,
        activityId: data.activity_id,
        status: data.status,
        attempts: data.attempts ?? null,
        errorsCount: data.metadata?.errorsCount ?? null,
        lockReason: data.metadata?.lockReason ?? null,
      },
    }),
  );

  if (mappedStatus === "travado") {
    await runBestEffortMobileSync("lock mobile learner session after progress lock", () =>
      setMobileLearnerSessionLockState(data.student_id, true),
    );
    await runBestEffortMobileSync("create progress locked notification", () =>
      resolveTutorIdForStudent(data.student_id).then((resolvedTutorId) =>
        createEducatorNotification({
          recipientId: resolvedTutorId,
          recipientRole: resolvedTutorId ? "tutor" : "admin",
          type: "progress_locked",
          title: "Aluno travado",
          body: "Um alfabetizando ficou travado em uma atividade.",
          sourceEntityType: "activity_progress",
          sourceEntityId: data.id,
          payload: {
            studentId: data.student_id,
            activityId: data.activity_id,
            status: data.status,
            attempts: data.attempts ?? null,
            errorsCount: data.metadata?.errorsCount ?? null,
            lockReason: data.metadata?.lockReason ?? null,
          },
        }),
      ),
    );
  }

  // RN085: avanço do aluno (em andamento/concluído) pode render bônus de
  // apoio ao educador; conclusão pode fechar a etapa e creditar +10/+15/+25.
  if (mappedStatus === "em_andamento" || mappedStatus === "concluido") {
    await runBestEffortMobileSync("credit support bonus after mobile progress", () =>
      maybeCreditSupportBonus({ studentId: data.student_id }),
    );
  }

  let stageCompleted = null;
  if (mappedStatus === "concluido") {
    await runBestEffortMobileSync("credit stage completion after mobile progress", async () => {
      stageCompleted = await maybeCreditStageCompletion({
        studentId: data.student_id,
        activityId: data.activity_id,
      });
    });
  }

  return stageCompleted ? { progress: data, stageCompleted } : { progress: data };
}

export async function updateActivityProgressStatus({
  progressId,
  status,
  attempts,
  score,
  completedAt,
  metadataPatch,
} = {}) {
  const client = requireSupabase();
  const normalizedProgressId = normalizeText(progressId);
  if (!normalizedProgressId) {
    throw new HttpError(400, "ID do progresso invalido.");
  }

  const normalizedStatus = normalizeText(status).toLowerCase();
  if (normalizedStatus && !ACTIVITY_PROGRESS_STATUSES.has(normalizedStatus)) {
    throw new HttpError(
      400,
      "Status invalido para progresso. Use: nao_iniciado, em_andamento, travado ou concluido.",
    );
  }

  const { data: existing, error: readError } = await client
    .from("activity_progress")
    .select(
      "id, student_id, activity_id, status, attempts, score, source_platform, last_interacted_at, completed_at, metadata, created_at, updated_at",
    )
    .eq("id", normalizedProgressId)
    .maybeSingle();

  if (readError) {
    throw new HttpError(400, `Falha ao buscar progresso: ${readError.message}`);
  }

  if (!existing) {
    throw new HttpError(404, "Registro de progresso nao encontrado.");
  }

  const payload = {
    last_interacted_at: new Date().toISOString(),
  };

  if (normalizedStatus) {
    payload.status = normalizedStatus;
    if (normalizedStatus === "concluido" && completedAt === undefined) {
      payload.completed_at = new Date().toISOString();
    }
    if (normalizedStatus !== "concluido" && completedAt === undefined) {
      payload.completed_at = null;
    }
  }

  if (attempts !== undefined) {
    payload.attempts = Math.max(0, normalizeInteger(attempts, 0));
  }

  if (score !== undefined) {
    const normalizedScore = Number(score);
    if (!Number.isFinite(normalizedScore)) {
      throw new HttpError(400, "Score invalido.");
    }
    payload.score = normalizedScore;
  }

  if (completedAt !== undefined) {
    if (completedAt === null || completedAt === "") {
      payload.completed_at = null;
    } else {
      const parsedCompletedAt = parseDate(completedAt);
      if (!parsedCompletedAt) {
        throw new HttpError(400, "completedAt invalido.");
      }
      payload.completed_at = parsedCompletedAt.toISOString();
    }
  }

  if (metadataPatch !== undefined) {
    if (!metadataPatch || typeof metadataPatch !== "object" || Array.isArray(metadataPatch)) {
      throw new HttpError(400, "metadataPatch deve ser um objeto JSON valido.");
    }
    const currentMetadata =
      existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? existing.metadata
        : {};
    payload.metadata = {
      ...currentMetadata,
      ...metadataPatch,
    };
  }

  const { data, error } = await client
    .from("activity_progress")
    .update(payload)
    .eq("id", normalizedProgressId)
    .select(
      "id, student_id, activity_id, status, attempts, score, source_platform, last_interacted_at, completed_at, metadata, created_at, updated_at",
    )
    .single();

  if (error) {
    throw new HttpError(400, `Falha ao atualizar progresso: ${error.message}`);
  }

  await runBestEffortMobileSync("register activity progress update event", () =>
    registerSyncEvent({
      sourcePlatform: "web",
      eventType:
        data.status === "travado"
          ? "progress.locked"
          : existing.status === "travado" && data.status !== "travado"
            ? "progress.unlocked"
            : "activity.progress.updated",
      entityType: "activity_progress",
      entityId: data.id,
      payload: {
        studentId: data.student_id,
        activityId: data.activity_id,
        status: data.status,
      },
    }),
  );

  if (normalizedStatus === "travado") {
    await runBestEffortMobileSync("lock mobile learner session after panel progress update", () =>
      setMobileLearnerSessionLockState(data.student_id, true),
    );
  }

  if (existing.status === "travado" && data.status !== "travado") {
    await runBestEffortMobileSync("unlock mobile learner session after panel progress update", () =>
      setMobileLearnerSessionLockState(data.student_id, false),
    );
  }

  // RN085: conclusão marcada pelo painel também pode fechar a etapa.
  if (normalizedStatus === "concluido") {
    await runBestEffortMobileSync("credit stage completion after panel progress update", async () => {
      data.stageCompleted = await maybeCreditStageCompletion({
        studentId: data.student_id,
        activityId: data.activity_id,
      });
    });
  }

  return data;
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

  await runBestEffortMobileSync("register link create event", () =>
    registerSyncEvent({
      sourcePlatform: "web",
      eventType: data.status === "pendente" ? "link.requested" : "link.updated",
      entityType: "tutor_student_link",
      entityId: data.id,
      payload: {
        tutorId: data.tutor_id,
        studentId: data.student_id,
        status: data.status,
      },
    }),
  );

  if (data.status === "pendente") {
    await runBestEffortMobileSync("create link pending notification", () =>
      createEducatorNotification({
        recipientId: data.tutor_id,
        recipientRole: "tutor",
        type: "link_pending",
        title: "Vinculo pendente",
        body: "Um alfabetizando solicitou vinculacao.",
        sourceEntityType: "tutor_student_link",
        sourceEntityId: data.id,
        payload: {
          tutorId: data.tutor_id,
          studentId: data.student_id,
          status: data.status,
        },
      }),
    );
  }

  // RN104: vínculo já criado confirmado (ex.: novo educador cadastrou o
  // alfabetizando) notifica os alfabetizadores antigos.
  if (data.status === "confirmado") {
    await runBestEffortMobileSync("notify previous educators after link create", () =>
      notifyPreviousEducatorsOfNewLink(data),
    );
  }

  return data;
}

export async function updateTutorStudentLink(id, updates) {
  const client = requireSupabase();
  const linkId = normalizeText(id);

  if (!linkId) {
    throw new HttpError(400, "ID do vinculo invalido.");
  }

  // Decisao 2026-05-17 (docs/product/decisoes-etapa1-etapa2-2026-05-17.md):
  // negar vinculo exige motivo. GET /fila/:id (painel) ja validava isso,
  // mas /cadastros/vinculos/:id e /cadastros/sessoes-confirmacao/:id (via
  // app mobile do alfabetizador) chamavam esta funcao sem nenhuma
  // validacao server-side — só o app cliente impedia o envio vazio.
  const normalizedReason = normalizeText(updates.reason);
  if (updates.status === "negado" && (!normalizedReason || normalizedReason.length < 3)) {
    throw new HttpError(400, "Informe um motivo (minimo 3 caracteres) para negar o vinculo.");
  }

  const payload = {
    status: updates.status,
    reason: normalizedReason || null,
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

  await runBestEffortMobileSync("register link update event", () =>
    registerSyncEvent({
      sourcePlatform: "web",
      eventType: "link.updated",
      entityType: "tutor_student_link",
      entityId: data.id,
      payload: {
        tutorId: data.tutor_id,
        studentId: data.student_id,
        status: data.status,
      },
    }),
  );

  // RN099: recusa notifica o alfabetizando e a administração com o motivo.
  if (data.status === "negado") {
    await runBestEffortMobileSync("notify link denial", () => notifyLinkDenied(data));
  }

  // RN104: confirmação de vínculo com novo alfabetizador notifica os antigos.
  if (data.status === "confirmado") {
    await runBestEffortMobileSync("notify previous educators after link update", () =>
      notifyPreviousEducatorsOfNewLink(data),
    );
  }

  return data;
}

// ─── Tutorial Completions ─────────────────────────────────────────────────────

const TUTORIAL_COMPLETIONS_SELECT =
  "id, educator_id, media_id, completed_at, position_sec, watch_count, created_at, updated_at";

export async function getTutorialCompletions({ educatorId } = {}) {
  const client = requireSupabase();
  if (!educatorId) throw new HttpError(400, "educatorId e obrigatorio.");

  const [{ data: mediaItems, error: mediaError }, { data: completions, error: completionsError }] =
    await Promise.all([
      client
        .from("media_library")
        .select(MEDIA_LIBRARY_SELECT)
        .eq("kind", "tutorial")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      client
        .from("tutorial_completions")
        .select(TUTORIAL_COMPLETIONS_SELECT)
        .eq("educator_id", educatorId),
    ]);

  if (mediaError) throw new HttpError(400, `Falha ao listar tutoriais: ${mediaError.message}`);
  if (completionsError) throw new HttpError(400, `Falha ao listar progressos: ${completionsError.message}`);

  const completionByMedia = new Map((completions ?? []).map((c) => [c.media_id, c]));

  return (mediaItems ?? []).map((item) => {
    const completion = completionByMedia.get(item.id) ?? null;
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      description: item.description,
      kind: item.kind,
      duration_sec: item.duration_sec,
      public_url: item.public_url,
      tags: item.tags,
      metadata: item.metadata,
      completion: completion
        ? {
            completed_at: completion.completed_at,
            position_sec: completion.position_sec,
            watch_count: completion.watch_count,
            is_completed: completion.completed_at !== null,
          }
        : null,
    };
  });
}

// Vídeos de dica/apoio (kind=dica) que o alfabetizando pode consultar na aba
// de tutoriais. Sem PII e sem progresso — apenas os clipes ativos.
export async function getSupportVideos() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("media_library")
    .select(MEDIA_LIBRARY_SELECT)
    .eq("kind", "dica")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new HttpError(400, `Falha ao listar dicas: ${error.message}`);
  return (data ?? []).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    kind: item.kind,
    duration_sec: item.duration_sec,
    public_url: item.public_url,
    tags: item.tags,
    metadata: item.metadata,
  }));
}

export async function upsertTutorialCompletion({
  educatorId,
  mediaId,
  positionSec,
  markCompleted,
}) {
  const client = requireSupabase();
  const normalizedEducatorId = normalizeText(educatorId);
  const normalizedMediaId = normalizeText(mediaId);
  if (!isUuid(normalizedEducatorId)) throw new HttpError(400, "educatorId invalido.");
  if (!isUuid(normalizedMediaId)) throw new HttpError(400, "mediaId invalido.");

  const now = new Date().toISOString();
  const payload = {
    educator_id: normalizedEducatorId,
    media_id: normalizedMediaId,
    position_sec: typeof positionSec === "number" ? positionSec : 0,
    updated_at: now,
  };

  if (markCompleted) payload.completed_at = now;

  const { data, error } = await client
    .from("tutorial_completions")
    .upsert(payload, {
      onConflict: "educator_id,media_id",
      ignoreDuplicates: false,
    })
    .select(TUTORIAL_COMPLETIONS_SELECT)
    .single();

  if (error) throw new HttpError(400, `Falha ao salvar progresso de tutorial: ${error.message}`);
  return data;
}

// ─── Fase 2: fotos de atividade do alfabetizando (RN059/RN070/RN113/RN114) ──
// A mesma infra atende a carta de agradecimento da Etapa 3 (kind='carta').

const ACTIVITY_PHOTO_SELECT =
  "id, student_id, activity_id, kind, storage_path, public_url, status, approved_by, approved_at, metadata, created_at";

function extensionForMime(mimeType) {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  return "jpg";
}

export async function createActivityPhoto({ studentId, activityId, kind, imageBase64, mimeType }) {
  const client = requireSupabase();
  const normalizedStudentId = normalizeText(studentId);
  if (!normalizedStudentId) {
    throw new HttpError(400, "studentId e obrigatorio.");
  }

  const base64 = String(imageBase64 || "").replace(/^data:[^;]+;base64,/, "").trim();
  if (!base64) {
    throw new HttpError(400, "imageBase64 e obrigatorio.");
  }
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) {
    throw new HttpError(400, "Imagem vazia.");
  }
  if (buffer.length > 8 * 1024 * 1024) {
    throw new HttpError(400, "Imagem acima de 8MB.");
  }

  const normalizedKind = String(kind || "atividade").toLowerCase() === "carta" ? "carta" : "atividade";
  const normalizedMime = normalizeText(mimeType) || "image/jpeg";
  const objectPath = `activity-photos/${normalizedStudentId}/${Date.now()}-${randomUUID().slice(0, 8)}.${extensionForMime(normalizedMime)}`;

  const uploaded = await uploadBufferToStorage({ buffer, mimeType: normalizedMime, objectPath });

  const { data, error } = await client
    .from("activity_photos")
    .insert({
      student_id: normalizedStudentId,
      activity_id: normalizeNullableText(activityId),
      kind: normalizedKind,
      storage_path: uploaded.objectPath,
      public_url: uploaded.publicUrl,
      status: "enviada",
      metadata: {},
    })
    .select(ACTIVITY_PHOTO_SELECT)
    .single();

  if (error) {
    throw new HttpError(400, `Falha ao registrar foto: ${error.message}`);
  }

  // Notifica o alfabetizador vinculado (RN059: foto disponivel na area dele).
  await runBestEffortMobileSync("notify photo_sent", async () => {
    const links = await getTutorStudentLinks({ studentIds: [normalizedStudentId], statuses: ["confirmado"] });
    const tutorId = links[0]?.tutor_id;
    if (!tutorId) return;
    const { data: studentProfile } = await client
      .from("profiles")
      .select("full_name")
      .eq("id", normalizedStudentId)
      .maybeSingle();
    await createEducatorNotification({
      recipientId: tutorId,
      recipientRole: "tutor",
      type: "photo_sent",
      title: normalizedKind === "carta" ? "Carta de agradecimento recebida" : "Foto de atividade enviada",
      body: `${studentProfile?.full_name ?? "Um alfabetizando"} enviou ${normalizedKind === "carta" ? "a carta de agradecimento" : "a foto de uma atividade"}.`,
      sourceEntityType: "activity_photo",
      sourceEntityId: data.id,
      payload: { studentId: normalizedStudentId, activityId: data.activity_id, kind: normalizedKind },
    });
  });

  return data;
}

export async function listActivityPhotos({ studentId, activityId, kind, status } = {}) {
  const client = requireSupabase();
  let query = client
    .from("activity_photos")
    .select(ACTIVITY_PHOTO_SELECT)
    .order("created_at", { ascending: false })
    .limit(100);

  const normalizedStudentId = normalizeText(studentId);
  if (normalizedStudentId) query = query.eq("student_id", normalizedStudentId);
  const normalizedActivityId = normalizeText(activityId);
  if (normalizedActivityId) query = query.eq("activity_id", normalizedActivityId);
  const normalizedKind = normalizeText(kind).toLowerCase();
  if (normalizedKind) query = query.eq("kind", normalizedKind);
  const normalizedStatus = normalizeText(status).toLowerCase();
  if (normalizedStatus) query = query.eq("status", normalizedStatus);

  const { data, error } = await query;
  if (error) {
    if (isOptionalSourceMissing(error)) return [];
    throw new HttpError(400, `Falha ao listar fotos: ${error.message}`);
  }
  return data ?? [];
}

// RN082: APROVAR TAREFA — marca a foto como aprovada e registra a decisão.
export async function approveActivityPhoto({ photoId, educatorId }) {
  const client = requireSupabase();
  const normalizedPhotoId = normalizeText(photoId);
  if (!normalizedPhotoId) {
    throw new HttpError(400, "photoId e obrigatorio.");
  }

  const { data, error } = await client
    .from("activity_photos")
    .update({
      status: "aprovada",
      approved_by: normalizeNullableText(educatorId),
      approved_at: new Date().toISOString(),
    })
    .eq("id", normalizedPhotoId)
    .select(ACTIVITY_PHOTO_SELECT)
    .maybeSingle();

  if (error) {
    throw new HttpError(400, `Falha ao aprovar foto: ${error.message}`);
  }
  if (!data) {
    throw new HttpError(404, "Foto nao encontrada.");
  }

  await runBestEffortMobileSync("notify photo_approved", () =>
    createEducatorNotification({
      recipientId: normalizeNullableText(educatorId),
      recipientRole: "tutor",
      type: "photo_approved",
      title: "Tarefa aprovada",
      body: "Voce aprovou a atividade enviada pelo alfabetizando.",
      sourceEntityType: "activity_photo",
      sourceEntityId: data.id,
      payload: { studentId: data.student_id, activityId: data.activity_id },
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
