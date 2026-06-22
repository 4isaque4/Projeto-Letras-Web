import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { env } from "./config/env.js";
import { installDashboardRealtimeServer } from "./realtime/dashboardRealtime.js";
import { authRouter } from "./routes/auth.js";
import { cadastrosRouter } from "./routes/cadastros.js";
import { healthRouter } from "./routes/health.js";
import { learnersRouter } from "./routes/learners.js";
import { painelRouter } from "./routes/painel.js";
import { referenceRouter } from "./routes/reference.js";
import { sessionsRouter } from "./routes/sessions.js";
import { getLearningThemes, toHttpError } from "./services/letrasDataService.js";

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

// GET /api/v1/themes — lista temas para o onboarding do educador no mobile
app.get(`${env.apiPrefix}/themes`, async (_req, res) => {
  try {
    const themes = await getLearningThemes();
    const mapped = (themes ?? []).map((t) => ({
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
});
