import { AssetKind, AssetStatus } from "./cmsTypes";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_REGEX.test(value.trim());
}

export function toInt(value: string | number, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

export function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString("pt-BR");
}

export function assetKindLabel(kind: AssetKind) {
  if (kind === "mp4") return "Video";
  if (kind === "mp3") return "Audio (MP3)";
  if (kind === "wav") return "Audio (WAV)";
  if (kind === "png") return "Imagem (PNG)";
  return "Imagem (JPG)";
}

export function isAudioKind(kind: AssetKind): boolean {
  return kind === "mp3" || kind === "wav";
}

export function isImageKind(kind: AssetKind): boolean {
  return kind === "png" || kind === "jpg";
}

export function isVideoKind(kind: AssetKind): boolean {
  return kind === "mp4";
}

export function assetStatusLabel(status: AssetStatus) {
  if (status === "rascunho") return "Rascunho";
  if (status === "publicado") return "Publicado";
  return "Arquivado";
}

export function toFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("learning_themes_slug_key") ||
    normalized.includes("ja existe um tema muito parecido")
  ) {
    return "Ja existe um tema com esse nome. Troque o titulo e tente novamente.";
  }

  if (normalized.includes("duplicate key value") && normalized.includes("learning_themes")) {
    return "Esse tema ja foi cadastrado. Use outro nome para o tema.";
  }

  if (
    normalized.includes("duplicate key value") &&
    normalized.includes("learning_modules_unique_per_stage")
  ) {
    return "Ja existe um modulo nesta etapa. Use outro nome de modulo ou altere a etapa.";
  }

  return message;
}

export function inferAssetKindFromFile(file: File): AssetKind | null {
  const mimeType = file.type.toLowerCase();
  if (mimeType.startsWith("video/mp4")) return "mp4";
  if (mimeType.startsWith("audio/mpeg") || mimeType.startsWith("audio/mp3")) return "mp3";
  if (
    mimeType.startsWith("audio/wav") ||
    mimeType.startsWith("audio/wave") ||
    mimeType.startsWith("audio/x-wav") ||
    mimeType.startsWith("audio/vnd.wave")
  ) {
    return "wav";
  }
  if (mimeType.startsWith("image/png")) return "png";
  if (mimeType.startsWith("image/jpeg")) return "jpg";

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "mp4") return "mp4";
  if (extension === "mp3") return "mp3";
  if (extension === "wav") return "wav";
  if (extension === "png") return "png";
  if (extension === "jpg" || extension === "jpeg") return "jpg";
  return null;
}

export function inferAssetKindFromPath(path: string): AssetKind | null {
  const value = path.trim().toLowerCase();
  if (!value) {
    return null;
  }

  const cleanPath = value.split("?")[0]?.split("#")[0] ?? value;
  if (cleanPath.endsWith(".mp4")) return "mp4";
  if (cleanPath.endsWith(".mp3")) return "mp3";
  if (cleanPath.endsWith(".wav")) return "wav";
  if (cleanPath.endsWith(".png")) return "png";
  if (cleanPath.endsWith(".jpg") || cleanPath.endsWith(".jpeg")) return "jpg";

  if (value.includes("video")) return "mp4";
  if (value.includes("audio")) return "mp3";
  if (value.includes("image")) return "png";
  return null;
}

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const kb = value / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(2)} MB`;
}

export function getAssetDisplayName(path: string) {
  const normalized = String(path ?? "").trim();
  if (!normalized) {
    return "";
  }
  try {
    const withoutQuery = normalized.split("?")[0] || normalized;
    const parts = withoutQuery.split("/").filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || normalized);
  } catch {
    return normalized;
  }
}

function readMetadataString(metadata: unknown, key: string): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export function getAssetFriendlyName(asset: {
  storage_path: string;
  metadata?: Record<string, unknown> | null;
}): string {
  const fromMetadata =
    readMetadataString(asset.metadata, "originalFileName") ||
    readMetadataString(asset.metadata, "title");
  if (fromMetadata) {
    return fromMetadata;
  }
  return getAssetDisplayName(asset.storage_path);
}

export function resolvePublicAssetUrl(path: string, supabaseUrl: string, publicBucket = "letras-assets") {
  const normalized = String(path ?? "").trim();
  if (!normalized) {
    return "";
  }
  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("blob:") || normalized.startsWith("data:")) {
    return normalized;
  }
  const base = String(supabaseUrl ?? "").trim().replace(/\/+$/, "");
  const cleaned = normalized.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!base) {
    return cleaned ? `/${encodeURI(cleaned)}` : "";
  }
  if (cleaned.startsWith("storage/v1/object/public/")) {
    return `${base}/${encodeURI(cleaned)}`;
  }
  return `${base}/storage/v1/object/public/${publicBucket}/${encodeURI(cleaned)}`;
}
