/*
 * supabase.ts — cliente único do Supabase (Auth com PKCE, sessão persistida no navegador).
 * As chaves vêm do .env (VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY); nunca coloque a service_role no front.
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const configurado = Boolean(url && chave);

export const supabase = createClient(url || "http://localhost:54321", chave || "sem-chave", {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/* Chama uma função do banco (RPC) e devolve o dado ou lança o erro com a mensagem do banco. */
export async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/* Fim de supabase.ts */
