/*
 * destino.test.ts — o login só devolve a pessoa para caminhos do próprio app (critério 9).
 */
import { describe, expect, it } from "vitest";
import { destinoSeguro } from "@/lib/destino";

describe("destinoSeguro", () => {
  it("mantém caminhos locais com busca e âncora", () => {
    expect(destinoSeguro("/listas")).toBe("/listas");
    expect(destinoSeguro("/listas?status=aberta#topo")).toBe("/listas?status=aberta#topo");
    expect(destinoSeguro("/listas/../oportunidades")).toBe("/oportunidades");
  });

  it("recusa destinos externos ou ambíguos e usa o padrão", () => {
    for (const de of [
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "/%5Cevil.example",
      "/%2F%2Fevil.example",
      "https://evil.example",
      "javascript:alert(1)",
      "listas",
      "/\tevil",
      "",
      undefined,
      null,
      42,
      "/" + "a".repeat(2048),
    ]) {
      expect(destinoSeguro(de), String(de)).toBe("/");
    }
  });

  it("recusa codificação inválida", () => {
    expect(destinoSeguro("/%E0%A4%A")).toBe("/");
  });

  it("aceita outro padrão", () => {
    expect(destinoSeguro("//evil.example", "/conta")).toBe("/conta");
  });
});

/* Fim de destino.test.ts */
