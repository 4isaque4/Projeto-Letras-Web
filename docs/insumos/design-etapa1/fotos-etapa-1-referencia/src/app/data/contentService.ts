/**
 * ContentService – Camada única de acesso a dados de conteúdo.
 *
 * Fonte PRIMÁRIA: conteudo-planilha.ts (dados da planilha convertidos).
 * Quando API estiver disponível, trocar a implementação interna
 * sem alterar a interface pública.
 */
import {
  conteudoPlanilha,
  mediaAssetsByKey,
  type ModuleContent,
  type LessonContent,
  type ScreenContent,
  type ActivityContent,
  type ContentBlock,
} from "./conteudo-planilha";

// Re-export types
export type { ModuleContent, LessonContent, ScreenContent, ActivityContent, ContentBlock };
export type { MediaKind } from "./conteudo-planilha";

/**
 * Resolve media keys (e.g. "VID-M01-A01-T04") into actual asset paths.
 */
export function resolveMediaUrl(value: string): string {
  return mediaAssetsByKey[value] ?? value;
}

/**
 * Resolve all ContentBlocks in an array, mapping media keys to real URLs.
 */
export function resolveContentBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((b) => ({
    ...b,
    value: b.kind !== "text" ? resolveMediaUrl(b.value) : b.value,
  }));
}

// Motivational messages for the Duolingo feel
const motivationalMessages = [
  "Você está indo muito bem!",
  "Continue assim, cada passo conta!",
  "Que progresso incrível!",
  "Foco e dedicação levam longe!",
  "Você é capaz de muito mais!",
];

export const ContentService = {
  // ─── Módulos ──────────────────────────────────────────
  getModulos(): ModuleContent[] {
    console.log("[ContentService] getModulos →", conteudoPlanilha.length, "módulos");
    return conteudoPlanilha;
  },

  getModulo(numeroModulo: number): ModuleContent | undefined {
    return conteudoPlanilha.find((m) => m.numeroModulo === numeroModulo);
  },

  // ─── Aulas ────────────────────────────────────────────
  getAulasByModulo(numeroModulo: number): LessonContent[] {
    const mod = this.getModulo(numeroModulo);
    const result = mod?.aulas ?? [];
    console.log(`[ContentService] getAulasByModulo(${numeroModulo}) →`, result.length, "aulas");
    return result;
  },

  getAula(numeroModulo: number, numeroAula: number): LessonContent | undefined {
    const aulas = this.getAulasByModulo(numeroModulo);
    return aulas.find((a) => a.numeroAula === numeroAula);
  },

  // ─── Telas ────────────────────────────────────────────
  getTelasByAula(numeroModulo: number, numeroAula: number): ScreenContent[] {
    const aula = this.getAula(numeroModulo, numeroAula);
    const result = aula?.telas ?? [];
    console.log(`[ContentService] getTelasByAula(M${numeroModulo}, A${numeroAula}) →`, result.length, "telas");
    return result;
  },

  getTela(numeroModulo: number, numeroAula: number, numeroTela: number): ScreenContent | undefined {
    const telas = this.getTelasByAula(numeroModulo, numeroAula);
    return telas.find((t) => t.numeroTela === numeroTela);
  },

  // ─── Atividades ───────────────────────────────────────
  getAtividadesByTela(
    numeroModulo: number,
    numeroAula: number,
    numeroTela: number
  ): ActivityContent[] {
    const tela = this.getTela(numeroModulo, numeroAula, numeroTela);
    const result = tela?.atividades ?? [];
    console.log(`[ContentService] getAtividadesByTela(M${numeroModulo}, A${numeroAula}, T${numeroTela}) →`, result.length, "atividades");
    return result;
  },

  getAtividade(
    numeroModulo: number,
    numeroAula: number,
    numeroTela: number,
    numeroAtividade: number
  ): ActivityContent | undefined {
    const ativs = this.getAtividadesByTela(numeroModulo, numeroAula, numeroTela);
    return ativs.find((a) => a.numeroAtividade === numeroAtividade);
  },

  // ─── Helpers ──────────────────────────────────────────
  getTotalAulas(numeroModulo: number): number {
    return this.getAulasByModulo(numeroModulo).length;
  },

  getTotalTelas(numeroModulo: number, numeroAula: number): number {
    return this.getTelasByAula(numeroModulo, numeroAula).length;
  },

  getMotivationalMessage(): string {
    return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  },
};