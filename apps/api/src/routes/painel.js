import { Router } from "express";
import multer from "multer";
import {
  createContentAsset,
  deleteContentAsset,
  createLearningActivity,
  createLearningModule,
  createLearningTheme,
  deleteLearningActivity,
  deleteLearningModule,
  deleteLearningTheme,
  createMobileScreenBlueprint,
  daysSince,
  formatDateTime,
  formatRelativeTime,
  getActivityProgress,
  getContentAssets,
  getLearningActivities,
  getLearningModules,
  getPanelLearningActivities,
  getPanelLearningModules,
  getPanelLearningThemes,
  getMobileScreenBlueprints,
  getLearningThemes,
  getPanelSystemSettings,
  getProfiles,
  getSyncEvents,
  getTutorStudentLinks,
  importContentAssetsFromDirectory,
  importMobileBlueprintsFromManifest,
  resetCmsContent,
  updateActivityProgressStatus,
  updateMobileScreenBlueprint,
  updatePanelSystemSettings,
  updateLearningActivity,
  updateLearningModule,
  updateLearningTheme,
  updateTutorStudentLink,
  toHttpError,
  updateContentAsset,
  uploadContentAssetFile,
} from "../services/letrasDataService.js";
import { env } from "../config/env.js";

export const painelRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(1, Number(env.uploadMaxFileMb || 200)) * 1024 * 1024,
  },
});

function parseMetadataInput(rawValue) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === "object" && !Array.isArray(rawValue)) {
    return rawValue;
  }

  const asText = String(rawValue).trim();
  if (!asText) {
    return {};
  }

  try {
    const parsed = JSON.parse(asText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return { observacoes: asText };
  } catch {
    return { observacoes: asText };
  }
}

function decodeMultipartFilename(name) {
  if (typeof name !== "string" || name.length === 0) return name;
  // Multer/busboy entrega o filename do Content-Disposition como Latin-1 quando
  // o cliente nao usa filename*=UTF-8''... — re-decodifica como UTF-8 quando os
  // bytes formam uma sequencia UTF-8 valida.
  try {
    const buffer = Buffer.from(name, "latin1");
    const utf8 = buffer.toString("utf8");
    // Se o roundtrip via UTF-8 perdeu caracteres (replacement U+FFFD),
    // mantem o nome original.
    if (utf8.includes("�")) return name;
    return utf8;
  } catch {
    return name;
  }
}

function parseMultipartFile(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      if (req.file && typeof req.file.originalname === "string") {
        req.file.originalname = decodeMultipartFilename(req.file.originalname);
      }
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res
        .status(413)
        .json({ message: `Arquivo excede o limite de ${env.uploadMaxFileMb}MB.` });
      return;
    }

    res.status(400).json({ message: error.message || "Falha ao processar upload." });
  });
}

function mapById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function toStageLabel(stageNumber) {
  const normalized = Number(stageNumber);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return "Etapa 1";
  }
  return `Etapa ${Math.floor(normalized)}`;
}

