import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve("apps/web/.env.production");
const required = new Map([
  ["VITE_API_BASE_URL", "https://painel.letras.cloud/api/v1"],
  ["VITE_USE_MOCKS", "false"],
  ["VITE_USE_SUPABASE_AUTH", "true"],
]);

function parseEnv(contents) {
  const values = new Map();
  const duplicates = new Set();

  for (const rawLine of contents.split(/\r?\n/)) {
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

if (!existsSync(envPath)) {
  console.error("[quality] apps/web/.env.production nao existe. O build de producao cairia no localhost.");
  process.exit(1);
}

const { values, duplicates } = parseEnv(readFileSync(envPath, "utf8"));
const errors = [];

for (const [key, expected] of required) {
  const actual = values.get(key);
  if (actual !== expected) {
    errors.push(`${key} deve ser ${expected}, mas esta ${actual || "(ausente)"}`);
  }
}

if ((values.get("VITE_API_BASE_URL") || "").includes("localhost")) {
  errors.push("VITE_API_BASE_URL de producao nao pode apontar para localhost.");
}

if (duplicates.size > 0) {
  errors.push(`Variaveis duplicadas em .env.production: ${Array.from(duplicates).join(", ")}`);
}

if (errors.length > 0) {
  console.error("[quality] Ambiente de producao invalido:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("[quality] Ambiente de producao do painel OK.");
