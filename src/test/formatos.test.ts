/*
 * formatos.test.ts — formatação e busca de endereço (com fetch simulado).
 */
import { describe, expect, it, vi } from "vitest";
import { formatarData, formatarDocumento, formatarReais, linkWhatsApp, tempoRelativo } from "@/lib/formatos";
import { buscarCep, enderecoValido, ENDERECO_VAZIO, geocodificar, normalizarCep } from "@/lib/endereco";

describe("formatos", () => {
  it("moeda, data e documento", () => {
    expect(formatarReais(1234.5).replace(/\s/g, " ")).toBe("R$ 1.234,50");
    expect(formatarData("2026-10-05")).toBe("05/10/2026");
    expect(formatarDocumento("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatarDocumento("12345678901")).toBe("123.456.789-01");
  });
  it("WhatsApp com DDI", () => {
    expect(linkWhatsApp("(32) 99999-0000")).toBe("https://wa.me/5532999990000");
    expect(linkWhatsApp("123")).toBeNull();
  });
  it("tempo relativo", () => {
    const agora = new Date("2026-10-01T12:00:00Z");
    expect(tempoRelativo("2026-10-01T11:59:30Z", agora)).toBe("agora");
    expect(tempoRelativo("2026-10-01T09:00:00Z", agora)).toBe("há 3 h");
    expect(tempoRelativo("2026-09-29T12:00:00Z", agora)).toBe("há 2 dias");
  });
});

const resposta = (ok: boolean, corpo: unknown) => Promise.resolve({ ok, json: () => Promise.resolve(corpo) } as Response);

describe("endereço", () => {
  it("normaliza CEP e valida o mínimo", () => {
    expect(normalizarCep("36010-000")).toBe("36010000");
    expect(normalizarCep("123")).toBeNull();
    expect(enderecoValido({ ...ENDERECO_VAZIO, cep: "36010-000", cidade: "Juiz de Fora", uf: "MG" })).toBe(true);
  });
  it("usa a BrasilAPI e cai para o ViaCEP", async () => {
    const f = vi.fn()
      .mockReturnValueOnce(resposta(false, {}))
      .mockReturnValueOnce(resposta(true, { logradouro: "Rua Halfeld", bairro: "Centro", localidade: "Juiz de Fora", uf: "MG" }));
    const e = await buscarCep("36010-000", f as unknown as typeof fetch);
    expect(e).toMatchObject({ cidade: "Juiz de Fora", uf: "MG", latitude: null });
    expect(f.mock.calls[1][0]).toContain("viacep");
  });
  it("geocodifica tentando formas mais amplas", async () => {
    const f = vi.fn().mockReturnValueOnce(resposta(true, [])).mockReturnValueOnce(resposta(true, [{ lat: "-21.76", lon: "-43.35" }]));
    const c = await geocodificar({ logradouro: "Rua X", bairro: "Centro", cidade: "Juiz de Fora", uf: "MG" }, f as unknown as typeof fetch);
    expect(c).toEqual({ latitude: -21.76, longitude: -43.35 });
  });
});

/* Fim de formatos.test.ts */
