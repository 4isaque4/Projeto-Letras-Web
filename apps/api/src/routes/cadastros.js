import { Router } from "express";
import {
  createAuthUserWithProfile,
  createTutorStudentLink,
  deleteProfileRecord,
  daysSince,
  formatDateTime,
  formatRelativeTime,
  getActivityProgress,
  getEducatorNotifications,
  getMobileLearnerSessionState,
  getLearningActivities,
  getLearningModules,
  getProfiles,
  getSupportRequests,
  getTutorStudentLinks,
  setMobileLearnerSessionLockState,
  toHttpError,
  updateProfileRecord,
  updateTutorStudentLink,
} from "../services/letrasDataService.js";
import { emitLearnerLockChanged } from "../realtime/dashboardRealtime.js";

export const cadastrosRouter = Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Resolve um educator ID (pode ser CUID do NestJS ou UUID do Supabase) para o
// UUID do Supabase.
//
// Estratégia 1: consulta a tabela "Educator" do NestJS/Prisma (que pode estar
//   no mesmo banco Supabase) e retorna supabaseAuthUserId.
// Estratégia 2: chama internamente /auth/educators/me nas portas conhecidas
//   do NestJS para obter o email, depois busca o profile por email.
async function resolveSupabaseTutorId(rawId, authHeader, supabaseClient) {
  if (!rawId) return null;
  if (UUID_PATTERN.test(rawId)) return rawId; // já é UUID Supabase

  // Estratégia 1: tabela Educator do NestJS/Prisma no mesmo banco
  try {
    const { data: educator } = await supabaseClient
      .from("Educator")
      .select("supabaseAuthUserId")
      .eq("id", rawId)
      .maybeSingle();

    if (educator?.supabaseAuthUserId && UUID_PATTERN.test(educator.supabaseAuthUserId)) {
      return educator.supabaseAuthUserId;
    }
  } catch {
    // Tabela não existe neste banco — tenta estratégia 2
  }

  // Estratégia 2: chama /auth/educators/me via porta interna do NestJS
  const token = String(authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const nestPorts = [3000, 8082, 8080];
  for (const port of nestPorts) {
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/auth/educators/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(2000),
      });

      if (!resp.ok) continue;

      const data = await resp.json();
      const email = String(data?.educator?.email ?? "").trim().toLowerCase();
      if (!email) continue;

      // Busca o profile Supabase pelo email no metadata
      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("id, metadata")
        .eq("role", "tutor");

      const found = (profiles ?? []).find((p) => {
        const pEmail = String(p.metadata?.email ?? "").trim().toLowerCase();
        return pEmail && pEmail === email;
      });

      if (found?.id) return found.id;
    } catch {
      // Tenta a próxima porta
    }
  }

  return null;
}

function mapById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function extractProfileEmail(profile) {
  if (!profile || typeof profile !== "object") {
    return "";
  }

  const metadata = profile.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }

  const email =
    typeof metadata.email === "string"
      ? metadata.email
      : typeof metadata.email === "number"
        ? String(metadata.email)
        : "";

  return email.trim().toLowerCase();
}

function computeStudentStatus(progressRows) {
  if (progressRows.some((row) => row.status === "travado")) {
    return "travado";
  }

  const last = progressRows
    .map((row) => row.last_interacted_at || row.completed_at || row.updated_at || row.created_at)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return daysSince(last) > 7 ? "inativo" : "ativo";
}

function computeStageLabel(stageNumber) {
  const normalized = Number(stageNumber);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return "Etapa 1";
  }

  return `Etapa ${Math.floor(normalized)}`;
}

function normalizeSubmissionStatus(value, fallback = "pendente") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (normalized === "approved" || normalized === "aprovado" || normalized === "aprovada") {
    return "aprovada";
  }
  if (normalized === "rejected" || normalized === "negado" || normalized === "negada") {
    return "negada";
  }
  if (normalized === "sent" || normalized === "submitted" || normalized === "enviado") {
    return "enviada";
  }
  return normalized;
}

