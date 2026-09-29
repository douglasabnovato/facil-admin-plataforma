/*
 * Paginas.tsx — páginas estáticas: Termos de Uso, Política de Privacidade (rascunhos para revisão jurídica) e 404.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Marca } from "./Marca";

/* Moldura simples para textos. */
function Texto({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="container flex h-16 items-center"><Link to="/" aria-label="FacilAdmin, início"><Marca /></Link></header>
      <main id="conteudo" className="container max-w-3xl pb-16">
        <h1 className="mb-2 text-3xl font-semibold">{titulo}</h1>
        <p className="mb-6 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">Rascunho para o piloto. Será revisado juridicamente antes do lançamento.</p>
        <div className="space-y-4 text-sm leading-relaxed text-foreground [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold">{children}</div>
      </main>
    </div>
  );
}

/* Termos de Uso (rascunho). */
export function Termos() {
  return (
    <Texto titulo="Termos de Uso">
      <p>A FacilAdmin conecta condomínios, administradoras e moradores a fornecedores de serviços e produtos. A plataforma organiza pedidos, propostas e aprovações; não presta os serviços nem intermedeia pagamentos.</p>
      <h2>Contas</h2>
      <p>Cada pessoa usa a própria conta. Síndicos e administradoras respondem pelas listas publicadas em nome do condomínio. Fornecedores respondem pela veracidade dos documentos enviados.</p>
      <h2>Propostas e contratações</h2>
      <p>Propostas são compromissos do fornecedor pelo prazo de validade informado. A contratação, a execução e o pagamento são acertados diretamente entre as partes.</p>
      <h2>Conduta</h2>
      <p>É proibido usar os contatos obtidos para fins diferentes da contratação, publicar conteúdo falso ou burlar as regras de aprovação do condomínio. Contas que descumprirem podem ser suspensas.</p>
    </Texto>
  );
}

/* Política de Privacidade (rascunho). */
export function Privacidade() {
  return (
    <Texto titulo="Política de Privacidade">
      <p>Tratamos os dados necessários para operar a plataforma, com base na execução do contrato e no legítimo interesse (LGPD, art. 7º).</p>
      <h2>O que coletamos</h2>
      <p>Nome, e-mail e telefone; dados do condomínio (endereço e unidades); dados do fornecedor (razão social, CNPJ/CPF, área de atendimento, documentos de habilitação).</p>
      <h2>Quem vê o quê</h2>
      <p>Fornecedores veem só bairro e cidade das listas. Endereço e contatos do condomínio são liberados apenas ao fornecedor com proposta aprovada. Documentos do fornecedor são vistos só pela equipe FacilAdmin.</p>
      <h2>Seus direitos</h2>
      <p>Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail de privacidade que será divulgado no lançamento.</p>
    </Texto>
  );
}

/* Página não encontrada. */
export function NaoEncontrada() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl font-semibold text-primary">404</p>
      <p className="text-muted-foreground">Página não encontrada.</p>
      <Button asChild><Link to="/">Voltar ao painel</Link></Button>
    </div>
  );
}

/* Fim de Paginas.tsx */
