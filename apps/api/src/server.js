import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { env } from "./config/env.js";
import { installDashboardRealtimeServer } from "./realtime/dashboardRealtime.js";
import { authRouter } from "./routes/auth.js";
import { cadastrosRouter } from "./routes/cadastros.js";
import { healthRouter } from "./routes/health.js";
import { painelRouter } from "./routes/painel.js";
import { referenceRouter } from "./routes/reference.js";

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

// Endpoint temporario de setup — remover apos criar admin@gmail.com
app.post(`${env.apiPrefix}/setup-admin`, async (_req, res) => {
  try {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./lib/supabase.js");
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return res.status(503).json({ message: "Supabase nao configurado." });
    }
    const email = "admin@gmail.com";
    const password = "123456";
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existing = (list?.users ?? []).find((u) => u.email === email);
    if (existing) await supabaseAdmin.auth.admin.deleteUser(existing.id);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: "Admin", role: "admin" },
    });
    if (error) return res.status(400).json({ message: error.message });
    await supabaseAdmin.from("profiles").upsert({
      id: data.user.id, full_name: "Admin", role: "admin", metadata: { email },
    });
    return res.json({ ok: true, id: data.user.id });
  } catch (err) {
    return res.status(500).json({ message: String(err.message ?? err) });
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
