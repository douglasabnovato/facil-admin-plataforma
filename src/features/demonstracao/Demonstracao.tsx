/*
 * Demonstracao.tsx — o fluxo principal com dados fictícios, sem login e sem acessar o banco.
 * Existe para a plataforma poder ser avaliada mesmo com o backend fora do ar. Nada é gravado.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Marca } from "@/app/Marca";
import { Score, SeloStatus } from "@/components/Comuns";
import { Button } from "@/components/ui/button";
import { faltamPropostas, ordenarPropostas, type CriterioOrdem } from "@/features/propostas/regras";

type Proposta = { id: string; fornecedor: string; valor: number; prazoDias: number; score: number; motivos: string };

const LISTA = { titulo: "Manutenção elétrica e limpeza", condominio: "Condomínio Exemplo", itens: ["Revisão do quadro elétrico", "Limpeza mensal das áreas comuns"] };

const PROPOSTAS: Proposta[] = [
  { id: "a", fornecedor: "Fornecedor A", valor: 4200, prazoDias: 10, score: 91, motivos: "Atende às 2 categorias, NR-10 válida, a 6 km" },
  { id: "b", fornecedor: "Fornecedor B", valor: 3800, prazoDias: 20, score: 74, motivos: "Atende às 2 categorias, a 18 km" },
  { id: "c", fornecedor: "Fornecedor C", valor: 5600, prazoDias: 7, score: 62, motivos: "Atende a 1 categoria, a 4 km" },
];

const LIMITE_SEM_VOTACAO = 5000;
const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* Página pública com o comparativo de propostas e a regra de aprovação. */
export default function Demonstracao() {
  const [escolhida, setEscolhida] = useState<Proposta | null>(null);
  const [ordem, setOrdem] = useState<CriterioOrdem>("score");
  const lista = ordenarPropostas(PROPOSTAS, ordem);
  const faltam = faltamPropostas(PROPOSTAS.length);

  return (
    <div className="min-h-screen bg-background">
      <header className="container flex h-16 items-center justify-between">
        <Link to="/entrar" aria-label="FacilAdmin, entrar">
          <Marca />
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link to="/entrar">Entrar</Link>
        </Button>
      </header>
      <main id="conteudo" className="container max-w-3xl space-y-6 pb-16 pt-4">
        <p role="note" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <strong>Demonstração com dados fictícios.</strong> Nada aqui é gravado, e os fornecedores não existem.
        </p>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Compare propostas e escolha sem favorecimento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O condomínio publica a necessidade, recebe propostas comparáveis e decide conforme as próprias regras.
          </p>
        </div>

        <section aria-labelledby="demo-lista" className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="demo-lista" className="text-lg font-semibold">{LISTA.titulo}</h2>
            <SeloStatus tipo="lista" status="aberta" />
          </div>
          <p className="text-sm text-muted-foreground">{LISTA.condominio}</p>
          <ul className="mt-3 list-disc pl-5 text-sm">
            {LISTA.itens.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </section>

        <section aria-labelledby="demo-propostas" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="demo-propostas" className="text-lg font-semibold">Propostas recebidas</h2>
            <label className="flex flex-col text-sm">
              Ordenar por
              <select
                className="mt-1 rounded-md border bg-background px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value as CriterioOrdem)}
              >
                <option value="score">Maior aderência</option>
                <option value="valor">Menor valor</option>
                <option value="prazo">Menor prazo</option>
              </select>
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            {faltam === 0
              ? `${PROPOSTAS.length} propostas por escrito: atende ao mínimo de 3 para comparar.`
              : `Faltam ${faltam} propostas para o mínimo de 3.`}
          </p>
          <ul className="space-y-3" aria-label="Propostas na ordem escolhida">
            {lista.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{p.fornecedor}</h3>
                    <p className="text-sm text-muted-foreground">{moeda(p.valor)} · {p.prazoDias} dias</p>
                  </div>
                  <Score valor={p.score} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.motivos}</p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  variant={escolhida?.id === p.id ? "default" : "outline"}
                  aria-pressed={escolhida?.id === p.id}
                  onClick={() => setEscolhida(p)}
                >
                  Escolher {p.fornecedor}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="demo-decisao" aria-live="polite" className="rounded-xl border bg-card p-5">
          <h2 id="demo-decisao" className="text-lg font-semibold">Decisão</h2>
          {!escolhida && <p className="mt-1 text-sm text-muted-foreground">Escolha uma proposta para ver a regra de aprovação.</p>}
          {escolhida && escolhida.valor > LIMITE_SEM_VOTACAO && (
            <div className="mt-2 space-y-2 text-sm">
              <SeloStatus tipo="contratacao" status="aguardando_aprovacao" />
              <p>{moeda(escolhida.valor)} passa do limite de {moeda(LIMITE_SEM_VOTACAO)}: o conselho vota antes da contratação.</p>
            </div>
          )}
          {escolhida && escolhida.valor <= LIMITE_SEM_VOTACAO && (
            <div className="mt-2 space-y-2 text-sm">
              <SeloStatus tipo="contratacao" status="aprovada" />
              <p>{moeda(escolhida.valor)} está dentro do limite de {moeda(LIMITE_SEM_VOTACAO)}: a síndica aprova sem votação.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* Fim de Demonstracao.tsx */
