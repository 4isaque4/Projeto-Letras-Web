import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { cadastrosRouter } from "./routes/cadastros.js";
import { healthRouter } from "./routes/health.js";
import { painelRouter } from "./routes/painel.js";

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
app.use(`${env.apiPrefix}/cadastros`, cadastrosRouter);
app.use(`${env.apiPrefix}/painel`, painelRouter);

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

app.listen(env.port, () => {
  console.log(
    `[letras-api] running on http://localhost:${env.port} with prefix ${env.apiPrefix}`,
  );
});
