import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_CONFIG_PATH = path.resolve(
  process.cwd(),
  "docs",
  "insumos",
  "conteudo",
  "video-aula-real",
  "video-aula-alfabeto-completo.config.json",
);

const DEFAULT_API_BASE_URL = process.env.LETRAS_API_BASE_URL || "https://painel.letras.cloud/api/v1";

const MIME_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};

const KIND_BY_EXTENSION = {
  ".jpg": "jpg",
  ".jpeg": "jpg",
  ".png": "png",
  ".mp4": "mp4",
  ".mp3": "mp3",
};

function parseArgs(argv) {
  const options = {
    configPath: DEFAULT_CONFIG_PATH,
    apiBaseUrl: DEFAULT_API_BASE_URL,
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--apply") {
      options.apply = true;
      continue;
    }
    if (token === "--dry-run") {
      options.apply = false;
      continue;
    }
    if (token === "--config") {
      options.configPath = path.resolve(process.cwd(), String(argv[index + 1] || ""));
      index += 1;
      continue;
    }
    if (token === "--api-base") {
      options.apiBaseUrl = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
  }

  return options;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function toSlug(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toTitleFromFileName(fileName) {
  const withoutExtension = normalizeText(fileName).replace(/\.[^/.]+$/, "");
  return withoutExtension
    .replace(/\bimagem\b/gi, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toLabelFromFileName(fileName) {
  const title = toTitleFromFileName(fileName);
  if (!title) {
    return "Item";
  }

  return title
    .split(" ")
    .map((token) => token.slice(0, 1).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalizeText(value),
  );
}

function resolvePathFromConfig(baseDirectory, value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }
  if (path.isAbsolute(normalized)) {
    return normalized;
  }
  return path.resolve(baseDirectory, normalized);
}

function isCorrectTarget(label, targetLetter) {
  const cleanLabel = normalizeText(label).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const firstLetter = cleanLabel.slice(0, 1).toUpperCase();
  return firstLetter === normalizeText(targetLetter).slice(0, 1).toUpperCase();
}

function inferMimeAndKind(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  return {
    extension,
    mimeType: MIME_BY_EXTENSION[extension] || "application/octet-stream",
    kind: KIND_BY_EXTENSION[extension] || null,
  };
}

function sortByFileName(items) {
  return [...items].sort((left, right) => left.fileName.localeCompare(right.fileName, "pt-BR"));
}

async function listSupportedFiles(directoryPath, allowedExtensions) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const extension = path.extname(entry.name).toLowerCase();
      if (!allowedExtensions.has(extension)) {
        return null;
      }
      return {
        fileName: entry.name,
        fullPath: path.join(directoryPath, entry.name),
        extension,
      };
    })
    .filter(Boolean);

  return sortByFileName(files);
}

async function apiRequest(apiBaseUrl, method, route, payload = undefined) {
  const targetUrl = `${apiBaseUrl.replace(/\/+$/, "")}${route}`;
  const init = {
    method,
    headers: {},
  };

  if (payload?.formData) {
    init.body = payload.formData;
  } else if (payload !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(payload);
  }

  const response = await fetch(targetUrl, init);
  const rawBody = await response.text();
  let body;

  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = rawBody;
  }

  if (!response.ok) {
    const message =
      typeof body === "object" && body && "message" in body ? body.message : rawBody || response.statusText;
    throw new Error(`[${method} ${route}] ${response.status}: ${message}`);
  }

  return body;
}

function findThemeByTitle(themes, title) {
  const expected = normalizeText(title).toLowerCase();
  return (
    themes.find((item) => normalizeText(item?.title).toLowerCase() === expected && isUuid(item?.id)) ||
    null
  );
}

function findModule(modules, { themeId, stageNumber, title }) {
  const expectedTitle = normalizeText(title).toLowerCase();
  return (
    modules.find((item) => {
      const sameTheme = normalizeText(item?.theme_id) === normalizeText(themeId);
      const sameStage = Number(item?.stage_number || 1) === Number(stageNumber || 1);
      const sameTitle = normalizeText(item?.title).toLowerCase() === expectedTitle;
      return sameTheme && sameStage && sameTitle && isUuid(item?.id);
    }) || null
  );
}

function findActivity(activities, { moduleId, title }) {
  const expectedTitle = normalizeText(title).toLowerCase();
  return (
    activities.find((item) => {
      const sameModule = normalizeText(item?.module_id) === normalizeText(moduleId);
      const sameTitle = normalizeText(item?.title).toLowerCase() === expectedTitle;
      return sameModule && sameTitle && isUuid(item?.id);
    }) || null
  );
}

function readAssetMetadata(asset) {
  const metadata = asset?.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata;
  }
  return {};
}

