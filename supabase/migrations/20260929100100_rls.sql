-- 02 — Segurança (RLS)
-- Funções auxiliares de papel e as políticas de cada tabela, conforme a matriz de docs/ARQUITETURA.md (seção 6).
-- Regra geral: leitura pelas políticas; escrita de regra de negócio só pelas funções da migração 03.

/* Usuário logado é administrador da plataforma. */
CREATE OR REPLACE FUNCTION public.eh_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM perfis WHERE user_id = auth.uid()), false);
$$;

/* Papel do usuário logado no condomínio: sindico, administradora, conselheiro, condomino ou NULL. */
CREATE OR REPLACE FUNCTION public.papel_no_condominio(p_condominio UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM membros m WHERE m.condominio_id = p_condominio AND m.user_id = auth.uid()
                 AND m.status = 'ativo' AND m.papel = 'sindico') THEN 'sindico'
    WHEN EXISTS (SELECT 1 FROM condominios c JOIN administradora_membros am ON am.administradora_id = c.administradora_id
                 WHERE c.id = p_condominio AND am.user_id = auth.uid()) THEN 'administradora'
    ELSE (SELECT m.papel FROM membros m WHERE m.condominio_id = p_condominio AND m.user_id = auth.uid() AND m.status = 'ativo')
  END;
$$;

/* Síndico ou administradora do condomínio (ou admin da plataforma). */
CREATE OR REPLACE FUNCTION public.eh_gestor(p_condominio UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.papel_no_condominio(p_condominio) IN ('sindico', 'administradora') OR public.eh_admin();
$$;

/* Qualquer papel ativo no condomínio. */
CREATE OR REPLACE FUNCTION public.eh_membro(p_condominio UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.papel_no_condominio(p_condominio) IS NOT NULL OR public.eh_admin();
$$;

/* Id do fornecedor do usuário logado. */
CREATE OR REPLACE FUNCTION public.meu_fornecedor_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM fornecedores WHERE user_id = auth.uid();
$$;

/* Quem pode ver a lista: membros (lista do condomínio publicada), gestores (rascunhos e sugestões) e o autor. */
CREATE OR REPLACE FUNCTION public.pode_ver_lista(p_lista UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM listas l
    WHERE l.id = p_lista AND (
      l.criado_por = auth.uid()
      OR public.eh_admin()
      OR (l.escopo = 'condominio' AND public.eh_gestor(l.condominio_id))
      OR (l.escopo = 'condominio' AND l.status NOT IN ('sugestao', 'rascunho') AND public.eh_membro(l.condominio_id))
    )
  );
$$;

/* Quem decide sobre a lista: gestores e conselheiros (lista do condomínio) ou o autor (lista da unidade). */
CREATE OR REPLACE FUNCTION public.pode_decidir_lista(p_lista UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM listas l
    WHERE l.id = p_lista AND (
      (l.escopo = 'unidade' AND l.criado_por = auth.uid())
      OR (l.escopo = 'condominio' AND public.papel_no_condominio(l.condominio_id) IN ('sindico', 'administradora', 'conselheiro'))
      OR public.eh_admin()
    )
  );
$$;

/* Comparativo liberado: mínimo de propostas atingido, prazo encerrado ou lista já fora da fase aberta (RN05). */
CREATE OR REPLACE FUNCTION public.comparativo_liberado(p_lista UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.status NOT IN ('sugestao', 'rascunho', 'aberta')
      OR (l.prazo_propostas IS NOT NULL AND l.prazo_propostas < current_date)
      OR (SELECT count(*) FROM propostas p WHERE p.lista_id = l.id AND p.status IN ('enviada', 'escolhida')) >= c.min_propostas
  FROM listas l JOIN condominios c ON c.id = l.condominio_id
  WHERE l.id = p_lista;
$$;

/* Quem vê as propostas de uma lista: quem decide, depois de liberado o comparativo. */
CREATE OR REPLACE FUNCTION public.pode_ver_propostas(p_lista UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.pode_decidir_lista(p_lista) AND COALESCE(public.comparativo_liberado(p_lista), false);
$$;

/* Impede que usuário comum altere campos de controle (is_admin, verificado). */
CREATE OR REPLACE FUNCTION public.proteger_campos_admin()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.eh_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'perfis' AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Somente o administrador altera este campo';
  END IF;
  IF TG_TABLE_NAME = 'fornecedores' AND NEW.verificado IS DISTINCT FROM OLD.verificado THEN
    RAISE EXCEPTION 'Somente o administrador altera este campo';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_perfis_protege BEFORE UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_admin();
CREATE TRIGGER trg_fornecedores_protege BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_admin();

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administradoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administradora_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedor_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprovacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_match ENABLE ROW LEVEL SECURITY;

-- Perfis: cada um vê e edita o próprio (nome e telefone); admin vê todos.
CREATE POLICY perfis_select ON public.perfis FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.eh_admin());
CREATE POLICY perfis_update ON public.perfis FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Administradoras: membros veem e editam.
CREATE POLICY administradoras_select ON public.administradoras FOR SELECT TO authenticated
  USING (public.eh_admin() OR EXISTS (SELECT 1 FROM public.administradora_membros am WHERE am.administradora_id = id AND am.user_id = auth.uid()));
CREATE POLICY administradoras_update ON public.administradoras FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.administradora_membros am WHERE am.administradora_id = id AND am.user_id = auth.uid()));
CREATE POLICY administradora_membros_select ON public.administradora_membros FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.eh_admin());

