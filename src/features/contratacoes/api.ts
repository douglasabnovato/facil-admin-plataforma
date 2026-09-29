/*
 * api.ts (contratações) — lista, votação do conselho, mudança de status, contatos e avaliação.
 */
import { rpc, supabase } from "@/lib/supabase";
import type { Contatos, MinhaContratacao, StatusContratacao } from "@/lib/tipos";

export const minhasContratacoes = () => rpc<MinhaContratacao[]>("minhas_contratacoes");
export const votar = (id: string, aprova: boolean, comentario?: string) =>
  rpc<StatusContratacao>("votar_contratacao", { p_contratacao: id, p_aprova: aprova, p_comentario: comentario || null });
export const atualizarContratacao = (id: string, status: "em_execucao" | "concluida" | "cancelada") =>
  rpc<void>("atualizar_contratacao", { p_contratacao: id, p_status: status });
export const contatos = (id: string) => rpc<Contatos>("contatos_contratacao", { p_contratacao: id });
export const avaliar = (id: string, nota: number, comentario?: string) =>
  rpc<void>("avaliar", { p_contratacao: id, p_nota: nota, p_comentario: comentario || null });

/* Comentários dos votos (sem nomes; visíveis a quem decide). */
export async function comentariosVotos(id: string): Promise<Array<{ aprova: boolean; comentario: string | null; created_at: string }>> {
  const { data, error } = await supabase.from("aprovacoes").select("aprova, comentario, created_at").eq("contratacao_id", id).order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/* Fim de api.ts */