function getStudentLastInteraction(progressRows) {
  return progressRows
    .map((row) => row.last_interacted_at || row.completed_at || row.updated_at || row.created_at)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function getStudentStatus(progressRows) {
  if (progressRows.some((row) => row.status === "travado")) {
    return "travado";
  }

  const lastActivityAt = getStudentLastInteraction(progressRows);
  return daysSince(lastActivityAt) > 7 ? "inativo" : "ativo";
}

function buildStageMap(activities, modules) {
  const activityById = mapById(activities);
  const moduleById = mapById(modules);

  return {
    activityById,
    moduleById,
    getStageNumberByActivityId(activityId) {
      const activity = activityById.get(activityId);
      if (!activity) {
        return 1;
      }
      const module = moduleById.get(activity.module_id);
      return module?.stage_number ?? 1;
    },
  };
}

function groupProgressByStudent(progressRows) {
  const map = new Map();
  for (const row of progressRows) {
    const current = map.get(row.student_id) ?? [];
    current.push(row);
    map.set(row.student_id, current);
  }
  return map;
}

painelRouter.get("/dashboard/admin", async (_req, res) => {
  try {
    const [students, tutors, links, progress, activities, modules] = await Promise.all([
      getProfiles({ role: "alfabetizando" }),
      getProfiles({ role: "tutor" }),
      getTutorStudentLinks(),
      getActivityProgress(),
      getLearningActivities(),
      getLearningModules(),
    ]);

    const progressByStudent = groupProgressByStudent(progress);
    const lockedStudents = students.filter((student) => {
      const studentRows = progressByStudent.get(student.id) ?? [];
      return studentRows.some((row) => row.status === "travado");
    });
    const inactiveStudents = students.filter((student) => {
      const studentRows = progressByStudent.get(student.id) ?? [];
      return daysSince(getStudentLastInteraction(studentRows)) > 7;
    });
    const activeToday = students.filter((student) => {
      const studentRows = progressByStudent.get(student.id) ?? [];
      return daysSince(getStudentLastInteraction(studentRows)) <= 0;
    });

    const scores = progress
      .map((row) => Number(row.score))
      .filter((value) => Number.isFinite(value));
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const responseTimesInHours = links
      .filter((link) => link.decided_at && link.requested_at)
      .map((link) => {
        const openedAt = new Date(link.requested_at).getTime();
        const decidedAt = new Date(link.decided_at).getTime();
        return (decidedAt - openedAt) / (1000 * 60 * 60);
      })
      .filter((value) => Number.isFinite(value) && value >= 0);
    const avgTutorResponseHours =
      responseTimesInHours.length > 0
        ? Number(
            (
              responseTimesInHours.reduce((a, b) => a + b, 0) /
              responseTimesInHours.length
            ).toFixed(2),
          )
        : 0;

    const stageMap = buildStageMap(activities, modules);
    const progressCompletions = progress.filter((row) => row.completed_at);
    const chartData = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const dayKey = date.toISOString().slice(0, 10);
      const value = progressCompletions.filter((row) => String(row.completed_at).startsWith(dayKey)).length;

      return {
        dia: date.toLocaleDateString("pt-BR", { weekday: "short" }),
        progresso: value,
      };
    });

    const alerts = lockedStudents.slice(0, 10).map((student) => {
      const rows = progressByStudent.get(student.id) ?? [];
      const stage = toStageLabel(
        rows.reduce((max, row) => Math.max(max, stageMap.getStageNumberByActivityId(row.activity_id)), 1),
      );
      return {
        id: student.id,
        tipo: "Aluno travado",
        aluno: student.full_name,
        prioridade: "Alta",
        etapa: stage,
      };
    });

    res.json({
      kpis: {
        totalAlfabetizandos: students.length,
        ativosHoje: activeToday.length,
        travados: lockedStudents.length,
        inativos7d: inactiveStudents.length,
        mediaAcerto: Number(averageScore.toFixed(2)),
        tempoMedioRespostaHoras: avgTutorResponseHours,
        totalTutores: tutors.length,
      },
      chartData,
      alertas: alerts,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.get("/dashboard/tutor", async (req, res) => {
  try {
    const tutorId = String(req.query.tutorId ?? "").trim();
    if (!tutorId) {
      res.status(400).json({ message: "Parametro tutorId e obrigatorio." });
      return;
    }

    const [links, students, progress, activities, modules] = await Promise.all([
      getTutorStudentLinks({ tutorIds: [tutorId] }),
      getProfiles({ role: "alfabetizando" }),
      getActivityProgress(),
      getLearningActivities(),
      getLearningModules(),
    ]);

    const confirmedLinks = links.filter((link) => link.status === "confirmado");
    const pendingLinks = links.filter((link) => link.status === "pendente");
    const studentIds = [...new Set(confirmedLinks.map((link) => link.student_id))];
    const studentById = mapById(students);
    const progressByStudent = groupProgressByStudent(progress.filter((row) => studentIds.includes(row.student_id)));
    const stageMap = buildStageMap(activities, modules);

    const activeToday = studentIds.filter((studentId) => {
      const rows = progressByStudent.get(studentId) ?? [];
      return daysSince(getStudentLastInteraction(rows)) <= 0;
    });
    const lockedStudents = studentIds.filter((studentId) => {
      const rows = progressByStudent.get(studentId) ?? [];
      return rows.some((row) => row.status === "travado");
    });

    const pedidosRecentes = [
      ...pendingLinks.map((link) => ({
        id: link.id,
        aluno: studentById.get(link.student_id)?.full_name ?? "Sem nome",
        tipo: "Vinculo pendente",
        tempo: formatRelativeTime(link.requested_at || link.created_at),
        prioridade: "alta",
      })),
      ...lockedStudents.map((studentId) => {
        const rows = progressByStudent.get(studentId) ?? [];
        const latestRow = rows.sort(
          (a, b) =>
            new Date(b.last_interacted_at || b.updated_at || b.created_at).getTime() -
            new Date(a.last_interacted_at || a.updated_at || a.created_at).getTime(),
        )[0];
        return {
          id: `lock-${studentId}`,
          aluno: studentById.get(studentId)?.full_name ?? "Sem nome",
          tipo: "Aluno travado",
          tempo: formatRelativeTime(latestRow?.last_interacted_at || latestRow?.updated_at),
          prioridade: "alta",
        };
      }),
    ].slice(0, 10);

    const alunosEvoluindo = studentIds
      .map((studentId) => {
        const rows = progressByStudent.get(studentId) ?? [];
        const totalScore = rows
          .map((row) => Number(row.score))
          .filter((value) => Number.isFinite(value))
          .reduce((a, b) => a + b, 0);

        const maxStage = rows.reduce(
          (max, row) => Math.max(max, stageMap.getStageNumberByActivityId(row.activity_id)),
          1,
        );
        return {
          id: studentId,
          aluno: studentById.get(studentId)?.full_name ?? "Sem nome",
          evolucao: `+${Math.round(totalScore)} pts`,
          etapa: toStageLabel(maxStage),
          totalScore,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentRows = progress.filter((row) => {
      if (!studentIds.includes(row.student_id)) {
        return false;
      }
      const when = new Date(row.updated_at || row.created_at);
      return when >= oneWeekAgo;
    });

    const responseTimesInHours = links
      .filter((link) => link.decided_at && link.requested_at)
      .map((link) => {
        const openedAt = new Date(link.requested_at).getTime();
        const decidedAt = new Date(link.decided_at).getTime();
        return (decidedAt - openedAt) / (1000 * 60 * 60);
      })
      .filter((value) => Number.isFinite(value) && value >= 0);

    const avgTutorResponseHours =
      responseTimesInHours.length > 0
        ? Number(
            (
              responseTimesInHours.reduce((accumulator, value) => accumulator + value, 0) /
              responseTimesInHours.length
            ).toFixed(2),
          )
        : 0;

    res.json({
      kpis: {
        meusAlunosTotal: studentIds.length,
        ativosHoje: activeToday.length,
        travados: lockedStudents.length,
        pedidosAbertos: pedidosRecentes.length,
      },
      pedidosRecentes,
      alunosEvoluindo,
      resumoSemanal: {
        pedidosAtendidos: links.filter((link) => link.status === "confirmado" || link.status === "negado").length,
        tempoMedioRespostaHoras: avgTutorResponseHours,
        alunosDesbloqueados: recentRows.filter((row) => row.status === "travado").length,
        submissoesAprovadas: recentRows.filter((row) => row.status === "concluido").length,
      },
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.get("/conteudo", async (req, res) => {
  try {
    const scope = String(req.query?.scope || "all").trim().toLowerCase();
    const cmsOnly = scope === "cms";
    const [themes, modules, activities, assets, blueprints] = await Promise.all([
      cmsOnly ? getPanelLearningThemes() : getLearningThemes(),
      cmsOnly ? getPanelLearningModules() : getLearningModules(),
      cmsOnly ? getPanelLearningActivities() : getLearningActivities(),
      getContentAssets(),
      getMobileScreenBlueprints(),
    ]);

    res.json({
      themes,
      modules,
      activities,
      assets,
      blueprints,
      totals: {
        themes: themes.length,
        modules: modules.length,
        activities: activities.length,
        assets: assets.length,
        blueprints: blueprints.length,
      },
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.post("/conteudo/temas", async (req, res) => {
  try {
    const data = await createLearningTheme({
      title: req.body?.title,
      description: req.body?.description,
      slug: req.body?.slug,
      sortOrder: req.body?.sortOrder,
      isActive: req.body?.isActive,
    });

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.patch("/conteudo/temas/:id", async (req, res) => {
  try {
    const data = await updateLearningTheme({
      themeId: req.params.id,
      title: req.body?.title,
      description: req.body?.description,
      slug: req.body?.slug,
      sortOrder: req.body?.sortOrder,
      isActive: req.body?.isActive,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.delete("/conteudo/temas/:id", async (req, res) => {
  try {
    const data = await deleteLearningTheme({
      themeId: req.params.id,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.post("/conteudo/modulos", async (req, res) => {
  try {
    const data = await createLearningModule({
      themeId: req.body?.themeId,
      title: req.body?.title,
      description: req.body?.description,
      stageNumber: req.body?.stageNumber,
      sortOrder: req.body?.sortOrder,
      isActive: req.body?.isActive,
    });

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.patch("/conteudo/modulos/:id", async (req, res) => {
  try {
    const data = await updateLearningModule({
      moduleId: req.params.id,
      themeId: req.body?.themeId,
      title: req.body?.title,
      description: req.body?.description,
      stageNumber: req.body?.stageNumber,
      sortOrder: req.body?.sortOrder,
      isActive: req.body?.isActive,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.delete("/conteudo/modulos/:id", async (req, res) => {
  try {
    const data = await deleteLearningModule({
      moduleId: req.params.id,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.post("/conteudo/atividades", async (req, res) => {
  try {
    const data = await createLearningActivity({
      moduleId: req.body?.moduleId,
      type: req.body?.type,
      title: req.body?.title,
      instructions: req.body?.instructions,
      sortOrder: req.body?.sortOrder,
      isPublished: req.body?.isPublished,
    });

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.patch("/conteudo/atividades/:id", async (req, res) => {
  try {
    const data = await updateLearningActivity({
      activityId: req.params.id,
      moduleId: req.body?.moduleId,
      type: req.body?.type,
      title: req.body?.title,
      instructions: req.body?.instructions,
      sortOrder: req.body?.sortOrder,
      isPublished: req.body?.isPublished,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.delete("/conteudo/atividades/:id", async (req, res) => {
  try {
    const data = await deleteLearningActivity({
      activityId: req.params.id,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.post("/conteudo/reset", async (req, res) => {
  try {
    const data = await resetCmsContent({
      includeBlueprints: Boolean(req.body?.includeBlueprints),
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.post("/conteudo/assets", async (req, res) => {
  try {
    const data = await createContentAsset({
      activityId: req.body?.activityId,
      kind: req.body?.kind,
      storagePath: req.body?.storagePath,
      mimeType: req.body?.mimeType,
      status: req.body?.status,
      metadata: req.body?.metadata,
    });

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.post("/conteudo/assets/upload", parseMultipartFile, async (req, res) => {
  try {
    const metadata = parseMetadataInput(req.body?.metadata ?? req.body?.metadataText);
    const data = await uploadContentAssetFile({
      fileBuffer: req.file?.buffer,
      originalName: req.file?.originalname,
      mimeType: req.file?.mimetype,
      bytes: Number(req.file?.size ?? 0),
      activityId: req.body?.activityId,
      kind: req.body?.kind,
      status: req.body?.status,
      metadata,
      title: req.body?.title,
      createdByEducatorId: req.body?.createdByEducatorId,
      folder: req.body?.folder,
    });

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.post("/conteudo/assets/import-directory", async (req, res) => {
  try {
    const data = await importContentAssetsFromDirectory({
      directoryPath: req.body?.directoryPath,
      activityId: req.body?.activityId,
      status: req.body?.status,
      folder: req.body?.folder,
      metadata: req.body?.metadata,
    });

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.post("/conteudo/blueprints", async (req, res) => {
  try {
    const data = await createMobileScreenBlueprint({
      slug: req.body?.slug,
      title: req.body?.title,
      svgPath: req.body?.svgPath,
      stageTag: req.body?.stageTag,
      moduleCode: req.body?.moduleCode,
      isActive: req.body?.isActive,
    });

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.patch("/conteudo/assets/:id", async (req, res) => {
  try {
    const data = await updateContentAsset({
      assetId: req.params.id,
      activityId: req.body?.activityId,
      kind: req.body?.kind,
      storagePath: req.body?.storagePath,
      mimeType: req.body?.mimeType,
      status: req.body?.status,
      metadata: req.body?.metadata,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.delete("/conteudo/assets/:id", async (req, res) => {
  try {
    const data = await deleteContentAsset({
      assetId: req.params.id,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.patch("/conteudo/blueprints/:id", async (req, res) => {
  try {
    const data = await updateMobileScreenBlueprint({
      blueprintId: req.params.id,
      slug: req.body?.slug,
      title: req.body?.title,
      svgPath: req.body?.svgPath,
      stageTag: req.body?.stageTag,
      moduleCode: req.body?.moduleCode,
      isActive: req.body?.isActive,
    });

    res.json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.post("/conteudo/blueprints/import-manifest", async (req, res) => {
  try {
    const data = await importMobileBlueprintsFromManifest({
      manifestPath: req.body?.manifestPath,
    });

    res.status(201).json(data);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.get("/fila", async (_req, res) => {
  try {
    const [links, students, progress, activities, modules] = await Promise.all([
      getTutorStudentLinks(),
      getProfiles({ role: "alfabetizando" }),
      getActivityProgress(),
      getLearningActivities(),
      getLearningModules(),
    ]);

    const studentById = mapById(students);
    const activityById = mapById(activities);
    const moduleById = mapById(modules);

    const pendingLinks = links
      .filter((link) => link.status === "pendente")
      .map((link) => ({
        id: link.id,
        queueType: "vinculo",
        tipo: "Vinculo pendente",
        aluno: studentById.get(link.student_id)?.full_name ?? "Sem nome",
        etapa: "Cadastro",
        atividade: "Confirmacao de vinculo",
        status: link.status,
        tempo: formatRelativeTime(link.requested_at || link.created_at),
        prioridade: "alta",
      }));

    const lockedProgress = progress
      .filter((row) => row.status === "travado")
      .map((row) => {
        const activity = activityById.get(row.activity_id);
        const module = activity ? moduleById.get(activity.module_id) : null;
        return {
          id: row.id,
          queueType: "progresso",
          tipo: "Aluno travado",
          aluno: studentById.get(row.student_id)?.full_name ?? "Sem nome",
          etapa: toStageLabel(module?.stage_number ?? 1),
          atividade: activity?.title ?? "Atividade",
          status: row.status,
          tempo: formatRelativeTime(row.last_interacted_at || row.updated_at || row.created_at),
          prioridade: "alta",
        };
      });

    res.json({
      total: pendingLinks.length + lockedProgress.length,
      items: [...pendingLinks, ...lockedProgress].slice(0, 200),
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.patch("/fila/:id", async (req, res) => {
  try {
    const queueItemId = String(req.params.id ?? "").trim();
    if (!queueItemId) {
      res.status(400).json({ message: "ID do item da fila e obrigatorio." });
      return;
    }

    const action = String(req.body?.action ?? "").trim().toLowerCase();
    const reason = req.body?.reason;
    const decidedBy = req.body?.decidedBy;

    if (action === "confirmar" || action === "aprovar") {
      const data = await updateTutorStudentLink(queueItemId, {
        status: "confirmado",
        reason,
        decidedBy,
      });
      res.json({
        id: queueItemId,
        queueType: "vinculo",
        action: "confirmar",
        result: data,
      });
      return;
    }

    if (action === "negar" || action === "recusar") {
      const data = await updateTutorStudentLink(queueItemId, {
        status: "negado",
        reason,
        decidedBy,
      });
      res.json({
        id: queueItemId,
        queueType: "vinculo",
        action: "negar",
        result: data,
      });
      return;
    }

    if (action === "desbloquear" || action === "liberar") {
      const data = await updateActivityProgressStatus({
        progressId: queueItemId,
        status: "em_andamento",
        metadataPatch: {
          queueResolution: {
            action: "desbloquear",
            reason: typeof reason === "string" ? reason : null,
            resolvedBy: typeof decidedBy === "string" ? decidedBy : null,
            resolvedAt: new Date().toISOString(),
          },
        },
      });
      res.json({
        id: queueItemId,
        queueType: "progresso",
        action: "desbloquear",
        result: data,
      });
      return;
    }

    res.status(400).json({
      message: "Acao invalida. Use confirmar, negar ou desbloquear.",
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.get("/ranking", async (_req, res) => {
  try {
    const [students, tutors, links, progress, activities, modules] = await Promise.all([
      getProfiles({ role: "alfabetizando" }),
      getProfiles({ role: "tutor" }),
      getTutorStudentLinks({ statuses: ["confirmado"] }),
      getActivityProgress(),
      getLearningActivities(),
      getLearningModules(),
    ]);

    const studentById = mapById(students);
    const tutorById = mapById(tutors);
    const stageMap = buildStageMap(activities, modules);
    const progressByStudent = groupProgressByStudent(progress);

    const rankingAlunos = students
      .map((student) => {
        const rows = progressByStudent.get(student.id) ?? [];
        const points = rows
          .map((row) => Number(row.score))
          .filter((value) => Number.isFinite(value))
          .reduce((a, b) => a + b, 0);
        const maxStage = rows.reduce(
          (max, row) => Math.max(max, stageMap.getStageNumberByActivityId(row.activity_id)),
          1,
        );

        return {
          id: student.id,
          nome: student.full_name,
          grupo:
            typeof student.metadata?.group_name === "string" && student.metadata.group_name.length > 0
              ? student.metadata.group_name
              : "Sem grupo",
          pontos: Math.round(points),
          etapa: toStageLabel(maxStage),
        };
      })
      .sort((a, b) => b.pontos - a.pontos)
      .map((item, index) => ({
        pos: index + 1,
        ...item,
      }));

    const rankingTutores = tutors
      .map((tutor) => {
        const linkedStudentIds = links
          .filter((link) => link.tutor_id === tutor.id)
          .map((link) => link.student_id);
        const uniqueStudentIds = [...new Set(linkedStudentIds)];
        const activeStudentCount = uniqueStudentIds.filter((studentId) => {
          const rows = progressByStudent.get(studentId) ?? [];
          return daysSince(getStudentLastInteraction(rows)) <= 7;
        }).length;
        const tutorPoints = uniqueStudentIds.reduce((acc, studentId) => {
          const rows = progressByStudent.get(studentId) ?? [];
          const score = rows
            .map((row) => Number(row.score))
            .filter((value) => Number.isFinite(value))
            .reduce((a, b) => a + b, 0);
          return acc + score;
        }, 0);

        return {
          id: tutor.id,
          nome: tutor.full_name,
          alunos: uniqueStudentIds.length,
          pontos: Math.round(tutorPoints),
          taxa:
            uniqueStudentIds.length > 0
              ? `${Math.round((activeStudentCount / uniqueStudentIds.length) * 100)}%`
              : "0%",
        };
      })
      .sort((a, b) => b.pontos - a.pontos)
      .map((item, index) => ({
        pos: index + 1,
        ...item,
      }));

    const ledger = progress
      .filter((row) => Number.isFinite(Number(row.score)))
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 50)
      .map((row, index) => ({
        id: row.id,
        data: formatDateTime(row.updated_at || row.created_at),
        descricao: `${studentById.get(row.student_id)?.full_name ?? "Aluno"} - ${
          row.status === "concluido" ? "Atividade concluida" : "Atualizacao de progresso"
        }`,
        pontos: Number(row.score) >= 0 ? `+${Number(row.score).toFixed(0)}` : `${Number(row.score).toFixed(0)}`,
        saldo: Number(row.score).toFixed(0),
        ordem: index + 1,
      }));

    res.json({
      rankingAlunos,
      rankingTutores,
      extrato: ledger,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.get("/relatorios/inatividade", async (_req, res) => {
  try {
    const [students, tutors, links, progress, activities, modules] = await Promise.all([
      getProfiles({ role: "alfabetizando" }),
      getProfiles({ role: "tutor" }),
      getTutorStudentLinks({ statuses: ["confirmado"] }),
      getActivityProgress(),
      getLearningActivities(),
      getLearningModules(),
    ]);

    const tutorById = mapById(tutors);
    const progressByStudent = groupProgressByStudent(progress);
    const stageMap = buildStageMap(activities, modules);

    const items = students
      .map((student) => {
        const rows = progressByStudent.get(student.id) ?? [];
        const last = getStudentLastInteraction(rows);
        const diasInativo = daysSince(last);
        const maxStage = rows.reduce(
          (max, row) => Math.max(max, stageMap.getStageNumberByActivityId(row.activity_id)),
          1,
        );
        const link = links.find((item) => item.student_id === student.id);
        const tutor = link ? tutorById.get(link.tutor_id) : null;

        return {
          id: student.id,
          aluno: student.full_name,
          tutor: tutor?.full_name ?? "Sem tutor",
          ultimoAcesso: formatDateTime(last),
          diasInativo: Number.isFinite(diasInativo) ? diasInativo : 999,
          etapa: toStageLabel(maxStage),
        };
      })
      .filter((item) => item.diasInativo >= 3)
      .sort((a, b) => b.diasInativo - a.diasInativo);

    res.json({
      resumo: {
        inatividade: items.length,
        evolucaoPorEtapa: students.length,
        taxaAcerto: progress.filter((row) => Number.isFinite(Number(row.score))).length,
        tempoResposta: links.filter((link) => link.decided_at).length,
      },
      items,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.get("/grupos", async (_req, res) => {
  try {
    const [students, links, progress, activities, modules] = await Promise.all([
      getProfiles({ role: "alfabetizando" }),
      getTutorStudentLinks({ statuses: ["confirmado"] }),
      getActivityProgress(),
      getLearningActivities(),
      getLearningModules(),
    ]);

    const tutorProfiles = await getProfiles({ role: "tutor" });
    const tutorById = mapById(tutorProfiles);
    const progressByStudent = groupProgressByStudent(progress);
    const stageMap = buildStageMap(activities, modules);

    const groups = new Map();
    for (const student of students) {
      const groupName =
        typeof student.metadata?.group_name === "string" && student.metadata.group_name.length > 0
          ? student.metadata.group_name
          : "Sem grupo";
      const current = groups.get(groupName) ?? {
        id: groupName,
        nome: groupName,
        membros: 0,
        stageAccumulator: 0,
        tutorVotes: {},
      };
      current.membros += 1;

      const rows = progressByStudent.get(student.id) ?? [];
      const stage = rows.reduce(
        (max, row) => Math.max(max, stageMap.getStageNumberByActivityId(row.activity_id)),
        1,
      );
      current.stageAccumulator += stage;

      const link = links.find((item) => item.student_id === student.id);
      if (link) {
        current.tutorVotes[link.tutor_id] = (current.tutorVotes[link.tutor_id] ?? 0) + 1;
      }

      groups.set(groupName, current);
    }

    const items = [...groups.values()]
      .map((group) => {
        const topTutorId = Object.entries(group.tutorVotes).sort((a, b) => b[1] - a[1])[0]?.[0];
        const avgStage = group.membros > 0 ? group.stageAccumulator / group.membros : 1;
        return {
          id: group.id,
          nome: group.nome,
          membros: group.membros,
          etapaMedia: toStageLabel(Math.round(avgStage)),
          tutor: topTutorId ? tutorById.get(topTutorId)?.full_name ?? "Sem tutor" : "Sem tutor",
          status: avgStage >= 3 ? "avancado" : "normal",
        };
      })
      .sort((a, b) => b.membros - a.membros);

    res.json({
      total: items.length,
      items,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.get("/eventos", async (_req, res) => {
  try {
    const events = await getSyncEvents({ limit: 100 });
    res.json({
      total: events.length,
      items: events,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.get("/configuracoes/sistema", async (_req, res) => {
  try {
    const settings = await getPanelSystemSettings();
    res.json(settings);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});

painelRouter.patch("/configuracoes/sistema", async (req, res) => {
  try {
    const settings = await updatePanelSystemSettings({
      errorBlockLimit: req.body?.errorBlockLimit,
      inactivityDays: req.body?.inactivityDays,
      updatedBy: req.body?.updatedBy,
    });
    res.json(settings);
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.status).json({ message: httpError.message });
  }
});
