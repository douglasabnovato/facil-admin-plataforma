/*
 * apoio.tsx — dados fictícios e montagem das telas logadas nos testes, com a API simulada.
 * Não depende do Supabase publicado (#2).
 */
import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContexto, type AuthValor } from "@/features/auth/contexto";
import type {
  Fornecedor, MeuCondominio, MinhaContratacao, MinhaProposta, Notificacao, Oportunidade, Painel, Perfil, ResumoLista,
} from "@/lib/tipos";

export const perfilGestor: Perfil = { user_id: "u1", nome: "Ana Souza", telefone: null, tipo: "gestor", is_admin: false };
export const perfilFornecedor: Perfil = { ...perfilGestor, nome: "Bruno Lima", tipo: "fornecedor" };

/* Contexto de autenticação com o perfil dado. */
export function auth(perfil: Perfil | null = perfilGestor): AuthValor {
  return {
    sessao: null,
    usuario: perfil ? ({ id: perfil.user_id, email: "teste@exemplo.com" } as AuthValor["usuario"]) : null,
    perfil,
    carregando: false,
    recarregarPerfil: async () => {},
    sair: async () => {},
  };
}

/* Monta um elemento com QueryClient novo (sem novas tentativas), rota e autenticação. */
export function montar(el: ReactNode, { rota = "/", perfil = perfilGestor }: { rota?: string; perfil?: Perfil | null } = {}) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <AuthContexto.Provider value={auth(perfil)}>
        <MemoryRouter initialEntries={[rota]}>{el}</MemoryRouter>
      </AuthContexto.Provider>
    </QueryClientProvider>,
  );
}

/* Promessa que nunca resolve: deixa a tela em carregamento. */
export const pendente = () => new Promise<never>(() => {});

export const condominio: MeuCondominio = {
  id: "c1", nome: "Residencial Ipês", cidade: "Campinas", uf: "SP", papel: "sindico", status: "ativo", unidade: "Bloco A, 101",
  codigo_convite: "ABCD1234", min_propostas: 3, limite_conselho: 5000, membros_pendentes: 1,
};

export const lista: ResumoLista = {
  id: "l1", condominio_id: "c1", condominio: "Residencial Ipês", titulo: "Manutenção elétrica", escopo: "condominio",
  unidade: null, status: "aberta", prazo_propostas: "2026-12-01", itens: 2, propostas: 1, min_propostas: 3,
  eh_autor: true, created_at: "2026-11-01",
};

export const fornecedor = {
  id: "f1", user_id: "u1", razao_social: "Lima Serviços Ltda", nome_fantasia: "Lima Serviços", documento: "00000000000000",
  tipo: "servico", descricao: null, telefone: null, email_contato: null, cep: "13000000", bairro: "Centro", cidade: "Campinas",
  uf: "SP", latitude: null, longitude: null, raio_km: 20, verificado: true, ativo: true,
} as Fornecedor;

export const oportunidade: Oportunidade = {
  lista_id: "l1", titulo: "Manutenção elétrica", bairro: "Cambuí", cidade: "Campinas", uf: "SP", escopo: "condominio",
  prazo_propostas: "2026-12-01", data_desejada: null, itens: 2, categorias: ["Elétrica"], score: 82,
  motivos: ["Atende a categoria Elétrica", "A 4 km da sua base"], cobertura: 1, distancia_km: 4, status_match: "sugerido",
  minha_proposta: null, publicada_em: "2026-11-02",
};

export const proposta: MinhaProposta = {
  id: "p1", lista_id: "l1", titulo: "Manutenção elétrica", bairro: "Cambuí", cidade: "Campinas", uf: "SP", status: "escolhida",
  valor_total: 3200, prazo_execucao_dias: 5, validade: "2026-12-10", status_lista: "contratada", contratacao_id: "k1",
  status_contratacao: "aguardando_aprovacao", updated_at: "2026-11-05",
};

export const contratacao: MinhaContratacao = {
  id: "k1", lista_id: "l1", titulo: "Manutenção elétrica", condominio: "Residencial Ipês", fornecedor: "Lima Serviços",
  valor_total: 6200, status: "aguardando_aprovacao", exige_conselho: true, votos_sim: 1, votos_nao: 0, conselheiros: 3,
  meu_voto: null, lado: "contratante", pode_votar: true, pode_gerir: true, ja_avaliei: false, created_at: "2026-11-05",
};

export const notificacao: Notificacao = {
  id: "n1", tipo: "proposta", titulo: "Nova proposta em Manutenção elétrica", link: "/listas/l1", lida: false, created_at: "2026-11-05T10:00:00Z",
};

export const painel: Painel = {
  contratante: { condominios: 1, listas_abertas: 1, sugestoes: 0, propostas_30d: 2, aprovacoes_pendentes: 1, em_andamento: 0, membros_pendentes: 1 },
  fornecedor: null,
  nao_lidas: 1,
};

/* Fim de apoio.tsx */
