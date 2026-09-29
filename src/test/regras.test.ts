/*
 * regras.test.ts — regras do front que espelham o banco: comparativo, conselho, total, validação da lista e menu.
 */
import { describe, expect, it } from "vitest";
import { lerValor, menorPorItem, precisaConselho, totalProposta } from "@/features/propostas/regras";
import { validarLista } from "@/features/necessidades/validacao";
import type { ListaRascunho } from "@/features/necessidades/api";
import { itensMenu } from "@/app/menu";
import type { PropostaComparativo } from "@/lib/tipos";

const prop = (id: string, itens: Array<[string, number]>): PropostaComparativo => ({
  id, status: "enviada", valor_total: 0, prazo_execucao_dias: 1, validade: "2027-01-01", condicoes: null, enviada_em: "",
  fornecedor: { id, nome: id, verificado: true, cidade: "", uf: "", nota: null, avaliacoes: 0 }, score: 50, motivos: [],
  itens: itens.map(([item_id, valor_unitario]) => ({ item_id, valor_unitario, observacao: null })),
});

describe("comparativo", () => {
  it("marca o menor valor de cada item", () => {
    const r = menorPorItem({ propostas: [prop("a", [["i1", 100], ["i2", 50]]), prop("b", [["i1", 80]]), prop("c", [["i1", 80], ["i2", 60]])] });
    expect(r).toEqual({ i1: "b", i2: "a" });
  });
});

describe("RN06 — conselho", () => {
  it("exige conselho só em lista do condomínio, acima do limite e com conselheiros", () => {
    expect(precisaConselho(6000, 5000, 3, "condominio")).toBe(true);
    expect(precisaConselho(5000, 5000, 3, "condominio")).toBe(false);
    expect(precisaConselho(6000, 5000, 0, "condominio")).toBe(false);
    expect(precisaConselho(6000, 5000, 3, "unidade")).toBe(false);
  });
});

describe("proposta", () => {
  it("soma valor × quantidade só dos itens preenchidos", () => {
    expect(totalProposta([{ quantidade: 2 }, { quantidade: 3 }], { a: 10, b: undefined }, ["a", "b"])).toBe(20);
  });
  it("lê valores em formato brasileiro", () => {
    expect(lerValor("1.234,56")).toBe(1234.56);
    expect(lerValor("99.9")).toBe(99.9);
    expect(lerValor("")).toBeUndefined();
    expect(lerValor("-3")).toBeUndefined();
  });
});

describe("validação da lista", () => {
  const base: ListaRascunho = {
    condominio_id: "c", escopo: "condominio", titulo: "Portão", descricao: "", prazo_propostas: "2026-10-10", data_desejada: "",
    itens: [{ categoria_id: "x", descricao: "Motor do portão", quantidade: 1, unidade_medida: "un", recorrencia: "unica" }],
  };
  it("aceita lista completa", () => expect(validarLista(base, "2026-10-01")).toEqual([]));
  it("aponta item sem categoria e prazo no passado", () => {
    const erros = validarLista({ ...base, prazo_propostas: "2026-09-01", itens: [{ ...base.itens[0], categoria_id: "" }] }, "2026-10-01");
    expect(erros).toContain("Item 1: escolha a categoria.");
    expect(erros).toContain("O prazo para propostas não pode estar no passado.");
  });
  it("exige ao menos um item", () => expect(validarLista({ ...base, itens: [] }, "2026-10-01")).toContain("Inclua ao menos um item."));
});

describe("menu", () => {
  it("fornecedor vê oportunidades; gestor vê condomínios; admin vê Admin", () => {
    expect(itensMenu("fornecedor", false).map((i) => i.para)).toContain("/oportunidades");
    expect(itensMenu("gestor", false).map((i) => i.para)).toContain("/condominios");
    expect(itensMenu("gestor", true).map((i) => i.para)).toContain("/admin");
  });
});

/* Fim de regras.test.ts */
