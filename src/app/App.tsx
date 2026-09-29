/*
 * App.tsx — provedores (React Query, Auth, tooltips, toasts) e rotas. Páginas carregadas sob demanda.
 * O basename segue o caminho publicado (VITE_BASE), para funcionar no GitHub Pages.
 */
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Carregando } from "@/components/Comuns";
import { AuthProvider } from "@/features/auth/AuthContext";
import { configurado } from "@/lib/supabase";
import Layout from "./Layout";
import { RotaProtegida } from "./RotaProtegida";
import { NaoEncontrada, Privacidade, Termos } from "./Paginas";

const Entrar = lazy(() => import("@/features/auth/Entrar"));
const Cadastro = lazy(() => import("@/features/auth/Cadastro"));
const NovaSenha = lazy(() => import("@/features/auth/NovaSenha"));
const Conta = lazy(() => import("@/features/auth/Conta"));
const Painel = lazy(() => import("@/features/painel/Painel"));
const Condominios = lazy(() => import("@/features/organizacoes/Condominios"));
const CondominioDetalhe = lazy(() => import("@/features/organizacoes/CondominioDetalhe"));
const Listas = lazy(() => import("@/features/necessidades/Listas"));
const NovaLista = lazy(() => import("@/features/necessidades/NovaLista"));
const ListaDetalhe = lazy(() => import("@/features/necessidades/ListaDetalhe"));
const Oportunidades = lazy(() => import("@/features/matching/Oportunidades"));
const OportunidadeDetalhe = lazy(() => import("@/features/matching/OportunidadeDetalhe"));
const MinhasPropostas = lazy(() => import("@/features/propostas/MinhasPropostas"));
const Contratacoes = lazy(() => import("@/features/contratacoes/Contratacoes"));
const ContratacaoDetalhe = lazy(() => import("@/features/contratacoes/ContratacaoDetalhe"));
const PerfilFornecedor = lazy(() => import("@/features/fornecedores/PerfilFornecedor"));
const Notificacoes = lazy(() => import("@/features/notificacoes/Notificacoes"));
const Admin = lazy(() => import("@/features/admin/Admin"));

const cliente = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

/* Aviso quando o .env não foi preenchido. */
function SemConfiguracao() {
  return (
    <div className="container max-w-xl py-16">
      <h1 className="text-2xl font-semibold">Configuração pendente</h1>
      <p className="mt-2 text-muted-foreground">
        Crie o arquivo <code>.env.development.local</code> a partir do <code>.env.example</code> com a URL e a chave pública do Supabase e reinicie o <code>npm run dev</code>. Passo a passo em docs/AMBIENTE-LOCAL.md.
      </p>
    </div>
  );
}

/* Aplicação. */
export default function App() {
  if (!configurado) return <SemConfiguracao />;
  const protegida = (el: JSX.Element, admin = false) => <RotaProtegida admin={admin}>{el}</RotaProtegida>;
  return (
    <QueryClientProvider client={cliente}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Suspense fallback={<Carregando />}>
              <Routes>
                <Route path="/entrar" element={<Entrar />} />
                <Route path="/cadastro" element={<Cadastro />} />
                <Route path="/nova-senha" element={<NovaSenha />} />
                <Route path="/termos" element={<Termos />} />
                <Route path="/privacidade" element={<Privacidade />} />
                <Route element={protegida(<Layout />)}>
                  <Route index element={<Painel />} />
                  <Route path="conta" element={<Conta />} />
                  <Route path="condominios" element={<Condominios />} />
                  <Route path="condominios/:id" element={<CondominioDetalhe />} />
                  <Route path="listas" element={<Listas />} />
                  <Route path="listas/nova" element={<NovaLista />} />
                  <Route path="listas/:id" element={<ListaDetalhe />} />
                  <Route path="listas/:id/editar" element={<NovaLista />} />
                  <Route path="oportunidades" element={<Oportunidades />} />
                  <Route path="oportunidades/:id" element={<OportunidadeDetalhe />} />
                  <Route path="propostas" element={<MinhasPropostas />} />
                  <Route path="contratacoes" element={<Contratacoes />} />
                  <Route path="contratacoes/:id" element={<ContratacaoDetalhe />} />
                  <Route path="fornecedor" element={<PerfilFornecedor />} />
                  <Route path="notificacoes" element={<Notificacoes />} />
                  <Route path="admin" element={protegida(<Admin />, true)} />
                  <Route path="*" element={<NaoEncontrada />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/* Fim de App.tsx */
