// Converte qualquer erro (HTTP, rede, timeout, excecao) em uma mensagem segura
// para o alfabetizando/alfabetizador. Regra do produto: nunca exibir JSON,
// URLs, status HTTP, nomes de schema/payload ou termos tecnicos ao usuario.

const DEFAULT_FALLBACK =
  "Nao foi possivel carregar agora. Verifique sua conexao e toque em Atualizar.";

// Marcadores de mensagem tecnica que jamais devem chegar ao usuario final.
const TECHNICAL_PATTERN =
  /request failed|[{}]|https?:\/\/|\bfetch\b|timeout|\bnetwork\b|\b\d{3}\b|econn|supabase|prisma|undefined|null|stack|json/i;

export function toUserFacingMessage(error, fallback = DEFAULT_FALLBACK) {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String(error.message ?? "")
      : String(error ?? "");

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // Mensagem tecnica -> troca pelo texto amigavel.
  if (TECHNICAL_PATTERN.test(trimmed)) return fallback;

  return trimmed;
}

export const USER_FACING_FALLBACK = DEFAULT_FALLBACK;
