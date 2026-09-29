/*
 * formatos.ts — formatação (moeda, data, documento) e rótulos em português dos status e papéis.
 */
import type { Papel, Recorrencia, StatusContratacao, StatusLista, StatusProposta, TipoDocumento } from "./tipos";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/* R$ 1.234,56 */
export function formatarReais(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return moeda.format(Number(valor));
}

/* dd/mm/aaaa a partir de 'aaaa-mm-dd' ou ISO, sem deslocamento de fuso para datas puras. */
export function formatarData(valor: string | null | undefined): string {
  if (!valor) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Date(valor).toLocaleDateString("pt-BR");
}

/* Data de hoje + n dias em 'aaaa-mm-dd' (fuso local). */
export function dataISO(diasAFrente = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + diasAFrente);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* Tempo relativo curto: "agora", "há 5 min", "há 3 h", "há 2 dias". */
export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  const s = Math.max(0, (agora.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

/* Só dígitos. */
export function digitos(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

/* CPF ou CNPJ com máscara. */
export function formatarDocumento(v: string | null | undefined): string {
  const d = digitos(v);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v ?? "";
}

/* Link de WhatsApp para um telefone brasileiro. */
export function linkWhatsApp(telefone: string | null | undefined): string | null {
  const d = digitos(telefone);
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : "55" + d}`;
}

export const ROTULO_PAPEL: Record<Papel, string> = {
  sindico: "Síndico",
  administradora: "Administradora",
  conselheiro: "Conselheiro",
  condomino: "Condômino",
};

export const ROTULO_STATUS_LISTA: Record<StatusLista, string> = {
  sugestao: "Sugestão",
  rascunho: "Rascunho",
  aberta: "Recebendo propostas",
  em_aprovacao: "Em aprovação",
  contratada: "Contratada",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

export const ROTULO_STATUS_PROPOSTA: Record<StatusProposta, string> = {
  enviada: "Enviada",
  escolhida: "Escolhida",
  recusada: "Não escolhida",
  retirada: "Retirada",
  expirada: "Expirada",
};

export const ROTULO_STATUS_CONTRATACAO: Record<StatusContratacao, string> = {
  aguardando_aprovacao: "Aguardando conselho",
  aprovada: "Aprovada",
  recusada: "Recusada pelo conselho",
  em_execucao: "Em execução",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const ROTULO_RECORRENCIA: Record<Recorrencia, string> = {
  unica: "Única",
  mensal: "Mensal",
  trimestral: "Trimestral",
  anual: "Anual",
};

export const ROTULO_DOCUMENTO: Record<TipoDocumento, string> = {
  cnpj: "Cartão CNPJ",
  nr10: "NR-10 (elétrica)",
  nr35: "NR-35 (altura)",
  credenciamento_bombeiros: "Credenciamento dos bombeiros",
  seguro: "Seguro de responsabilidade civil",
  outro: "Outro",
};

/* Rótulo de certificação exigida (nr10 → NR-10). */
export function rotuloCertificacao(c: string): string {
  return ROTULO_DOCUMENTO[c as TipoDocumento] ?? c;
}

/* Fim de formatos.ts */
