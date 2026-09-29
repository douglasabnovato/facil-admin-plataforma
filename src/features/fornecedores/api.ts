/*
 * api.ts (fornecedores) — perfil do fornecedor, categorias atendidas e documentos (Storage + registro).
 */
import { rpc, supabase } from "@/lib/supabase";
import type { Documento, Fornecedor, TipoDocumento } from "@/lib/tipos";

/* Perfil do fornecedor logado (ou null) e ids das categorias atendidas. */
export async function meuFornecedor(): Promise<{ fornecedor: Fornecedor | null; categorias: string[] }> {
  const { data, error } = await supabase.from("fornecedores").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { fornecedor: null, categorias: [] };
  const cats = await supabase.from("fornecedor_categorias").select("categoria_id").eq("fornecedor_id", data.id);
  if (cats.error) throw new Error(cats.error.message);
  return { fornecedor: data as Fornecedor, categorias: (cats.data ?? []).map((c) => c.categoria_id as string) };
}

export const salvarFornecedor = (p: Record<string, unknown>) => rpc<string>("salvar_fornecedor", { p });

/* Documentos do fornecedor logado. */
export async function meusDocumentos(): Promise<Documento[]> {
  const { data, error } = await supabase.from("documentos").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Documento[];
}

/* Nome de arquivo seguro para o Storage. */
export function nomeSeguro(nome: string): string {
  const ext = nome.includes(".") ? nome.slice(nome.lastIndexOf(".")).toLowerCase() : "";
  const base = nome.slice(0, nome.length - ext.length).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 60);
  return `${base || "arquivo"}${ext}`;
}

/* Envia o arquivo para documentos/<fornecedor>/ e registra para análise. */
export async function enviarDocumento(fornecedorId: string, tipo: TipoDocumento, arquivo: File, validade: string | null): Promise<void> {
  if (arquivo.size > 10 * 1024 * 1024) throw new Error("O arquivo passa de 10 MB.");
  const caminho = `${fornecedorId}/${Date.now()}-${nomeSeguro(arquivo.name)}`;
  const up = await supabase.storage.from("documentos").upload(caminho, arquivo, { upsert: false, contentType: arquivo.type || undefined });
  if (up.error) throw new Error(up.error.message);
  await rpc<string>("registrar_documento", { p: { tipo, arquivo_path: caminho, validade } });
}

/* Remove documento ainda em análise (registro e arquivo). */
export async function removerDocumento(doc: Documento): Promise<void> {
  const { error } = await supabase.from("documentos").delete().eq("id", doc.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from("documentos").remove([doc.arquivo_path]);
}

/* Link temporário (5 min) para abrir o arquivo. */
export async function linkDocumento(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(caminho, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/* Fim de api.ts */
