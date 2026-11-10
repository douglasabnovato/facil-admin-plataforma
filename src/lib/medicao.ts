/*
 * medicao.ts — medição de uso (critério 5, decisão D5 de 10/11/2026): GoatCounter, sem cookie e sem dado pessoal.
 * Conta o caminho da visita e, como evento, os cliques marcados com data-evento (escolher proposta na demonstração
 * e publicar a lista). O clique é ouvido no documento, porque as telas entram depois do script.
 * Só carrega no build de produção e fora de navegador automatizado (Playwright). A conta é do responsável.
 */
export const ENDERECO_CONTAGEM = "https://douglasabnovato.goatcounter.com/count";
export const SCRIPT_CONTAGEM = "https://gc.zgo.at/count.js";

type Ambiente = { producao: boolean; automatizado: boolean };
type Contador = { count: (dados: { path: string; title?: string; event: boolean }) => void };

/* Diz se a visita deve ser contada. */
export function deveMedir({ producao, automatizado }: Ambiente) {
  return producao && !automatizado;
}

/* Envia o evento do elemento clicado, se ele (ou um ancestral) tiver data-evento. */
export function contarClique(alvo: EventTarget | null, contador: Contador | undefined) {
  if (!(alvo instanceof Element) || !contador) return false;
  const elemento = alvo.closest<HTMLElement>("[data-evento]");
  const nome = elemento?.dataset.evento;
  if (!nome) return false;
  contador.count({ path: nome, title: elemento.textContent?.trim(), event: true });
  return true;
}

/* Acrescenta o script do GoatCounter uma única vez, se a visita deve ser contada. */
export function iniciarMedicao(documento: Document, ambiente: Ambiente) {
  if (!deveMedir(ambiente)) return false;
  if (documento.querySelector("script[data-goatcounter]")) return true;
  documento.addEventListener("click", (evento) => {
    const janela = documento.defaultView as (Window & { goatcounter?: Contador }) | null;
    contarClique(evento.target, janela?.goatcounter);
  });
  const script = documento.createElement("script");
  script.async = true;
  script.src = SCRIPT_CONTAGEM;
  script.dataset.goatcounter = ENDERECO_CONTAGEM;
  documento.body.appendChild(script);
  return true;
}

/* Fim de medicao.ts */
