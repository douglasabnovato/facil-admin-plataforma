/*
 * CondominioDetalhe.tsx — dados do condomínio, regras de compra (mínimo de propostas e limite do conselho),
 * código de convite e gestão de membros (aprovar, recusar, mudar papel, remover).
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ListPlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina, Carregando, ErroCarga, EstadoVazio } from "@/components/Comuns";
import { ROTULO_PAPEL, formatarReais } from "@/lib/formatos";
import type { Membro, Papel } from "@/lib/tipos";
import { atualizarCondominio, buscarCondominio, gerenciarMembro, meusCondominios, membrosCondominio, novoCodigoConvite } from "./api";

/* Regras de compra editáveis pelo gestor. */
function Regras({ id, min, limite, gestor }: { id: string; min: number; limite: number; gestor: boolean }) {
  const cliente = useQueryClient();
  const [minimo, setMinimo] = useState(String(min));
  const [lim, setLim] = useState(String(limite));
  useEffect(() => {
    setMinimo(String(min));
    setLim(String(limite));
  }, [min, limite]);
  const salvar = useMutation({
    mutationFn: () => atualizarCondominio(id, { min_propostas: Number(minimo), limite_conselho: Number(lim.replace(",", ".")) }),
    onSuccess: () => {
      toast.success("Regras atualizadas");
      cliente.invalidateQueries({ queryKey: ["condominio", id] });
      cliente.invalidateQueries({ queryKey: ["condominios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const valido = Number(minimo) >= 1 && Number(minimo) <= 10 && Number(lim.replace(",", ".")) >= 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Regras de compra</CardTitle>
        <CardDescription>Valem para as listas do condomínio. Listas da unidade não passam pelo conselho.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="r-min">Mínimo de propostas para comparar</Label>
          <Input id="r-min" type="number" min={1} max={10} value={minimo} disabled={!gestor} onChange={(e) => setMinimo(e.target.value)} />
          <p className="text-xs text-muted-foreground">O comparativo abre com esse número de propostas ou quando o prazo termina.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="r-lim">Aprovação do conselho acima de (R$)</Label>
          <Input id="r-lim" inputMode="decimal" value={lim} disabled={!gestor} onChange={(e) => setLim(e.target.value)} />
          <p className="text-xs text-muted-foreground">Acima do valor, a escolha precisa da maioria simples dos conselheiros ativos.</p>
        </div>
        {gestor && (
          <div className="sm:col-span-2">
            <Button onClick={() => salvar.mutate()} disabled={!valido || salvar.isPending}>Salvar regras</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* Linha de membro com ações do gestor. */
function LinhaMembro({ m, condominio, gestor }: { m: Membro; condominio: string; gestor: boolean }) {
  const cliente = useQueryClient();
  const acao = useMutation({
    mutationFn: (a: { acao: "aprovar" | "recusar" | "papel" | "remover"; papel?: Papel }) => gerenciarMembro(condominio, m.user_id, a.acao, a.papel),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ["membros", condominio] });
      cliente.invalidateQueries({ queryKey: ["condominios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">
          {m.nome} {m.eu && <span className="text-xs text-muted-foreground">(você)</span>}
        </p>
        <p className="text-sm text-muted-foreground">{[ROTULO_PAPEL[m.papel], m.unidade].filter(Boolean).join(" · ")}</p>
      </div>
      {gestor && m.status === "pendente" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => acao.mutate({ acao: "aprovar" })} disabled={acao.isPending}>Aprovar como condômino</Button>
          <Button size="sm" variant="outline" onClick={() => acao.mutate({ acao: "aprovar", papel: "conselheiro" })} disabled={acao.isPending}>Aprovar como conselheiro</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => acao.mutate({ acao: "recusar" })} disabled={acao.isPending}>Recusar</Button>
        </div>
      ) : gestor && m.status === "ativo" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={m.papel} onValueChange={(v) => acao.mutate({ acao: "papel", papel: v as Papel })}>
            <SelectTrigger className="h-9 w-40" aria-label={`Papel de ${m.nome}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sindico">Síndico</SelectItem>
              <SelectItem value="conselheiro">Conselheiro</SelectItem>
              <SelectItem value="condomino">Condômino</SelectItem>
            </SelectContent>
          </Select>
          {!m.eu && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => acao.mutate({ acao: "remover" })} disabled={acao.isPending}>Remover</Button>
          )}
        </div>
      ) : (
        <Badge variant="secondary">{ROTULO_PAPEL[m.papel]}</Badge>
      )}
    </li>
  );
}

/* Página do condomínio. */
export default function CondominioDetalhe() {
  const { id = "" } = useParams();
  const cliente = useQueryClient();
  const cond = useQuery({ queryKey: ["condominio", id], queryFn: () => buscarCondominio(id) });
  const meus = useQuery({ queryKey: ["condominios"], queryFn: meusCondominios });
  const membros = useQuery({ queryKey: ["membros", id], queryFn: () => membrosCondominio(id) });
  const meu = meus.data?.find((c) => c.id === id);
  const gestor = meu?.papel === "sindico" || meu?.papel === "administradora";

  const codigo = useMutation({
    mutationFn: () => novoCodigoConvite(id),
    onSuccess: () => {
      toast.success("Novo código gerado. O anterior deixou de valer.");
      cliente.invalidateQueries({ queryKey: ["condominios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (cond.isLoading) return <Carregando />;
  if (cond.error || !cond.data) return <ErroCarga erro={cond.error ?? new Error("Condomínio não encontrado")} tentar={cond.refetch} />;
  const c = cond.data;
  const pendentes = membros.data?.filter((m) => m.status === "pendente") ?? [];
  const ativos = membros.data?.filter((m) => m.status === "ativo") ?? [];

  const copiar = async () => {
    if (!meu?.codigo_convite) return;
    await navigator.clipboard?.writeText(meu.codigo_convite);
    toast.success("Código copiado");
  };

  return (
    <>
      <CabecalhoPagina
        titulo={c.nome}
        descricao={`${[c.logradouro, c.numero].filter(Boolean).join(", ")}${c.bairro ? ` · ${c.bairro}` : ""} · ${c.cidade}/${c.uf}`}
        acoes={
          <Button asChild>
            <Link to={`/listas/nova?condominio=${c.id}`}><ListPlus className="mr-2 h-4 w-4" aria-hidden="true" />{gestor ? "Nova necessidade" : "Sugerir necessidade"}</Link>
          </Button>
        }
      />
      <Tabs defaultValue={pendentes.length && gestor ? "membros" : "geral"}>
        <TabsList>
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="membros">Membros{pendentes.length && gestor ? ` (${pendentes.length})` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="geral" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Regras id={c.id} min={c.min_propostas} limite={c.limite_conselho} gestor={gestor} />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Convite</CardTitle>
              <CardDescription>Moradores e conselheiros entram com o código e você aprova.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gestor && meu?.codigo_convite ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border bg-muted px-4 py-2 font-mono text-2xl tracking-[0.3em]" aria-label="Código de convite">{meu.codigo_convite}</span>
                    <Button variant="outline" size="icon" onClick={copiar} aria-label="Copiar código"><Copy className="h-4 w-4" /></Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => codigo.mutate()} disabled={codigo.isPending}>
                    <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Gerar novo código
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">O código fica com o síndico ou a administradora.</p>
              )}
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Unidades</dt><dd>{c.unidades ?? "—"}</dd>
                <dt className="text-muted-foreground">Conselho acima de</dt><dd>{formatarReais(c.limite_conselho)}</dd>
                <dt className="text-muted-foreground">Membros ativos</dt><dd>{ativos.length}</dd>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="membros" className="mt-4">
          {membros.isLoading ? <Carregando /> : membros.error ? <ErroCarga erro={membros.error} tentar={membros.refetch} /> : (
            <div className="space-y-6">
              {gestor && pendentes.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Pedidos de entrada</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="divide-y">{pendentes.map((m) => <LinhaMembro key={m.user_id} m={m} condominio={id} gestor={gestor} />)}</ul>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle className="text-lg">Membros ativos</CardTitle></CardHeader>
                <CardContent>
                  {ativos.length ? (
                    <ul className="divide-y">{ativos.map((m) => <LinhaMembro key={m.user_id} m={m} condominio={id} gestor={gestor} />)}</ul>
                  ) : (
                    <EstadoVazio titulo="Nenhum membro ativo ainda." />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

/* Fim de CondominioDetalhe.tsx */
