/*
 * primeira-carga.spec.ts — guarda o LCP da /demonstracao (#36): o h1, que é o elemento do LCP, tem de pintar
 * só com o JS que o index.html já pede (script de entrada e modulepreload). Se a página voltar para um
 * chunk sob demanda (`React.lazy`), o h1 passa a esperar um segundo pedido de JS e este teste falha.
 * Também confere que o supabase-js não entra na primeira carga.
 */
import { expect, test } from "@playwright/test";

/* Caminhos de JS que o index.html pede direto. */
function jsDoHtml(html: string): string[] {
  const caminhos = [...html.matchAll(/<(?:script[^>]*\ssrc|link[^>]*rel="modulepreload"[^>]*\shref)="([^"]+\.js)"/g)].map((m) => m[1]);
  return caminhos.map((c) => new URL(c, "http://x").pathname);
}

test("o h1 da demonstração pinta só com o JS do index.html, sem o supabase-js", async ({ page, request }) => {
  const html = await (await request.get("/demonstracao")).text();
  const permitidos = jsDoHtml(html);
  expect(permitidos.length).toBeGreaterThan(0);
  expect(permitidos.filter((c) => /supabase/.test(c))).toEqual([]);

  const cortados: string[] = [];
  await page.route(/\.js(\?.*)?$/, (rota) => {
    const caminho = new URL(rota.request().url()).pathname;
    if (permitidos.includes(caminho)) return rota.continue();
    cortados.push(caminho);
    return rota.abort();
  });
  await page.route(/supabase-e2e\.invalid|fonts\.(googleapis|gstatic)\.com|gc\.zgo\.at|goatcounter\.com/, (rota) => rota.abort());

  await page.goto("/demonstracao");
  await expect(page.getByRole("heading", { level: 1, name: "Compare propostas e escolha sem favorecimento" })).toBeVisible({ timeout: 10_000 });
  /* Conferência extra, dependente do nome do chunk; quem guarda de verdade é o toBeVisible acima. */
  expect(cortados.filter((c) => /Demonstracao/.test(c))).toEqual([]);
});

/*
 * LCP do /entrar (#58): o login e o cadastro pintam sem o supabase-js. Com o chunk `supabase-*` bloqueado, o texto
 * aparece; o cliente só é pedido no envio. Se a tela voltar a importar o Supabase no topo, o chunk dela passa a
 * depender do `supabase-*`, nada pinta e este teste falha.
 */
for (const [rota, titulo] of [
  ["/entrar", "Entrar"],
  ["/cadastro", "Criar conta"],
] as const) {
  test(`${rota} pinta o h1 sem o supabase-js`, async ({ page }) => {
    const pedidosSupabase: string[] = [];
    await page.route(/\/assets\/supabase-[^/]*\.js(\?.*)?$/, (rota) => {
      pedidosSupabase.push(rota.request().url());
      return rota.abort();
    });
    await page.route(/supabase-e2e\.invalid|fonts\.(googleapis|gstatic)\.com|gc\.zgo\.at|goatcounter\.com/, (rota) => rota.abort());

    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible({ timeout: 10_000 });
  });
}

test("/entrar com o cliente sob demanda: o envio ainda chega ao servidor", async ({ page }) => {
  await page.route(/supabase-e2e\.invalid|fonts\.(googleapis|gstatic)\.com|gc\.zgo\.at|goatcounter\.com/, (rota) => rota.abort());

  await page.goto("/entrar");
  await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
  await page.getByLabel("E-mail").fill("pessoa@example.com");
  await page.getByLabel("Senha").fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  /* A mensagem de falha de rede só aparece se o envio carregou o cliente e chamou o Auth. */
  await expect(page.getByText("Não conseguimos falar com o servidor agora.", { exact: false })).toBeVisible();
});

test("/entrar com o chunk do supabase-js fora do ar avisa no envio, sem travar", async ({ page }) => {
  await page.route(/\/assets\/supabase-[^/]*\.js(\?.*)?$/, (rota) => rota.abort());
  await page.route(/supabase-e2e\.invalid|fonts\.(googleapis|gstatic)\.com|gc\.zgo\.at|goatcounter\.com/, (rota) => rota.abort());

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("pessoa@example.com");
  await page.getByLabel("Senha").fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Não conseguimos falar com o servidor agora.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
});

/* Fim de primeira-carga.spec.ts */
