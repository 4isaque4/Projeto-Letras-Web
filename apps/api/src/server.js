import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { env } from "./config/env.js";
import { installDashboardRealtimeServer } from "./realtime/dashboardRealtime.js";
import { authRouter } from "./routes/auth.js";
import { cadastrosRouter } from "./routes/cadastros.js";
import { healthRouter } from "./routes/health.js";
import { learnersRouter } from "./routes/learners.js";
import { learnerActivitiesRouter } from "./routes/learnerActivities.js";
import { painelRouter } from "./routes/painel.js";
import { referenceRouter } from "./routes/reference.js";
import { sessionsRouter } from "./routes/sessions.js";
import { getEducatorScoreSummary, getPanelLearningThemes, toHttpError } from "./services/letrasDataService.js";
import { supabaseAdmin } from "./lib/supabase.js";
import { startScoringSweep } from "./jobs/scoringSweep.js";

const app = express();
const allowAnyOrigin = env.corsOrigins.includes("*");


function isPrivateNetworkHost(hostname) {
  if (!hostname) {
    return false;
  }

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function isDevLocalOrigin(origin) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    return isPrivateNetworkHost(parsed.hostname);
  } catch {
    return false;
  }
}

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      const isAllowedByList = typeof origin === "string" && env.corsOrigins.includes(origin);
      const isAllowedDevLocal =
        env.nodeEnv !== "production" && typeof origin === "string" && isDevLocalOrigin(origin);

      if (!origin || allowAnyOrigin || isAllowedByList || isAllowedDevLocal) {
        callback(null, true);
        return;
      }

      // Keep the API running even when an origin is blocked.
      callback(null, false);
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use(healthRouter);
app.use(`${env.apiPrefix}/auth`, authRouter);
app.use(`${env.apiPrefix}/reference`, referenceRouter);
app.use(`${env.apiPrefix}/cadastros`, cadastrosRouter);
app.use(`${env.apiPrefix}/painel`, painelRouter);
app.use(`${env.apiPrefix}/sessions`, sessionsRouter);
app.use(`${env.apiPrefix}/learners`, learnersRouter);
app.use(`${env.apiPrefix}/learner-activities`, learnerActivitiesRouter);

// GET /api/v1/scoring/me — pontuação do educador para o app mobile
app.get(`${env.apiPrefix}/scoring/me`, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ message: "Supabase nao configurado." });

    // Resolve educator via Bearer token; query param é aceito como fallback de leitura
    // mas deve corresponder ao usuário autenticado
    const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
    let educatorId = String(req.query?.educatorId ?? "").trim();

    if (token) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) return res.status(401).json({ message: "Sessao expirada ou invalida." });
      // Rejeita se o educatorId da query não bate com o token autenticado
      if (educatorId && educatorId !== user.id) {
        return res.status(403).json({ message: "Acesso negado." });
      }
      educatorId = user.id;
    }

    if (!educatorId) return res.status(401).json({ message: "Autenticacao necessaria." });

    // RN085/RN096: pontuação vem do ledger de eventos (educator_score_events);
    // letras da frase "PESSOA QUE TRANSFORMA PESSOA!": 1 grátis + 1 a cada 200.
    const summary = await getEducatorScoreSummary(educatorId);
    const recentEvents = summary.events.slice(0, 20).map((event) => ({
      id: event.id,
      type: event.event_type,
      delta: event.points,
      description: event.payload?.description ?? null,
      createdAt: event.created_at,
    }));

    return res.json({
      totalScore: Math.max(0, summary.totalScore),
      lettersUnlocked: summary.lettersUnlocked,
      phraseLength: 26,
      recentEvents,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const httpError = toHttpError(err);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});

// GET /api/v1/themes — lista temas para o onboarding do educador no mobile.
// Apenas temas ativos do painel (learning_themes): o schema mobile legado tem
// temas próprios que não existem no CMS e quebrariam etapas/stage-status.
app.get(`${env.apiPrefix}/themes`, async (_req, res) => {
  try {
    const themes = await getPanelLearningThemes();
    const mapped = (themes ?? []).filter((t) => t.is_active !== false).map((t) => ({
      id: t.id,
      name: t.title ?? t.slug ?? "",
      description: t.description ?? null,
      createdAt: t.created_at ?? null,
      updatedAt: t.updated_at ?? null,
    }));
    return res.json(mapped);
  } catch (err) {
    const httpError = toHttpError(err);
    return res.status(httpError.status).json({ message: httpError.message });
  }
});



app.get("/", (_req, res) => {
  res.json({
    service: "letras-api",
    apiPrefix: env.apiPrefix,
    endpoints: [
      "/health",
      `${env.apiPrefix}/cadastros/alfabetizadores`,
      `${env.apiPrefix}/cadastros/alfabetizandos`,
      `${env.apiPrefix}/cadastros/vinculos`,
      `${env.apiPrefix}/painel/dashboard/admin`,
      `${env.apiPrefix}/painel/conteudo`,
    ],
  });
});

const httpServer = createServer(app);
installDashboardRealtimeServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(
    `[letras-api] running on http://localhost:${env.port} with prefix ${env.apiPrefix} and realtime /realtime`,
  );
  startScoringSweep();
});
