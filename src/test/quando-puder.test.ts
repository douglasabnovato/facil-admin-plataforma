/*
 * quando-puder.test.ts — o supabase-js só é pedido depois da primeira pintura nas páginas públicas (#42).
 * Os quadros (requestAnimationFrame) e o ócio (requestIdleCallback) são simulados: cada passo entra num registro,
 * e o teste confere que o pedido vem depois de dois quadros pintados. Sem os requestAnimationFrame em quandoPuder()
 * (a versão anterior ao PR #41), o pedido sai antes do primeiro quadro e o teste falha.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { quandoPuder } from "@/features/auth/quandoPuder";

let quadros: FrameRequestCallback[] = [];
let ociosos: IdleRequestCallback[] = [];
let registro: string[] = [];
let numeroDoQuadro = 0;

/* Pinta um quadro: roda os callbacks pedidos até aqui (os pedidos dentro deles ficam para o próximo). */
function pintarQuadro() {
  const fila = quadros;
  quadros = [];
  numeroDoQuadro += 1;
  registro.push(`quadro ${numeroDoQuadro}`);
  fila.forEach((fn) => fn(numeroDoQuadro * 16));
}

/* O navegador fica ocioso: roda os callbacks de requestIdleCallback. */
function ficarOcioso() {
  const fila = ociosos;
  ociosos = [];
  fila.forEach((fn) => fn({ didTimeout: false, timeRemaining: () => 50 }));
}

/* Deixa as promessas pendentes andarem. */
const esvaziar = () => new Promise((ok) => setTimeout(ok, 0));

/* Chama quandoPuder() e registra o pedido do supabase-js quando ela resolve. */
function pedirSupabase() {
  const estado = { pedido: false };
  quandoPuder().then(() => {
    estado.pedido = true;
    registro.push("pedido do supabase-js");
  });
  return estado;
}

beforeEach(() => {
  quadros = [];
  ociosos = [];
  registro = [];
  numeroDoQuadro = 0;
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => quadros.push(fn));
  vi.stubGlobal("requestIdleCallback", (fn: IdleRequestCallback) => ociosos.push(fn));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("quandoPuder nas páginas públicas", () => {
  it("na /demonstracao, o pedido do supabase-js só sai depois de dois quadros pintados e do ócio", async () => {
    window.history.replaceState({}, "", "/demonstracao");
    const estado = pedirSupabase();

    ficarOcioso();
    await esvaziar();
    expect(estado.pedido).toBe(false);

    pintarQuadro();
    ficarOcioso();
    await esvaziar();
    expect(estado.pedido).toBe(false);

    pintarQuadro();
    await esvaziar();
    expect(estado.pedido).toBe(false);

    ficarOcioso();
    await esvaziar();
    expect(estado.pedido).toBe(true);
    expect(registro).toEqual(["quadro 1", "quadro 2", "pedido do supabase-js"]);
  });

  it("com a página ainda carregando, espera o load antes de contar os quadros", async () => {
    window.history.replaceState({}, "", "/termos");
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const estado = pedirSupabase();

    pintarQuadro();
    pintarQuadro();
    ficarOcioso();
    await esvaziar();
    expect(estado.pedido).toBe(false);

    window.dispatchEvent(new Event("load"));
    ficarOcioso();
    await esvaziar();
    expect(estado.pedido).toBe(false);

    pintarQuadro();
    pintarQuadro();
    ficarOcioso();
    await esvaziar();
    expect(estado.pedido).toBe(true);
    expect(registro).toEqual(["quadro 1", "quadro 2", "quadro 3", "quadro 4", "pedido do supabase-js"]);
  });
});

describe("quandoPuder nas demais páginas", () => {
  it("nas telas logadas (/listas), segue na hora, sem esperar quadro", async () => {
    window.history.replaceState({}, "", "/listas");
    const estado = pedirSupabase();
    await esvaziar();
    expect(estado.pedido).toBe(true);
    expect(registro).toEqual(["pedido do supabase-js"]);
  });
});

/* Fim de quando-puder.test.ts */
