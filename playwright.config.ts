import { defineConfig, devices } from "@playwright/test";

// Alvos padrao: os apps publicados. Sobrescreva para apontar para local:
//   PAINEL_URL=http://localhost:5173 MOBILE_URL=http://localhost:8081 pnpm e2e
export const PAINEL_URL = process.env.PAINEL_URL ?? "https://painel.letras.cloud";
export const MOBILE_URL = process.env.MOBILE_URL ?? "https://mobile.letras.cloud";
export const API_URL = process.env.API_URL ?? "https://painel.letras.cloud/api/v1";

export default defineConfig({
  testDir: "./e2e",
  // Sem paralelismo por padrao: os testes que interceptam rede sao
  // determinísticos, mas os de smoke batem em host real e nao ha ganho em
  // multiplicar carga sobre producao.
  workers: process.env.CI ? 1 : 2,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [
    ["list"],
    // JSON para leitura programatica das falhas, em vez de raspar texto do
    // terminal — o diagnostico fica exato.
    ["json", { outputFile: "e2e-results/results.json" }],
    ["html", { outputFolder: "e2e-results/html", open: "never" }],
  ],

  use: {
    // O trace guarda snapshot do DOM, rede e console POR PASSO. Quando um teste
    // quebra, da para inspecionar o que aconteceu sem re-rodar as cegas:
    //   pnpm exec playwright show-trace e2e-results/<...>/trace.zip
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: "painel",
      testMatch: /painel\..*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: PAINEL_URL },
    },
    {
      name: "mobile-web",
      testMatch: /mobile\..*\.spec\.ts/,
      // O app do alfabetizando roda em navegador (expo export --platform web),
      // entao o mesmo runner cobre os dois apps. Viewport de celular porque e
      // como ele e usado de verdade.
      use: { ...devices["Pixel 7"], baseURL: MOBILE_URL },
    },
    {
      name: "api",
      testMatch: /api\..*\.spec\.ts/,
      use: { baseURL: API_URL },
    },
  ],
});
