/*
 * contraste.test.ts — contraste (WCAG 2.1 AA, 4,5:1 para texto) dos pares de cores que as telas logadas usam,
 * calculado a partir dos tokens de src/index.css. Cobre o que o axe não mede no jsdom.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "../index.css"), "utf-8");

/* Lê um token HSL ("220 9% 40%") do :root e devolve RGB 0–255. */
function token(nome: string): number[] {
  const m = css.match(new RegExp(`--${nome}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`));
  if (!m) throw new Error(`token --${nome} não encontrado`);
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((x) => x * 255);
}

/* Cor com opacidade sobre um fundo. */
const sobre = (cor: number[], fundo: number[], alfa: number) => cor.map((v, i) => v * alfa + fundo[i] * (1 - alfa));

function luminancia(c: number[]) {
  const [r, g, b] = c.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: number[], b: number[]) {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const branco = [255, 255, 255];
const card = token("card");

/* [descrição, texto, fundo] — classes usadas em Comuns.tsx (selos), Contratacoes, Condominios e Painel. */
const pares: Array<[string, number[], number[]]> = [
  ["texto secundário no fundo da página", token("muted-foreground"), token("background")],
  ["texto secundário no cartão", token("muted-foreground"), card],
  ["texto secundário em bg-muted", token("muted-foreground"), token("muted")],
  ["selo âmbar (text-warning em bg-warning/10)", token("warning"), sobre(token("warning"), card, 0.1)],
  ["selo verde (text-success em bg-success/10)", token("success"), sobre(token("success"), card, 0.1)],
  ["selo vermelho (text-destructive em bg-destructive/10)", token("destructive"), sobre(token("destructive"), card, 0.1)],
  ["selo azul (text-secondary-foreground em bg-secondary)", token("secondary-foreground"), token("secondary")],
  ["\"Seu voto\" (branco em bg-warning)", branco, token("warning")],
  ["\"Aguardando aprovação\" (text-warning no cartão)", token("warning"), card],
  ["\"Avalie\" (text-accent no cartão)", token("accent"), card],
  ["botão principal", token("primary-foreground"), token("primary")],
  ["contador de não lidas (branco em bg-destructive)", branco, token("destructive")],
];

describe("contraste dos tokens usados nas telas logadas", () => {
  it.each(pares)("%s atinge 4,5:1", (_nome, texto, fundo) => {
    expect(contraste(texto, fundo)).toBeGreaterThanOrEqual(4.5);
  });
});

/* Fim de contraste.test.ts */
