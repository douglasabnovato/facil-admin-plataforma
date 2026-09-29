/*
 * Notificacoes.tsx — avisos in-app (novas oportunidades, propostas, votos, aprovações), com marcar como lida.
 */
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CabecalhoPagina, Carregando, ErroCarga, EstadoVazio } from "@/components/Comuns";
import { cn } from "@/lib/utils";
import { tempoRelativo } from "@/lib/formatos";
import { supabase } from "@/lib/supabase";
import type { Notificacao } from "@/lib/tipos";

/* Últimas 100 notificações do usuário. */
async function listar(): Promise<Notificacao[]> {
  const { data, error } = await supabase.from("notificacoes").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as Notificacao[];
}

/* Marca como lidas (uma ou todas). */
async function marcarLidas(id?: string): Promise<void> {
  let q = supabase.from("notificacoes").update({ lida: true }).eq("lida", false);
  if (id) q = q.eq("id", id);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

/* Página de notificações. */
export default function Notificacoes() {
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const q = useQuery({ queryKey: ["notificacoes"], queryFn: listar });
  const lidas = useMutation({
    mutationFn: marcarLidas,
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["notificacoes"] }),
  });
  const abrir = (n: Notificacao) => {
    if (!n.lida) lidas.mutate(n.id);
    if (n.link) navegar(n.link);
  };
  const temNaoLidas = q.data?.some((n) => !n.lida);

  return (
    <>
      <CabecalhoPagina
        titulo="Notificações"
        acoes={temNaoLidas && <Button variant="outline" onClick={() => lidas.mutate(undefined)}><CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />Marcar todas como lidas</Button>}
      />
      {q.isLoading ? <Carregando /> : q.error ? <ErroCarga erro={q.error} tentar={q.refetch} /> : !q.data?.length ? (
        <EstadoVazio titulo="Nenhuma notificação." texto="Novas oportunidades, propostas e votações aparecem aqui." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {q.data.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => abrir(n)} className={cn("flex w-full items-start gap-3 p-4 text-left hover:bg-muted", !n.lida && "bg-secondary/50")}>
                    <Bell className={cn("mt-0.5 h-4 w-4 shrink-0", n.lida ? "text-muted-foreground" : "text-primary")} aria-hidden="true" />
                    <span className="flex-1">
                      <span className={cn("block text-sm", !n.lida && "font-semibold")}>{n.titulo}</span>
                      <span className="text-xs text-muted-foreground">{tempoRelativo(n.created_at)}</span>
                    </span>
                    {!n.lida && <span className="sr-only">não lida</span>}
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* Fim de Notificacoes.tsx */
