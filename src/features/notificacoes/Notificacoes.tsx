/*
 * Notificacoes.tsx — avisos in-app (novas oportunidades, propostas, votos, aprovações), com marcar como lida.
 */
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CabecalhoPagina, Carregando, ErroCarga, EstadoVazio } from "@/components/Comuns";
import { cn } from "@/lib/utils";
import { tempoRelativo } from "@/lib/formatos";
import type { Notificacao } from "@/lib/tipos";
import { listarNotificacoes, marcarLidas } from "./api";

/* Página de notificações. */
export default function Notificacoes() {
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const q = useQuery({ queryKey: ["notificacoes"], queryFn: listarNotificacoes });
  const lidas = useMutation({
    mutationFn: marcarLidas,
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["notificacoes"] }),
    onError: (e: Error) => toast.error(`Não foi possível marcar como lida: ${e.message}`),
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
