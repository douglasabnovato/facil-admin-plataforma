/*
 * validacao.ts — regras de preenchimento da lista antes de enviar ao banco (o banco valida de novo).
 */
import type { ListaRascunho } from "./api";

/* Devolve a lista de problemas; vazia quando pode salvar. */
export function validarLista(l: ListaRascunho, hoje: string): string[] {
  const erros: string[] = [];
  if (!l.condominio_id) erros.push("Escolha o condomínio.");
  if (l.titulo.trim().length < 3) erros.push("Dê um título para a lista.");
  if (!l.itens.length) erros.push("Inclua ao menos um item.");
  if (l.itens.length > 50) erros.push("Use no máximo 50 itens por lista.");
  l.itens.forEach((it, i) => {
    if (!it.categoria_id) erros.push(`Item ${i + 1}: escolha a categoria.`);
    if (it.descricao.trim().length < 3) erros.push(`Item ${i + 1}: descreva o item.`);
    if (!(it.quantidade > 0)) erros.push(`Item ${i + 1}: quantidade precisa ser maior que zero.`);
  });
  if (l.prazo_propostas && l.prazo_propostas < hoje) erros.push("O prazo para propostas não pode estar no passado.");
  if (l.data_desejada && l.prazo_propostas && l.data_desejada < l.prazo_propostas) erros.push("A data desejada vem depois do prazo de propostas.");
  return erros;
}

/* Fim de validacao.ts */