function findExistingAssetForFile(assets, { activityId, localFilePath }) {
  const normalizedPath = normalizeText(localFilePath).toLowerCase();
  return (
    assets.find((asset) => {
      if (normalizeText(asset?.activity_id) !== normalizeText(activityId)) {
        return false;
      }
      const metadata = readAssetMetadata(asset);
      const scriptPath = normalizeText(metadata?.scriptSourceFilePath).toLowerCase();
      return scriptPath === normalizedPath;
    }) || null
  );
}

function buildVideoInstructions(config) {
  const lines = [
    normalizeText(config.videoActivity?.instructions),
    "",
    "Objetivo da aula:",
    normalizeText(config.videoActivity?.objective),
    "",
    "Roteiro para o alfabetizador:",
    normalizeText(config.videoActivity?.educatorGuidance),
    "",
    "Fala sugerida para o alfabetizando:",
    normalizeText(config.videoActivity?.learnerSpeech),
  ].filter(Boolean);

  return lines.join("\n");
}

function buildMarkImagesInstructions(config, items) {
  const targetLetter = normalizeText(config.dynamicActivity?.targetLetter || "A").slice(0, 1).toUpperCase() || "A";
  const expectedSelections = items.filter((item) => item.isCorrectTarget).length;

  const payload = {
    schema: "letras-stage2-v1",
    screenTemplate: "exercise-mark-images",
    educatorGuidance: normalizeText(config.dynamicActivity?.educatorGuidance) || null,
    learnerSpeech: normalizeText(config.dynamicActivity?.learnerSpeech) || null,
    lockReason: normalizeText(config.dynamicActivity?.lockReason) || "pedido_ajuda",
    lockMessage: normalizeText(config.dynamicActivity?.lockMessage) || null,
    lockAudioUrl: normalizeText(config.dynamicActivity?.lockAudioUrl) || null,
    exercise: {
      template: "exercise-mark-images",
      targetLetter,
      instructionText:
        normalizeText(config.dynamicActivity?.instructionText) ||
        `Marque ${expectedSelections} imagem(ns) da letra ${targetLetter}.`,
      instructionAudioUrl: normalizeText(config.dynamicActivity?.instructionAudioUrl) || null,
      expectedSelections,
      maxAttemptsBeforeLock: Number(config.dynamicActivity?.maxAttemptsBeforeLock || 3),
      progressiveUnlock: false,
      items,
      successFeedback: normalizeText(config.dynamicActivity?.successFeedback) || "Muito bem! Vamos avancar.",
      errorFeedback:
        normalizeText(config.dynamicActivity?.errorFeedback) || "Selecao incorreta. Tente novamente.",
    },
  };

  return JSON.stringify(payload, null, 2);
}

