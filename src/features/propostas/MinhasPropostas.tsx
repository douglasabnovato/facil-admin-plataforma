/*
 * MinhasPropostas.tsx — propostas enviadas pelo fornecedor, com a situação da lista e da contratação.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CabecalhoPagina, Carregando, ErroCarga, EstadoVazio, SeloStatus } from "@/components/Comuns";
import { formatarData, formatarReais } from "@/lib/formatos";
import { minhasPropostas } from "./api";

/* Página de propostas do fornecedor. */
export default function MinhasPropostas() {
  const q = useQuery({ queryKey: ["propostas"], queryFn: minhasPropostas });
  return (
    <>
      <CabecalhoPagina titulo="Minhas propostas" descricao="Acompanhe o que foi enviado, escolhido ou recusado." />
      {q.isLoading ? <Carregando /> : q.error ? <ErroCarga erro={q.error} tentar={q.refetch} /> : !q.data?.length ? (
        <EstadoVazio titulo="Você ainda não enviou propostas." acao={<Button asChild><Link to="/oportunidades">Ver oportunidades</Link></Button>} />
      ) : (
        <ul className="space-y-3">
          {q.data.map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/oportunidades/${p.lista_id}`} className="font-semibold hover:underline">{p.titulo}</Link>
                      <SeloStatus tipo="proposta" status={p.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[p.bairro, `${p.cidade}/${p.uf}`].filter(Boolean).join(" · ")} · {formatarReais(p.valor_total)} · {p.prazo_execucao_dias} dia(s) · válida até {formatarData(p.validade)}
                    </p>
                  </div>
                  {p.contratacao_id && (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/contratacoes/${p.contratacao_id}`}>Contratação{p.status_contratacao ? ` · ${p.status_contratacao === "aguardando_aprovacao" ? "aguardando conselho" : p.status_contratacao.replace("_", " ")}` : ""}</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* Fim de MinhasPropostas.tsx */
