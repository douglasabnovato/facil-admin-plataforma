/*
 * api.ts (propostas) — comparativo, escolha, envio e retirada de propostas.
 */
import { rpc } from "@/lib/supabase";
import type { Comparativo, MinhaProposta } from "@/lib/tipos";

export interface EnvioProposta {
  lista_id: string;
  prazo_execucao_dias: number;
  validade: string;
  condicoes: string;
  itens: Array<{ item_id: string; valor_unitario: number; observacao?: string }>;
}

export const comparativo = (lista: string) => rpc<Comparativo>("comparativo", { p_lista: lista });
export const escolherProposta = (proposta: string) => rpc<string>("escolher_proposta", { p_proposta: proposta });
export const enviarProposta = (p: EnvioProposta) => rpc<string>("enviar_proposta", { p });
export const retirarProposta = (proposta: string) => rpc<void>("retirar_proposta", { p_proposta: proposta });
export const minhasPropostas = () => rpc<MinhaProposta[]>("minhas_propostas");

/* Fim de api.ts */
