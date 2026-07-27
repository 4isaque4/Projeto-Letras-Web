import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const prompt = readFileSync(resolve(rootDir, "tools/quality/codex-review-prompt.md"), "utf8");
const args = process.argv.slice(2);
const reviewArgs = args.length > 0 ? args : ["--uncommitted"];

const result = spawnSync("codex", ["review", ...reviewArgs, "-"], {
  cwd: rootDir,
  input: prompt,
  stdio: ["pipe", "inherit", "inherit"],
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(`[quality] Falha ao executar codex review: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
