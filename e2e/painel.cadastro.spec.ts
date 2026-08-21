import { expect, test } from "@playwright/test";
import { autenticarAdminSemBackend } from "./support/auth";

test.describe("painel — cadastro coerente com a POC", () => {
  test.beforeEach(async ({ page }) => {
    await autenticarAdminSemBackend(page);
  });

  test("cadastra com passaporte e celular sem exigir credencial tecnica", async ({ page }) => {
    let cadastroRecebido: Record<string, unknown> | null = null;

    await page.route("**/api/v1/cadastros/alfabetizandos", async (route) => {
      if (route.request().method() === "POST") {
        cadastroRecebido = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({ status: 201, json: { id: "student-created" } });
        return;
      }
      await route.fulfill({ json: { total: 0, items: [] } });
    });
    await page.route("**/api/v1/cadastros/alfabetizadores", (route) =>
      route.fulfill({ json: { items: [{ id: "tutor-1", nome: "Tutor E2E" }] } }),
    );

    await page.goto("/admin/alfabetizandos");
    const form = page.locator("form").filter({ hasText: "Criar alfabetizando" });
    await form.getByPlaceholder("Nome").fill("Ana Passaporte");
    await form.getByLabel("CPF ou passaporte do alfabetizando").fill("AB123456");
    await form.getByLabel("Celular do alfabetizando").fill("11987654321");
    await form.getByLabel("Alfabetizador responsável").selectOption("tutor-1");
    await form.getByRole("button", { name: "Criar alfabetizando" }).click();

    await expect.poll(() => cadastroRecebido).not.toBeNull();
    expect(cadastroRecebido).toMatchObject({
      nome: "Ana Passaporte",
      cpf: "AB123456",
      phone: "(11) 98765-4321",
      educatorId: "tutor-1",
      email: "aluno.ab123456@mobile.letras.local",
      password: "Letras@ab123456",
    });
  });

  test("mantem a tela de grupos oculta na POC individual", async ({ page }) => {
    await page.route("**/api/v1/painel/dashboard/**", (route) => route.fulfill({ json: {} }));

    await page.goto("/admin/grupos");

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByText("Grupos", { exact: true })).toHaveCount(0);
  });
});