function buildMobileProvisionEmail(deviceId) {
  const suffix = String(deviceId ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-24)
    .toLowerCase() || Date.now().toString(36);
  return `alfabetizando.${suffix}@mobile.letras.local`;
}

function toCanonicalLearnerProfile(profile) {
  return {
    id: profile.id,
    displayName: profile.full_name,
    notes: profile.metadata?.notes ?? profile.metadata?.source ?? null,
    educatorId: profile.metadata?.educatorId ?? null,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function normalizeSubmissionType(rawItem) {
  const typeCandidate = String(
    rawItem?.tipo ?? rawItem?.type ?? rawItem?.kind ?? rawItem?.mimeType ?? rawItem?.mime_type ?? "",
  )
    .trim()
    .toLowerCase();
  const sourceUrl = String(rawItem?.url ?? rawItem?.sourceUrl ?? rawItem?.storagePath ?? "").toLowerCase();

  if (
    typeCandidate.includes("audio") ||
    typeCandidate.includes("mp3") ||
    sourceUrl.endsWith(".mp3") ||
    sourceUrl.endsWith(".wav")
  ) {
    return "Audio";
  }

  if (
    typeCandidate.includes("foto") ||
    typeCandidate.includes("imagem") ||
    typeCandidate.includes("image") ||
    typeCandidate.includes("png") ||
    typeCandidate.includes("jpg") ||
    sourceUrl.endsWith(".png") ||
    sourceUrl.endsWith(".jpg") ||
    sourceUrl.endsWith(".jpeg")
  ) {
    return "Foto";
  }

  if (
    typeCandidate.includes("video") ||
    typeCandidate.includes("mp4") ||
    sourceUrl.endsWith(".mp4") ||
    sourceUrl.endsWith(".mov")
  ) {
    return "Video";
  }

  return "Arquivo";
}

function extractSubmissionsFromProgress(progressRows, activityById) {
  const submissionItems = [];

  for (const row of progressRows) {
    const metadata = row.metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      continue;
    }

    const rawEntries = [];
    if (Array.isArray(metadata.submissions)) {
      rawEntries.push(...metadata.submissions);
    }
    if (metadata.submission && typeof metadata.submission === "object" && !Array.isArray(metadata.submission)) {
      rawEntries.push(metadata.submission);
    }
    if (Array.isArray(metadata.assets)) {
      rawEntries.push(...metadata.assets);
    }
    if (metadata.asset && typeof metadata.asset === "object" && !Array.isArray(metadata.asset)) {
      rawEntries.push(metadata.asset);
    }

    if (rawEntries.length === 0) {
      continue;
    }

    const fallbackStatus = row.status === "concluido" ? "aprovada" : "pendente";
    const fallbackDate = row.last_interacted_at || row.updated_at || row.created_at;
    const activityTitle = activityById.get(row.activity_id)?.title ?? "Atividade";

    rawEntries.forEach((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return;
      }

      const idCandidate = String(entry.id ?? "").trim();
      const createdAtCandidate = entry.createdAt || entry.created_at || fallbackDate;
      submissionItems.push({
        id: idCandidate || `${row.id}-${index + 1}`,
        tipo: normalizeSubmissionType(entry),
        atividade: activityTitle,
        data: formatDateTime(createdAtCandidate),
        status: normalizeSubmissionStatus(entry.status, fallbackStatus),
        createdAt: new Date(createdAtCandidate || fallbackDate || 0).getTime(),
      });
    });
  }

  return submissionItems
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ createdAt, ...item }) => item);
}

