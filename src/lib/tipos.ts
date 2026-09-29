/*
 * tipos.ts — formatos dos dados devolvidos pelas tabelas e funções do banco (migrações 01 e 03).
 * Mantidos à mão; quando o projeto crescer, gere com `npx supabase gen types typescript` (ver docs/ARQUITETURA.md, ADR-06).
 */
export type TipoPerfil = "gestor" | "condomino" | "fornecedor";
export type Papel = "sindico" | "administradora" | "conselheiro" | "condomino";
export type StatusLista = "sugestao" | "rascunho" | "aberta" | "em_aprovacao" | "contratada" | "encerrada" | "cancelada";
export type StatusProposta = "enviada" | "escolhida" | "recusada" | "retirada" | "expirada";
export type StatusContratacao = "aguardando_aprovacao" | "aprovada" | "recusada" | "em_execucao" | "concluida" | "cancelada";
export type Recorrencia = "unica" | "mensal" | "trimestral" | "anual";
export type TipoDocumento = "cnpj" | "nr10" | "nr35" | "credenciamento_bombeiros" | "seguro" | "outro";

export interface Perfil {
  user_id: string;
  nome: string;
  telefone: string | null;
  tipo: TipoPerfil;
  is_admin: boolean;
}

export interface Categoria {
  id: string;
  slug: string;
  nome: string;
  grupo: "servico" | "produto";
  certificacoes: string[];
  ativo: boolean;
}

export interface MeuCondominio {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  papel: Papel | null;
  status: "pendente" | "ativo" | "recusado";
  unidade: string | null;
  codigo_convite: string | null;
  min_propostas: number;
  limite_conselho: number;
  membros_pendentes: number;
}

export interface Condominio {
  id: string;
  nome: string;
  cnpj: string | null;
  cep: string;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
  unidades: number | null;
  min_propostas: number;
  limite_conselho: number;
  administradora_id: string | null;
}

export interface Membro {
  user_id: string;
  nome: string;
  papel: Papel;
  unidade: string | null;
  status: "pendente" | "ativo" | "recusado";
  eu: boolean;
}

export interface Fornecedor {
  id: string;
  user_id: string;
  razao_social: string;
  nome_fantasia: string | null;
  documento: string;
  tipo: "servico" | "produto" | "ambos";
  descricao: string | null;
  telefone: string | null;
  email_contato: string | null;
  cep: string;
  bairro: string | null;
  cidade: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
  raio_km: number;
  verificado: boolean;
  ativo: boolean;
}

export interface Documento {
  id: string;
  fornecedor_id: string;
  tipo: TipoDocumento;
  arquivo_path: string;
  validade: string | null;
  status: "em_analise" | "aprovado" | "recusado";
  observacao: string | null;
  created_at: string;
}

export interface ItemLista {
  id: string;
  lista_id: string;
  categoria_id: string;
  descricao: string;
  quantidade: number;
  unidade_medida: string;
  recorrencia: Recorrencia;
}

export interface Lista {
  id: string;
  condominio_id: string;
  criado_por: string;
  escopo: "condominio" | "unidade";
  unidade: string | null;
  titulo: string;
  descricao: string | null;
  status: StatusLista;
  prazo_propostas: string | null;
  data_desejada: string | null;
  fotos: string[];
  publicada_em: string | null;
  created_at: string;
}

export interface ResumoLista {
  id: string;
  condominio_id: string;
  condominio: string;
  titulo: string;
  escopo: "condominio" | "unidade";
  unidade: string | null;
  status: StatusLista;
  prazo_propostas: string | null;
  itens: number;
  propostas: number;
  min_propostas: number;
  eh_autor: boolean;
  created_at: string;
}

export interface Oportunidade {
  lista_id: string;
  titulo: string;
  bairro: string | null;
  cidade: string;
  uf: string;
  escopo: "condominio" | "unidade";
  prazo_propostas: string | null;
  data_desejada: string | null;
  itens: number;
  categorias: string[];
  score: number;
  motivos: string[];
  cobertura: number;
  distancia_km: number | null;
  status_match: "sugerido" | "visto" | "proposta" | "ignorado";
  minha_proposta: StatusProposta | null;
  publicada_em: string | null;
}

