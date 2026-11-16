/*
 * medicao.test.ts — o GoatCounter só entra no build de produção, fora do Playwright, e conta os cliques marcados (D5).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ENDERECO_CONTAGEM, contarClique, deveMedir, iniciarMedicao } from "@/lib/medicao";

const seletor = "script[data-goatcounter]";

afterEach(() => {
  document.querySelectorAll(seletor).forEach((s) => s.remove());
  document.body.innerHTML = "";
});

describe("medição de uso", () => {
  it("não carrega em desenvolvimento nem nos testes", () => {
    expect(iniciarMedicao(document, { producao: import.meta.env.PROD, automatizado: false })).toBe(false);
    expect(document.querySelector(seletor)).toBeNull();
  });

  it("não carrega em navegador automatizado, mesmo no build", () => {
    expect(deveMedir({ producao: true, automatizado: true })).toBe(false);
    iniciarMedicao(document, { producao: true, automatizado: true });
    expect(document.querySelector(seletor)).toBeNull();
  });

  it("carrega uma vez no build de produção, com o endereço do portfólio", () => {
    iniciarMedicao(document, { producao: true, automatizado: false });
    iniciarMedicao(document, { producao: true, automatizado: false });
    const scripts = document.querySelectorAll<HTMLScriptElement>(seletor);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.dataset.goatcounter).toBe(ENDERECO_CONTAGEM);
  });

  it("conta o clique marcado e ignora os demais", () => {
    const contador = { count: vi.fn() };
    const botao = document.createElement("button");
    botao.dataset.evento = "demonstracao-escolher";
    botao.textContent = " Escolher Fornecedor A ";
    document.body.appendChild(botao);
    expect(contarClique(botao, contador)).toBe(true);
    expect(contador.count).toHaveBeenCalledWith({ path: "demonstracao-escolher", title: "Escolher Fornecedor A", event: true });
    expect(contarClique(document.body, contador)).toBe(false);
    expect(contarClique(botao, undefined)).toBe(false);
    expect(contador.count).toHaveBeenCalledTimes(1);
  });
});

/* Fim de medicao.test.ts */
