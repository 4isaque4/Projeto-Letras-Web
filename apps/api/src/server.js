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

// Endpoint temporario: recriar conta tutor Isaque (auth user + profile deletados)
app.post(`${env.apiPrefix}/fix-isaque`, async (_req, res) => {
  try {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./lib/supabase.js");
    if (!isSupabaseConfigured || !supabaseAdmin) return res.status(503).json({ message: "Supabase nao configurado." });

    // Remove qualquer vestigio anterior
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existing = (list?.users ?? []).find((u) => u.email === "isaque@gmail.com");
    if (existing) await supabaseAdmin.auth.admin.deleteUser(existing.id);

    // Recria auth user com o mesmo email e senha
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: "isaque@gmail.com",
      password: "123456",
      email_confirm: true,
      user_metadata: { full_name: "Isaque", role: "tutor" },
    });
    if (error) return res.status(400).json({ message: error.message });

    // Garante profile na tabela
    await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      full_name: "Isaque",
      role: "tutor",
      metadata: { email: "isaque@gmail.com" },
    });

    // Recria vinculos com novo UUID
    const newId = data.user.id;
    const studentIds = [
      "cmpp03mba0005j8y90a7hycfr",
      "cmpp1dm7i000dj86phwbd2mvn",
      "6d3d72e6-e055-46cf-8c60-0b54dc5cc8d7",
      "b8860ca8-0c6f-44f1-a77d-f2039cf09328",
    ];
    const { createTutorStudentLink } = await import("./services/letrasDataService.js");
    for (const sid of studentIds) {
      try { await createTutorStudentLink({ tutorId: newId, studentId: sid, status: "confirmado", requestedBy: newId }); } catch { /* ignora duplicado */ }
    }

    return res.json({ ok: true, newId });
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
