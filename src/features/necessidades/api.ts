/*
 * api.ts (necessidades) — categorias, listas de necessidades, itens, publicação e cancelamento.
 */
import { rpc, supabase } from "@/lib/supabase";
import type { Categoria, ItemLista, Lista, Recorrencia, ResumoLista } from "@/lib/tipos";

export interface ItemRascunho {
  categoria_id: string;
  descricao: string;
  quantidade: number;
  unidade_medida: string;
  recorrencia: Recorrencia;
}

export interface ListaRascunho {
  id?: string;
  condominio_id: string;
  escopo: "condominio" | "unidade";
  unidade?: string;
  titulo: string;
  descricao: string;
  prazo_propostas: string;
  data_desejada: string;
  itens: ItemRascunho[];
}

/* Categorias ativas, serviços primeiro. */
export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from("categorias").select("*").eq("ativo", true).order("grupo", { ascending: false }).order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []) as Categoria[];
}

export const minhasListas = (condominio?: string | null) => rpc<ResumoLista[]>("minhas_listas", { p_condominio: condominio ?? null });

/* Lista com itens (RLS decide o acesso). */
export async function buscarLista(id: string): Promise<{ lista: Lista; itens: ItemLista[] }> {
  const [l, i] = await Promise.all([
    supabase.from("listas").select("*").eq("id", id).single(),
    supabase.from("itens").select("*").eq("lista_id", id).order("descricao"),
  ]);
  if (l.error) throw new Error(l.error.code === "PGRST116" ? "Lista não encontrada ou sem acesso" : l.error.message);
  if (i.error) throw new Error(i.error.message);
  return { lista: l.data as Lista, itens: (i.data ?? []) as ItemLista[] };
}

/* Quantos fornecedores compatíveis a lista tem (match). */
export async function contarCompativeis(id: string): Promise<number> {
  const { count, error } = await supabase.from("matches").select("fornecedor_id", { count: "exact", head: true }).eq("lista_id", id);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export const salvarLista = (p: ListaRascunho) => rpc<string>("salvar_lista", { p });
export const publicarLista = (id: string) => rpc<number>("publicar_lista", { p_lista: id });
export const cancelarLista = (id: string) => rpc<void>("cancelar_lista", { p_lista: id });

/* Fim de api.ts */
