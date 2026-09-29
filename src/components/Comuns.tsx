/*
 * Comuns.tsx — peças de interface usadas em todas as telas: cabeçalho de página, estado vazio,
 * carregamento, erro de carga e selos de status.
 */
import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROTULO_STATUS_CONTRATACAO, ROTULO_STATUS_LISTA, ROTULO_STATUS_PROPOSTA } from "@/lib/formatos";
import type { StatusContratacao, StatusLista, StatusProposta } from "@/lib/tipos";

/* Título da página com descrição e ações à direita. */
export function CabecalhoPagina({ titulo, descricao, acoes }: { titulo: string; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-muted-foreground sm:text-base">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

/* Caixa tracejada para listas vazias. */
export function EstadoVazio({ titulo, texto, acao }: { titulo: string; texto?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      <p className="font-medium text-foreground">{titulo}</p>
      {texto && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{texto}</p>}
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  );
}

/* Indicador de carregamento acessível. */
export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

/* Mensagem de erro com botão de tentar de novo. */
export function ErroCarga({ erro, tentar }: { erro: unknown; tentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="text-sm text-foreground">{erro instanceof Error ? erro.message : "Não foi possível carregar."}</p>
      {tentar && (
        <Button variant="outline" size="sm" onClick={tentar}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

const TOM: Record<string, string> = {
  neutro: "border-border bg-muted text-muted-foreground",
  azul: "border-primary/30 bg-secondary text-secondary-foreground",
  verde: "border-success/30 bg-success/10 text-success",
  ambar: "border-warning/40 bg-warning/10 text-warning",
  vermelho: "border-destructive/30 bg-destructive/10 text-destructive",
};

const TOM_STATUS: Record<string, keyof typeof TOM> = {
  sugestao: "ambar", rascunho: "neutro", aberta: "azul", em_aprovacao: "ambar", contratada: "verde", encerrada: "neutro", cancelada: "vermelho",
  enviada: "azul", escolhida: "verde", recusada: "neutro", retirada: "neutro", expirada: "neutro",
  aguardando_aprovacao: "ambar", aprovada: "verde", em_execucao: "azul", concluida: "verde",
};

/* Selo de status de lista, proposta ou contratação. */
export function SeloStatus({ tipo, status, className }: { tipo: "lista" | "proposta" | "contratacao"; status: string; className?: string }) {
  const rotulo =
    tipo === "lista" ? ROTULO_STATUS_LISTA[status as StatusLista]
    : tipo === "proposta" ? ROTULO_STATUS_PROPOSTA[status as StatusProposta]
    : ROTULO_STATUS_CONTRATACAO[status as StatusContratacao];
  const tom = tipo === "contratacao" && status === "recusada" ? "vermelho" : TOM_STATUS[status] ?? "neutro";
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap font-medium", TOM[tom], className)}>
      {rotulo ?? status}
    </Badge>
  );
}

/* Barra de score 0–100 com rótulo. */
export function Score({ valor }: { valor: number | null | undefined }) {
  if (valor === null || valor === undefined) return null;
  const tom = valor >= 75 ? "bg-success" : valor >= 50 ? "bg-primary" : "bg-warning";
  return (
    <div className="flex items-center gap-2" aria-label={`Compatibilidade ${valor} de 100`}>
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={cn("h-full rounded-full", tom)} style={{ width: `${Math.min(100, Math.max(0, valor))}%` }} />
      </div>
      <span className="text-sm font-semibold tabular-nums">{valor}</span>
    </div>
  );
}

/* Fim de Comuns.tsx */
