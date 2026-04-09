import { promises as fs } from "node:fs";
import path from "node:path";

const baseDir = path.resolve(process.cwd(), "assets/mobile/etapa-1");
const outputPath = path.join(baseDir, "manifest.json");

function toSlug(input) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function extractStageTag(input) {
  const match = input.match(/etapa[\s_-]?(\d+)/i);
  if (!match) {
    return null;
  }
  return `etapa-${match[1]}`;
}

async function listSvgFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await listSvgFiles(absolutePath);
      files.push(...nested);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".svg")) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function main() {
  try {
    await fs.access(baseDir);
  } catch {
    console.error(`Diretorio nao encontrado: ${baseDir}`);
    console.error("Crie a pasta assets/mobile/etapa-1 e adicione os SVGs antes de gerar o manifesto.");
    process.exitCode = 1;
    return;
  }

  const files = await listSvgFiles(baseDir);
  const screens = files
    .map((absoluteFilePath) => {
      const relativePath = path.relative(baseDir, absoluteFilePath).replace(/\\/g, "/");
      const fileName = path.basename(relativePath, ".svg");
      const stageTag = extractStageTag(relativePath) ?? extractStageTag(fileName);

      return {
        slug: toSlug(fileName),
        title: fileName.replace(/[_-]+/g, " ").trim(),
        svgPath: relativePath,
        stageTag,
        moduleCode: null,
      };
    })
    .sort((left, right) => left.svgPath.localeCompare(right.svgPath, "pt-BR"));

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalScreens: screens.length,
    screens,
  };

  await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Manifesto gerado com ${screens.length} tela(s): ${outputPath}`);
}

main().catch((error) => {
  console.error("Falha ao gerar manifesto:", error);
  process.exitCode = 1;
});
