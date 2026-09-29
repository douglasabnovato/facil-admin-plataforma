/*
 * Contratacoes.tsx — contratações do usuário (como contratante, conselheiro ou fornecedor), com pendências no topo.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Vote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CabecalhoPagina, Carregando, ErroCarga, EstadoVazio, SeloStatus } from "@/components/Comuns";
import { formatarData, formatarReais } from "@/lib/formatos";
import { minhasContratacoes } from "./api";

/* Página de contratações. */
export default function Contratacoes() {
  const q = useQuery({ queryKey: ["contratacoes"], queryFn: minhasContratacoes });
  return (
    <>
      <CabecalhoPagina titulo="Contratações" descricao="Propostas escolhidas, aprovações do conselho, execução e avaliações." />
      {q.isLoading ? <Carregando /> : q.error ? <ErroCarga erro={q.error} tentar={q.refetch} /> : !q.data?.length ? (
        <EstadoVazio titulo="Nenhuma contratação ainda." texto="Quando uma proposta for escolhida, ela aparece aqui." />
      ) : (
        <ul className="space-y-3">
          {q.data.map((c) => (
            <li key={c.id}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-0">
                  <Link to={`/contratacoes/${c.id}`} className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{c.titulo}</span>
                        <SeloStatus tipo="contratacao" status={c.status} />
                        {c.pode_votar && c.meu_voto === null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground"><Vote className="h-3 w-3" aria-hidden="true" />Seu voto</span>
                        )}
                        {c.status === "concluida" && !c.ja_avaliei && (c.pode_gerir || c.lado === "fornecedor") && <span className="text-xs font-medium text-accent">Avalie</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {c.lado === "fornecedor" ? c.condominio : c.fornecedor} · {formatarReais(c.valor_total)} · {formatarData(c.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* Fim de Contratacoes.tsx */
