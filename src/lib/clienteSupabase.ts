/*
 * clienteSupabase.ts — o cliente do Supabase carregado sob demanda (chunk `supabase-*`, ~60 kB gzip).
 * As telas de entrada (login e cadastro) só precisam dele no envio do formulário: importar aqui, e não no topo
 * da tela, tira o supabase-js do caminho da primeira pintura (LCP do /entrar, #58).
 */
import type { supabase as Cliente } from "./supabase";

/* Devolve o cliente único de src/lib/supabase.ts, importado uma vez. */
export function clienteSupabase(): Promise<typeof Cliente> {
  return import("./supabase").then((m) => m.supabase);
}

/* Fim de clienteSupabase.ts */
