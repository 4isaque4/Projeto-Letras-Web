import dotenv from "dotenv";

dotenv.config();

function readNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function readCorsOrigins(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return ["*"];
  }

  const parsed = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (parsed.length === 0) {
    return ["*"];
  }

  return parsed;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: readNumber(process.env.PORT, 8080),
  apiPrefix: process.env.API_PREFIX ?? "/api/v1",
  corsOrigins: readCorsOrigins(process.env.CORS_ORIGIN),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
};
