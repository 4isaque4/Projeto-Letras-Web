import type { Page } from "@playwright/test";

// Ruido que nao indica defeito do produto: extensoes do navegador, avisos de
// devtools e falhas de favicon. Mantido explicito para que um erro real nunca
// seja silenciado por engano.
const IGNORAVEIS = [
  /favicon/i,
  /Download the React DevTools/i,
  /\[vite\] connect/i,
];

export interface ConsoleColetado {
  erros: string[];
  falhasDeRede: string[];
}

/**
 * Comeca a coletar erros de console e requisicoes falhadas da pagina.
 * Chame ANTES do primeiro `goto`, senao os eventos do carregamento inicial
 * passam batido.
 */
export function coletarConsole(page: Page): ConsoleColetado {
  const coletado: ConsoleColetado = { erros: [], falhasDeRede: [] };

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const texto = msg.text();
    if (IGNORAVEIS.some((re) => re.test(texto))) return;
    coletado.erros.push(texto);
  });

  page.on("pageerror", (erro) => {
    coletado.erros.push(`pageerror: ${erro.message}`);
  });

  page.on("requestfailed", (req) => {
    const url = req.url();
    if (IGNORAVEIS.some((re) => re.test(url))) return;
    coletado.falhasDeRede.push(`${req.method()} ${url} — ${req.failure()?.errorText ?? "?"}`);
  });

  return coletado;
}
