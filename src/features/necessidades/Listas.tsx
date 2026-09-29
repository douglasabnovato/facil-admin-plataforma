/*
 * Listas.tsx — necessidades dos condomínios do usuário, com filtro por condomínio e por situação.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina, Carregando, ErroCarga, EstadoVazio, SeloStatus } from "@/components/Comuns";
import { formatarData } from "@/lib/formatos";
import { meusCondominios } from "@/features/organizacoes/api";
import { minhasListas } from "./api";

const FILTROS = [
  { valor: "andamento", rotulo: "Em andamento", status: ["sugestao", "rascunho", "aberta", "em_aprovacao"] },
  { valor: "contratadas", rotulo: "Contratadas", status: ["contratada", "encerrada"] },
  { valor: "todas", rotulo: "Todas", status: [] as string[] },
];

/* Página de listas. */
export default function Listas() {
  const [params, setParams] = useSearchParams();
  const condominio = params.get("condominio");
  const [filtro, setFiltro] = useState("andamento");
  const conds = useQuery({ queryKey: ["condominios"], queryFn: meusCondominios });
  const listas = useQuery({ queryKey: ["listas", condominio], queryFn: () => minhasListas(condominio) });
  const ativos = conds.data?.filter((c) => c.status === "ativo") ?? [];
  const status = FILTROS.find((f) => f.valor === filtro)?.status ?? [];
  const visiveis = (listas.data ?? []).filter((l) => !status.length || status.includes(l.status));

  return (
    <>
      <CabecalhoPagina
        titulo="Necessidades"
        descricao="Listas publicadas pelo condomínio, sugestões de moradores e pedidos da sua unidade."
        acoes={
          ativos.length > 0 && (
            <Button asChild>
              <Link to={`/listas/nova${condominio ? `?condominio=${condominio}` : ""}`}><ListPlus className="mr-2 h-4 w-4" aria-hidden="true" />Nova lista</Link>
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        {ativos.length > 1 && (
          <Select value={condominio ?? "todos"} onValueChange={(v) => setParams(v === "todos" ? {} : { condominio: v })}>
            <SelectTrigger className="w-64" aria-label="Condomínio"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os condomínios</SelectItem>
              {ativos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div role="tablist" aria-label="Situação" className="inline-flex rounded-lg border bg-card p-1">
          {FILTROS.map((f) => (
            <button key={f.valor} role="tab" aria-selected={filtro === f.valor} onClick={() => setFiltro(f.valor)}
              className={`rounded-md px-3 py-1.5 text-sm ${filtro === f.valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>
      {listas.isLoading ? <Carregando /> : listas.error ? <ErroCarga erro={listas.error} tentar={listas.refetch} /> : !ativos.length && !conds.isLoading ? (
        <EstadoVazio titulo="Entre em um condomínio primeiro." texto="As listas pertencem a um condomínio." acao={<Button asChild variant="outline"><Link to="/condominios">Ir para condomínios</Link></Button>} />
      ) : !visiveis.length ? (
        <EstadoVazio titulo="Nenhuma lista aqui." texto="Crie uma lista com os itens de que o condomínio precisa: os fornecedores compatíveis recebem a oportunidade." />
      ) : (
        <ul className="space-y-3">
          {visiveis.map((l) => (
            <li key={l.id}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-0">
                  <Link to={`/listas/${l.id}`} className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{l.titulo}</span>
                        <SeloStatus tipo="lista" status={l.status} />
                        {l.escopo === "unidade" && <span className="text-xs text-muted-foreground">Unidade {l.unidade}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {l.condominio} · {l.itens} {l.itens === 1 ? "item" : "itens"}
                        {l.status === "aberta" && ` · ${l.propostas} de ${l.min_propostas} propostas · prazo ${formatarData(l.prazo_propostas)}`}
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

/* Fim de Listas.tsx */
