/*
 * OportunidadeDetalhe.tsx — detalhe anonimizado da lista e formulário de proposta estruturada por item.
 * Itens de categorias que o fornecedor não atende (ou sem a certificação aprovada) ficam bloqueados.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CabecalhoPagina, Carregando, ErroCarga, Score, SeloStatus } from "@/components/Comuns";
import { dataISO, formatarData, formatarReais, ROTULO_RECORRENCIA, rotuloCertificacao } from "@/lib/formatos";
import { enviarProposta, retirarProposta } from "@/features/propostas/api";
import { lerValor, totalProposta } from "@/features/propostas/regras";
import { oportunidadeDetalhe } from "./api";

/* Página da oportunidade. */
export default function OportunidadeDetalhe() {
  const { id = "" } = useParams();
  const cliente = useQueryClient();
  const q = useQuery({ queryKey: ["oportunidade", id], queryFn: () => oportunidadeDetalhe(id) });
  const [valores, setValores] = useState<Record<string, string>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [prazo, setPrazo] = useState("7");
  const [validade, setValidade] = useState(dataISO(15));
  const [condicoes, setCondicoes] = useState("");

  useEffect(() => {
    const mp = q.data?.minha_proposta;
    if (!mp) return;
    setValores(Object.fromEntries(mp.itens.map((i) => [i.item_id, String(i.valor_unitario).replace(".", ",")])));
    setObs(Object.fromEntries(mp.itens.map((i) => [i.item_id, i.observacao ?? ""])));
    setPrazo(String(mp.prazo_execucao_dias));
    setValidade(mp.validade);
    setCondicoes(mp.condicoes ?? "");
  }, [q.data?.minha_proposta]);

  const d = q.data;
  const atendidos = useMemo(() => d?.itens.filter((i) => i.atende) ?? [], [d]);
  const numeros = Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, lerValor(v)]));
  const total = totalProposta(atendidos, numeros, atendidos.map((i) => i.id));
  const cotados = atendidos.filter((i) => numeros[i.id] !== undefined);
  const statusProposta = d?.minha_proposta?.status;
  const editavel = d?.status === "aberta" && (!statusProposta || statusProposta === "enviada" || statusProposta === "retirada") && (!d.prazo_propostas || d.prazo_propostas >= dataISO(0));

  const enviar = useMutation({
    mutationFn: () =>
      enviarProposta({
        lista_id: id,
        prazo_execucao_dias: Number(prazo),
        validade,
        condicoes,
        itens: cotados.map((i) => ({ item_id: i.id, valor_unitario: numeros[i.id]!, observacao: obs[i.id] || undefined })),
      }),
    onSuccess: () => {
      toast.success(statusProposta === "enviada" ? "Proposta atualizada" : "Proposta enviada");
      cliente.invalidateQueries({ queryKey: ["oportunidade", id] });
      cliente.invalidateQueries({ queryKey: ["oportunidades"] });
      cliente.invalidateQueries({ queryKey: ["propostas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const retirar = useMutation({
    mutationFn: () => retirarProposta(d!.minha_proposta!.id),
    onSuccess: () => {
      toast.success("Proposta retirada");
      cliente.invalidateQueries({ queryKey: ["oportunidade", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Carregando />;
  if (q.error || !d) return <ErroCarga erro={q.error} tentar={q.refetch} />;

  return (
    <>
      <CabecalhoPagina
        titulo={d.titulo}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />{[d.bairro, `${d.cidade}/${d.uf}`].filter(Boolean).join(" · ")}
            {d.distancia_km !== null && ` · ${String(d.distancia_km).replace(".", ",")} km`}
            {d.unidades ? ` · ${d.unidades} unidades` : ""}
            {d.escopo === "unidade" && " · pedido de uma unidade"}
          </span>
        }
        acoes={statusProposta && <SeloStatus tipo="proposta" status={statusProposta} />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">Itens e valores</CardTitle></CardHeader>
            <CardContent>
              {d.descricao && <p className="mb-4 whitespace-pre-line text-sm text-muted-foreground">{d.descricao}</p>}
              <ul className="space-y-4">
                {d.itens.map((it) => (
                  <li key={it.id} className={`rounded-lg border p-4 ${it.atende ? "" : "bg-muted/50"}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="font-medium">{it.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {it.categoria} · {Number(it.quantidade)} {it.unidade_medida}
                          {it.recorrencia !== "unica" && ` · ${ROTULO_RECORRENCIA[it.recorrencia].toLowerCase()}`}
                        </p>
                      </div>
                      {!it.atende && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" aria-hidden="true" />
                          {it.certificacoes.length ? `Exige ${it.certificacoes.map(rotuloCertificacao).join(", ")} aprovado` : "Fora das suas categorias"}
                        </span>
                      )}
                    </div>
                    {it.atende && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-5">
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor={`v-${it.id}`}>Valor por {it.unidade_medida} (R$)</Label>
                          <Input id={`v-${it.id}`} inputMode="decimal" disabled={!editavel} value={valores[it.id] ?? ""} onChange={(e) => setValores({ ...valores, [it.id]: e.target.value })} placeholder="0,00" />
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <Label htmlFor={`o-${it.id}`}>Observação (opcional)</Label>
                          <Input id={`o-${it.id}`} disabled={!editavel} value={obs[it.id] ?? ""} onChange={(e) => setObs({ ...obs, [it.id]: e.target.value })} placeholder="Marca, material incluso…" />
                        </div>
                        {numeros[it.id] !== undefined && (
                          <p className="text-right text-sm text-muted-foreground sm:col-span-5">Subtotal: {formatarReais(numeros[it.id]! * Number(it.quantidade))}</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader><CardTitle className="text-lg">Sua proposta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Compatibilidade</span><Score valor={d.score} />
              </div>
              <ul className="space-y-0.5 text-xs text-muted-foreground">{d.motivos.map((m) => <li key={m}>• {m}</li>)}</ul>
              <div className="space-y-1">
                <Label htmlFor="p-prazo">Prazo de execução (dias)</Label>
                <Input id="p-prazo" type="number" min={1} disabled={!editavel} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-val">Proposta válida até</Label>
                <Input id="p-val" type="date" min={dataISO(0)} disabled={!editavel} value={validade} onChange={(e) => setValidade(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-cond">Condições de pagamento e garantia</Label>
                <Textarea id="p-cond" rows={3} disabled={!editavel} value={condicoes} onChange={(e) => setCondicoes(e.target.value)} />
              </div>
              <div className="rounded-md bg-secondary p-3">
                <p className="text-xs text-secondary-foreground">Total ({cotados.length} de {atendidos.length} itens)</p>
                <p className="text-2xl font-semibold tabular-nums text-primary">{formatarReais(total)}</p>
              </div>
              {editavel ? (
                <>
                  <Button className="w-full" onClick={() => enviar.mutate()} disabled={!cotados.length || Number(prazo) < 1 || !validade || enviar.isPending}>
                    {statusProposta === "enviada" ? "Atualizar proposta" : "Enviar proposta"}
                  </Button>
                  {statusProposta === "enviada" && (
                    <Button variant="ghost" className="w-full text-destructive" onClick={() => retirar.mutate()} disabled={retirar.isPending}>Retirar proposta</Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Esta lista não recebe mais alterações de proposta.</p>
              )}
              <p className="text-xs text-muted-foreground">Prazo para propostas: {formatarData(d.prazo_propostas)}. O condomínio só vê as propostas quando juntar o mínimo definido ou o prazo acabar.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

/* Fim de OportunidadeDetalhe.tsx */
