/*
 * api.ts (notificacoes) — avisos in-app do usuário: listar e marcar como lidas.
 */
import { supabase } from "@/lib/supabase";
import type { Notificacao } from "@/lib/tipos";

/* Últimas 100 notificações do usuário. */
export async function listarNotificacoes(): Promise<Notificacao[]> {
  const { data, error } = await supabase.from("notificacoes").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as Notificacao[];
}

/* Marca como lidas (uma ou todas). */
export async function marcarLidas(id?: string): Promise<void> {
  let q = supabase.from("notificacoes").update({ lida: true }).eq("lida", false);
  if (id) q = q.eq("id", id);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

/* Fim de api.ts */
