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

/* Fim de primeira-carga.spec.ts */
