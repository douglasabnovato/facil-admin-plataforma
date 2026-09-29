/*
 * PerfilFornecedor.tsx — cadastro do fornecedor: dados, área de atendimento (raio), categorias e documentos.
 * Só fornecedores verificados pelo admin recebem oportunidades; categorias com certificação exigem o documento aprovado.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Clock, FileUp, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina, Carregando, ErroCarga } from "@/components/Comuns";
import { CamposEndereco } from "@/components/CamposEndereco";
import { ENDERECO_VAZIO, enderecoValido, type ValorEndereco } from "@/lib/endereco";
import { digitos, formatarData, formatarDocumento, ROTULO_DOCUMENTO, rotuloCertificacao } from "@/lib/formatos";
import type { Documento, Fornecedor, TipoDocumento } from "@/lib/tipos";
import { useAuth } from "@/features/auth/contexto";
import { listarCategorias } from "@/features/necessidades/api";
import { enviarDocumento, linkDocumento, meuFornecedor, meusDocumentos, removerDocumento, salvarFornecedor } from "./api";

interface Form {
  razao_social: string;
  nome_fantasia: string;
  documento: string;
  tipo: Fornecedor["tipo"];
  descricao: string;
  telefone: string;
  email_contato: string;
  raio_km: number;
  ativo: boolean;
}

/* Seção de documentos. */
function Documentos({ fornecedorId, exigidos }: { fornecedorId: string; exigidos: string[] }) {
  const cliente = useQueryClient();
  const docs = useQuery({ queryKey: ["documentos"], queryFn: meusDocumentos });
  const [tipo, setTipo] = useState<TipoDocumento>("cnpj");
  const [validade, setValidade] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const enviar = useMutation({
    mutationFn: () => enviarDocumento(fornecedorId, tipo, arquivo!, validade || null),
    onSuccess: () => {
      toast.success("Documento enviado para análise");
      setArquivo(null);
      setValidade("");
      cliente.invalidateQueries({ queryKey: ["documentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remover = useMutation({
    mutationFn: removerDocumento,
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["documentos"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const abrir = async (d: Documento) => {
    try {
      window.open(await linkDocumento(d.arquivo_path), "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const aprovados = new Set((docs.data ?? []).filter((d) => d.status === "aprovado").map((d) => d.tipo));
  const faltando = exigidos.filter((e) => !aprovados.has(e as TipoDocumento));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Documentos</CardTitle>
        <CardDescription>PDF ou imagem até 10 MB. Só a equipe FacilAdmin vê os arquivos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {faltando.length > 0 && (
          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            Suas categorias exigem: <strong>{faltando.map(rotuloCertificacao).join(", ")}</strong>. Sem o documento aprovado, você não recebe essas oportunidades.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="space-y-1 sm:col-span-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDocumento)}>
              <SelectTrigger aria-label="Tipo de documento"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ROTULO_DOCUMENTO).map(([v, r]) => <SelectItem key={v} value={v}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="d-validade">Validade (se houver)</Label>
            <Input id="d-validade" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="d-arquivo">Arquivo</Label>
            <Input id="d-arquivo" type="file" accept=".pdf,image/*" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button onClick={() => enviar.mutate()} disabled={!arquivo || enviar.isPending}>
          <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />{enviar.isPending ? "Enviando…" : "Enviar documento"}
        </Button>
        {docs.isLoading ? <Carregando /> : (
          <ul className="divide-y">
            {(docs.data ?? []).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">{ROTULO_DOCUMENTO[d.tipo]}</p>
                  <p className="text-xs text-muted-foreground">Enviado em {formatarData(d.created_at)}{d.validade && ` · válido até ${formatarData(d.validade)}`}</p>
                  {d.observacao && <p className="text-xs text-destructive">{d.observacao}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={d.status === "aprovado" ? "border-success/40 text-success" : d.status === "recusado" ? "text-destructive" : "border-warning/40 text-warning"}>
                    {d.status === "aprovado" ? "Aprovado" : d.status === "recusado" ? "Recusado" : "Em análise"}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => abrir(d)} aria-label="Abrir arquivo"><ExternalLink className="h-4 w-4" /></Button>
                  {d.status === "em_analise" && (
                    <Button variant="ghost" size="icon" onClick={() => remover.mutate(d)} aria-label="Remover documento"><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* Página do cadastro do fornecedor. */
export default function PerfilFornecedor() {
  const { perfil, usuario } = useAuth();
  const cliente = useQueryClient();
  const q = useQuery({ queryKey: ["fornecedor"], queryFn: meuFornecedor });
  const cats = useQuery({ queryKey: ["categorias"], queryFn: listarCategorias, staleTime: 3_600_000 });
  const [f, setF] = useState<Form>({ razao_social: "", nome_fantasia: "", documento: "", tipo: "servico", descricao: "", telefone: "", email_contato: "", raio_km: 30, ativo: true });
  const [endereco, setEndereco] = useState<ValorEndereco>(ENDERECO_VAZIO);
  const [categorias, setCategorias] = useState<string[]>([]);

  useEffect(() => {
    const d = q.data?.fornecedor;
    if (!d) {
      setF((v) => ({ ...v, telefone: v.telefone || perfil?.telefone || "", email_contato: v.email_contato || usuario?.email || "" }));
      return;
    }
    setF({ razao_social: d.razao_social, nome_fantasia: d.nome_fantasia ?? "", documento: formatarDocumento(d.documento), tipo: d.tipo, descricao: d.descricao ?? "", telefone: d.telefone ?? "", email_contato: d.email_contato ?? "", raio_km: Number(d.raio_km), ativo: d.ativo });
    setEndereco({ cep: d.cep, logradouro: "", numero: "", bairro: d.bairro ?? "", cidade: d.cidade, uf: d.uf, latitude: d.latitude !== null ? Number(d.latitude) : null, longitude: d.longitude !== null ? Number(d.longitude) : null });
    setCategorias(q.data?.categorias ?? []);
  }, [q.data, perfil?.telefone, usuario?.email]);

  const salvar = useMutation({
    mutationFn: () => salvarFornecedor({ ...f, documento: digitos(f.documento), ...endereco, categorias }),
    onSuccess: () => {
      toast.success("Cadastro salvo");
      cliente.invalidateQueries({ queryKey: ["fornecedor"] });
      cliente.invalidateQueries({ queryKey: ["painel"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading || cats.isLoading) return <Carregando />;
  if (q.error) return <ErroCarga erro={q.error} tentar={q.refetch} />;
  const forn = q.data?.fornecedor;
  const doc = digitos(f.documento);
  const valido = f.razao_social.trim().length >= 3 && (doc.length === 11 || doc.length === 14) && enderecoValido(endereco) && categorias.length > 0;
  const exigidos = [...new Set((cats.data ?? []).filter((c) => categorias.includes(c.id)).flatMap((c) => c.certificacoes))];
  const alternar = (id: string, marcado: boolean) => setCategorias((v) => (marcado ? [...v, id] : v.filter((x) => x !== id)));

  return (
    <>
      <CabecalhoPagina
        titulo="Meu cadastro de fornecedor"
        descricao="Complete os dados, escolha as categorias e envie os documentos. A equipe FacilAdmin verifica o cadastro."
        acoes={forn && (forn.verificado
          ? <Badge className="gap-1 bg-success text-success-foreground"><BadgeCheck className="h-4 w-4" aria-hidden="true" />Verificado</Badge>
          : <Badge variant="outline" className="gap-1 border-warning/40 text-warning"><Clock className="h-4 w-4" aria-hidden="true" />Aguardando verificação</Badge>)}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Empresa</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="f-razao">Razão social ou nome</Label>
              <Input id="f-razao" value={f.razao_social} onChange={(e) => setF({ ...f, razao_social: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-fantasia">Nome fantasia</Label>
              <Input id="f-fantasia" value={f.nome_fantasia} onChange={(e) => setF({ ...f, nome_fantasia: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-doc">CNPJ ou CPF</Label>
              <Input id="f-doc" inputMode="numeric" value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} onBlur={() => setF({ ...f, documento: formatarDocumento(f.documento) })} />
            </div>
            <div className="space-y-2">
              <Label>Oferece</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Form["tipo"] })}>
                <SelectTrigger aria-label="Oferece"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="servico">Serviços</SelectItem>
                  <SelectItem value="produto">Produtos</SelectItem>
                  <SelectItem value="ambos">Serviços e produtos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-tel">Telefone comercial</Label>
              <Input id="f-tel" type="tel" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="f-email">E-mail comercial</Label>
              <Input id="f-email" type="email" value={f.email_contato} onChange={(e) => setF({ ...f, email_contato: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="f-desc">Apresentação</Label>
              <Textarea id="f-desc" rows={3} placeholder="Experiência, equipe, diferenciais…" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">Telefone e e-mail só aparecem para o condomínio depois que ele aprova a sua proposta.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Área de atendimento</CardTitle>
            <CardDescription>Base da empresa e até que distância você atende.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CamposEndereco valor={endereco} onChange={setEndereco} completo={false} prefixo="f" />
            <div className="space-y-2">
              <Label htmlFor="f-raio">Raio de atendimento: <strong>{f.raio_km} km</strong></Label>
              <input id="f-raio" type="range" min={1} max={200} step={1} value={f.raio_km} onChange={(e) => setF({ ...f, raio_km: Number(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="f-ativo" checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} />
              <Label htmlFor="f-ativo">Recebendo oportunidades</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Categorias atendidas ({categorias.length})</CardTitle>
            <CardDescription>Você recebe as listas com itens dessas categorias, dentro do seu raio.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {(["servico", "produto"] as const).map((g) => (
              <fieldset key={g}>
                <legend className="mb-3 text-sm font-semibold">{g === "servico" ? "Serviços" : "Produtos"}</legend>
                <div className="grid gap-2">
                  {(cats.data ?? []).filter((c) => c.grupo === g).map((c) => (
                    <label key={c.id} className="flex items-start gap-2 text-sm">
                      <Checkbox checked={categorias.includes(c.id)} onCheckedChange={(v) => alternar(c.id, v === true)} aria-label={c.nome} />
                      <span>
                        {c.nome}
                        {c.certificacoes.length > 0 && <span className="block text-xs text-muted-foreground">Exige {c.certificacoes.map(rotuloCertificacao).join(", ")}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={() => salvar.mutate()} disabled={!valido || salvar.isPending}>{salvar.isPending ? "Salvando…" : forn ? "Salvar alterações" : "Criar cadastro"}</Button>
      </div>
      {forn && <div className="mt-6"><Documentos fornecedorId={forn.id} exigidos={exigidos} /></div>}
      {!forn && <p className="mt-4 text-sm text-muted-foreground">Depois de criar o cadastro, você envia os documentos aqui mesmo.</p>}
    </>
  );
}

/* Fim de PerfilFornecedor.tsx */
