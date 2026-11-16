/*
 * fluxo.spec.ts — fluxo principal no navegador: na demonstração, comparar 3 propostas, ordenar e escolher,
 * com a regra de aprovação (até R$ 5.000 a síndica aprova; acima, o conselho vota). No login, um envio real
 * pelo navegador com o backend fora do ar mostra a mensagem de falha. axe sem violações em claro e escuro.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  /* Corta a rede externa: Supabase e fontes. O fluxo da demonstração não pode depender delas. */
  await context.route(/supabase-e2e\.invalid|fonts\.(googleapis|gstatic)\.com|gc\.zgo\.at|goatcounter\.com/, (rota) => rota.abort());
});

test("demonstração: compara, ordena e escolhe com a regra de aprovação", async ({ page }) => {
  await page.goto("/demonstracao");
  await expect(page.getByRole("heading", { level: 1, name: "Compare propostas e escolha sem favorecimento" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("dados fictícios");
  await expect(page.getByText("3 propostas por escrito: atende ao mínimo de 3 para comparar.")).toBeVisible();

  const propostas = page.getByRole("list", { name: "Propostas na ordem escolhida" }).getByRole("heading", { level: 3 });
  await expect(propostas).toHaveText(["Fornecedor A", "Fornecedor B", "Fornecedor C"]);
  await page.getByLabel("Ordenar por").selectOption("valor");
  await expect(propostas).toHaveText(["Fornecedor B", "Fornecedor A", "Fornecedor C"]);

  const decisao = page.getByRole("region", { name: "Decisão" });
  await expect(decisao).toContainText("Escolha uma proposta");
  await page.getByRole("button", { name: "Escolher Fornecedor C" }).click();
  await expect(page.getByRole("button", { name: "Escolher Fornecedor C" })).toHaveAttribute("aria-pressed", "true");
  await expect(decisao).toContainText("o conselho vota antes da contratação");

  await page.getByRole("button", { name: "Escolher Fornecedor B" }).click();
  await expect(decisao).toContainText("a síndica aprova sem votação");

  const resultado = await new AxeBuilder({ page }).analyze();
  expect(resultado.violations).toEqual([]);
});

test("demonstração por teclado: Tab chega ao botão de escolha e Enter decide", async ({ page }) => {
  await page.goto("/demonstracao");
  const botao = page.getByRole("button", { name: "Escolher Fornecedor A" });
  await expect(botao).toBeVisible();
  for (let i = 0; i < 20 && !(await botao.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(botao).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Decisão" })).toContainText("a síndica aprova sem votação");
});

test("login com o backend fora do ar mostra a falha e o caminho da demonstração", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("pessoa@example.com");
  await page.getByLabel("Senha").fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Não conseguimos falar com o servidor agora.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver a demonstração sem login" })).toBeVisible();

  const resultado = await new AxeBuilder({ page }).analyze();
  expect(resultado.violations).toEqual([]);
});

/* Fim de fluxo.spec.ts */
