import { env } from "../config/env.js";
import { runScoringDeadlineSweep } from "../services/letrasDataService.js";

const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

// RN085/RN093 — varredura periódica dos pedidos de apoio em aberto: emite os
// alertas de prazo (faltando 3 dias e faltando 24 horas do fim do prazo de 5
// dias) e lança os débitos de -3 pontos a cada 5 dias sem avanço (teto 30).
// Idempotente: alertas deduplicados por notificação e débitos por dedupe_key.
export function startScoringSweep() {
  // Evita que um `npm run dev` local dispare débitos/alertas no banco de
  // produção: fora de produção só roda com SCORING_SWEEP_ENABLED=true.
  if (env.nodeEnv !== "production" && process.env.SCORING_SWEEP_ENABLED !== "true") {
    console.log("[scoring-sweep] desativado fora de producao (use SCORING_SWEEP_ENABLED=true).");
    return null;
  }

  const run = async () => {
    try {
      const summary = await runScoringDeadlineSweep();
      if (summary.alerts > 0 || summary.penalties > 0) {
        console.log(
          `[scoring-sweep] pedidos=${summary.checked} alertas=${summary.alerts} debitos=${summary.penalties}`,
        );
      }
    } catch (error) {
      console.warn(`[scoring-sweep] falha na varredura: ${error?.message ?? error}`);
    }
  };

  const timer = setInterval(run, SWEEP_INTERVAL_MS);
  timer.unref?.();
  void run();
  return timer;
}
