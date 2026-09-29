/*
 * api.ts (organizações) — condomínios, administradoras, membros e convites.
 */
import { rpc, supabase } from "@/lib/supabase";
import type { Condominio, Membro, MeuCondominio, Papel } from "@/lib/tipos";

export const meusCondominios = () => rpc<MeuCondominio[]>("meus_condominios");

export const criarCondominio = (p: Record<string, unknown>) => rpc<string>("criar_condominio", { p });

export const criarAdministradora = (p: { nome: string; cnpj?: string }) => rpc<string>("criar_administradora", { p });

export const entrarCondominio = (codigo: string, unidade: string) => rpc<string>("entrar_condominio", { p_codigo: codigo, p_unidade: unidade });

export const membrosCondominio = (id: string) => rpc<Membro[]>("membros_condominio", { p_condominio: id });

export const gerenciarMembro = (condominio: string, user: string, acao: "aprovar" | "recusar" | "papel" | "remover", papel?: Papel) =>
  rpc<void>("gerenciar_membro", { p_condominio: condominio, p_user: user, p_acao: acao, p_papel: papel ?? null });

export const novoCodigoConvite = (id: string) => rpc<string>("novo_codigo_convite", { p_condominio: id });

/* Dados completos do condomínio (RLS: só membros). */
export async function buscarCondominio(id: string): Promise<Condominio> {
  const { data, error } = await supabase.from("condominios").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as Condominio;
}

/* Gestor atualiza dados e regras (colunas liberadas na migração 02). */
export async function atualizarCondominio(id: string, campos: Partial<Condominio>): Promise<void> {
  const { error } = await supabase.from("condominios").update(campos).eq("id", id);
  if (error) throw new Error(error.message);
}

/* Administradoras de que o usuário faz parte. */
export async function minhasAdministradoras(): Promise<Array<{ id: string; nome: string }>> {
  const { data, error } = await supabase.from("administradoras").select("id, nome").order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/* Fim de api.ts */
