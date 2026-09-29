/*
 * ContratacaoDetalhe.tsx — situação da contratação: votação do conselho (RN06), contatos liberados (RN04),
 * mudança de status (execução, conclusão, cancelamento) e avaliação mútua (RN08).
 */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MapPin, MessageCircle, Phone, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CabecalhoPagina, Carregando, ErroCarga, SeloStatus } from "@/components/Comuns";
import { cn } from "@/lib/utils";
import { formatarDocumento, formatarReais, linkWhatsApp, ROTULO_PAPEL } from "@/lib/formatos";
import type { MinhaContratacao, Papel } from "@/lib/tipos";
import { atualizarContratacao, avaliar, comentariosVotos, contatos, minhasContratacoes, votar } from "./api";

/* Painel de votação do conselho. */
function Votacao({ c }: { c: MinhaContratacao }) {
  const cliente = useQueryClient();
  const [comentario, setComentario] = useState("");
  const votos = useQuery({ queryKey: ["votos", c.id], queryFn: () => comentariosVotos(c.id) });
  const enviar = useMutation({
    mutationFn: (aprova: boolean) => votar(c.id, aprova, comentario),
    onSuccess: (r) => {
      toast.success(r === "aprovada" ? "Voto registrado: contratação aprovada." : r === "recusada" ? "Voto registrado: proposta recusada pelo conselho." : "Voto registrado.");
      cliente.invalidateQueries({ queryKey: ["contratacoes"] });
      cliente.invalidateQueries({ queryKey: ["votos", c.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const necessarios = Math.floor(c.conselheiros / 2) + 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Aprovação do conselho</CardTitle>
        <CardDescription>Aprova com {necessarios} de {c.conselheiros} votos a favor (maioria simples). Empate não aprova.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm"><span>{c.votos_sim} a favor</span><span>{c.votos_nao} contra</span></div>
          <Progress value={(100 * c.votos_sim) / Math.max(1, necessarios)} aria-label="Votos a favor" />
        </div>
        {votos.data && votos.data.some((v) => v.comentario) && (
          <ul className="space-y-2">
            {votos.data.filter((v) => v.comentario).map((v, i) => (
              <li key={i} className="rounded-md bg-muted p-2 text-sm">
                <span className={v.aprova ? "text-success" : "text-destructive"}>{v.aprova ? "A favor" : "Contra"}:</span> {v.comentario}
              </li>
            ))}
          </ul>
        )}
        {c.pode_votar && (
          <div className="space-y-3 border-t pt-4">
            {c.meu_voto !== null && <p className="text-sm">Seu voto atual: <strong>{c.meu_voto ? "a favor" : "contra"}</strong>. Você pode mudar enquanto a votação estiver aberta.</p>}
            <div className="space-y-1">
              <Label htmlFor="v-com">Comentário (opcional)</Label>
              <Textarea id="v-com" rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => enviar.mutate(true)} disabled={enviar.isPending} className="bg-success text-success-foreground hover:bg-success/90"><ThumbsUp className="mr-2 h-4 w-4" aria-hidden="true" />Aprovar</Button>
              <Button variant="outline" onClick={() => enviar.mutate(false)} disabled={enviar.isPending} className="text-destructive"><ThumbsDown className="mr-2 h-4 w-4" aria-hidden="true" />Recusar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* Contatos liberados depois da aprovação. */
function BlocoContatos({ id, lado }: { id: string; lado: "contratante" | "fornecedor" }) {
  const q = useQuery({ queryKey: ["contatos", id], queryFn: () => contatos(id) });
  if (q.isLoading) return <Carregando />;
  if (q.error || !q.data) return <ErroCarga erro={q.error} tentar={q.refetch} />;
  const { condominio: c, responsaveis, fornecedor: f } = q.data;
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Contatos</CardTitle><CardDescription>Liberados porque a contratação foi aprovada.</CardDescription></CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{lado === "fornecedor" ? "Condomínio" : "Local do serviço"}</h3>
          <p className="font-medium">{c.nome}</p>
          <p className="flex items-start gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {[c.logradouro, c.numero].filter(Boolean).join(", ")}{c.unidade ? ` · ${c.unidade}` : ""} · {c.bairro} · {c.cidade}/{c.uf} · CEP {c.cep}</p>
          <ul className="space-y-2">
            {responsaveis.map((r) => (
              <li key={r.nome + r.telefone} className="text-sm">
                <span className="font-medium">{r.nome}</span> <span className="text-muted-foreground">({ROTULO_PAPEL[r.papel as Papel] ?? r.papel})</span>
                {r.telefone && (
                  <span className="mt-1 flex gap-2">
                    <a className="inline-flex items-center gap-1 text-primary underline" href={`tel:${r.telefone}`}><Phone className="h-3 w-3" aria-hidden="true" />{r.telefone}</a>
                    {linkWhatsApp(r.telefone) && <a className="inline-flex items-center gap-1 text-success underline" href={linkWhatsApp(r.telefone)!} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-3 w-3" aria-hidden="true" />WhatsApp</a>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Fornecedor</h3>
          <p className="font-medium">{f.nome}</p>
          <p className="text-sm text-muted-foreground">{f.razao_social} · {formatarDocumento(f.documento)}</p>
          {f.telefone && (
            <p className="flex flex-wrap gap-3 text-sm">
              <a className="inline-flex items-center gap-1 text-primary underline" href={`tel:${f.telefone}`}><Phone className="h-3 w-3" aria-hidden="true" />{f.telefone}</a>
              {linkWhatsApp(f.telefone) && <a className="inline-flex items-center gap-1 text-success underline" href={linkWhatsApp(f.telefone)!} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-3 w-3" aria-hidden="true" />WhatsApp</a>}
            </p>
          )}
          {f.email && <a className="inline-flex items-center gap-1 text-sm text-primary underline" href={`mailto:${f.email}`}><Mail className="h-3 w-3" aria-hidden="true" />{f.email}</a>}
        </div>
      </CardContent>
    </Card>
  );
}

/* Formulário de avaliação (1 a 5 estrelas). */
function Avaliar({ c }: { c: MinhaContratacao }) {
  const cliente = useQueryClient();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const enviar = useMutation({
    mutationFn: () => avaliar(c.id, nota, comentario),
    onSuccess: () => {
      toast.success("Avaliação registrada. Obrigado!");
      cliente.invalidateQueries({ queryKey: ["contratacoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Avalie {c.lado === "fornecedor" ? "o condomínio" : "o fornecedor"}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div role="radiogroup" aria-label="Nota" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} estrela${n > 1 ? "s" : ""}`} onClick={() => setNota(n)} className="rounded p-1">
              <Star className={cn("h-7 w-7", n <= nota ? "fill-warning text-warning" : "text-muted-foreground")} />
            </button>
          ))}
        </div>
        <Textarea rows={3} aria-label="Comentário" placeholder="Como foi? (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
        <Button onClick={() => enviar.mutate()} disabled={!nota || enviar.isPending}>Enviar avaliação</Button>
      </CardContent>
    </Card>
  );
}

/* Página da contratação. */
export default function ContratacaoDetalhe() {
  const { id = "" } = useParams();
  const cliente = useQueryClient();
  const q = useQuery({ queryKey: ["contratacoes"], queryFn: minhasContratacoes });
  const mudar = useMutation({
    mutationFn: (s: "em_execucao" | "concluida" | "cancelada") => atualizarContratacao(id, s),
    onSuccess: () => {
      toast.success("Situação atualizada");
      cliente.invalidateQueries({ queryKey: ["contratacoes"] });
      cliente.invalidateQueries({ queryKey: ["listas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Carregando />;
  if (q.error) return <ErroCarga erro={q.error} tentar={q.refetch} />;
  const c = q.data?.find((x) => x.id === id);
  if (!c) return <ErroCarga erro={new Error("Contratação não encontrada ou sem acesso.")} />;
  const contratante = c.lado === "contratante";
  const liberada = ["aprovada", "em_execucao", "concluida"].includes(c.status);

  return (
    <>
      <CabecalhoPagina
        titulo={c.titulo}
        descricao={<span className="flex flex-wrap items-center gap-2"><SeloStatus tipo="contratacao" status={c.status} />{contratante ? c.fornecedor : c.condominio} · {formatarReais(c.valor_total)}</span>}
        acoes={
          <>
            {contratante && <Button variant="outline" asChild><Link to={`/listas/${c.lista_id}`}>Ver lista</Link></Button>}
            {c.status === "aprovada" && (c.pode_gerir || !contratante) && <Button variant="outline" onClick={() => mudar.mutate("em_execucao")} disabled={mudar.isPending}>Marcar início</Button>}
            {c.pode_gerir && ["aprovada", "em_execucao"].includes(c.status) && (
              <Button onClick={() => mudar.mutate("concluida")} disabled={mudar.isPending}>Concluir serviço</Button>
            )}
            {c.pode_gerir && ["aguardando_aprovacao", "aprovada", "em_execucao"].includes(c.status) && (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" className="text-destructive">Cancelar</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar a contratação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {c.status === "aguardando_aprovacao" ? "A votação é encerrada e a lista volta a receber propostas." : "O fornecedor será avisado e a lista será cancelada."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => mudar.mutate("cancelada")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancelar contratação</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        }
      />
      <div className="grid gap-6">
        {c.status === "aguardando_aprovacao" && contratante && <Votacao c={c} />}
        {c.status === "aguardando_aprovacao" && !contratante && (
          <p className="rounded-lg border bg-card p-4 text-sm">Sua proposta foi escolhida e aguarda a aprovação do conselho do condomínio. Avisaremos o resultado.</p>
        )}
        {c.status === "recusada" && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">O conselho recusou esta escolha. A lista voltou a receber propostas.</p>}
        {liberada && <BlocoContatos id={c.id} lado={c.lado} />}
        {c.status === "concluida" && !c.ja_avaliei && (c.pode_gerir || !contratante) && <Avaliar c={c} />}
        {c.status === "concluida" && c.ja_avaliei && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Você já avaliou esta contratação.</p>}
      </div>
    </>
  );
}

/* Fim de ContratacaoDetalhe.tsx */