cadastrosRouter.get("/alfabetizadores", async (_req, res) => {
  try {
    const tutors = await getProfiles({ role: "tutor" });
    const links = await getTutorStudentLinks();
    const tutorLinks = links.filter((item) => item.status === "confirmado");

    const studentIds = [...new Set(tutorLinks.map((item) => item.student_id))];
    const progress = await getActivityProgress({ studentIds });

    const studentProgressById = new Map();
    for (const row of progress) {
      const current = studentProgressById.get(row.student_id) ?? [];
      current.push(row);
      studentProgressById.set(row.student_id, current);
    }

    const items = tutors.map((tutor) => {
      const linkedStudents = tutorLinks.filter((item) => item.tutor_id === tutor.id).map((item) => item.student_id);
      const uniqueStudents = [...new Set(linkedStudents)];
      const linkedProgress = uniqueStudents.flatMap((studentId) => studentProgressById.get(studentId) ?? []);
      const lockedStudents = uniqueStudents.filter((studentId) => {
        const studentRows = studentProgressById.get(studentId) ?? [];
        return studentRows.some((row) => row.status === "travado");
      });

      const scores = linkedProgress
        .map((row) => Number(row.score))
        .filter((value) => Number.isFinite(value));
      const avgScore = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0;

      return {
        id: tutor.id,
        nome: tutor.full_name,
        email: extractProfileEmail(tutor),
        telefone: tutor.phone ?? "",
        cpf: tutor.cpf ?? "",
        alunos: uniqueStudents.length,
        travados: lockedStudents.length,
        pontuacao: avgScore,
        criadoEm: tutor.created_at,
      };
    });

    res.json({
      total: items.length,
      items,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.post("/alfabetizadores", async (req, res) => {
  try {
    const data = await createAuthUserWithProfile({
      email: req.body?.email,
      password: req.body?.password,
      fullName: req.body?.fullName ?? req.body?.nome,
      phone: req.body?.phone,
      cpf: req.body?.cpf,
      role: "tutor",
    });

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.get("/perfis/:id", async (req, res) => {
  try {
    const profileId = String(req.params.id ?? "").trim();
    if (!profileId) {
      res.status(400).json({ message: "ID invalido." });
      return;
    }

    const profiles = await getProfiles({ ids: [profileId] });
    const profile = profiles[0] ?? null;

    if (!profile) {
      res.status(404).json({ message: "Perfil nao encontrado." });
      return;
    }

    res.json(profile);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.patch("/perfis/:id", async (req, res) => {
  try {
    const data = await updateProfileRecord({
      profileId: req.params.id,
      role: req.body?.role,
      fullName: req.body?.fullName ?? req.body?.nome,
      email: req.body?.email,
      phone: req.body?.phone,
      cpf: req.body?.cpf,
      metadata: req.body?.metadata,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.patch("/alfabetizadores/:id", async (req, res) => {
  try {
    const data = await updateProfileRecord({
      profileId: req.params.id,
      role: "tutor",
      fullName: req.body?.fullName ?? req.body?.nome,
      email: req.body?.email,
      phone: req.body?.phone,
      cpf: req.body?.cpf,
      metadata: req.body?.metadata,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.delete("/alfabetizadores/:id", async (req, res) => {
  try {
    const data = await deleteProfileRecord({
      profileId: req.params.id,
      role: "tutor",
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.get("/sessoes-bloqueadas", async (req, res) => {
  try {
    const rawId = String(req.query.tutorId ?? req.query.educatorId ?? "").trim();
    const { supabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase.js");
    const client = isSupabaseConfigured && supabaseAdmin ? supabaseAdmin : null;
    const tutorId = client
      ? (await resolveSupabaseTutorId(rawId, req.headers.authorization, client)) ?? rawId
      : rawId;

    if (!tutorId) {
      res.json([]);
      return;
    }

    const [students, links] = await Promise.all([
      getProfiles({ role: "alfabetizando" }),
      getTutorStudentLinks(),
    ]);

    const confirmedStudentIds = new Set(
      links
        .filter((item) => item.status === "confirmado" && item.tutor_id === tutorId)
        .map((item) => item.student_id),
    );

    const linkedStudents = students.filter((student) => confirmedStudentIds.has(student.id));
    const sessionChecks = await Promise.all(
      linkedStudents.map(async (student) => ({
        student,
        session: await getMobileLearnerSessionState(student.id),
      })),
    );

    const items = sessionChecks
      .filter((item) => item.session?.sessionState?.isLocked)
      .map(({ student, session }) => ({
        id: student.id,
        displayName: student.full_name,
        phoneDigits: student.phone ?? null,
        session,
      }));

    res.json(items);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

// Chamado pelo app mobile do educador para bloquear/desbloquear a sessão de um aluno.
cadastrosRouter.put("/sessions/:learnerId/lock", async (req, res) => {
  try {
    const { learnerId } = req.params;
    const isLocked = Boolean(req.body?.isLocked);
    if (!learnerId) {
      return res.status(400).json({ message: "learnerId obrigatorio." });
    }
    await setMobileLearnerSessionLockState(learnerId, isLocked);
    // Notifica o mobile do aluno em tempo real para que a UI desbloqueie
    // imediatamente, sem esperar o poll de 10 s.
    emitLearnerLockChanged(learnerId, isLocked);
    res.json({ learnerId, isLocked });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.get("/alfabetizandos", async (req, res) => {
  try {
    const rawId = String(req.query.tutorId ?? req.query.educatorId ?? "").trim();
    const { supabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase.js");
    const client = isSupabaseConfigured && supabaseAdmin ? supabaseAdmin : null;
    const tutorId = client
      ? (await resolveSupabaseTutorId(rawId, req.headers.authorization, client)) ?? rawId
      : rawId;
    const students = await getProfiles({ role: "alfabetizando" });
    const studentMap = mapById(students);

    const links = await getTutorStudentLinks({
      studentIds: students.map((item) => item.id),
    });

    const confirmedLinks = links.filter((item) => item.status === "confirmado");
    const filteredStudentIds =
      tutorId.length > 0
        ? [
            ...new Set(
              confirmedLinks.filter((item) => item.tutor_id === tutorId).map((item) => item.student_id),
            ),
          ]
        : students.map((item) => item.id);

    const filteredStudents = filteredStudentIds
      .map((id) => studentMap.get(id))
      .filter(Boolean);

    const progress = await getActivityProgress({ studentIds: filteredStudentIds });
    const activityIds = [...new Set(progress.map((item) => item.activity_id).filter(Boolean))];
    const activities = await getLearningActivities({ ids: activityIds });
    const moduleIds = [...new Set(activities.map((item) => item.module_id).filter(Boolean))];
    const modules = await getLearningModules({ ids: moduleIds });

    const activityById = new Map(activities.map((item) => [item.id, item]));
    const moduleById = new Map(modules.map((item) => [item.id, item]));
    const progressByStudent = new Map();
    for (const row of progress) {
      const current = progressByStudent.get(row.student_id) ?? [];
      current.push(row);
      progressByStudent.set(row.student_id, current);
    }

    const tutors = await getProfiles({ role: "tutor" });
    const tutorById = mapById(tutors);
    const totalActivities = activities.length;

    const items = filteredStudents.map((student) => {
      const studentRows = progressByStudent.get(student.id) ?? [];
      const completedCount = studentRows.filter(
        (row) => row.status === "concluido" || Boolean(row.completed_at),
      ).length;

      const progressPercent =
        totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

      const latestActivityAt = studentRows
        .map((row) => row.last_interacted_at || row.completed_at || row.updated_at || row.created_at)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      const stageNumbers = studentRows
        .map((row) => {
          const activity = activityById.get(row.activity_id);
          if (!activity) {
            return null;
          }
          const module = moduleById.get(activity.module_id);
          return module?.stage_number ?? null;
        })
        .filter((value) => typeof value === "number");
      const stageNumber = stageNumbers.length > 0 ? Math.max(...stageNumbers) : 1;

      const link = confirmedLinks.find((item) => item.student_id === student.id);
      const tutor = link ? tutorById.get(link.tutor_id) : null;

      return {
        id: student.id,
        nome: student.full_name,
        displayName: student.full_name,        // alias para o app mobile do educador
        phoneDigits: student.phone ?? null,     // alias para o app mobile do educador
        learnerThemes: [],                      // painel nao tem temas por aluno ainda
        email: extractProfileEmail(student),
        grupo:
          typeof student.metadata?.group_name === "string" && student.metadata.group_name.length > 0
            ? student.metadata.group_name
            : "Sem grupo",
        etapa: computeStageLabel(stageNumber),
        progresso: progressPercent,
        status: computeStudentStatus(studentRows),
        ultimaAtividade: formatRelativeTime(latestActivityAt),
        ultimaAtividadeEm: latestActivityAt ?? null,
        tutorId: link?.tutor_id ?? null,
        tutorNome: tutor?.full_name ?? "Sem tutor",
        telefone: student.phone ?? "",
        cpf: student.cpf ?? "",
      };
    });

    res.json({
      total: items.length,
      items,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.post("/alfabetizandos/provisionar-mobile", async (req, res) => {
  try {
    const deviceId = String(req.body?.deviceId ?? "").trim();
    if (!deviceId) {
      res.status(400).json({ message: "deviceId e obrigatorio." });
      return;
    }

    const displayName =
      String(req.body?.displayName ?? "").trim() ||
      `Alfabetizando ${deviceId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "WEB"}`;
    const email = buildMobileProvisionEmail(deviceId);
    const existingProfiles = await getProfiles({ role: "alfabetizando" });
    const existing = existingProfiles.find((profile) => {
      if (!UUID_PATTERN.test(profile.id)) {
        return false;
      }
      const metadata = profile.metadata && typeof profile.metadata === "object" ? profile.metadata : {};
      return metadata.mobileDeviceId === deviceId || extractProfileEmail(profile) === email;
    });

    if (existing) {
      res.json(toCanonicalLearnerProfile(existing));
      return;
    }

    const created = await createAuthUserWithProfile({
      email,
      password: `Letras@${Date.now().toString(36)}${deviceId.replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "mobile"}`,
      fullName: displayName,
      role: "alfabetizando",
    });

    const updated = await updateProfileRecord({
      profileId: created.id,
      role: "alfabetizando",
      metadata: {
        ...(created.metadata && typeof created.metadata === "object" ? created.metadata : {}),
        email,
        mobileDeviceId: deviceId,
        source: "mobile_autoprovision",
      },
    });

    res.status(201).json(toCanonicalLearnerProfile(updated));
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

// Busca alfabetizando por CPF/passaporte ou telefone — usado pelo app mobile
// no fluxo de aprendiz retornante (LearnerCpfLoginView).
cadastrosRouter.get("/alfabetizandos/buscar", async (req, res) => {
  try {
    const cpfOrPassport = String(req.query.cpfOrPassport ?? "").trim();
    const phoneDigits = String(req.query.phoneDigits ?? "").trim();

    if (!cpfOrPassport && !phoneDigits) {
      return res.status(400).json({ message: "Forneça cpfOrPassport ou phoneDigits para buscar." });
    }

    const students = await getProfiles({ role: "alfabetizando" });

    const found = students.find((s) => {
      if (cpfOrPassport) {
        const profileCpf = String(s.cpf ?? "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const searchCpf = cpfOrPassport.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (profileCpf && profileCpf === searchCpf) return true;
      }
      if (phoneDigits) {
        const profilePhone = String(s.phone ?? "").replace(/\D/g, "");
        const searchPhone = phoneDigits.replace(/\D/g, "");
        if (profilePhone && profilePhone === searchPhone) return true;
      }
      return false;
    });

    if (!found) {
      return res.status(404).json({ message: "Cadastro não encontrado. Verifique os dados ou entre em contato com seu educador." });
    }

    // Resolve o alfabetizador que cadastrou o aluno (RN084) para habilitar o
    // fluxo de vínculo no mobile (RN101): sem isto, o app não sabe a quem pedir
    // vínculo e acabava liberando acesso direto indevidamente.
    let educator = null;
    const registrarId = found.metadata?.educatorId ?? null;
    if (registrarId) {
      try {
        const tutors = await getProfiles({ role: "tutor" });
        const tutor = tutors.find((t) => t.id === registrarId);
        educator = { id: registrarId, name: tutor?.full_name ?? "Seu alfabetizador" };
      } catch {
        educator = { id: registrarId, name: "Seu alfabetizador" };
      }
    }

    return res.json({
      id: found.id,
      displayName: found.full_name,
      cpfOrPassport: found.cpf ?? null,
      phoneDigits: found.phone ?? null,
      educator,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.get("/alfabetizandos/:id", async (req, res) => {
  try {
    const studentId = String(req.params.id ?? "").trim();
    if (!studentId) {
      res.status(400).json({ message: "ID invalido." });
      return;
    }

    const students = await getProfiles({ ids: [studentId] });
    const student = students[0];
    if (!student) {
      res.status(404).json({ message: "Alfabetizando nao encontrado." });
      return;
    }

    const links = await getTutorStudentLinks({ studentIds: [studentId] });
    const tutors = await getProfiles({ role: "tutor" });
    const tutorById = mapById(tutors);
    const progress = await getActivityProgress({ studentIds: [studentId] });
    const [supportRequests, notifications] = await Promise.all([
      getSupportRequests({ studentIds: [studentId], limit: 100 }),
      getEducatorNotifications({ limit: 200 }),
    ]);
    const activityIds = [...new Set(progress.map((item) => item.activity_id).filter(Boolean))];
    const activities = await getLearningActivities({ ids: activityIds });
    const activityById = new Map(activities.map((item) => [item.id, item]));
    const moduleIds = [...new Set(activities.map((item) => item.module_id).filter(Boolean))];
    const modules = await getLearningModules({ ids: moduleIds });
    const moduleById = new Map(modules.map((item) => [item.id, item]));

    const progressoPorEtapaMap = new Map();
    for (const row of progress) {
      const activity = activityById.get(row.activity_id);
      if (!activity) {
        continue;
      }

      const module = moduleById.get(activity.module_id);
      const stageNumber = module?.stage_number ?? 1;
      const stageKey = `Etapa ${stageNumber}`;
      const current = progressoPorEtapaMap.get(stageKey) ?? {
        etapa: stageKey,
        atividades: 0,
        concluidas: 0,
        progresso: 0,
      };
      current.atividades += 1;
      if (row.status === "concluido" || row.completed_at) {
        current.concluidas += 1;
      }
      progressoPorEtapaMap.set(stageKey, current);
    }

    const progresso = [...progressoPorEtapaMap.values()]
      .map((item) => ({
        ...item,
        progresso: item.atividades > 0 ? Math.round((item.concluidas / item.atividades) * 100) : 0,
      }))
      .sort((a, b) => a.etapa.localeCompare(b.etapa));

    const tentativas = progress
      .map((row) => {
        const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
        return {
          id: row.id,
          atividade: activityById.get(row.activity_id)?.title ?? "Atividade",
          data: formatDateTime(row.last_interacted_at || row.updated_at || row.created_at),
          acertos: row.score ? Number(row.score) : 0,
          erros: Number(metadata.errorsCount ?? row.attempts ?? 0),
          taxa: row.score ? `${Number(row.score).toFixed(0)}%` : "-",
        };
      })
      .sort((a, b) => b.data.localeCompare(a.data));

    const linkHistory = links.map((link) => ({
        id: link.id,
        tipo: `Vinculo ${link.status}`,
        data: formatDateTime(link.updated_at || link.created_at),
        usuario: tutorById.get(link.tutor_id)?.full_name ?? "Sistema",
        obs: link.reason || "Atualizacao de vinculo",
        status: link.status,
        queueType: "vinculo",
        actionable: link.status === "pendente",
      }));

    const supportHistory = supportRequests.map((request) => ({
      id: request.id,
      tipo: request.status === "resolvido" ? "Ajuda resolvida" : "Pedido de ajuda",
      data: formatDateTime(request.resolved_at || request.requested_at || request.created_at),
      usuario: request.resolved_by || tutorById.get(request.tutor_id)?.full_name || "Sistema",
      obs: request.response_message || request.resolution_reason || request.message || "Pedido de ajuda registrado",
      status: request.status,
      queueType: "ajuda",
      actionable: request.status === "aberto" || request.status === "em_atendimento",
    }));

    const progressHistory = progress
      .filter((row) => row.status === "travado" || row.metadata?.queueResolution || row.metadata?.lockReason)
      .map((row) => {
        const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
        const resolution = metadata.queueResolution && typeof metadata.queueResolution === "object" ? metadata.queueResolution : null;
        return {
          id: row.id,
          tipo: row.status === "travado" ? "Aluno travado" : "Desbloqueio registrado",
          data: formatDateTime(row.last_interacted_at || row.updated_at || row.created_at),
          usuario: resolution?.resolvedBy || "Sistema",
          obs: resolution?.reason || metadata.lockReason || "Atualizacao de trava/destrava",
          status: row.status,
          queueType: "progresso",
          actionable: row.status === "travado",
        };
      });

    const notificationHistory = notifications
      .filter((notification) => {
        const payload = notification.payload && typeof notification.payload === "object" ? notification.payload : {};
        return payload.studentId === studentId || notification.source_entity_id === studentId;
      })
      .map((notification) => ({
        id: notification.id,
        tipo: `Notificacao ${notification.read_at ? "lida" : "aberta"}`,
        data: formatDateTime(notification.created_at),
        usuario: notification.recipient_role || "Sistema",
        obs: notification.title || notification.body || notification.type,
        status: notification.read_at ? "lida" : "aberta",
        queueType: "notificacao",
        actionable: false,
      }));

    const historico = [...supportHistory, ...progressHistory, ...linkHistory, ...notificationHistory]
      .sort((a, b) => b.data.localeCompare(a.data));
    const submissoes = extractSubmissionsFromProgress(progress, activityById);

    const activeLink = links.find((item) => item.status === "confirmado");
    const tutor = activeLink ? tutorById.get(activeLink.tutor_id) : null;

    const status = computeStudentStatus(progress);
    const stageNumbers = progress
      .map((row) => {
        const activity = activityById.get(row.activity_id);
        if (!activity) {
          return null;
        }
        const module = moduleById.get(activity.module_id);
        return module?.stage_number ?? null;
      })
      .filter((value) => typeof value === "number");

    const maxStage = stageNumbers.length > 0 ? Math.max(...stageNumbers) : 1;

    res.json({
      id: student.id,
      nome: student.full_name,
      email: extractProfileEmail(student),
      telefone: student.phone ?? "",
      cpf: student.cpf ?? "",
      tutor: tutor?.full_name ?? "Sem tutor",
      grupo:
        typeof student.metadata?.group_name === "string" && student.metadata.group_name.length > 0
          ? student.metadata.group_name
          : "Sem grupo",
      etapa: computeStageLabel(maxStage),
      status,
      progresso,
      tentativas,
      submissoes,
      historico,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.post("/alfabetizandos", async (req, res) => {
  try {
    // Aceita tanto o formato do painel web (nome/email/password) quanto
    // o formato do app mobile (displayName/cpfOrPassport/phoneDigits).
    const fullName = String(
      req.body?.fullName ?? req.body?.displayName ?? req.body?.nome ?? ""
    ).trim();

    const cpf = String(
      req.body?.cpf ?? req.body?.cpfOrPassport ?? ""
    ).trim();

    const phone = String(
      req.body?.phone ?? req.body?.phoneDigits ?? req.body?.telefone ?? ""
    ).trim();

    let email = String(req.body?.email ?? "").trim().toLowerCase();
    let password = String(req.body?.password ?? "").trim();

    // Se email/senha não vieram (formato mobile), auto-gera a partir do CPF/telefone.
    if (!email || !email.includes("@")) {
      const identifier = (cpf || phone)
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(-16)
        .toLowerCase() || Date.now().toString(36);
      email = `aluno.${identifier}@mobile.letras.local`;
    }

    if (password.length < 6) {
      const identifier = (cpf || phone)
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(-16) || Date.now().toString(36);
      password = `Letras@${identifier}`;
    }

    const data = await createAuthUserWithProfile({
      email,
      password,
      fullName,
      phone: phone || undefined,
      cpf: cpf || undefined,
      role: "alfabetizando",
    });

    // Se vier educatorId (fluxo mobile do educador), cria o vínculo automaticamente.
    const rawEducatorId = String(req.body?.educatorId ?? "").trim();
    if (rawEducatorId && data?.id) {
      try {
        const { supabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase.js");
        const client = isSupabaseConfigured && supabaseAdmin ? supabaseAdmin : null;
        const supabaseTutorId = client
          ? (await resolveSupabaseTutorId(rawEducatorId, req.headers.authorization, client)) ?? rawEducatorId
          : rawEducatorId;

        if (UUID_PATTERN.test(supabaseTutorId)) {
          await createTutorStudentLink({
            tutorId: supabaseTutorId,
            studentId: data.id,
            status: "confirmado",
            requestedBy: supabaseTutorId,
          });
        }
      } catch {
        // Vínculo falhou mas o cadastro foi criado — não bloqueia o retorno.
      }
    }

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.patch("/alfabetizandos/:id", async (req, res) => {
  try {
    const data = await updateProfileRecord({
      profileId: req.params.id,
      role: "alfabetizando",
      fullName: req.body?.fullName ?? req.body?.nome,
      email: req.body?.email,
      phone: req.body?.phone,
      cpf: req.body?.cpf,
      metadata: req.body?.metadata,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.delete("/alfabetizandos/:id", async (req, res) => {
  try {
    const data = await deleteProfileRecord({
      profileId: req.params.id,
      role: "alfabetizando",
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.get("/vinculos", async (_req, res) => {
  try {
    const links = await getTutorStudentLinks();
    const profileIds = [...new Set(links.flatMap((item) => [item.tutor_id, item.student_id]))];
    const profiles = await getProfiles({ ids: profileIds });
    const profileById = mapById(profiles);

    const items = links.map((link) => {
      const student = profileById.get(link.student_id);
      const tutor = profileById.get(link.tutor_id);
      return {
        id: link.id,
        status: link.status,
        data: formatDateTime(link.requested_at || link.created_at),
        motivo: link.reason ?? "",
        aluno: student?.full_name ?? "Sem nome",
        cpf: student?.cpf ?? "",
        telefone: student?.phone ?? "",
        tutor: tutor?.full_name ?? "Sem tutor",
        tutorId: link.tutor_id,
        studentId: link.student_id,
      };
    });

    const response = {
      pendentes: items.filter((item) => item.status === "pendente"),
      confirmados: items.filter((item) => item.status === "confirmado"),
      negados: items.filter((item) => item.status === "negado"),
    };

    res.json(response);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.post("/vinculos", async (req, res) => {
  try {
    const data = await createTutorStudentLink({
      tutorId: req.body?.tutorId ?? req.body?.alfabetizadorId,
      studentId: req.body?.studentId ?? req.body?.alfabetizandoId,
      status: req.body?.status ?? "pendente",
      requestedBy: req.body?.requestedBy,
      reason: req.body?.reason,
    });

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.patch("/vinculos/:id", async (req, res) => {
  try {
    const data = await updateTutorStudentLink(req.params.id, {
      status: req.body?.status,
      reason: req.body?.reason,
      decidedBy: req.body?.decidedBy,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});
