import { expect, test } from "@playwright/test";
import { autenticarAdminSemBackend } from "./support/auth";

test.describe("painel — regressoes conhecidas", () => {
  test("ordena a timeline por data completa, inclusive entre meses", async ({ page }) => {
    await autenticarAdminSemBackend(page);

    await page.route("**/api/v1/cadastros/alfabetizandos/student-1", async (route) => {
      await route.fulfill({
        json: {
          id: "student-1",
          nome: "Ana de Teste",
          email: "",
          telefone: "",
          cpf: "",
          tutor: "Tutor de Teste",
          grupo: "",
          etapa: "Etapa 2",
          status: "ativo",
          progresso: [],
          tentativas: [],
          submissoes: [],
          // A API deve entregar a ordem cronologica, usando a data ISO original
          // antes de formatar os valores para exibicao.
          historico: [
            { id: "ago", tipo: "Evento de agosto", data: "02/08/2026 10:00", usuario: "Sistema", obs: "Mais recente" },
            { id: "jul", tipo: "Evento de julho", data: "31/07/2026 10:00", usuario: "Sistema", obs: "Anterior" },
          ],
        },
      });
    });
    await page.route("**/api/v1/painel/fotos-atividade?studentId=student-1", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.route("**/api/v1/painel/conteudo?scope=cms", (route) =>
      route.fulfill({ json: { themes: [] } }),
    );

    await page.goto("/admin/alfabetizandos/student-1");

    const timeline = page.getByRole("list", { name: "Linha do tempo de eventos" });
    await expect(timeline.getByRole("listitem").first()).toContainText("Evento de agosto");
  });

  test("configuracoes gerais nao duplicam o limite definido por exercicio", async ({ page }) => {
    await autenticarAdminSemBackend(page);
    let settingsPayload: Record<string, unknown> | null = null;

    await page.route("**/api/v1/cadastros/perfis/*", (route) =>
      route.fulfill({
        json: {
          id: "00000000-0000-4000-8000-000000000001",
          full_name: "Admin E2E",
          role: "admin",
          phone: "",
          cpf: "",
          metadata: { email: "admin.e2e@letras.test" },
        },
      }),
    );
    await page.route("**/api/v1/painel/configuracoes/sistema", async (route) => {
      if (route.request().method() === "PATCH") {
        settingsPayload = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({ json: { inactivityDays: 9 } });
        return;
      }
      await route.fulfill({ json: { errorBlockLimit: 3, inactivityDays: 7 } });
    });

    await page.goto("/admin/configuracoes");
    await page.getByRole("button", { name: "Sistema", exact: true }).click();

    await expect(page.getByText("Limite de erros para bloqueio", { exact: true })).toHaveCount(0);
    await page.getByLabel("Dias para inatividade").fill("9");
    await page.getByRole("button", { name: /Salvar parametros/i }).click();

    await expect.poll(() => settingsPayload).not.toBeNull();
    expect(settingsPayload).toMatchObject({ inactivityDays: 9 });
    expect(settingsPayload).not.toHaveProperty("errorBlockLimit");
  });
});
