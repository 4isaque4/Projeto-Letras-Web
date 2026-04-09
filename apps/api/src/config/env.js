import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);
const apiProjectRoot = resolve(currentDirPath, "..", "..");
const envFilePath = resolve(apiProjectRoot, ".env");

dotenv.config({ path: envFilePath });

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
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "letras-assets",
  supabaseStoragePublicBaseUrl: process.env.SUPABASE_STORAGE_PUBLIC_BASE_URL ?? "",
  uploadMaxFileMb: readNumber(process.env.UPLOAD_MAX_FILE_MB, 100),
};
