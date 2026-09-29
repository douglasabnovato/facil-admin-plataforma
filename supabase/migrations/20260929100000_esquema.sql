-- 01 — Esquema da plataforma FacilAdmin
-- Organizações (administradoras e condomínios), membros, fornecedores, categorias, documentos,
-- listas de necessidades, matches, propostas, contratações, aprovações, avaliações e notificações.
-- Regras e permissões ficam nas migrações 02 (RLS) e 03 (funções).

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE TABLE public.perfis (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(160) NOT NULL,
  telefone VARCHAR(20),
  tipo VARCHAR(20) NOT NULL DEFAULT 'gestor' CHECK (tipo IN ('gestor', 'condomino', 'fornecedor')),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.administradoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(160) NOT NULL,
  cnpj VARCHAR(20) UNIQUE,
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.administradora_membros (
  administradora_id UUID NOT NULL REFERENCES public.administradoras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (administradora_id, user_id)
);

CREATE TABLE public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(160) NOT NULL,
  cnpj VARCHAR(20),
  cep VARCHAR(9) NOT NULL,
  logradouro VARCHAR(200),
  numero VARCHAR(20),
  bairro VARCHAR(120),
  cidade VARCHAR(120) NOT NULL,
  uf CHAR(2) NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  geo extensions.geography(Point, 4326),
  unidades INTEGER,
  administradora_id UUID REFERENCES public.administradoras(id) ON DELETE SET NULL,
  min_propostas SMALLINT NOT NULL DEFAULT 3 CHECK (min_propostas BETWEEN 1 AND 10),
  limite_conselho NUMERIC(12,2) NOT NULL DEFAULT 5000 CHECK (limite_conselho >= 0),
  codigo_convite VARCHAR(12) NOT NULL UNIQUE DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.membros (
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel VARCHAR(20) NOT NULL CHECK (papel IN ('sindico', 'conselheiro', 'condomino')),
  unidade VARCHAR(40),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'recusado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (condominio_id, user_id)
);

CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(60) NOT NULL UNIQUE,
  nome VARCHAR(120) NOT NULL,
  grupo VARCHAR(20) NOT NULL CHECK (grupo IN ('servico', 'produto')),
  certificacoes TEXT[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  razao_social VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(160),
  documento VARCHAR(20) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'servico' CHECK (tipo IN ('servico', 'produto', 'ambos')),
  descricao TEXT,
  telefone VARCHAR(20),
  email_contato VARCHAR(160),
  cep VARCHAR(9) NOT NULL,
  bairro VARCHAR(120),
  cidade VARCHAR(120) NOT NULL,
  uf CHAR(2) NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  geo extensions.geography(Point, 4326),
  raio_km NUMERIC(6,1) NOT NULL DEFAULT 30 CHECK (raio_km BETWEEN 1 AND 500),
  verificado BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fornecedor_categorias (
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (fornecedor_id, categoria_id)
);

CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL CHECK (tipo IN ('cnpj', 'nr10', 'nr35', 'credenciamento_bombeiros', 'seguro', 'outro')),
  arquivo_path TEXT NOT NULL,
  validade DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'em_analise' CHECK (status IN ('em_analise', 'aprovado', 'recusado')),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.listas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  escopo VARCHAR(20) NOT NULL CHECK (escopo IN ('condominio', 'unidade')),
  unidade VARCHAR(40),
  titulo VARCHAR(160) NOT NULL,
  descricao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('sugestao', 'rascunho', 'aberta', 'em_aprovacao', 'contratada', 'encerrada', 'cancelada')),
  prazo_propostas DATE,
  data_desejada DATE,
  fotos TEXT[] NOT NULL DEFAULT '{}',
  publicada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES public.listas(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.categorias(id),
  descricao VARCHAR(300) NOT NULL,
  quantidade NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  unidade_medida VARCHAR(20) NOT NULL DEFAULT 'un',
  recorrencia VARCHAR(20) NOT NULL DEFAULT 'unica' CHECK (recorrencia IN ('unica', 'mensal', 'trimestral', 'anual'))
);

CREATE TABLE public.matches (
  lista_id UUID NOT NULL REFERENCES public.listas(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL,
  motivos TEXT[] NOT NULL DEFAULT '{}',
  cobertura NUMERIC(5,2) NOT NULL,
  distancia_km NUMERIC(8,1),
  status VARCHAR(20) NOT NULL DEFAULT 'sugerido' CHECK (status IN ('sugerido', 'visto', 'proposta', 'ignorado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lista_id, fornecedor_id)
);

CREATE TABLE public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES public.listas(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'enviada' CHECK (status IN ('enviada', 'escolhida', 'recusada', 'retirada', 'expirada')),
  valor_total NUMERIC(12,2) NOT NULL CHECK (valor_total >= 0),
  prazo_execucao_dias INTEGER NOT NULL CHECK (prazo_execucao_dias > 0),
  validade DATE NOT NULL,
  condicoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lista_id, fornecedor_id)
);

CREATE TABLE public.proposta_itens (
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.itens(id) ON DELETE CASCADE,
  valor_unitario NUMERIC(12,2) NOT NULL CHECK (valor_unitario >= 0),
  observacao VARCHAR(300),
  PRIMARY KEY (proposta_id, item_id)
);

CREATE TABLE public.contratacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES public.listas(id) ON DELETE CASCADE,
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL
    CHECK (status IN ('aguardando_aprovacao', 'aprovada', 'recusada', 'em_execucao', 'concluida', 'cancelada')),
  exige_conselho BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluida_em TIMESTAMPTZ
);

CREATE TABLE public.aprovacoes (
  contratacao_id UUID NOT NULL REFERENCES public.contratacoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aprova BOOLEAN NOT NULL,
  comentario VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contratacao_id, user_id)
);

CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contratacao_id UUID NOT NULL REFERENCES public.contratacoes(id) ON DELETE CASCADE,
  avaliador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel VARCHAR(20) NOT NULL CHECK (papel IN ('contratante', 'fornecedor')),
  nota SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contratacao_id, papel)
);

CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  link VARCHAR(200),
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.config_match (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  peso_cobertura NUMERIC NOT NULL DEFAULT 25,
  peso_reputacao NUMERIC NOT NULL DEFAULT 25,
  peso_distancia NUMERIC NOT NULL DEFAULT 15,
  peso_resposta NUMERIC NOT NULL DEFAULT 15,
  peso_aceite NUMERIC NOT NULL DEFAULT 10,
  peso_historico NUMERIC NOT NULL DEFAULT 5,
  peso_atividade NUMERIC NOT NULL DEFAULT 5,
  top_notificar SMALLINT NOT NULL DEFAULT 10
);

CREATE INDEX idx_condominios_geo ON public.condominios USING GIST (geo);
CREATE INDEX idx_fornecedores_geo ON public.fornecedores USING GIST (geo);
CREATE INDEX idx_membros_user ON public.membros (user_id);
CREATE INDEX idx_listas_condominio_status ON public.listas (condominio_id, status);
CREATE INDEX idx_listas_status ON public.listas (status);
CREATE INDEX idx_itens_lista ON public.itens (lista_id);
CREATE INDEX idx_itens_categoria ON public.itens (categoria_id);
CREATE INDEX idx_propostas_lista ON public.propostas (lista_id);
CREATE INDEX idx_propostas_fornecedor ON public.propostas (fornecedor_id);
CREATE INDEX idx_documentos_fornecedor ON public.documentos (fornecedor_id, tipo, status);
CREATE UNIQUE INDEX uq_contratacao_lista_ativa ON public.contratacoes (lista_id) WHERE status NOT IN ('recusada', 'cancelada');
CREATE INDEX idx_contratacoes_proposta ON public.contratacoes (proposta_id);
CREATE INDEX idx_matches_fornecedor ON public.matches (fornecedor_id, status);
CREATE INDEX idx_notificacoes_user ON public.notificacoes (user_id, lida, created_at DESC);

CREATE OR REPLACE FUNCTION public.definir_geo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geo := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_condominios_geo BEFORE INSERT OR UPDATE OF latitude, longitude ON public.condominios
  FOR EACH ROW EXECUTE FUNCTION public.definir_geo();
CREATE TRIGGER trg_fornecedores_geo BEFORE INSERT OR UPDATE OF latitude, longitude ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.definir_geo();

CREATE OR REPLACE FUNCTION public.tocar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listas_updated BEFORE UPDATE ON public.listas FOR EACH ROW EXECUTE FUNCTION public.tocar_updated_at();
CREATE TRIGGER trg_propostas_updated BEFORE UPDATE ON public.propostas FOR EACH ROW EXECUTE FUNCTION public.tocar_updated_at();

CREATE OR REPLACE FUNCTION public.criar_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (user_id, nome, telefone, tipo)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), 'Usuário'),
    NULLIF(NEW.raw_user_meta_data->>'telefone', ''),
    CASE WHEN NEW.raw_user_meta_data->>'tipo' IN ('gestor', 'condomino', 'fornecedor')
      THEN NEW.raw_user_meta_data->>'tipo' ELSE 'gestor' END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_perfil
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.criar_perfil();

-- Fim da migração 01
