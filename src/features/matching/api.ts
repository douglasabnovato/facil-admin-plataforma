/*
 * api.ts (matching) — vitrine de oportunidades do fornecedor (listas compatíveis, anonimizadas).
 */
import { rpc } from "@/lib/supabase";
import type { Oportunidade, OportunidadeDetalhe } from "@/lib/tipos";

export const oportunidades = () => rpc<Oportunidade[]>("oportunidades");
export const oportunidadeDetalhe = (lista: string) => rpc<OportunidadeDetalhe>("oportunidade_detalhe", { p_lista: lista });
export const ignorarOportunidade = (lista: string, ignorar = true) => rpc<void>("ignorar_oportunidade", { p_lista: lista, p_ignorar: ignorar });

/* Fim de api.ts */
