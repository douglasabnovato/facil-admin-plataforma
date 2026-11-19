/*
 * cadastro.spec.ts — o cadastro no navegador com o Supabase simulado por page.route (#38): sucesso (pede a
 * confirmação do e-mail), falha do servidor (e-mail já cadastrado), falha de rede e validação dos campos,
 * anunciada com aria-invalid e aria-describedby. axe sem violações com os erros na tela, em desktop e celular.
 * Dados fictícios (@empresa.test). Nenhum pedido sai para a internet.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/* Responde ao signup do Auth simulado; o preflight (OPTIONS) sempre passa. */
async function simularSignup(page: Page, responder: (rota: Route) => Promise<void>) {
  await page.route(/supabase-e2e\.invalid\/auth\/v1\/signup/, async (rota) => {
    if (rota.request().method() === "OPTIONS") return rota.fulfill({ status: 204, headers: CORS });
    return responder(rota);
  });
}

/* Preenche o formulário com dados fictícios válidos. */
async function preencher(page: Page, email = "sindica.ficticia@empresa.test") {
  await page.getByLabel("Nome completo").fill("Síndica Fictícia");
  await page.getByLabel("Celular (WhatsApp)").fill("(11) 90000-0000");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-de-teste-123");
  await page.getByRole("checkbox", { name: /Li e aceito/ }).click();
}

test.beforeEach(async ({ context }) => {
  /* Corta a rede externa; as rotas de cada teste (na página) vêm depois e vencem esta. */
  await context.route(/supabase-e2e\.invalid|fonts\.(googleapis|gstatic)\.com|gc\.zgo\.at|goatcounter\.com/, (rota) => rota.abort());
});

test("cadastro com sucesso pede a confirmação do e-mail e envia o tipo escolhido", async ({ page }) => {
  let corpo: Record<string, unknown> = {};
  await simularSignup(page, async (rota) => {
    corpo = rota.request().postDataJSON();
    await rota.fulfill({
      status: 200,
      headers: CORS,
      contentType: "application/json",
      body: JSON.stringify({ id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "", email: corpo.email, user_metadata: {} }),
    });
  });

  await page.goto("/cadastro?tipo=fornecedor");
  await expect(page.getByRole("radio", { name: /Fornecedor/ })).toHaveAttribute("aria-checked", "true");
  await preencher(page, "fornecedor.ficticio@empresa.test");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Confirme o seu e-mail" })).toBeVisible();
  await expect(page.getByText("fornecedor.ficticio@empresa.test")).toBeVisible();
  expect(corpo.email).toBe("fornecedor.ficticio@empresa.test");
  expect((corpo.data as Record<string, unknown>).tipo).toBe("fornecedor");

  const resultado = await new AxeBuilder({ page }).analyze();
  expect(resultado.violations).toEqual([]);
});

test("e-mail já cadastrado mostra o aviso traduzido e mantém o formulário", async ({ page }) => {
  await simularSignup(page, (rota) =>
    rota.fulfill({
      status: 422,
      headers: CORS,
      contentType: "application/json",
      body: JSON.stringify({ code: 422, error_code: "user_already_exists", msg: "User already registered" }),
    }),
  );

  await page.goto("/cadastro");
  await preencher(page);
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page.getByText("Este e-mail já tem cadastro. Tente entrar.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar conta" })).toBeEnabled();
  await expect(page.getByLabel("E-mail")).toHaveValue("sindica.ficticia@empresa.test");

  const resultado = await new AxeBuilder({ page }).analyze();
  expect(resultado.violations).toEqual([]);
});

test("falha de rede no cadastro mostra que o servidor não respondeu", async ({ page }) => {
  await simularSignup(page, (rota) => rota.abort());

  await page.goto("/cadastro");
  await preencher(page);
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page.getByText("Não conseguimos falar com o servidor agora.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar conta" })).toBeEnabled();

  const resultado = await new AxeBuilder({ page }).analyze();
  expect(resultado.violations).toEqual([]);
});

test("validação: e-mail inválido e senha curta aparecem, são anunciados e não chamam o servidor", async ({ page }) => {
  let pedidos = 0;
  await simularSignup(page, async (rota) => {
    pedidos += 1;
    await rota.abort();
  });

  await page.goto("/cadastro");
  await page.getByLabel("Nome completo").fill("Síndica Fictícia");
  await page.getByLabel("Celular (WhatsApp)").fill("(11) 90000-0000");
  await page.getByLabel("E-mail").fill("email-sem-arroba");
  await page.getByLabel("Senha").fill("curta");
  await page.getByRole("button", { name: "Criar conta" }).click();

  const email = page.getByLabel("E-mail");
  const senha = page.getByLabel("Senha");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription("Informe um e-mail válido");
  await expect(senha).toHaveAttribute("aria-invalid", "true");
  await expect(senha).toHaveAccessibleDescription("Use ao menos 8 caracteres");
  await expect(page.getByRole("checkbox", { name: /Li e aceito/ })).toHaveAccessibleDescription("É preciso aceitar os termos");
  /* O primeiro campo inválido recebe o foco, e o leitor de tela lê a mensagem ligada a ele. */
  await expect(email).toBeFocused();
  await expect(page.getByLabel("Nome completo")).not.toHaveAttribute("aria-invalid", "true");

  const resultado = await new AxeBuilder({ page }).analyze();
  expect(resultado.violations).toEqual([]);
  expect(pedidos).toBe(0);
});

/* Fim de cadastro.spec.ts */
