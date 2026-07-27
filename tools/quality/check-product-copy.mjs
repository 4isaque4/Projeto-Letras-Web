import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const roots = ["apps/mobile-app/src"];
const allowedExtensions = new Set([".tsx", ".jsx"]);
const ignoredDirs = new Set(["node_modules", "dist", "build", "coverage"]);
const forbiddenPatterns = [
  {
    regex: /\bCMS\b/,
    message: 'Use "Aulas e Midias" em texto visivel; "CMS" fica apenas em codigo interno.',
  },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, files);
    } else if (entry.isFile() && allowedExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

const failures = [];

for (const root of roots) {
  const absoluteRoot = resolve(root);
  if (!statSync(absoluteRoot, { throwIfNoEntry: false })?.isDirectory()) continue;

  for (const file of walk(absoluteRoot)) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { regex, message } of forbiddenPatterns) {
        if (regex.test(line)) {
          failures.push(`${relative(process.cwd(), file)}:${index + 1} - ${message}`);
        }
      }
    });
  }
}

if (failures.length > 0) {
  console.error("[quality] Copy de produto precisa de ajuste:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[quality] Copy de produto OK.");
