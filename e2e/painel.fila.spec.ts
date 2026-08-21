import { expect, test } from "@playwright/test";
import { autenticarAdminSemBackend } from "./support/auth";

test.describe("painel — fila com API interceptada", () => {
  test.beforeEach(async ({ page }) => {
    await autenticarAdminSemBackend(page);
  });

  test("valida o motivo e desbloqueia sem alterar dados reais", async ({ page }) => {
    let patchRecebido: unknown;
    let items = [
      {
        id: "queue-1",
        queueType: "progresso",
        tipo: "Aluno travado",
        aluno: "Maria de Teste",
        etapa: "Etapa 2",
        atividade: "Reconhecimento da letra A",
        status: "travado",
        tempo: "12 min",
        prioridade: "alta",
      },
    ];

    await page.route("**/api/v1/painel/fila", async (route) => {
      await route.fulfill({ json: { total: items.length, items } });
    });
    await page.route("**/api/v1/painel/fila/queue-1", async (route) => {
      patchRecebido = route.request().postDataJSON();
      items = [];
      await route.fulfill({ json: { ok: true } });
    });

    await page.goto("/admin/fila");

    await expect(page.getByRole("heading", { name: "Fila de Atendimento" })).toBeVisible();
    await page.getByRole("row", { name: /Maria de Teste/ }).click();
    await page.getByRole("button", { name: "Desbloquear aluno" }).click();
    await expect(page.getByText(/Informe uma observacao\/motivo/i)).toBeVisible();
    expect(patchRecebido).toBeUndefined();

    await page.getByPlaceholder(/Obrigatorio: descreva por que esta desbloqueando/i)
      .fill("Alfabetizador revisou a atividade");
    await page.getByRole("button", { name: "Desbloquear aluno" }).click();

    await expect(page.getByText("Item atualizado com sucesso.")).toBeVisible();
    expect(patchRecebido).toEqual({
      action: "desbloquear",
      reason: "Alfabetizador revisou a atividade",
      decidedBy: "painel-web",
    });
  });

  test("mostra falha de autorizacao no meio da acao", async ({ page }) => {
    await page.route("**/api/v1/painel/fila", async (route) => {
      await route.fulfill({
        json: {
          total: 1,
          items: [{
            id: "help-1",
            queueType: "ajuda",
            tipo: "Pedido de ajuda",
            aluno: "Joao de Teste",
            etapa: "Etapa 2",
            atividade: "Letra B",
            status: "aberto",
            tempo: "3 min",
            prioridade: "normal",
          }],
        },
      });
    });
    await page.route("**/api/v1/painel/fila/help-1", async (route) => {
      await route.fulfill({ status: 401, json: { message: "Sessao expirada." } });
    });

    await page.goto("/admin/fila");
    await page.getByRole("tab", { name: /Pedidos de ajuda/ }).click();
    await page.getByRole("row", { name: /Joao de Teste/ }).click();
    await page.getByRole("button", { name: "Marcar ajuda como atendida" }).click();

    await expect(page.getByText("Sessao expirada.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Detalhe do Item" })).toBeVisible();
  });
});
