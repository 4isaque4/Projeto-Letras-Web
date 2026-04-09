import { Router } from "express";
import {
  createAuthUserWithProfile,
  createTutorStudentLink,
  daysSince,
  formatDateTime,
  formatRelativeTime,
  getActivityProgress,
  getLearningActivities,
  getLearningModules,
  getProfiles,
  getTutorStudentLinks,
  toHttpError,
  updateTutorStudentLink,
} from "../services/letrasDataService.js";

export const cadastrosRouter = Router();

function mapById(items) {
  return new Map(items.map((item) => [item.id, item]));
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
        email: "",
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

cadastrosRouter.get("/alfabetizandos", async (req, res) => {
  try {
    const tutorId = String(req.query.tutorId ?? "").trim();
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
      .map((row) => ({
        id: row.id,
        atividade: activityById.get(row.activity_id)?.title ?? "Atividade",
        data: formatDateTime(row.last_interacted_at || row.updated_at || row.created_at),
        acertos: row.score ? Number(row.score) : 0,
        erros: row.attempts ?? 0,
        taxa: row.score ? `${Number(row.score).toFixed(0)}%` : "-",
      }))
      .sort((a, b) => b.data.localeCompare(a.data));

    const historico = links
      .map((link) => ({
        id: link.id,
        tipo: `Vinculo ${link.status}`,
        data: formatDateTime(link.updated_at || link.created_at),
        usuario: tutorById.get(link.tutor_id)?.full_name ?? "Sistema",
        obs: link.reason || "Atualizacao de vinculo",
      }))
      .sort((a, b) => b.data.localeCompare(a.data));

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
      tutor: tutor?.full_name ?? "Sem tutor",
      grupo:
        typeof student.metadata?.group_name === "string" && student.metadata.group_name.length > 0
          ? student.metadata.group_name
          : "Sem grupo",
      etapa: computeStageLabel(maxStage),
      status,
      progresso,
      tentativas,
      submissoes: [],
      historico,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

cadastrosRouter.post("/alfabetizandos", async (req, res) => {
  try {
    const data = await createAuthUserWithProfile({
      email: req.body?.email,
      password: req.body?.password,
      fullName: req.body?.fullName ?? req.body?.nome,
      phone: req.body?.phone,
      cpf: req.body?.cpf,
      role: "alfabetizando",
    });

    res.status(201).json(data);
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