-- Condomínios: membros veem; gestores editam dados e regras (colunas liberadas abaixo).
CREATE POLICY condominios_select ON public.condominios FOR SELECT TO authenticated
  USING (public.eh_membro(id));
CREATE POLICY condominios_update ON public.condominios FOR UPDATE TO authenticated
  USING (public.eh_gestor(id)) WITH CHECK (public.eh_gestor(id));

-- Membros: a própria linha ou gestores do condomínio (a lista para os demais vem de membros_condominio()).
CREATE POLICY membros_select ON public.membros FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.eh_gestor(condominio_id));

-- Categorias: leitura pública; escrita do admin.
CREATE POLICY categorias_select ON public.categorias FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY categorias_insert ON public.categorias FOR INSERT TO authenticated WITH CHECK (public.eh_admin());
CREATE POLICY categorias_update ON public.categorias FOR UPDATE TO authenticated USING (public.eh_admin());

-- Fornecedores: o dono e o admin (contratantes veem o fornecedor pelas funções de comparativo e contato).
CREATE POLICY fornecedores_select ON public.fornecedores FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.eh_admin());
CREATE POLICY fornecedor_categorias_select ON public.fornecedor_categorias FOR SELECT TO authenticated
  USING (fornecedor_id = public.meu_fornecedor_id() OR public.eh_admin());

-- Documentos: o fornecedor e o admin; o fornecedor pode apagar o que ainda está em análise.
CREATE POLICY documentos_select ON public.documentos FOR SELECT TO authenticated
  USING (fornecedor_id = public.meu_fornecedor_id() OR public.eh_admin());
CREATE POLICY documentos_delete ON public.documentos FOR DELETE TO authenticated
  USING (fornecedor_id = public.meu_fornecedor_id() AND status = 'em_analise');

-- Listas e itens.
CREATE POLICY listas_select ON public.listas FOR SELECT TO authenticated USING (public.pode_ver_lista(id));
CREATE POLICY itens_select ON public.itens FOR SELECT TO authenticated USING (public.pode_ver_lista(lista_id));

-- Matches: quem vê a lista (sugestões de fornecedores) e o próprio fornecedor.
CREATE POLICY matches_select ON public.matches FOR SELECT TO authenticated
  USING (fornecedor_id = public.meu_fornecedor_id() OR public.pode_decidir_lista(lista_id));

-- Propostas: o autor sempre; o contratante depois de liberado o comparativo.
CREATE POLICY propostas_select ON public.propostas FOR SELECT TO authenticated
  USING (fornecedor_id = public.meu_fornecedor_id() OR public.pode_ver_propostas(lista_id));
CREATE POLICY proposta_itens_select ON public.proposta_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = proposta_id
    AND (p.fornecedor_id = public.meu_fornecedor_id() OR public.pode_ver_propostas(p.lista_id))));

-- Contratações e aprovações: quem vê a lista e o fornecedor contratado.
CREATE POLICY contratacoes_select ON public.contratacoes FOR SELECT TO authenticated
  USING (public.pode_ver_lista(lista_id)
    OR EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = proposta_id AND p.fornecedor_id = public.meu_fornecedor_id()));
CREATE POLICY aprovacoes_select ON public.aprovacoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contratacoes ct WHERE ct.id = contratacao_id AND public.pode_decidir_lista(ct.lista_id)));

-- Avaliações: as partes (a média pública vem de reputacao_fornecedor()).
CREATE POLICY avaliacoes_select ON public.avaliacoes FOR SELECT TO authenticated
  USING (avaliador_id = auth.uid() OR public.eh_admin() OR EXISTS (
    SELECT 1 FROM public.contratacoes ct JOIN public.propostas p ON p.id = ct.proposta_id
    WHERE ct.id = contratacao_id AND (p.fornecedor_id = public.meu_fornecedor_id() OR public.pode_decidir_lista(ct.lista_id))));

-- Notificações: só as próprias; pode marcar como lida e apagar.
CREATE POLICY notificacoes_select ON public.notificacoes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notificacoes_update ON public.notificacoes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notificacoes_delete ON public.notificacoes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Configuração do match: leitura para logados, escrita do admin.
CREATE POLICY config_match_select ON public.config_match FOR SELECT TO authenticated USING (true);
CREATE POLICY config_match_update ON public.config_match FOR UPDATE TO authenticated USING (public.eh_admin());

-- Colunas que o usuário pode alterar diretamente (o resto só pelas funções).
REVOKE UPDATE ON public.perfis, public.administradoras, public.condominios, public.notificacoes FROM anon, authenticated;
GRANT UPDATE (nome, telefone) ON public.perfis TO authenticated;
GRANT UPDATE (nome, cnpj) ON public.administradoras TO authenticated;
GRANT UPDATE (nome, cnpj, cep, logradouro, numero, bairro, cidade, uf, latitude, longitude, unidades, min_propostas, limite_conselho)
  ON public.condominios TO authenticated;
GRANT UPDATE (lida) ON public.notificacoes TO authenticated;

-- Fim da migração 02
