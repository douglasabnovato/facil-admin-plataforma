/*
 * quandoPuder.ts — momento de importar o supabase-js para ler a sessão. Nas páginas que pintam sem ela (demonstração,
 * termos, privacidade, login e cadastro), espera o load, um quadro pintado e o navegador ocioso; nas demais, segue na hora.
 * No login e no cadastro, quem já tem sessão vê o formulário por um instante antes de ir para o painel (#58).
 * Os dois requestAnimationFrame garantem que um quadro já foi pintado: sem eles, quando a primeira pintura
 * vinha depois do load, o supabase-js (~59 kB gzip) disputava a rede com o h1 do LCP (#36).
 * Em aba oculta o requestAnimationFrame não roda: a sessão só carrega quando a aba aparece (só nas páginas públicas).
 * Teste em src/test/quando-puder.test.ts (#42).
 */

export const PUBLICAS = ["/demonstracao", "/termos", "/privacidade", "/entrar", "/cadastro"];

/* Resolve quando o supabase-js pode ser pedido sem atrasar a primeira pintura. */
export function quandoPuder(): Promise<void> {
  const caminho = window.location.pathname.replace(import.meta.env.BASE_URL.replace(/\/$/, ""), "");
  if (!PUBLICAS.some((p) => caminho.startsWith(p))) return Promise.resolve();
  return new Promise((ok) => {
    const depoisDaPintura = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn));
    const ocioso = () =>
      depoisDaPintura(() => ("requestIdleCallback" in window ? window.requestIdleCallback(() => ok(), { timeout: 3000 }) : setTimeout(ok, 1500)));
    if (document.readyState === "complete") ocioso();
    else window.addEventListener("load", ocioso, { once: true });
  });
}

/* Fim de quandoPuder.ts */
