/*
 * ListaDetalhe.tsx — itens da lista, ações (editar, publicar, cancelar), fornecedores compatíveis,
 * comparativo de propostas e atalho para a contratação.
 */
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Pencil, Send, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CabecalhoPagina, Carregando, ErroCarga, SeloStatus } from "@/components/Comuns";
import { formatarData, ROTULO_RECORRENCIA } from "@/lib/formatos";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/contexto";
import { meusCondominios } from "@/features/organizacoes/api";
import { buscarLista, cancelarLista, contarCompativeis, listarCategorias, publicarLista } from "./api";
import { ComparativoLista } from "@/features/propostas/Comparativo";

/* Contratação ativa da lista, se houver. */
async function contratacaoDaLista(id: string): Promise<{ id: string; status: string } | null> {
  const { data } = await supabase.from("contratacoes").select("id, status").eq("lista_id", id).not("status", "in", "(recusada,cancelada)").maybeSingle();
  return data;
}

/* Página da lista. */
export default function ListaDetalhe() {
  const { id = "" } = useParams();
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const q = useQuery({ queryKey: ["lista", id], queryFn: () => buscarLista(id) });
  const conds = useQuery({ queryKey: ["condominios"], queryFn: meusCondominios });
  const cats = useQuery({ queryKey: ["categorias"], queryFn: listarCategorias, staleTime: 3_600_000 });
  const status = q.data?.lista.status;
  const publicada = !!status && !["sugestao", "rascunho"].includes(status);
  const compat = useQuery({ queryKey: ["compativeis", id], queryFn: () => contarCompativeis(id), enabled: publicada });
  const contr = useQuery({ queryKey: ["contratacao-lista", id], queryFn: () => contratacaoDaLista(id), enabled: publicada });

  const invalidar = () => {
    cliente.invalidateQueries({ queryKey: ["lista", id] });
    cliente.invalidateQueries({ queryKey: ["listas"] });
    cliente.invalidateQueries({ queryKey: ["compativeis", id] });
  };
  const publicar = useMutation({
    mutationFn: () => publicarLista(id),
    onSuccess: (n) => {
      toast.success(n ? `Publicada. ${n} fornecedor(es) compatível(is) avisado(s).` : "Publicada. Ainda não há fornecedores compatíveis na região.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancelar = useMutation({
    mutationFn: () => cancelarLista(id),
    onSuccess: () => {
      toast.success("Lista cancelada");
      invalidar();
      navegar("/listas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Carregando />;
  if (q.error || !q.data) return <ErroCarga erro={q.error} tentar={q.refetch} />;
  const { lista, itens } = q.data;
  const meu = conds.data?.find((c) => c.id === lista.condominio_id);
  const autor = lista.criado_por === usuario?.id;
  const gestor = meu?.papel === "sindico" || meu?.papel === "administradora";
  const decide = lista.escopo === "unidade" ? autor : gestor || meu?.papel === "conselheiro";
  const editavel = ["sugestao", "rascunho"].includes(lista.status) && (autor || (lista.escopo === "condominio" && gestor));
  const podePublicar = ["sugestao", "rascunho"].includes(lista.status) && (lista.escopo === "unidade" ? autor : gestor);
  const podeCancelar = ["sugestao", "rascunho", "aberta"].includes(lista.status) && (autor || (lista.escopo === "condominio" && gestor));
  const nomeCat = (cid: string) => cats.data?.find((c) => c.id === cid)?.nome ?? "";

  return (
    <>
      <CabecalhoPagina
        titulo={lista.titulo}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <SeloStatus tipo="lista" status={lista.status} />
            <span>{meu?.nome}{lista.escopo === "unidade" ? ` · unidade ${lista.unidade}` : " · áreas comuns"}</span>
          </span>
        }
        acoes={
          <>
            {editavel && <Button variant="outline" asChild><Link to={`/listas/${id}/editar`}><Pencil className="mr-2 h-4 w-4" aria-hidden="true" />Editar</Link></Button>}
            {podePublicar && (
              <Button onClick={() => publicar.mutate()} disabled={publicar.isPending}><Send className="mr-2 h-4 w-4" aria-hidden="true" />Publicar</Button>
            )}
            {podeCancelar && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive"><XCircle className="mr-2 h-4 w-4" aria-hidden="true" />Cancelar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar esta lista?</AlertDialogTitle>
                    <AlertDialogDescription>Fornecedores que já enviaram proposta serão avisados. Não dá para desfazer.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => cancelar.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancelar lista</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        }
      />

      {lista.status === "sugestao" && (
        <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          {gestor ? "Sugestão de um morador: revise, edite se precisar e publique." : "Sugestão enviada. O síndico revisa e decide se publica."}
        </p>
      )}
      {contr.data && (
        <Link to={`/contratacoes/${contr.data.id}`} className="mb-4 flex items-center justify-between rounded-lg border border-success/40 bg-success/5 p-4 text-sm hover:bg-success/10">
          <span className="flex items-center gap-2">Contratação: <SeloStatus tipo="contratacao" status={contr.data.status} /></span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Itens ({itens.length})</CardTitle></CardHeader>
          <CardContent>
            {lista.descricao && <p className="mb-4 whitespace-pre-line text-sm text-muted-foreground">{lista.descricao}</p>}
            <ul className="divide-y">
              {itens.map((it) => (
                <li key={it.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{it.descricao}</p>
                    <p className="text-xs text-muted-foreground">{nomeCat(it.categoria_id)}</p>
                  </div>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {Number(it.quantidade)} {it.unidade_medida}{it.recorrencia !== "unica" && ` · ${ROTULO_RECORRENCIA[it.recorrencia].toLowerCase()}`}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Prazos</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Publicada em</dt><dd>{formatarData(lista.publicada_em)}</dd>
              <dt className="text-muted-foreground">Propostas até</dt><dd>{formatarData(lista.prazo_propostas)}</dd>
              <dt className="text-muted-foreground">Precisa em</dt><dd>{formatarData(lista.data_desejada)}</dd>
            </dl>
            {publicada && decide && (
              <p className="mt-4 flex items-center gap-2 rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
                <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                {compat.data ?? "…"} fornecedor(es) compatível(is) com esta lista.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {publicada && decide && (
        <div className="mt-6">
          <ComparativoLista listaId={id} escopo={lista.escopo} statusLista={lista.status} />
        </div>
      )}
    </>
  );
}

/* Fim de ListaDetalhe.tsx */
