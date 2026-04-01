import { isSupabaseConfigured, supabaseAdmin } from "../lib/supabase.js";
import { randomBytes, scryptSync } from "node:crypto";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const MOBILE_PASSWORD_KEY_LENGTH = 64;
const OPTIONAL_SOURCE_ERROR_CODES = new Set(["PGRST205", "42P01"]);

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
  return {
    id: item.id,
    full_name: item.name,
    role: "tutor",
    phone: item.phoneDigits ?? "",
    cpf: item.cpf ?? "",
    metadata: {
      source: "mobile_api",
      email: item.email ?? "",
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

function mapMobileLearnerToLink(item) {
  return {
    id: `mobile-link-${item.educatorId}-${item.id}`,
    tutor_id: item.educatorId,
    student_id: item.id,
    status: "confirmado",
    requested_by: item.educatorId,
    requested_at: item.createdAt,
    decided_by: item.educatorId,
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

  const client = requireSupabase();
  let query = client
    .from("profiles")
    .select("id, full_name, role, phone, cpf, metadata, created_at, updated_at");

  if (role) {
    query = query.eq("role", role);
  }

  if (ids) {
    query = query.in("id", ids);
  }

  const shouldLoadMobileEducators = !role || role === "tutor";
  const shouldLoadMobileLearners = !role || role === "alfabetizando";

  const [profiles, mobileEducators, mobileLearners] = await Promise.all([
    runQuery(query, "Falha ao listar perfis"),
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

  const client = requireSupabase();
  let query = client
    .from("tutor_student_links")
    .select(
      "id, tutor_id, student_id, status, requested_by, requested_at, decided_by, decided_at, reason, created_at, updated_at",
    );

  if (tutorIds) {
    query = query.in("tutor_id", tutorIds);
  }

  if (studentIds) {
    query = query.in("student_id", studentIds);
  }

  if (statuses) {
    query = query.in("status", statuses);
  }

  const canIncludeMobileLinks = !statuses || statuses.includes("confirmado");
  if (!canIncludeMobileLinks) {
    return runQuery(query, "Falha ao listar vinculos");
  }

  const [links, mobileLearners] = await Promise.all([
    runQuery(query, "Falha ao listar vinculos"),
    getMobileLearners({ ids: studentIds, educatorIds: tutorIds }),
  ]);

  const filteredMobileLearners = mobileLearners.filter((item) => normalizeText(item.educatorId));
  const mobileLinks = filteredMobileLearners.map(mapMobileLearnerToLink);

  return dedupeByKey(links, mobileLinks, (item) => `${item.tutor_id}:${item.student_id}`);
}

export async function getActivityProgress({ studentIds } = {}) {
  if (studentIds && studentIds.length === 0) {
    return [];
  }

  const client = requireSupabase();
  let query = client
    .from("activity_progress")
    .select(
      "id, student_id, activity_id, status, attempts, score, source_platform, last_interacted_at, completed_at, metadata, created_at, updated_at",
    );

  if (studentIds) {
    query = query.in("student_id", studentIds);
  }

  const [progressRows, mobileCompletions] = await Promise.all([
    runQuery(query, "Falha ao listar progresso"),
    getMobileCompletions({ learnerProfileIds: studentIds }),
  ]);

  const mobileProgressRows = mobileCompletions.map(mapMobileCompletionToProgress);
  return dedupeByKey(progressRows, mobileProgressRows, (item) => `${item.student_id}:${item.activity_id}`);
}

export async function getLearningActivities({ ids } = {}) {
  if (ids && ids.length === 0) {
    return [];
  }

  const client = requireSupabase();
  let query = client
    .from("learning_activities")
    .select("id, module_id, type, title, instructions, sort_order, is_published, created_at, updated_at");

  if (ids) {
    query = query.in("id", ids);
  }

  const [activities, mobileActivities] = await Promise.all([
    runQuery(query, "Falha ao listar atividades"),
    getMobileActivities({ ids }),
  ]);

  return dedupeById(activities, mobileActivities.map(mapMobileActivityToActivity));
}

export async function getLearningModules({ ids } = {}) {
  if (ids && ids.length === 0) {
    return [];
  }

  const client = requireSupabase();
  let query = client
    .from("learning_modules")
    .select("id, theme_id, stage_number, title, description, sort_order, is_active, created_at, updated_at");

  if (ids) {
    query = query.in("id", ids);
  }

  const [modules, mobileUnits] = await Promise.all([
    runQuery(query, "Falha ao listar modulos"),
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

  const canFallbackToEmailUpdate =
    basePayload.email &&
    String(error.code ?? "") === "23505" &&
    String(error.message ?? "").toLowerCase().includes("educator_email_key");

  if (!canFallbackToEmailUpdate) {
    throw new HttpError(500, `Falha ao sincronizar educador no schema mobile: ${error.message}`);
  }

  const { error: updateError } = await client
    .from("Educator")
    .update({
      name: basePayload.name,
      cpf: basePayload.cpf,
      phoneDigits: basePayload.phoneDigits,
      supabaseAuthUserId: basePayload.supabaseAuthUserId,
      ...(basePayload.passwordHash ? { passwordHash: basePayload.passwordHash } : {}),
    })
    .eq("email", basePayload.email);

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
  const nextEducatorId = status === "confirmado" ? String(tutorId) : null;

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