export interface ItemProposta {
  item_id: string;
  valor_unitario: number;
  observacao: string | null;
}

export interface OportunidadeDetalhe {
  id: string;
  titulo: string;
  descricao: string | null;
  status: StatusLista;
  escopo: "condominio" | "unidade";
  prazo_propostas: string | null;
  data_desejada: string | null;
  publicada_em: string | null;
  bairro: string | null;
  cidade: string;
  uf: string;
  unidades: number | null;
  score: number;
  motivos: string[];
  distancia_km: number | null;
  fotos: string[];
  itens: Array<{
    id: string;
    descricao: string;
    quantidade: number;
    unidade_medida: string;
    recorrencia: Recorrencia;
    categoria: string;
    certificacoes: string[];
    atende: boolean;
  }>;
  minha_proposta: null | {
    id: string;
    status: StatusProposta;
    valor_total: number;
    prazo_execucao_dias: number;
    validade: string;
    condicoes: string | null;
    itens: ItemProposta[];
  };
}

export interface PropostaComparativo {
  id: string;
  status: StatusProposta;
  valor_total: number;
  prazo_execucao_dias: number;
  validade: string;
  condicoes: string | null;
  enviada_em: string;
  fornecedor: { id: string; nome: string; verificado: boolean; cidade: string; uf: string; nota: number | null; avaliacoes: number };
  score: number | null;
  motivos: string[] | null;
  itens: ItemProposta[];
}

export interface Comparativo {
  liberado: boolean;
  recebidas: number;
  minimo: number;
  prazo_propostas: string | null;
  limite_conselho: number;
  conselheiros: number;
  pode_escolher: boolean;
  itens: Array<{ id: string; descricao: string; quantidade: number; unidade_medida: string; categoria: string }>;
  propostas: PropostaComparativo[];
}

export interface MinhaProposta {
  id: string;
  lista_id: string;
  titulo: string;
  bairro: string | null;
  cidade: string;
  uf: string;
  status: StatusProposta;
  valor_total: number;
  prazo_execucao_dias: number;
  validade: string;
  status_lista: StatusLista;
  contratacao_id: string | null;
  status_contratacao: StatusContratacao | null;
  updated_at: string;
}

export interface MinhaContratacao {
  id: string;
  lista_id: string;
  titulo: string;
  condominio: string;
  fornecedor: string;
  valor_total: number;
  status: StatusContratacao;
  exige_conselho: boolean;
  votos_sim: number;
  votos_nao: number;
  conselheiros: number;
  meu_voto: boolean | null;
  lado: "contratante" | "fornecedor";
  pode_votar: boolean;
  pode_gerir: boolean;
  ja_avaliei: boolean;
  created_at: string;
}

export interface Contatos {
  condominio: { nome: string; cep: string; logradouro: string | null; numero: string | null; bairro: string | null; cidade: string; uf: string; unidade: string | null };
  responsaveis: Array<{ nome: string; telefone: string | null; papel: string }>;
  fornecedor: { nome: string; razao_social: string; documento: string; telefone: string | null; email: string | null; cidade: string; uf: string };
}

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export interface Painel {
  contratante: {
    condominios: number;
    listas_abertas: number;
    sugestoes: number;
    propostas_30d: number;
    aprovacoes_pendentes: number;
    em_andamento: number;
    membros_pendentes: number;
  };
  fornecedor: null | {
    verificado: boolean;
    ativo: boolean;
    oportunidades: number;
    propostas_30d: number;
    escolhidas: number;
    em_andamento: number;
    nota: number | null;
    avaliacoes: number;
    documentos_em_analise: number;
    categorias: number;
  };
  nao_lidas: number;
}

/* Fim de tipos.ts */
