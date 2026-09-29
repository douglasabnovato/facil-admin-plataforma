/*
 * Admin.tsx — painel da equipe FacilAdmin: fila de documentos, verificação de fornecedores e categorias.
 * Acesso só para perfis com is_admin = true (definido por SQL; ver docs/CONFIGURACAO.md).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina, Carregando, EstadoVazio } from "@/components/Comuns";
import { formatarData, formatarDocumento, ROTULO_DOCUMENTO } from "@/lib/formatos";
import { rpc, supabase } from "@/lib/supabase";
import type { Categoria, Documento, Fornecedor } from "@/lib/tipos";
import { linkDocumento } from "@/features/fornecedores/api";

/* Fornecedores e documentos (admin lê tudo pela RLS). */
async function carregar(): Promise<{ fornecedores: Fornecedor[]; documentos: Documento[] }> {
  const [f, d] = await Promise.all([
    supabase.from("fornecedores").select("*").order("created_at", { ascending: false }),
    supabase.from("documentos").select("*").order("created_at"),
  ]);
  if (f.error) throw new Error(f.error.message);
  if (d.error) throw new Error(d.error.message);
  return { fornecedores: (f.data ?? []) as Fornecedor[], documentos: (d.data ?? []) as Documento[] };
}

/* Página de administração. */
export default function Admin() {
  const cliente = useQueryClient();
  const q = useQuery({ queryKey: ["admin"], queryFn: carregar });
  const cats = useQuery({ queryKey: ["admin-categorias"], queryFn: async () => {
    const { data, error } = await supabase.from("categorias").select("*").order("grupo", { ascending: false }).order("nome");
    if (error) throw new Error(error.message);
    return (data ?? []) as Categoria[];
  } });
  const [obs, setObs] = useState<Record<string, string>>({});
  const [nova, setNova] = useState({ nome: "", slug: "", grupo: "servico", certificacoes: "" });
  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ["admin"] });
    cliente.invalidateQueries({ queryKey: ["admin-categorias"] });
    cliente.invalidateQueries({ queryKey: ["categorias"] });
  };
  const revisar = useMutation({
    mutationFn: (a: { id: string; status: "aprovado" | "recusado" }) => rpc<void>("revisar_documento", { p_documento: a.id, p_status: a.status, p_observacao: obs[a.id] || null }),
    onSuccess: atualizar,
    onError: (e: Error) => toast.error(e.message),
  });
  const verificar = useMutation({
    mutationFn: (a: { id: string; v: boolean }) => rpc<void>("verificar_fornecedor", { p_fornecedor: a.id, p_verificado: a.v }),
    onSuccess: atualizar,
    onError: (e: Error) => toast.error(e.message),
  });
  const categoria = useMutation({
    mutationFn: async (a: { id?: string; ativo?: boolean }) => {
      const r = a.id
        ? await supabase.from("categorias").update({ ativo: a.ativo }).eq("id", a.id)
        : await supabase.from("categorias").insert({ nome: nova.nome.trim(), slug: nova.slug.trim(), grupo: nova.grupo, certificacoes: nova.certificacoes.split(",").map((s) => s.trim()).filter(Boolean) });
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      setNova({ nome: "", slug: "", grupo: "servico", certificacoes: "" });
      atualizar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const abrir = async (p: string) => {
    try {
      window.open(await linkDocumento(p), "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (q.isLoading) return <Carregando />;
  const forn = q.data?.fornecedores ?? [];
  const nomeForn = (id: string) => { const f = forn.find((x) => x.id === id); return f ? f.nome_fantasia || f.razao_social : id; };
  const fila = (q.data?.documentos ?? []).filter((d) => d.status === "em_analise");

  return (
    <>
      <CabecalhoPagina titulo="Administração" descricao="Verificação de fornecedores e cadastro de categorias." />
      <Tabs defaultValue="documentos">
        <TabsList>
          <TabsTrigger value="documentos">Documentos ({fila.length})</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores ({forn.length})</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="documentos" className="mt-4">
          {!fila.length ? <EstadoVazio titulo="Nenhum documento aguardando análise." /> : (
            <ul className="space-y-3">
              {fila.map((d) => (
                <li key={d.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                      <div className="flex-1">
                        <p className="font-medium">{ROTULO_DOCUMENTO[d.tipo]} · {nomeForn(d.fornecedor_id)}</p>
                        <p className="text-xs text-muted-foreground">Enviado em {formatarData(d.created_at)}{d.validade && ` · validade ${formatarData(d.validade)}`}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => abrir(d.arquivo_path)}><ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />Abrir</Button>
                      <Input className="lg:w-64" placeholder="Motivo (se recusar)" aria-label="Observação" value={obs[d.id] ?? ""} onChange={(e) => setObs({ ...obs, [d.id]: e.target.value })} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => revisar.mutate({ id: d.id, status: "aprovado" })}>Aprovar</Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => revisar.mutate({ id: d.id, status: "recusado" })}>Recusar</Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="fornecedores" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {forn.map((f) => {
                  const docs = (q.data?.documentos ?? []).filter((d) => d.fornecedor_id === f.id);
                  return (
                    <li key={f.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="flex items-center gap-1 font-medium">{f.nome_fantasia || f.razao_social}{f.verificado && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verificado" />}</p>
                        <p className="text-xs text-muted-foreground">{formatarDocumento(f.documento)} · {f.cidade}/{f.uf} · raio {Number(f.raio_km)} km · {docs.filter((d) => d.status === "aprovado").length}/{docs.length} documento(s) aprovado(s)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`ver-${f.id}`} className="text-sm">Verificado</Label>
                        <Switch id={`ver-${f.id}`} checked={f.verificado} onCheckedChange={(v) => verificar.mutate({ id: f.id, v })} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="categorias" className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              <ul className="divide-y">
                {(cats.data ?? []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 p-3">
                    <div>
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.slug} · {c.grupo}{c.certificacoes.length ? ` · exige ${c.certificacoes.join(", ")}` : ""}</p>
                    </div>
                    <Switch checked={c.ativo} aria-label={`Ativa: ${c.nome}`} onCheckedChange={(v) => categoria.mutate({ id: c.id, ativo: v })} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Nova categoria</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1"><Label htmlFor="n-nome">Nome</Label><Input id="n-nome" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="n-slug">Identificador (slug)</Label><Input id="n-slug" placeholder="ex.: gas-encanado" value={nova.slug} onChange={(e) => setNova({ ...nova, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>
              <div className="space-y-1">
                <Label>Grupo</Label>
                <Select value={nova.grupo} onValueChange={(v) => setNova({ ...nova, grupo: v })}>
                  <SelectTrigger aria-label="Grupo"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="servico">Serviço</SelectItem><SelectItem value="produto">Produto</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="n-cert">Certificações exigidas</Label>
                <Input id="n-cert" placeholder="nr10, nr35, credenciamento_bombeiros" value={nova.certificacoes} onChange={(e) => setNova({ ...nova, certificacoes: e.target.value })} />
                <div className="flex flex-wrap gap-1">{["nr10", "nr35", "credenciamento_bombeiros", "seguro"].map((c) => <Badge key={c} variant="secondary" className="font-normal">{c}</Badge>)}</div>
              </div>
              <Button onClick={() => categoria.mutate({})} disabled={nova.nome.trim().length < 3 || nova.slug.length < 3}>Adicionar</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

/* Fim de Admin.tsx */
