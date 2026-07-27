import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const mobileExamplePath = resolve("apps/mobile-app/.env.example");
const apiExamplePath = resolve("apps/api/.env.example");
const expectedMobileApi = "https://painel.letras.cloud/api/v1";

function parseEnv(path) {
  const values = new Map();
  const duplicates = new Set();

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsAt = line.indexOf("=");
    if (equalsAt === -1) continue;
    const key = line.slice(0, equalsAt).trim();
    const value = line.slice(equalsAt + 1).trim().replace(/^["']|["']$/g, "");
    if (values.has(key)) duplicates.add(key);
    values.set(key, value);
  }

  return { values, duplicates };
}

const errors = [];

if (!existsSync(mobileExamplePath)) {
  errors.push("apps/mobile-app/.env.example nao existe.");
} else {
  const { values, duplicates } = parseEnv(mobileExamplePath);
  const actual = values.get("EXPO_PUBLIC_API_URL");
  if (actual !== expectedMobileApi) {
    errors.push(`EXPO_PUBLIC_API_URL deve ser ${expectedMobileApi}, mas esta ${actual || "(ausente)"}`);
  }
  if (duplicates.size > 0) {
    errors.push(`Variaveis duplicadas em apps/mobile-app/.env.example: ${Array.from(duplicates).join(", ")}`);
  }
}

if (!existsSync(apiExamplePath)) {
  errors.push("apps/api/.env.example nao existe.");
}

if (errors.length > 0) {
  console.error("[quality] Ambiente mobile/API invalido:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("[quality] Ambiente mobile/API OK.");