function buildRn123Lines(items) {
  return items
    .map((item) => `${item.label}|${item.isCorrectTarget ? "sim" : "nao"}|${item.imageUrl || ""}|`)
    .join("\n");
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function uploadFileAsset({
  apiBaseUrl,
  filePath,
  activityId,
  status,
  folder,
  title,
  metadata,
}) {
  const { kind, mimeType } = inferMimeAndKind(filePath);
  if (!kind) {
    throw new Error(`Arquivo com extensao nao suportada: ${filePath}`);
  }

  const fileBuffer = await fs.readFile(filePath);
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer], { type: mimeType }), path.basename(filePath));
  formData.append("activityId", activityId);
  formData.append("kind", kind);
  formData.append("status", status);
  formData.append("title", title);
  formData.append("folder", folder);
  formData.append("metadata", JSON.stringify(metadata));

  const response = await apiRequest(apiBaseUrl, "POST", "/painel/conteudo/assets/upload", {
    formData,
  });

  return response?.asset || null;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const configRaw = await fs.readFile(options.configPath, "utf8");
  const config = JSON.parse(configRaw);
  const configDirectory = path.dirname(options.configPath);

  const videosDirectory = resolvePathFromConfig(configDirectory, config.assets?.videosDirectory);
  const dynamicImagesDirectory = resolvePathFromConfig(configDirectory, config.assets?.dynamicImagesDirectory);
  const targetLetter =
    normalizeText(config.dynamicActivity?.targetLetter || "A").slice(0, 1).toUpperCase() || "A";
  const assetStatus = normalizeText(config.assets?.status || "publicado");
  const storageFolder =
    normalizeText(config.assets?.folder) ||
    `conteudo/video-aula-real/${toSlug(config.theme?.title || "tema") || "tema"}`;
  const reportDirectory = path.resolve(process.cwd(), "artifacts", "video-aula-real");
  await ensureDirectory(reportDirectory);

  const videoFiles = await listSupportedFiles(videosDirectory, new Set([".mp4", ".mp3", ".jpg", ".jpeg", ".png"]));
  const dynamicImageFiles = await listSupportedFiles(dynamicImagesDirectory, new Set([".jpg", ".jpeg", ".png"]));

  const plannedDynamicItems = dynamicImageFiles.map((item, index) => {
    const label = toLabelFromFileName(item.fileName);
    return {
      id: `mark-${index + 1}`,
      label,
      imageUrl: "",
      audioUrl: null,
      isCorrectTarget: isCorrectTarget(label, targetLetter),
      sourceFilePath: item.fullPath,
    };
  });

  const dryRunReport = {
    mode: options.apply ? "apply" : "dry-run",
    apiBaseUrl: options.apiBaseUrl,
    configPath: options.configPath,
    source: {
      videosDirectory,
      dynamicImagesDirectory,
      videoFiles: videoFiles.map((item) => item.fileName),
      dynamicImageFiles: dynamicImageFiles.map((item) => item.fileName),
    },
    entities: {
      themeTitle: config.theme?.title,
      moduleTitle: config.module?.title,
      videoActivityTitle: config.videoActivity?.title,
      dynamicActivityTitle: config.dynamicActivity?.title,
      targetLetter,
    },
    dryRunPreview: {
      videoInstructions: buildVideoInstructions(config),
      dynamicInstructions: buildMarkImagesInstructions(config, plannedDynamicItems),
      rn123Lines: buildRn123Lines(plannedDynamicItems),
    },
  };

  const dryRunReportPath = path.join(
    reportDirectory,
    `video-aula-real-${new Date().toISOString().replace(/[:.]/g, "-")}.dry-run.json`,
  );
  await fs.writeFile(dryRunReportPath, JSON.stringify(dryRunReport, null, 2), "utf8");

  if (!options.apply) {
    console.log("Dry-run concluido. Nenhum dado foi gravado.");
    console.log(`Relatorio: ${dryRunReportPath}`);
    console.log(`Arquivos de video detectados: ${videoFiles.length}`);
    console.log(`Arquivos de imagem dinamica detectados: ${dynamicImageFiles.length}`);
    return;
  }

  const cms = await apiRequest(options.apiBaseUrl, "GET", "/painel/conteudo?scope=cms");
  const themes = Array.isArray(cms?.themes) ? cms.themes : [];
  const modules = Array.isArray(cms?.modules) ? cms.modules : [];
  const activities = Array.isArray(cms?.activities) ? cms.activities : [];
  const assets = Array.isArray(cms?.assets) ? cms.assets : [];

  let theme = findThemeByTitle(themes, config.theme?.title);
  if (!theme) {
    theme = await apiRequest(options.apiBaseUrl, "POST", "/painel/conteudo/temas", {
      title: config.theme?.title,
      description: config.theme?.description,
      slug: config.theme?.slug || toSlug(config.theme?.title || ""),
      sortOrder: Number(config.theme?.sortOrder || 0),
      isActive: true,
    });
  }

  let moduleItem = findModule(modules, {
    themeId: theme.id,
    stageNumber: Number(config.module?.stageNumber || 1),
    title: config.module?.title,
  });
  if (!moduleItem) {
    moduleItem = await apiRequest(options.apiBaseUrl, "POST", "/painel/conteudo/modulos", {
      themeId: theme.id,
      title: config.module?.title,
      description: config.module?.description,
      stageNumber: Number(config.module?.stageNumber || 1),
      sortOrder: Number(config.module?.sortOrder || 0),
      isActive: true,
    });
  }

  let videoActivity = findActivity(activities, {
    moduleId: moduleItem.id,
    title: config.videoActivity?.title,
  });
  if (!videoActivity) {
    videoActivity = await apiRequest(options.apiBaseUrl, "POST", "/painel/conteudo/atividades", {
      moduleId: moduleItem.id,
      type: config.videoActivity?.type || "video",
      title: config.videoActivity?.title,
      instructions: buildVideoInstructions(config),
      sortOrder: Number(config.videoActivity?.sortOrder || 1),
      isPublished: Boolean(config.videoActivity?.isPublished),
    });
  } else {
    await apiRequest(options.apiBaseUrl, "PATCH", `/painel/conteudo/atividades/${videoActivity.id}`, {
      instructions: buildVideoInstructions(config),
      isPublished: Boolean(config.videoActivity?.isPublished),
      sortOrder: Number(config.videoActivity?.sortOrder || 1),
    });
  }

  let dynamicActivity = findActivity(activities, {
    moduleId: moduleItem.id,
    title: config.dynamicActivity?.title,
  });
  if (!dynamicActivity) {
    dynamicActivity = await apiRequest(options.apiBaseUrl, "POST", "/painel/conteudo/atividades", {
      moduleId: moduleItem.id,
      type: config.dynamicActivity?.type || "letra",
      title: config.dynamicActivity?.title,
      instructions: "",
      sortOrder: Number(config.dynamicActivity?.sortOrder || 2),
      isPublished: Boolean(config.dynamicActivity?.isPublished),
    });
  }

  const uploadedVideoAssets = [];
  const uploadedDynamicAssets = [];

  for (const file of videoFiles) {
    const existing = findExistingAssetForFile(assets, {
      activityId: videoActivity.id,
      localFilePath: file.fullPath,
    });
    if (existing) {
      uploadedVideoAssets.push({
        fileName: file.fileName,
        assetId: existing.id,
        sourceUrl: existing.storage_path || "",
        reused: true,
      });
      continue;
    }

    const uploaded = await uploadFileAsset({
      apiBaseUrl: options.apiBaseUrl,
      filePath: file.fullPath,
      activityId: videoActivity.id,
      status: assetStatus,
      folder: storageFolder,
      title: toTitleFromFileName(file.fileName),
      metadata: {
        source: "script-video-aula-real",
        category: "video-aula",
        scriptSourceFilePath: file.fullPath,
      },
    });

    uploadedVideoAssets.push({
      fileName: file.fileName,
      assetId: uploaded?.id || null,
      sourceUrl: uploaded?.sourceUrl || "",
      reused: false,
    });
  }

  for (const file of dynamicImageFiles) {
    const existing = findExistingAssetForFile(assets, {
      activityId: dynamicActivity.id,
      localFilePath: file.fullPath,
    });
    if (existing) {
      uploadedDynamicAssets.push({
        fileName: file.fileName,
        label: toLabelFromFileName(file.fileName),
        assetId: existing.id,
        imageUrl: existing.storage_path || "",
        reused: true,
      });
      continue;
    }

    const uploaded = await uploadFileAsset({
      apiBaseUrl: options.apiBaseUrl,
      filePath: file.fullPath,
      activityId: dynamicActivity.id,
      status: assetStatus,
      folder: storageFolder,
      title: toTitleFromFileName(file.fileName),
      metadata: {
        source: "script-video-aula-real",
        category: "dinamico-imagens",
        scriptSourceFilePath: file.fullPath,
      },
    });

    uploadedDynamicAssets.push({
      fileName: file.fileName,
      label: toLabelFromFileName(file.fileName),
      assetId: uploaded?.id || null,
      imageUrl: uploaded?.sourceUrl || "",
      reused: false,
    });
  }

  const dynamicItems = uploadedDynamicAssets.map((item, index) => ({
    id: `mark-${index + 1}`,
    label: item.label,
    imageUrl: item.imageUrl || null,
    audioUrl: null,
    isCorrectTarget: isCorrectTarget(item.label, targetLetter),
  }));

  const dynamicInstructions = buildMarkImagesInstructions(config, dynamicItems);
  await apiRequest(options.apiBaseUrl, "PATCH", `/painel/conteudo/atividades/${dynamicActivity.id}`, {
    instructions: dynamicInstructions,
    isPublished: Boolean(config.dynamicActivity?.isPublished),
    sortOrder: Number(config.dynamicActivity?.sortOrder || 2),
  });

  const applyReport = {
    mode: "apply",
    apiBaseUrl: options.apiBaseUrl,
    configPath: options.configPath,
    createdOrReused: {
      theme: { id: theme.id, title: theme.title },
      module: { id: moduleItem.id, title: moduleItem.title },
      videoActivity: { id: videoActivity.id, title: videoActivity.title },
      dynamicActivity: { id: dynamicActivity.id, title: dynamicActivity.title },
    },
    uploads: {
      videoAssets: uploadedVideoAssets,
      dynamicAssets: uploadedDynamicAssets,
    },
    dynamic: {
      targetLetter,
      totalItems: dynamicItems.length,
      expectedSelections: dynamicItems.filter((item) => item.isCorrectTarget).length,
      rn123Lines: buildRn123Lines(dynamicItems),
    },
  };

  const applyReportPath = path.join(
    reportDirectory,
    `video-aula-real-${new Date().toISOString().replace(/[:.]/g, "-")}.apply.json`,
  );
  await fs.writeFile(applyReportPath, JSON.stringify(applyReport, null, 2), "utf8");

  console.log("Importacao concluida com sucesso.");
  console.log(`Tema: ${theme.title} (${theme.id})`);
  console.log(`Modulo: ${moduleItem.title} (${moduleItem.id})`);
  console.log(`Atividade de video: ${videoActivity.title} (${videoActivity.id})`);
  console.log(`Atividade dinamica: ${dynamicActivity.title} (${dynamicActivity.id})`);
  console.log(`Relatorio: ${applyReportPath}`);
}

main().catch((error) => {
  console.error("Falha ao importar video aula real:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
