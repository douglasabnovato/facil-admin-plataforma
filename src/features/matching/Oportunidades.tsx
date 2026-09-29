/*
 * Oportunidades.tsx — listas compatíveis com o fornecedor, ordenadas pelo score, com os motivos do match.
 */
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, EyeOff, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CabecalhoPagina, Carregando, ErroCarga, EstadoVazio, Score, SeloStatus } from "@/components/Comuns";
import { formatarData } from "@/lib/formatos";
import { meuFornecedor } from "@/features/fornecedores/api";
import { ignorarOportunidade, oportunidades } from "./api";

/* Página de oportunidades. */
export default function Oportunidades() {
  const cliente = useQueryClient();
  const forn = useQuery({ queryKey: ["fornecedor"], queryFn: meuFornecedor });
  const q = useQuery({ queryKey: ["oportunidades"], queryFn: oportunidades, enabled: !!forn.data?.fornecedor });
  const ignorar = useMutation({
    mutationFn: (id: string) => ignorarOportunidade(id),
    onSuccess: () => {
      toast.success("Oportunidade escondida");
      cliente.invalidateQueries({ queryKey: ["oportunidades"] });
    },
  });

  const f = forn.data?.fornecedor;
  return (
    <>
      <CabecalhoPagina titulo="Oportunidades" descricao="Listas publicadas por condomínios dentro da sua área e das suas categorias." />
      {forn.isLoading || q.isLoading ? <Carregando /> : forn.error || q.error ? <ErroCarga erro={forn.error ?? q.error} tentar={() => q.refetch()} /> : !f ? (
        <EstadoVazio titulo="Complete o seu cadastro de fornecedor." texto="Com categorias, área de atendimento e documentos, você passa a receber oportunidades." acao={<Button asChild><Link to="/fornecedor">Completar cadastro</Link></Button>} />
      ) : !f.verificado ? (
        <EstadoVazio titulo="Seu cadastro está em verificação." texto="Assim que a equipe FacilAdmin verificar os documentos, as oportunidades aparecem aqui e você recebe um aviso." acao={<Button asChild variant="outline"><Link to="/fornecedor">Ver meu cadastro</Link></Button>} />
      ) : !q.data?.length ? (
        <EstadoVazio titulo="Nenhuma oportunidade aberta no momento." texto="Quando um condomínio da sua região publicar uma lista compatível, avisamos você. Aumentar o raio ou as categorias amplia o alcance." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {q.data.map((o) => (
            <li key={o.lista_id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/oportunidades/${o.lista_id}`} className="font-semibold hover:underline">{o.titulo}</Link>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" aria-hidden="true" />{[o.bairro, `${o.cidade}/${o.uf}`].filter(Boolean).join(" · ")}
                        {o.escopo === "unidade" && " · unidade residencial"}
                      </p>
                    </div>
                    <Score valor={o.score} />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {o.categorias.map((c) => <Badge key={c} variant="secondary" className="font-normal">{c}</Badge>)}
                    {o.status_match === "sugerido" && <Badge className="bg-accent text-accent-foreground">Nova</Badge>}
                  </div>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">{o.motivos.map((m) => <li key={m}>• {m}</li>)}</ul>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3 w-3" aria-hidden="true" />Propostas até {formatarData(o.prazo_propostas)}
                    </span>
                    <div className="flex items-center gap-2">
                      {o.minha_proposta ? <SeloStatus tipo="proposta" status={o.minha_proposta} /> : (
                        <Button variant="ghost" size="sm" onClick={() => ignorar.mutate(o.lista_id)} aria-label={`Esconder ${o.titulo}`}><EyeOff className="h-4 w-4" /></Button>
                      )}
                      <Button asChild size="sm"><Link to={`/oportunidades/${o.lista_id}`}>{o.minha_proposta ? "Ver" : "Enviar proposta"}</Link></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* Fim de Oportunidades.tsx */
