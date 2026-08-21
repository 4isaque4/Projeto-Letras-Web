import { expect, test } from "@playwright/test";
import { coletarConsole } from "./support/console";

// Smoke do painel: somente leitura. Nao faz login (credencial nao entra em
// teste automatizado) e nao submete formulario, entao nenhum dado e criado ou
// alterado no ambiente apontado por PAINEL_URL.
test.describe("painel — smoke", () => {
  test("carrega a tela de entrada sem erro de console", async ({ page }) => {
    const console_ = coletarConsole(page);

    await page.goto("/");

    await expect(page).toHaveTitle(/Letras/i);
    await expect(page.getByText("Sistema de Gestão de Alfabetização", { exact: true }))
      .toBeVisible();

    // A alternativa por placeholder mantem o smoke compativel com a versao
    // publicada anterior enquanto a associacao label/input aguarda deploy.
    await expect(page.getByLabel(/^Email$/i).or(page.getByRole("textbox", { name: "usuario@exemplo.com" })))
      .toBeVisible();
    await expect(page.getByLabel(/^Senha$/i).or(page.getByRole("textbox", { name: "********" })))
      .toBeVisible();
    await expect(page.getByRole("button", { name: /^Entrar$/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /Esqueci minha senha/i })).toBeVisible();

    expect(console_.erros, "erros de console no carregamento").toEqual([]);
    expect(console_.falhasDeRede, "requisicoes falhadas no carregamento").toEqual([]);
  });

  test("rota inexistente nao derruba a aplicacao", async ({ page }) => {
    const console_ = coletarConsole(page);

    // SPA: o servidor devolve o index e o roteador decide. O que nao pode
    // acontecer e a aplicacao quebrar com tela branca.
    await page.goto("/rota-que-nao-existe-" + "x".repeat(8));

    await expect(page.locator("body")).not.toBeEmpty();
    expect(console_.erros.filter((e) => /is not a function|undefined is not|Cannot read/i.test(e)))
      .toEqual([]);
  });

  test("a tela de entrada nao regride estruturalmente", async ({ page }) => {
    await page.goto("/");

    // Snapshot da arvore de acessibilidade, nao de pixel: nao quebra quando o
    // CSS muda, mas quebra se um controle desaparecer ou trocar de papel.
    await expect(page.locator("form").first()).toMatchAriaSnapshot(`
      - text: Email
      - textbox /^(Email|usuario@exemplo\\.com)$/
      - text: Senha
      - textbox /^(Senha|\\*{8})$/
      - button "Esqueci minha senha"
      - button "Entrar":
        - img
        - text: Entrar
    `);
  });
});
