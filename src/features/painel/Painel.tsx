/*
 * Painel.tsx — página inicial logada: próximos passos (onboarding) e indicadores do lado contratante e do fornecedor.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ClipboardList, FileCheck2, Handshake, Inbox, Star, Users, Vote, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CabecalhoPagina, Carregando, ErroCarga } from "@/components/Comuns";
import { rpc } from "@/lib/supabase";
import type { Painel as TPainel } from "@/lib/tipos";
import { useAuth } from "@/features/auth/contexto";

/* Cartão de indicador com link. */
function Indicador({ icone: Icone, valor, rotulo, para, destaque }: { icone: typeof Inbox; valor: ReactNode; rotulo: string; para: string; destaque?: boolean }) {
  return (
    <Link to={para} className="group">
      <Card className={`h-full transition-shadow group-hover:shadow-md ${destaque ? "border-warning/50 bg-warning/5" : ""}`}>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icone className="h-5 w-5" aria-hidden="true" /></div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{valor}</p>
            <p className="text-sm text-muted-foreground">{rotulo}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* Chamada para o próximo passo. */
function Passo({ titulo, texto, para, acao }: { titulo: string; texto: string; para: string; acao: string }) {
  return (
    <Card className="border-primary/30 bg-secondary/60">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-primary">{titulo}</p>
          <p className="text-sm text-secondary-foreground">{texto}</p>
        </div>
        <Button asChild><Link to={para}>{acao}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>
      </CardContent>
    </Card>
  );
}

/* Página do painel. */
export default function Painel() {
  const { perfil } = useAuth();
  const q = useQuery({ queryKey: ["painel"], queryFn: () => rpc<TPainel>("painel") });
  if (q.isLoading) return <Carregando />;
  if (q.error || !q.data) return <ErroCarga erro={q.error} tentar={q.refetch} />;
  const { contratante: c, fornecedor: f } = q.data;
  const ehFornecedor = perfil?.tipo === "fornecedor";
  const primeiroNome = perfil?.nome?.split(" ")[0] ?? "";

  return (
    <>
      <CabecalhoPagina titulo={`Olá, ${primeiroNome}`} descricao="O que está acontecendo nas suas compras e propostas." />
      <div className="space-y-4">
        {ehFornecedor && !f && <Passo titulo="Complete o seu cadastro de fornecedor" texto="Categorias, área de atendimento e documentos. Depois da verificação, você recebe oportunidades." para="/fornecedor" acao="Completar" />}
        {ehFornecedor && f && !f.verificado && <Passo titulo="Cadastro em verificação" texto={`${f.documentos_em_analise} documento(s) em análise. Envie o cartão CNPJ e as certificações das suas categorias.`} para="/fornecedor" acao="Ver documentos" />}
        {!ehFornecedor && c.condominios === 0 && <Passo titulo="Comece pelo condomínio" texto="Síndicos e administradoras cadastram o condomínio; moradores entram com o código de convite." para="/condominios" acao="Condomínios" />}
        {!ehFornecedor && c.condominios > 0 && c.listas_abertas === 0 && c.sugestoes === 0 && <Passo titulo="Publique a primeira lista de necessidades" texto="Itens por categoria; os fornecedores verificados da região recebem e enviam propostas comparáveis." para="/listas/nova" acao="Nova lista" />}
      </div>

      {!ehFornecedor && (
        <section aria-label="Condomínio" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Indicador icone={Vote} valor={c.aprovacoes_pendentes} rotulo="Aprovações esperando o seu voto" para="/contratacoes" destaque={c.aprovacoes_pendentes > 0} />
          <Indicador icone={Users} valor={c.membros_pendentes} rotulo="Pedidos de entrada de moradores" para="/condominios" destaque={c.membros_pendentes > 0} />
          <Indicador icone={ClipboardList} valor={c.listas_abertas} rotulo="Listas recebendo propostas" para="/listas" />
          <Indicador icone={Inbox} valor={c.propostas_30d} rotulo="Propostas recebidas (30 dias)" para="/listas" />
          <Indicador icone={Handshake} valor={c.em_andamento} rotulo="Contratações em andamento" para="/contratacoes" />
          <Indicador icone={Building2} valor={c.sugestoes} rotulo="Sugestões de moradores" para="/listas" destaque={c.sugestoes > 0} />
        </section>
      )}

      {f && (
        <section aria-label="Fornecedor" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Indicador icone={Inbox} valor={f.oportunidades} rotulo="Oportunidades abertas" para="/oportunidades" destaque={f.oportunidades > 0} />
          <Indicador icone={ClipboardList} valor={f.propostas_30d} rotulo="Propostas enviadas (30 dias)" para="/propostas" />
          <Indicador icone={Handshake} valor={f.em_andamento} rotulo="Serviços em andamento" para="/contratacoes" />
          <Indicador icone={Star} valor={f.nota ? `${String(f.nota).replace(".", ",")} (${f.avaliacoes})` : "—"} rotulo="Nota média" para="/contratacoes" />
          <Indicador icone={Wrench} valor={f.categorias} rotulo="Categorias atendidas" para="/fornecedor" />
          <Indicador icone={FileCheck2} valor={f.verificado ? "Sim" : "Não"} rotulo="Cadastro verificado" para="/fornecedor" />
        </section>
      )}
    </>
  );
}

/* Fim de Painel.tsx */
