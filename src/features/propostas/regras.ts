/*
 * regras.ts (propostas) — cálculos do comparativo e da proposta, espelhando as regras do banco.
 */
import type { Comparativo } from "@/lib/tipos";

/* Para cada item, a proposta com o menor valor unitário (empates ficam com a primeira). */
export function menorPorItem(c: Pick<Comparativo, "propostas">): Record<string, string> {
  const melhor: Record<string, { id: string; valor: number }> = {};
  for (const p of c.propostas) {
    for (const it of p.itens) {
      const v = Number(it.valor_unitario);
      if (!melhor[it.item_id] || v < melhor[it.item_id].valor) melhor[it.item_id] = { id: p.id, valor: v };
    }
  }
  return Object.fromEntries(Object.entries(melhor).map(([k, v]) => [k, v.id]));
}

/* RN06: lista do condomínio, valor acima do limite e ao menos um conselheiro ativo. */
export function precisaConselho(valor: number, limite: number, conselheiros: number, escopo: "condominio" | "unidade"): boolean {
  return escopo === "condominio" && conselheiros > 0 && valor > limite;
}

/* Total da proposta: soma de valor unitário × quantidade dos itens cotados. */
export function totalProposta(itens: Array<{ quantidade: number }>, valores: Record<string, number | undefined>, ids: string[]): number {
  return ids.reduce((soma, id, i) => {
    const v = valores[id];
    return v === undefined || Number.isNaN(v) ? soma : soma + v * Number(itens[i].quantidade);
  }, 0);
}

/* Converte "1.234,56" ou "1234.56" em número. */
export function lerValor(txt: string): number | undefined {
  const t = txt.trim();
  if (!t) return undefined;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/* Critérios de ordenação do comparativo. */
export type CriterioOrdem = "score" | "valor" | "prazo";

/* Ordena sem alterar a lista original. Empate mantém a ordem recebida. */
export function ordenarPropostas<T extends { valor: number; prazoDias: number; score: number }>(lista: T[], criterio: CriterioOrdem): T[] {
  const chave = (p: T) => (criterio === "score" ? -p.score : criterio === "valor" ? p.valor : p.prazoDias);
  return lista.map((p, i) => ({ p, i })).sort((a, b) => chave(a.p) - chave(b.p) || a.i - b.i).map((x) => x.p);
}

/* Boa prática de condomínio: ao menos 3 propostas por escrito antes de decidir. */
export const MINIMO_PROPOSTAS = 3;
export function faltamPropostas(recebidas: number, minimo = MINIMO_PROPOSTAS): number {
  return Math.max(0, minimo - recebidas);
}

/* Fim de regras.ts */
