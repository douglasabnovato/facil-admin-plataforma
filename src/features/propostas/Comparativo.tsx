/*
 * Comparativo.tsx — propostas lado a lado para quem decide (síndico, administradora, conselheiros ou o morador da unidade).
 * Fica bloqueado até o mínimo de propostas ou o fim do prazo (RN05); a escolha segue RN06 (conselho).
 */
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Lock, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Carregando, ErroCarga, Score, SeloStatus } from "@/components/Comuns";
import { cn } from "@/lib/utils";
import { formatarData, formatarReais } from "@/lib/formatos";
import type { PropostaComparativo } from "@/lib/tipos";
import { comparativo, escolherProposta } from "./api";
import { menorPorItem, precisaConselho } from "./regras";

/* Comparativo da lista. */
export function ComparativoLista({ listaId, escopo, statusLista }: { listaId: string; escopo: "condominio" | "unidade"; statusLista: string }) {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const { data: c, isLoading, error, refetch } = useQuery({ queryKey: ["comparativo", listaId], queryFn: () => comparativo(listaId) });

  const escolher = useMutation({
    mutationFn: escolherProposta,
    onSuccess: (contratacao) => {
      cliente.invalidateQueries({ queryKey: ["lista", listaId] });
      cliente.invalidateQueries({ queryKey: ["comparativo", listaId] });
      cliente.invalidateQueries({ queryKey: ["listas"] });
      toast.success("Proposta escolhida");
      navegar(`/contratacoes/${contratacao}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Carregando texto="Carregando propostas…" />;
  if (error) return <ErroCarga erro={error} tentar={refetch} />;
  if (!c) return null;

  if (!c.liberado) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />Comparativo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            <strong>{c.recebidas}</strong> de <strong>{c.minimo}</strong> propostas recebidas. O comparativo abre quando chegar ao mínimo ou em {formatarData(c.prazo_propostas)} (fim do prazo).
          </p>
          <Progress value={(100 * c.recebidas) / Math.max(1, c.minimo)} aria-label="Propostas recebidas" />
          <p className="text-xs text-muted-foreground">Assim ninguém escolhe antes de ter opções para comparar.</p>
        </CardContent>
      </Card>
    );
  }

  const menores = menorPorItem(c);
  const podeEscolher = c.pode_escolher && statusLista === "aberta";

  const BotaoEscolher = ({ p }: { p: PropostaComparativo }) => {
    const conselho = precisaConselho(Number(p.valor_total), Number(c.limite_conselho), c.conselheiros, escopo);
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" disabled={p.status !== "enviada" || escolher.isPending}>Escolher</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Escolher {p.fornecedor.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Valor de {formatarReais(p.valor_total)}.{" "}
              {conselho
                ? `Como passa de ${formatarReais(c.limite_conselho)}, a escolha vai para o conselho (${c.conselheiros} conselheiro(s)); aprova com maioria simples.`
                : "A contratação é aprovada na hora, os contatos são liberados e as demais propostas são avisadas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => escolher.mutate(p.id)}>{conselho ? "Enviar ao conselho" : "Confirmar escolha"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comparativo · {c.propostas.length} proposta(s)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {c.propostas.map((p, i) => (
            <li key={p.id} className={cn("flex flex-col gap-3 rounded-lg border p-4", i === 0 && p.status !== "recusada" && "border-success/50 bg-success/5")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-semibold">
                    {p.fornecedor.nome}
                    {p.fornecedor.verificado && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verificado" />}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.fornecedor.cidade}/{p.fornecedor.uf}</p>
                </div>
                {i === 0 && <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><Trophy className="h-3 w-3" aria-hidden="true" />Menor preço</span>}
              </div>
              <p className="text-2xl font-semibold tabular-nums">{formatarReais(p.valor_total)}</p>
              <dl className="grid grid-cols-2 gap-1 text-sm">
                <dt className="text-muted-foreground">Prazo</dt><dd>{p.prazo_execucao_dias} dia(s)</dd>
                <dt className="text-muted-foreground">Validade</dt><dd>{formatarData(p.validade)}</dd>
                <dt className="text-muted-foreground">Nota</dt>
                <dd className="flex items-center gap-1">
                  {p.fornecedor.nota ? <><Star className="h-3 w-3 fill-warning text-warning" aria-hidden="true" />{String(p.fornecedor.nota).replace(".", ",")} ({p.fornecedor.avaliacoes})</> : "Sem avaliações"}
                </dd>
                <dt className="text-muted-foreground">Compatibilidade</dt><dd><Score valor={p.score} /></dd>
              </dl>
              {p.condicoes && <p className="rounded bg-muted p-2 text-xs">{p.condicoes}</p>}
              {p.motivos && p.motivos.length > 0 && (
                <ul className="space-y-0.5 text-xs text-muted-foreground">{p.motivos.map((m) => <li key={m}>• {m}</li>)}</ul>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <SeloStatus tipo="proposta" status={p.status} />
                {podeEscolher && <BotaoEscolher p={p} />}
              </div>
            </li>
          ))}
        </ul>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Item</TableHead>
                {c.propostas.map((p) => <TableHead key={p.id} className="min-w-32 text-right">{p.fornecedor.nome}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {c.itens.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <span className="block font-medium">{it.descricao}</span>
                    <span className="text-xs text-muted-foreground">{Number(it.quantidade)} {it.unidade_medida} · {it.categoria}</span>
                  </TableCell>
                  {c.propostas.map((p) => {
                    const v = p.itens.find((x) => x.item_id === it.id);
                    return (
                      <TableCell key={p.id} className={cn("text-right tabular-nums", menores[it.id] === p.id && "font-semibold text-success")}>
                        {v ? formatarReais(Number(v.valor_unitario) * Number(it.quantidade)) : <span className="text-muted-foreground">não cotou</span>}
                        {v?.observacao && <span className="block text-xs font-normal text-muted-foreground">{v.observacao}</span>}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">Em verde, o menor valor de cada item. Propostas que não cotam todos os itens aparecem com "não cotou".</p>
      </CardContent>
    </Card>
  );
}

/* Fim de Comparativo.tsx */
