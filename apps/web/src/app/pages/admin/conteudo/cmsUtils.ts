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
  if (kind === "mp3") return "Audio";
  if (kind === "png") return "Imagem (PNG)";
  return "Imagem (JPG)";
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

  return message;
}

export function inferAssetKindFromFile(file: File): AssetKind | null {
  const mimeType = file.type.toLowerCase();
  if (mimeType.startsWith("video/mp4")) return "mp4";
  if (mimeType.startsWith("audio/mpeg") || mimeType.startsWith("audio/mp3")) return "mp3";
  if (mimeType.startsWith("image/png")) return "png";
  if (mimeType.startsWith("image/jpeg")) return "jpg";

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "mp4") return "mp4";
  if (extension === "mp3") return "mp3";
  if (extension === "png") return "png";
  if (extension === "jpg" || extension === "jpeg") return "jpg";
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
