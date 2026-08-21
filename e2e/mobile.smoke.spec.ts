import { expect, test } from "@playwright/test";
import { coletarConsole } from "./support/console";

test.describe("mobile web — entrada", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("carrega a entrada unificada sem erro", async ({ page }) => {
    const console_ = coletarConsole(page);

    await page.goto("/");

    await expect(page.getByText("Entrar no Letras", { exact: true })).toBeVisible();
    await expect(page.getByText(/Use seu CPF(?:, passaporte ou celular)? para continuar\./))
      .toBeVisible();
    await expect(page.getByRole("button", { name: /Entrar/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Primeiro acesso.*cadastro/i })).toBeVisible();
    expect(console_.erros, "erros de console no carregamento").toEqual([]);
    expect(console_.falhasDeRede, "requisicoes falhadas no carregamento").toEqual([]);
  });

  test("aceita celular e o envia como alternativa de busca da RN101", async ({ page }) => {
    let consultaRecebida: URL | null = null;

    await page.route("**/api/v1/cadastros/alfabetizandos/buscar?*", async (route) => {
      consultaRecebida = new URL(route.request().url());
      await route.fulfill({ status: 404, json: { message: "Cadastro não encontrado." } });
    });
    await page.route("**/api/v1/auth/educators/login", async (route) => {
      await route.fulfill({ status: 401, json: { message: "Credenciais inválidas." } });
    });

    await page.goto("/");
    const identifier = page.getByLabel("CPF");
    await identifier.fill("11987654321");
    await page.getByRole("button", { name: /Entrar/i }).click();

    await expect(page.getByText(/CPF não encontrado/i)).toBeVisible();
    expect(consultaRecebida?.searchParams.get("cpfOrPassport")).toBe("11987654321");
    expect(consultaRecebida?.searchParams.get("phoneDigits")).toBe("11987654321");
  });

  test("mantem o alfabetizando aguardando a confirmacao do vinculo", async ({ page }) => {
    await page.route("**/api/v1/cadastros/alfabetizandos/buscar?*", (route) =>
      route.fulfill({
        json: {
          id: "11111111-1111-4111-8111-111111111111",
          displayName: "Maria E2E",
          phoneDigits: "11911112222",
          educator: {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Tutor E2E",
            phoneDigits: "11999998888",
          },
        },
      }),
    );
    await page.route("**/api/v1/cadastros/sessoes-confirmacao", (route) =>
      route.fulfill({ json: { id: "request-1", status: "PENDING", requestedAt: "2026-08-21T12:00:00Z" } }),
    );
    await page.route("**/api/v1/cadastros/sessoes-confirmacao/request-1", (route) =>
      route.fulfill({ json: { id: "request-1", status: "PENDING", denialReason: null, respondedAt: null } }),
    );

    await page.goto("/");
    await page.getByLabel("CPF").fill("12345678901");
    await page.getByRole("button", { name: /Entrar/i }).click();

    await expect(page.getByText("Notificação enviada para o celular")).toBeVisible();
    await expect(page.getByText("(11) 99999-8888")).toBeVisible();
    await expect(page.getByText("Faça a confirmação no número indicado.")).toBeVisible();
  });

  test("nao libera cadastro encontrado sem alfabetizador associado", async ({ page }) => {
    let solicitouVinculo = false;
    await page.route("**/api/v1/cadastros/alfabetizandos/buscar?*", (route) =>
      route.fulfill({
        json: {
          id: "11111111-1111-4111-8111-111111111111",
          displayName: "Aluno sem tutor",
          phoneDigits: "11911112222",
          educator: null,
        },
      }),
    );
    await page.route("**/api/v1/cadastros/sessoes-confirmacao", async (route) => {
      solicitouVinculo = true;
      await route.fulfill({ status: 500, json: {} });
    });

    await page.goto("/");
    await page.getByLabel("CPF").fill("12345678901");
    await page.getByRole("button", { name: /Entrar/i }).click();

    await expect(page.getByText(/ainda não foi cadastrado por um alfabetizador/i)).toBeVisible();
    expect(solicitouVinculo).toBe(false);
  });

  test("home do alfabetizador busca nomes e carrega a lista de dez em dez", async ({ page }) => {
    const learners = Array.from({ length: 11 }, (_, index) => ({
      id: `learner-${index + 1}`,
      displayName: `Aluno ${String(index + 1).padStart(2, "0")}`,
      phoneDigits: "11999990000",
      learnerThemes: [],
      etapa: "Etapa 1",
      mirrorUnlocked: false,
    }));

    await page.route("**/api/v1/**", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/v1/cadastros/alfabetizandos/buscar?*", (route) =>
      route.fulfill({ status: 404, json: { message: "Cadastro não encontrado." } }),
    );
    await page.route("**/api/v1/auth/educators/login", (route) =>
      route.fulfill({
        json: {
          token: "token-e2e",
          expiresAt: "2099-01-01T00:00:00.000Z",
          educator: {
            id: "educator-e2e",
            fullName: "Alfabetizador E2E",
            email: null,
            cpf: "52998224725",
            phoneDigits: "11999998888",
          },
        },
      }),
    );
    await page.route("**/api/v1/cadastros/alfabetizandos?educatorId=educator-e2e", (route) =>
      route.fulfill({ json: { items: learners } }),
    );

    await page.goto("/");
    await page.getByLabel("CPF").fill("52998224725");
    await page.getByRole("button", { name: /Entrar/i }).click();

    await expect(page.getByText("Aluno 10 (Etapa 1)", { exact: true })).toBeVisible();
    await expect(page.getByText("Aluno 11 (Etapa 1)", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Buscar alfabetizando" }).click();
    await page.getByLabel("Buscar alfabetizando por nome").fill("Aluno 11");
    await expect(page.getByText("Aluno 11 (Etapa 1)", { exact: true })).toBeVisible();

    await page.getByLabel("Buscar alfabetizando por nome").fill("");
    await page.getByRole("button", { name: "Carregar mais alfabetizandos" }).click();
    await expect(page.getByText("Aluno 11 (Etapa 1)", { exact: true })).toBeVisible();
  });
});
