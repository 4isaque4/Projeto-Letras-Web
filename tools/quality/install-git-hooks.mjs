import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const gitDir = resolve(rootDir, ".git");
const hooksDir = resolve(rootDir, ".githooks");

if (!existsSync(gitDir) || !existsSync(hooksDir)) {
  process.exit(0);
}

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    cwd: rootDir,
    stdio: "inherit",
  });
} catch (error) {
  console.warn(`[quality] Nao foi possivel configurar core.hooksPath: ${error.message}`);
}
