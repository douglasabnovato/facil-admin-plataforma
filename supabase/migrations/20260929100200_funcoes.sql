-- 03 — Funções de negócio
-- Organizações e membros, fornecedores e documentos, listas, match (score e motivos), oportunidades,
-- propostas, comparativo, escolha com aprovação do conselho, contratação, contatos, avaliações, painel e expiração.
-- Todas exigem login; as internas (notificar, calcular_matches, gravar_matches, atende_item) não ficam expostas na API.

/* Texto normalizado para comparar cidades (minúsculas, sem acento e sem espaços nas pontas). */
CREATE OR REPLACE FUNCTION public.norm_texto(p TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SET search_path = public, extensions
AS $$
  SELECT lower(extensions.unaccent(btrim(COALESCE(p, ''))));
$$;

/* Exige usuário logado e devolve o id. */
CREATE OR REPLACE FUNCTION public.exigir_login()
RETURNS UUID
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para continuar' USING ERRCODE = '42501';
  END IF;
  RETURN auth.uid();
END;
$$;

/* Grava uma notificação in-app (interna). */
CREATE OR REPLACE FUNCTION public.notificar(p_user UUID, p_tipo TEXT, p_titulo TEXT, p_link TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO notificacoes (user_id, tipo, titulo, link)
  SELECT p_user, p_tipo, left(p_titulo, 200), p_link WHERE p_user IS NOT NULL;
$$;

/* Usuários que decidem pelo condomínio (síndicos ativos e membros da administradora). */
CREATE OR REPLACE FUNCTION public.gestores_do_condominio(p_condominio UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.user_id FROM membros m WHERE m.condominio_id = p_condominio AND m.status = 'ativo' AND m.papel = 'sindico'
  UNION
  SELECT am.user_id FROM condominios c JOIN administradora_membros am ON am.administradora_id = c.administradora_id
  WHERE c.id = p_condominio;
$$;

/* Quem responde pela lista: gestores (lista do condomínio) ou o autor (lista da unidade). */
CREATE OR REPLACE FUNCTION public.responsaveis_lista(p_lista UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN l.escopo = 'unidade' THEN l.criado_por END FROM listas l WHERE l.id = p_lista AND l.escopo = 'unidade'
  UNION
  SELECT g FROM listas l, public.gestores_do_condominio(l.condominio_id) g WHERE l.id = p_lista AND l.escopo = 'condominio';
$$;

-- ============================================================ Organizações

/* Cria uma administradora e torna o usuário membro dela. */
CREATE OR REPLACE FUNCTION public.criar_administradora(p JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := public.exigir_login();
  v_id UUID;
BEGIN
  IF length(btrim(COALESCE(p->>'nome', ''))) < 3 THEN
    RAISE EXCEPTION 'Informe o nome da administradora';
  END IF;
  INSERT INTO administradoras (nome, cnpj, criado_por)
  VALUES (btrim(p->>'nome'), NULLIF(regexp_replace(COALESCE(p->>'cnpj', ''), '\D', '', 'g'), ''), v_uid)
  RETURNING id INTO v_id;
  INSERT INTO administradora_membros (administradora_id, user_id) VALUES (v_id, v_uid);
  RETURN v_id;
END;
$$;

/* Cria um condomínio; quem cria vira síndico ativo, ou a administradora informada passa a geri-lo. */
CREATE OR REPLACE FUNCTION public.criar_condominio(p JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := public.exigir_login();
  v_adm UUID := NULLIF(p->>'administradora_id', '')::UUID;
  v_id UUID;
BEGIN
  IF (SELECT tipo FROM perfis WHERE user_id = v_uid) = 'fornecedor' THEN
    RAISE EXCEPTION 'Contas de fornecedor não cadastram condomínios';
  END IF;
  IF length(btrim(COALESCE(p->>'nome', ''))) < 3 OR COALESCE(p->>'cep', '') = '' OR COALESCE(p->>'cidade', '') = ''
     OR length(COALESCE(p->>'uf', '')) <> 2 THEN
    RAISE EXCEPTION 'Informe nome, CEP, cidade e UF do condomínio';
  END IF;
  IF v_adm IS NOT NULL AND NOT EXISTS (SELECT 1 FROM administradora_membros WHERE administradora_id = v_adm AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Você não faz parte desta administradora';
  END IF;

  INSERT INTO condominios (nome, cnpj, cep, logradouro, numero, bairro, cidade, uf, latitude, longitude, unidades,
                           administradora_id, min_propostas, limite_conselho, criado_por)
  VALUES (btrim(p->>'nome'), NULLIF(regexp_replace(COALESCE(p->>'cnpj', ''), '\D', '', 'g'), ''),
          p->>'cep', p->>'logradouro', p->>'numero', p->>'bairro', btrim(p->>'cidade'), upper(p->>'uf'),
          NULLIF(p->>'latitude', '')::NUMERIC, NULLIF(p->>'longitude', '')::NUMERIC, NULLIF(p->>'unidades', '')::INTEGER,
          v_adm, COALESCE(NULLIF(p->>'min_propostas', '')::SMALLINT, 3), COALESCE(NULLIF(p->>'limite_conselho', '')::NUMERIC, 5000), v_uid)
  RETURNING id INTO v_id;

  IF v_adm IS NULL THEN
    INSERT INTO membros (condominio_id, user_id, papel, unidade, status)
    VALUES (v_id, v_uid, 'sindico', NULLIF(p->>'unidade', ''), 'ativo');
  END IF;
  RETURN v_id;
END;
$$;

/* Condomínios do usuário, com papel e pendências de aprovação de membros. */
CREATE OR REPLACE FUNCTION public.meus_condominios()
RETURNS TABLE (id UUID, nome TEXT, cidade TEXT, uf TEXT, papel TEXT, status TEXT, unidade TEXT,
               codigo_convite TEXT, min_propostas SMALLINT, limite_conselho NUMERIC, membros_pendentes INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH meus AS (
    SELECT c.id, COALESCE(public.papel_no_condominio(c.id), m.papel) AS papel, COALESCE(m.status, 'ativo') AS status, m.unidade
    FROM condominios c
    LEFT JOIN membros m ON m.condominio_id = c.id AND m.user_id = auth.uid()
    WHERE m.user_id IS NOT NULL
       OR EXISTS (SELECT 1 FROM administradora_membros am WHERE am.administradora_id = c.administradora_id AND am.user_id = auth.uid())
  )
  SELECT c.id, c.nome::TEXT, c.cidade::TEXT, c.uf::TEXT, meus.papel, meus.status::TEXT, meus.unidade::TEXT,
         CASE WHEN meus.papel IN ('sindico', 'administradora') AND meus.status = 'ativo' THEN c.codigo_convite::TEXT END,
         c.min_propostas, c.limite_conselho,
         CASE WHEN meus.papel IN ('sindico', 'administradora') AND meus.status = 'ativo'
           THEN (SELECT count(*)::INTEGER FROM membros x WHERE x.condominio_id = c.id AND x.status = 'pendente') ELSE 0 END
  FROM meus JOIN condominios c ON c.id = meus.id
  ORDER BY c.nome;
$$;

/* Pede entrada no condomínio pelo código de convite; fica pendente até o gestor aprovar. */
CREATE OR REPLACE FUNCTION public.entrar_condominio(p_codigo TEXT, p_unidade TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := public.exigir_login();
  v_cond condominios%ROWTYPE;
  v_g UUID;
BEGIN
  SELECT * INTO v_cond FROM condominios WHERE codigo_convite = upper(btrim(p_codigo));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de convite não encontrado';
  END IF;
  IF length(btrim(COALESCE(p_unidade, ''))) = 0 THEN
    RAISE EXCEPTION 'Informe a sua unidade (ex.: Bloco A, apto 101)';
  END IF;
  IF EXISTS (SELECT 1 FROM membros WHERE condominio_id = v_cond.id AND user_id = v_uid AND status <> 'recusado') THEN
    RAISE EXCEPTION 'Você já participa ou já pediu para participar deste condomínio';
  END IF;
  INSERT INTO membros (condominio_id, user_id, papel, unidade, status)
  VALUES (v_cond.id, v_uid, 'condomino', btrim(p_unidade), 'pendente')
  ON CONFLICT (condominio_id, user_id) DO UPDATE SET status = 'pendente', unidade = EXCLUDED.unidade, papel = 'condomino';
  FOR v_g IN SELECT public.gestores_do_condominio(v_cond.id) LOOP
    PERFORM public.notificar(v_g, 'membro_pendente', 'Novo pedido de entrada em ' || v_cond.nome, '/condominios/' || v_cond.id);
  END LOOP;
  RETURN v_cond.id;
END;
$$;

/* Gestor aprova, recusa, muda o papel ou remove um membro. */
CREATE OR REPLACE FUNCTION public.gerenciar_membro(p_condominio UUID, p_user UUID, p_acao TEXT, p_papel TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
BEGIN
  PERFORM public.exigir_login();
  IF NOT public.eh_gestor(p_condominio) THEN
    RAISE EXCEPTION 'Somente o síndico ou a administradora gerencia membros';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM membros WHERE condominio_id = p_condominio AND user_id = p_user) THEN
    RAISE EXCEPTION 'Membro não encontrado';
  END IF;
  IF p_papel IS NOT NULL AND p_papel NOT IN ('sindico', 'conselheiro', 'condomino') THEN
    RAISE EXCEPTION 'Papel inválido';
  END IF;
  -- O condomínio sem administradora precisa manter ao menos um síndico ativo.
  IF (p_acao IN ('recusar', 'remover') OR (p_acao = 'papel' AND p_papel <> 'sindico'))
     AND EXISTS (SELECT 1 FROM membros WHERE condominio_id = p_condominio AND user_id = p_user AND papel = 'sindico' AND status = 'ativo')
     AND (SELECT count(*) FROM membros WHERE condominio_id = p_condominio AND papel = 'sindico' AND status = 'ativo') = 1
     AND (SELECT administradora_id FROM condominios WHERE id = p_condominio) IS NULL THEN
    RAISE EXCEPTION 'O condomínio precisa de ao menos um síndico. Promova outra pessoa antes.';
  END IF;

  SELECT nome INTO v_nome FROM condominios WHERE id = p_condominio;
  IF p_acao = 'aprovar' THEN
    UPDATE membros SET status = 'ativo', papel = COALESCE(p_papel, papel) WHERE condominio_id = p_condominio AND user_id = p_user;
    PERFORM public.notificar(p_user, 'membro_aprovado', 'Sua entrada em ' || v_nome || ' foi aprovada', '/condominios/' || p_condominio);
  ELSIF p_acao = 'recusar' THEN
    UPDATE membros SET status = 'recusado' WHERE condominio_id = p_condominio AND user_id = p_user;
  ELSIF p_acao = 'papel' THEN
    UPDATE membros SET papel = p_papel WHERE condominio_id = p_condominio AND user_id = p_user AND status = 'ativo';
  ELSIF p_acao = 'remover' THEN
    DELETE FROM membros WHERE condominio_id = p_condominio AND user_id = p_user;
  ELSE
    RAISE EXCEPTION 'Ação inválida';
  END IF;
END;
$$;

/* Gera um novo código de convite (invalida o anterior). */
CREATE OR REPLACE FUNCTION public.novo_codigo_convite(p_condominio UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_codigo TEXT;
BEGIN
  PERFORM public.exigir_login();
  IF NOT public.eh_gestor(p_condominio) THEN
    RAISE EXCEPTION 'Somente o síndico ou a administradora gera convites';
  END IF;
  v_codigo := upper(substr(md5(gen_random_uuid()::TEXT), 1, 8));
  UPDATE condominios SET codigo_convite = v_codigo WHERE id = p_condominio;
  RETURN v_codigo;
END;
$$;

/* Membros do condomínio: gestores veem todos (com unidade e pendentes); os demais veem nome e papel dos ativos. */
CREATE OR REPLACE FUNCTION public.membros_condominio(p_condominio UUID)
RETURNS TABLE (user_id UUID, nome TEXT, papel TEXT, unidade TEXT, status TEXT, eu BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.user_id, pf.nome::TEXT, m.papel::TEXT,
         CASE WHEN public.eh_gestor(p_condominio) OR m.user_id = auth.uid() THEN m.unidade::TEXT END,
         m.status::TEXT, m.user_id = auth.uid()
  FROM membros m JOIN perfis pf ON pf.user_id = m.user_id
  WHERE m.condominio_id = p_condominio
    AND public.eh_membro(p_condominio)
    AND (m.status = 'ativo' OR public.eh_gestor(p_condominio))
  ORDER BY (m.status = 'pendente') DESC, CASE m.papel WHEN 'sindico' THEN 1 WHEN 'conselheiro' THEN 2 ELSE 3 END, pf.nome;
$$;

-- ============================================================ Fornecedores

/* O fornecedor atende o item: tem a categoria e todas as certificações exigidas aprovadas e válidas (RN03). */
CREATE OR REPLACE FUNCTION public.atende_item(p_fornecedor UUID, p_categoria UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM fornecedor_categorias fc WHERE fc.fornecedor_id = p_fornecedor AND fc.categoria_id = p_categoria)
     AND NOT EXISTS (
       SELECT 1 FROM categorias c, unnest(c.certificacoes) AS cert
       WHERE c.id = p_categoria
         AND NOT EXISTS (SELECT 1 FROM documentos d WHERE d.fornecedor_id = p_fornecedor AND d.tipo = cert
                         AND d.status = 'aprovado' AND (d.validade IS NULL OR d.validade >= current_date)));
$$;

/* Cria ou atualiza o perfil do fornecedor do usuário e as categorias atendidas (ids). */
CREATE OR REPLACE FUNCTION public.salvar_fornecedor(p JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := public.exigir_login();
  v_id UUID;
  v_doc TEXT := regexp_replace(COALESCE(p->>'documento', ''), '\D', '', 'g');
BEGIN
  IF length(btrim(COALESCE(p->>'razao_social', ''))) < 3 THEN
    RAISE EXCEPTION 'Informe a razão social ou o nome';
  END IF;
  IF length(v_doc) NOT IN (11, 14) THEN
    RAISE EXCEPTION 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)';
  END IF;
  IF COALESCE(p->>'cep', '') = '' OR COALESCE(p->>'cidade', '') = '' OR length(COALESCE(p->>'uf', '')) <> 2 THEN
    RAISE EXCEPTION 'Informe CEP, cidade e UF da base de atendimento';
  END IF;

  INSERT INTO fornecedores (user_id, razao_social, nome_fantasia, documento, tipo, descricao, telefone, email_contato,
                            cep, bairro, cidade, uf, latitude, longitude, raio_km, ativo)
  VALUES (v_uid, btrim(p->>'razao_social'), NULLIF(btrim(COALESCE(p->>'nome_fantasia', '')), ''), v_doc,
          COALESCE(NULLIF(p->>'tipo', ''), 'servico'), p->>'descricao', p->>'telefone', p->>'email_contato',
          p->>'cep', p->>'bairro', btrim(p->>'cidade'), upper(p->>'uf'),
          NULLIF(p->>'latitude', '')::NUMERIC, NULLIF(p->>'longitude', '')::NUMERIC,
          COALESCE(NULLIF(p->>'raio_km', '')::NUMERIC, 30), COALESCE((p->>'ativo')::BOOLEAN, true))
  ON CONFLICT (user_id) DO UPDATE SET
    razao_social = EXCLUDED.razao_social, nome_fantasia = EXCLUDED.nome_fantasia, documento = EXCLUDED.documento,
    tipo = EXCLUDED.tipo, descricao = EXCLUDED.descricao, telefone = EXCLUDED.telefone, email_contato = EXCLUDED.email_contato,
    cep = EXCLUDED.cep, bairro = EXCLUDED.bairro, cidade = EXCLUDED.cidade, uf = EXCLUDED.uf,
    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, raio_km = EXCLUDED.raio_km, ativo = EXCLUDED.ativo
  RETURNING id INTO v_id;

  IF p ? 'categorias' THEN
    DELETE FROM fornecedor_categorias WHERE fornecedor_id = v_id;
    INSERT INTO fornecedor_categorias (fornecedor_id, categoria_id)
    SELECT v_id, c.id FROM categorias c
    WHERE c.ativo AND c.id::TEXT IN (SELECT jsonb_array_elements_text(p->'categorias'));
  END IF;

  PERFORM public.gravar_matches(NULL, v_id);
  RETURN v_id;
END;
$$;

/* Registra um documento já enviado ao Storage (bucket documentos, pasta do fornecedor). */
CREATE OR REPLACE FUNCTION public.registrar_documento(p JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_forn UUID := public.meu_fornecedor_id();
  v_id UUID;
  v_admin UUID;
BEGIN
  PERFORM public.exigir_login();
  IF v_forn IS NULL THEN
    RAISE EXCEPTION 'Cadastre o perfil de fornecedor antes de enviar documentos';
  END IF;
  IF split_part(COALESCE(p->>'arquivo_path', ''), '/', 1) <> v_forn::TEXT THEN
    RAISE EXCEPTION 'Arquivo fora da pasta do fornecedor';
  END IF;
  INSERT INTO documentos (fornecedor_id, tipo, arquivo_path, validade)
  VALUES (v_forn, p->>'tipo', p->>'arquivo_path', NULLIF(p->>'validade', '')::DATE)
  RETURNING id INTO v_id;
  FOR v_admin IN SELECT user_id FROM perfis WHERE is_admin LOOP
    PERFORM public.notificar(v_admin, 'documento_em_analise', 'Documento aguardando análise', '/admin');
  END LOOP;
  RETURN v_id;
END;
$$;

/* Admin aprova ou recusa um documento; o match do fornecedor é recalculado. */
CREATE OR REPLACE FUNCTION public.revisar_documento(p_documento UUID, p_status TEXT, p_observacao TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_doc documentos%ROWTYPE;
BEGIN
  PERFORM public.exigir_login();
  IF NOT public.eh_admin() THEN
    RAISE EXCEPTION 'Somente o administrador revisa documentos';
  END IF;
  IF p_status NOT IN ('aprovado', 'recusado') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;
  UPDATE documentos SET status = p_status, observacao = p_observacao WHERE id = p_documento RETURNING * INTO v_doc;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento não encontrado';
  END IF;
  PERFORM public.notificar((SELECT user_id FROM fornecedores WHERE id = v_doc.fornecedor_id), 'documento_' || p_status,
    'Documento ' || v_doc.tipo || CASE WHEN p_status = 'aprovado' THEN ' aprovado' ELSE ' recusado' END, '/fornecedor');
  PERFORM public.gravar_matches(NULL, v_doc.fornecedor_id);
END;
$$;

/* Admin marca o fornecedor como verificado (ou suspende). */
CREATE OR REPLACE FUNCTION public.verificar_fornecedor(p_fornecedor UUID, p_verificado BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.exigir_login();
  IF NOT public.eh_admin() THEN
    RAISE EXCEPTION 'Somente o administrador verifica fornecedores';
  END IF;
  UPDATE fornecedores SET verificado = p_verificado WHERE id = p_fornecedor;
  IF p_verificado THEN
    PERFORM public.notificar((SELECT user_id FROM fornecedores WHERE id = p_fornecedor), 'fornecedor_verificado',
      'Seu cadastro foi verificado: você já recebe oportunidades', '/oportunidades');
  END IF;
  PERFORM public.gravar_matches(NULL, p_fornecedor);
END;
$$;

/* Nota média (1 a 5) e quantidade de avaliações recebidas pelo fornecedor. */
CREATE OR REPLACE FUNCTION public.reputacao_fornecedor(p_fornecedor UUID)
RETURNS TABLE (media NUMERIC, total INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT round(avg(a.nota), 1), count(*)::INTEGER
  FROM avaliacoes a JOIN contratacoes ct ON ct.id = a.contratacao_id JOIN propostas p ON p.id = ct.proposta_id
  WHERE p.fornecedor_id = p_fornecedor AND a.papel = 'contratante';
$$;

-- ============================================================ Match

/*
 * Calcula os pares lista × fornecedor compatíveis e o score (0–100) com motivos.
 * Filtros: fornecedor ativo e verificado, condomínio dentro do raio (ou mesma cidade sem coordenadas)
 * e ao menos um item atendido (categoria + certificações). Informe a lista, o fornecedor ou ambos.
 */
CREATE OR REPLACE FUNCTION public.calcular_matches(p_lista UUID DEFAULT NULL, p_fornecedor UUID DEFAULT NULL)
RETURNS TABLE (lista_id UUID, fornecedor_id UUID, score SMALLINT, motivos TEXT[], cobertura NUMERIC, distancia_km NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  WITH cfg AS (SELECT * FROM config_match WHERE id = 1),
  ls AS (
    SELECT l.id, l.condominio_id, c.geo, c.cidade, c.uf
    FROM listas l JOIN condominios c ON c.id = l.condominio_id
    WHERE (p_lista IS NOT NULL OR p_fornecedor IS NOT NULL)
      AND (l.id = p_lista OR (p_lista IS NULL AND l.status = 'aberta'))
  ),
  fs AS (
    SELECT f.* FROM fornecedores f
    WHERE f.ativo AND f.verificado AND (p_fornecedor IS NULL OR f.id = p_fornecedor)
  ),
  par AS (
    SELECT ls.id AS lista_id, ls.condominio_id, fs.id AS fornecedor_id, fs.raio_km, fs.created_at AS f_criado,
           CASE WHEN ls.geo IS NOT NULL AND fs.geo IS NOT NULL THEN round((ST_Distance(ls.geo, fs.geo) / 1000.0)::NUMERIC, 1) END AS dist
    FROM ls JOIN fs ON (
      (ls.geo IS NOT NULL AND fs.geo IS NOT NULL AND ST_DWithin(ls.geo, fs.geo, fs.raio_km * 1000))
      OR ((ls.geo IS NULL OR fs.geo IS NULL) AND public.norm_texto(ls.cidade) = public.norm_texto(fs.cidade) AND ls.uf = fs.uf)
    )
  ),
  itc AS (
    SELECT par.lista_id, par.fornecedor_id, i.categoria_id, cat.certificacoes,
           public.atende_item(par.fornecedor_id, i.categoria_id) AS atende
    FROM par JOIN itens i ON i.lista_id = par.lista_id JOIN categorias cat ON cat.id = i.categoria_id
  ),
  cob AS (
    SELECT itc.lista_id, itc.fornecedor_id, count(*) AS total, count(*) FILTER (WHERE itc.atende) AS cobertos
    FROM itc GROUP BY 1, 2
  ),
  certs AS (
    SELECT itc.lista_id, itc.fornecedor_id, array_agg(DISTINCT upper(replace(cert, 'nr', 'NR-')) ORDER BY upper(replace(cert, 'nr', 'NR-'))) AS lista
    FROM itc, unnest(itc.certificacoes) AS cert WHERE itc.atende GROUP BY 1, 2
  ),
  base AS (
    SELECT par.*, cob.total, cob.cobertos, certs.lista AS certs,
      (SELECT count(*) FROM avaliacoes a JOIN contratacoes ct ON ct.id = a.contratacao_id JOIN propostas p ON p.id = ct.proposta_id
        WHERE p.fornecedor_id = par.fornecedor_id AND a.papel = 'contratante') AS n_aval,
      (SELECT COALESCE(sum(a.nota), 0) FROM avaliacoes a JOIN contratacoes ct ON ct.id = a.contratacao_id JOIN propostas p ON p.id = ct.proposta_id
        WHERE p.fornecedor_id = par.fornecedor_id AND a.papel = 'contratante') AS soma_aval,
      (SELECT count(*) FROM matches m WHERE m.fornecedor_id = par.fornecedor_id AND m.lista_id <> par.lista_id
        AND m.created_at > now() - interval '90 days') AS n_match,
      (SELECT count(*) FROM propostas p WHERE p.fornecedor_id = par.fornecedor_id AND p.lista_id <> par.lista_id
        AND p.created_at > now() - interval '90 days') AS n_resp,
      (SELECT count(*) FROM propostas p WHERE p.fornecedor_id = par.fornecedor_id AND p.created_at > now() - interval '180 days'
        AND p.status IN ('escolhida', 'recusada')) AS n_decididas,
      (SELECT count(*) FROM propostas p WHERE p.fornecedor_id = par.fornecedor_id AND p.created_at > now() - interval '180 days'
        AND p.status = 'escolhida') AS n_escolhidas,
      EXISTS (SELECT 1 FROM contratacoes ct JOIN propostas p ON p.id = ct.proposta_id JOIN listas l2 ON l2.id = ct.lista_id
        WHERE p.fornecedor_id = par.fornecedor_id AND l2.condominio_id = par.condominio_id AND ct.status = 'concluida') AS ja_atendeu,
      GREATEST(par.f_criado, (SELECT max(p.updated_at) FROM propostas p WHERE p.fornecedor_id = par.fornecedor_id)) AS ultima_atividade
    FROM par JOIN cob ON cob.lista_id = par.lista_id AND cob.fornecedor_id = par.fornecedor_id
    LEFT JOIN certs ON certs.lista_id = par.lista_id AND certs.fornecedor_id = par.fornecedor_id
    WHERE cob.cobertos > 0
  ),
  fat AS (
    SELECT b.*,
      b.cobertos::NUMERIC / b.total AS f_cob,
      ((3 * 4.0 + b.soma_aval) / (3 + b.n_aval) - 1) / 4 AS f_rep,
      CASE WHEN b.dist IS NULL THEN 0.5 ELSE GREATEST(0, 1 - b.dist / NULLIF(b.raio_km, 0)) END AS f_dist,
      CASE WHEN b.n_match < 3 THEN 0.5 ELSE LEAST(1, b.n_resp::NUMERIC / b.n_match) END AS f_resp,
      CASE WHEN b.n_decididas < 3 THEN 0.5 ELSE b.n_escolhidas::NUMERIC / b.n_decididas END AS f_aceite,
      CASE WHEN b.ja_atendeu THEN 1 ELSE 0 END AS f_hist,
      CASE WHEN b.ultima_atividade > now() - interval '30 days' THEN 1
           WHEN b.ultima_atividade > now() - interval '90 days' THEN 0.5 ELSE 0 END AS f_ativ
    FROM base b
  )
  SELECT fat.lista_id, fat.fornecedor_id,
    round(100 * (cfg.peso_cobertura * f_cob + cfg.peso_reputacao * f_rep + cfg.peso_distancia * f_dist
      + cfg.peso_resposta * f_resp + cfg.peso_aceite * f_aceite + cfg.peso_historico * f_hist + cfg.peso_atividade * f_ativ)
      / NULLIF(cfg.peso_cobertura + cfg.peso_reputacao + cfg.peso_distancia + cfg.peso_resposta + cfg.peso_aceite
        + cfg.peso_historico + cfg.peso_atividade, 0))::SMALLINT,
    array_remove(ARRAY[
      CASE WHEN fat.total = 1 AND fat.cobertos = 1 THEN 'Atende o item pedido'
           WHEN fat.cobertos = fat.total THEN 'Atende todos os ' || fat.total || ' itens'
           ELSE 'Atende ' || fat.cobertos || ' de ' || fat.total || ' itens' END,
      CASE WHEN fat.dist IS NOT NULL THEN 'A ' || replace(fat.dist::TEXT, '.', ',') || ' km do condomínio'
           ELSE 'Atende na mesma cidade' END,
      CASE WHEN fat.n_aval > 0 THEN 'Nota ' || replace(round(fat.soma_aval::NUMERIC / fat.n_aval, 1)::TEXT, '.', ',')
             || ' em ' || fat.n_aval || CASE WHEN fat.n_aval = 1 THEN ' avaliação' ELSE ' avaliações' END
           ELSE 'Ainda sem avaliações' END,
      CASE WHEN fat.certs IS NOT NULL THEN 'Certificações validadas: ' || array_to_string(fat.certs, ', ') END,
      CASE WHEN fat.ja_atendeu THEN 'Já atendeu este condomínio' END,
      CASE WHEN fat.n_match >= 3 THEN 'Responde a ' || round(100 * fat.f_resp) || '% das oportunidades' END
    ], NULL),
    round(fat.f_cob, 2), fat.dist
  FROM fat CROSS JOIN cfg;
$$;

/* Grava (ou atualiza) os matches calculados; remove sugestões que deixaram de valer. Devolve a quantidade. */
CREATE OR REPLACE FUNCTION public.gravar_matches(p_lista UUID DEFAULT NULL, p_fornecedor UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_n INTEGER;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS tmp_matches (lista_id UUID, fornecedor_id UUID, score SMALLINT, motivos TEXT[], cobertura NUMERIC, distancia_km NUMERIC) ON COMMIT DROP;
  DELETE FROM tmp_matches;
  INSERT INTO tmp_matches SELECT * FROM public.calcular_matches(p_lista, p_fornecedor);

  DELETE FROM matches m
  WHERE m.status = 'sugerido'
    AND (p_lista IS NULL OR m.lista_id = p_lista)
    AND (p_fornecedor IS NULL OR m.fornecedor_id = p_fornecedor)
    AND EXISTS (SELECT 1 FROM listas l WHERE l.id = m.lista_id AND l.status = 'aberta')
    AND NOT EXISTS (SELECT 1 FROM tmp_matches t WHERE t.lista_id = m.lista_id AND t.fornecedor_id = m.fornecedor_id);

  INSERT INTO matches (lista_id, fornecedor_id, score, motivos, cobertura, distancia_km)
  SELECT t.lista_id, t.fornecedor_id, t.score, t.motivos, t.cobertura, t.distancia_km FROM tmp_matches t
  ON CONFLICT ON CONSTRAINT matches_pkey DO UPDATE SET
    score = EXCLUDED.score, motivos = EXCLUDED.motivos, cobertura = EXCLUDED.cobertura, distancia_km = EXCLUDED.distancia_km;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- ============================================================ Listas

/* Cria ou atualiza uma lista (rascunho ou sugestão) e substitui os itens. Devolve o id. */
CREATE OR REPLACE FUNCTION public.salvar_lista(p JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := public.exigir_login();
  v_id UUID := NULLIF(p->>'id', '')::UUID;
  v_lista listas%ROWTYPE;
  v_cond UUID := NULLIF(p->>'condominio_id', '')::UUID;
  v_escopo TEXT := COALESCE(NULLIF(p->>'escopo', ''), 'condominio');
  v_papel TEXT;
  v_status TEXT;
  v_unidade TEXT;
  v_n INTEGER := jsonb_array_length(COALESCE(p->'itens', '[]'::JSONB));
BEGIN
  IF length(btrim(COALESCE(p->>'titulo', ''))) < 3 THEN
    RAISE EXCEPTION 'Dê um título para a lista';
  END IF;
  IF v_n = 0 OR v_n > 50 THEN
    RAISE EXCEPTION 'A lista precisa ter de 1 a 50 itens';
  END IF;
  IF NULLIF(p->>'prazo_propostas', '')::DATE < current_date THEN
    RAISE EXCEPTION 'O prazo para propostas não pode estar no passado';
  END IF;

  IF v_id IS NOT NULL THEN
    SELECT * INTO v_lista FROM listas WHERE id = v_id FOR UPDATE;
    IF NOT FOUND OR v_lista.status NOT IN ('sugestao', 'rascunho') THEN
      RAISE EXCEPTION 'Só é possível editar listas em rascunho ou sugestão';
    END IF;
    IF NOT (v_lista.criado_por = v_uid OR (v_lista.escopo = 'condominio' AND public.eh_gestor(v_lista.condominio_id))) THEN
      RAISE EXCEPTION 'Você não pode editar esta lista';
    END IF;
    UPDATE listas SET titulo = btrim(p->>'titulo'), descricao = p->>'descricao',
      prazo_propostas = NULLIF(p->>'prazo_propostas', '')::DATE, data_desejada = NULLIF(p->>'data_desejada', '')::DATE,
      fotos = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p->'fotos')), fotos)
    WHERE id = v_id;
    DELETE FROM itens WHERE lista_id = v_id;
  ELSE
    IF v_escopo NOT IN ('condominio', 'unidade') THEN
      RAISE EXCEPTION 'Escopo inválido';
    END IF;
    v_papel := public.papel_no_condominio(v_cond);
    IF v_papel IS NULL THEN
      RAISE EXCEPTION 'Você não participa deste condomínio';
    END IF;
    IF v_escopo = 'condominio' THEN
      v_status := CASE WHEN v_papel IN ('sindico', 'administradora') THEN 'rascunho' ELSE 'sugestao' END;
    ELSE
      SELECT unidade INTO v_unidade FROM membros WHERE condominio_id = v_cond AND user_id = v_uid AND status = 'ativo';
      v_unidade := COALESCE(NULLIF(btrim(COALESCE(p->>'unidade', '')), ''), v_unidade);
      IF v_unidade IS NULL THEN
        RAISE EXCEPTION 'Informe a unidade';
      END IF;
      v_status := 'rascunho';
    END IF;
    INSERT INTO listas (condominio_id, criado_por, escopo, unidade, titulo, descricao, status, prazo_propostas, data_desejada, fotos)
    VALUES (v_cond, v_uid, v_escopo, v_unidade, btrim(p->>'titulo'), p->>'descricao', v_status,
            NULLIF(p->>'prazo_propostas', '')::DATE, NULLIF(p->>'data_desejada', '')::DATE,
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(p->'fotos')), '{}'))
    RETURNING id INTO v_id;
    IF v_status = 'sugestao' THEN
      PERFORM public.notificar(g, 'sugestao_lista', 'Nova sugestão de necessidade: ' || btrim(p->>'titulo'), '/listas/' || v_id)
      FROM public.gestores_do_condominio(v_cond) g;
    END IF;
  END IF;

  INSERT INTO itens (lista_id, categoria_id, descricao, quantidade, unidade_medida, recorrencia)
  SELECT v_id, (it->>'categoria_id')::UUID, btrim(it->>'descricao'),
         COALESCE(NULLIF(it->>'quantidade', '')::NUMERIC, 1), COALESCE(NULLIF(it->>'unidade_medida', ''), 'un'),
         COALESCE(NULLIF(it->>'recorrencia', ''), 'unica')
  FROM jsonb_array_elements(p->'itens') it;
  IF EXISTS (SELECT 1 FROM itens WHERE lista_id = v_id AND length(descricao) < 3) THEN
    RAISE EXCEPTION 'Descreva cada item';
  END IF;
  RETURN v_id;
END;
$$;

/* Publica a lista: status aberta, prazo padrão de 7 dias, grava matches e avisa os melhores fornecedores. */
CREATE OR REPLACE FUNCTION public.publicar_lista(p_lista UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := public.exigir_login();
  v_lista listas%ROWTYPE;
  v_n INTEGER;
BEGIN
  SELECT * INTO v_lista FROM listas WHERE id = p_lista FOR UPDATE;
  IF NOT FOUND OR v_lista.status NOT IN ('sugestao', 'rascunho') THEN
    RAISE EXCEPTION 'Só listas em rascunho ou sugestão podem ser publicadas';
  END IF;
  IF NOT ((v_lista.escopo = 'unidade' AND v_lista.criado_por = v_uid)
          OR (v_lista.escopo = 'condominio' AND public.eh_gestor(v_lista.condominio_id))) THEN
    RAISE EXCEPTION 'Somente o síndico ou a administradora publica listas do condomínio';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM itens WHERE lista_id = p_lista) THEN
    RAISE EXCEPTION 'A lista precisa de itens';
  END IF;

  UPDATE listas SET status = 'aberta', publicada_em = now(),
    prazo_propostas = GREATEST(COALESCE(prazo_propostas, current_date + 7), current_date)
  WHERE id = p_lista;

  v_n := public.gravar_matches(p_lista, NULL);

  PERFORM public.notificar(f.user_id, 'oportunidade', 'Nova oportunidade: ' || v_lista.titulo, '/oportunidades/' || p_lista)
  FROM (SELECT m.fornecedor_id FROM matches m WHERE m.lista_id = p_lista
        ORDER BY m.score DESC LIMIT (SELECT top_notificar FROM config_match WHERE id = 1)) top
  JOIN fornecedores f ON f.id = top.fornecedor_id;

  IF v_lista.status = 'sugestao' AND v_lista.criado_por <> v_uid THEN
    PERFORM public.notificar(v_lista.criado_por, 'sugestao_publicada', 'Sua sugestão foi publicada: ' || v_lista.titulo, '/listas/' || p_lista);
  END IF;
  RETURN v_n;
END;
$$;

/* Cancela a lista (antes da contratação). Propostas enviadas passam a recusadas. */
CREATE OR REPLACE FUNCTION public.cancelar_lista(p_lista UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := public.exigir_login();
  v_lista listas%ROWTYPE;
BEGIN
  SELECT * INTO v_lista FROM listas WHERE id = p_lista FOR UPDATE;
  IF NOT FOUND OR v_lista.status NOT IN ('sugestao', 'rascunho', 'aberta') THEN
    RAISE EXCEPTION 'Esta lista não pode mais ser cancelada';
  END IF;
  IF NOT (v_lista.criado_por = v_uid OR (v_lista.escopo = 'condominio' AND public.eh_gestor(v_lista.condominio_id))) THEN
    RAISE EXCEPTION 'Você não pode cancelar esta lista';
  END IF;
  UPDATE listas SET status = 'cancelada' WHERE id = p_lista;
  PERFORM public.notificar(f.user_id, 'lista_cancelada', 'Lista cancelada pelo condomínio: ' || v_lista.titulo, '/propostas')
  FROM propostas p JOIN fornecedores f ON f.id = p.fornecedor_id WHERE p.lista_id = p_lista AND p.status = 'enviada';
  UPDATE propostas SET status = 'recusada' WHERE lista_id = p_lista AND status = 'enviada';
END;
$$;

/* Resumo das listas que o usuário pode ver em um condomínio (ou em todos). */
CREATE OR REPLACE FUNCTION public.minhas_listas(p_condominio UUID DEFAULT NULL)
RETURNS TABLE (id UUID, condominio_id UUID, condominio TEXT, titulo TEXT, escopo TEXT, unidade TEXT, status TEXT,
               prazo_propostas DATE, itens INTEGER, propostas INTEGER, min_propostas SMALLINT, eh_autor BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.id, l.condominio_id, c.nome::TEXT, l.titulo::TEXT, l.escopo::TEXT, l.unidade::TEXT, l.status::TEXT, l.prazo_propostas,
         (SELECT count(*)::INTEGER FROM itens i WHERE i.lista_id = l.id),
         (SELECT count(*)::INTEGER FROM propostas p WHERE p.lista_id = l.id AND p.status IN ('enviada', 'escolhida')),
         c.min_propostas, l.criado_por = auth.uid(), l.created_at
  FROM listas l JOIN condominios c ON c.id = l.condominio_id
  WHERE (p_condominio IS NULL OR l.condominio_id = p_condominio) AND public.pode_ver_lista(l.id)
  ORDER BY CASE l.status WHEN 'em_aprovacao' THEN 1 WHEN 'aberta' THEN 2 WHEN 'sugestao' THEN 3 WHEN 'rascunho' THEN 4 ELSE 5 END,
           l.created_at DESC;
$$;

-- ============================================================ Oportunidades (lado do fornecedor)

/* Vitrine do fornecedor: listas abertas compatíveis, anonimizadas (bairro e cidade, sem nome nem endereço). */
CREATE OR REPLACE FUNCTION public.oportunidades()
RETURNS TABLE (lista_id UUID, titulo TEXT, bairro TEXT, cidade TEXT, uf TEXT, escopo TEXT, prazo_propostas DATE, data_desejada DATE,
               itens INTEGER, categorias TEXT[], score SMALLINT, motivos TEXT[], cobertura NUMERIC, distancia_km NUMERIC,
               status_match TEXT, minha_proposta TEXT, publicada_em TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_forn UUID := public.meu_fornecedor_id();
BEGIN
  PERFORM public.exigir_login();
  IF v_forn IS NULL THEN
    RETURN;
  END IF;
  PERFORM public.gravar_matches(NULL, v_forn);
  RETURN QUERY
  SELECT l.id, l.titulo::TEXT, c.bairro::TEXT, c.cidade::TEXT, c.uf::TEXT, l.escopo::TEXT, l.prazo_propostas, l.data_desejada,
         (SELECT count(*)::INTEGER FROM itens i WHERE i.lista_id = l.id),
         ARRAY(SELECT DISTINCT cat.nome::TEXT FROM itens i JOIN categorias cat ON cat.id = i.categoria_id WHERE i.lista_id = l.id),
         m.score, m.motivos, m.cobertura, m.distancia_km, m.status::TEXT,
         (SELECT p.status::TEXT FROM propostas p WHERE p.lista_id = l.id AND p.fornecedor_id = v_forn), l.publicada_em
  FROM matches m JOIN listas l ON l.id = m.lista_id JOIN condominios c ON c.id = l.condominio_id
  WHERE m.fornecedor_id = v_forn AND m.status <> 'ignorado'
    AND (l.status = 'aberta' OR EXISTS (SELECT 1 FROM propostas p WHERE p.lista_id = l.id AND p.fornecedor_id = v_forn))
  ORDER BY (l.status = 'aberta') DESC, m.score DESC, l.publicada_em DESC;
END;
$$;

/* Detalhe anonimizado de uma oportunidade, com os itens (e se o fornecedor atende cada um) e a proposta dele. */
CREATE OR REPLACE FUNCTION public.oportunidade_detalhe(p_lista UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_forn UUID := public.meu_fornecedor_id();
  v_res JSONB;
BEGIN
  PERFORM public.exigir_login();
  IF v_forn IS NULL OR NOT EXISTS (SELECT 1 FROM matches WHERE lista_id = p_lista AND fornecedor_id = v_forn) THEN
    RAISE EXCEPTION 'Oportunidade não disponível para o seu cadastro';
  END IF;
  UPDATE matches SET status = 'visto' WHERE lista_id = p_lista AND fornecedor_id = v_forn AND status = 'sugerido';

  SELECT jsonb_build_object(
    'id', l.id, 'titulo', l.titulo, 'descricao', l.descricao, 'status', l.status, 'escopo', l.escopo,
    'prazo_propostas', l.prazo_propostas, 'data_desejada', l.data_desejada, 'publicada_em', l.publicada_em,
    'bairro', c.bairro, 'cidade', c.cidade, 'uf', c.uf, 'unidades', c.unidades,
    'score', m.score, 'motivos', m.motivos, 'distancia_km', m.distancia_km, 'fotos', to_jsonb(l.fotos),
    'itens', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', i.id, 'descricao', i.descricao, 'quantidade', i.quantidade, 'unidade_medida', i.unidade_medida,
                'recorrencia', i.recorrencia, 'categoria', cat.nome, 'certificacoes', to_jsonb(cat.certificacoes),
                'atende', public.atende_item(v_forn, i.categoria_id)) ORDER BY cat.nome, i.descricao), '[]'::JSONB)
              FROM itens i JOIN categorias cat ON cat.id = i.categoria_id WHERE i.lista_id = l.id),
    'minha_proposta', (SELECT jsonb_build_object(
                'id', p.id, 'status', p.status, 'valor_total', p.valor_total, 'prazo_execucao_dias', p.prazo_execucao_dias,
                'validade', p.validade, 'condicoes', p.condicoes,
                'itens', (SELECT COALESCE(jsonb_agg(jsonb_build_object('item_id', pi.item_id, 'valor_unitario', pi.valor_unitario,
                            'observacao', pi.observacao)), '[]'::JSONB) FROM proposta_itens pi WHERE pi.proposta_id = p.id))
              FROM propostas p WHERE p.lista_id = l.id AND p.fornecedor_id = v_forn))
  INTO v_res
  FROM listas l JOIN condominios c ON c.id = l.condominio_id JOIN matches m ON m.lista_id = l.id AND m.fornecedor_id = v_forn
  WHERE l.id = p_lista;
  RETURN v_res;
END;
$$;

/* Fornecedor esconde (ou volta a mostrar) uma oportunidade. */
CREATE OR REPLACE FUNCTION public.ignorar_oportunidade(p_lista UUID, p_ignorar BOOLEAN DEFAULT true)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.exigir_login();
  UPDATE matches SET status = CASE WHEN p_ignorar THEN 'ignorado' ELSE 'visto' END
  WHERE lista_id = p_lista AND fornecedor_id = public.meu_fornecedor_id() AND status <> 'proposta';
END;
$$;

-- ============================================================ Propostas

/* Envia (ou reenvia) a proposta estruturada por item. Só itens que o fornecedor atende; total calculado no banco. */
CREATE OR REPLACE FUNCTION public.enviar_proposta(p JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_forn fornecedores%ROWTYPE;
  v_lista listas%ROWTYPE;
  v_id UUID;
  v_existente propostas%ROWTYPE;
  v_total NUMERIC;
  v_qtd INTEGER;
  v_min SMALLINT;
  v_g UUID;
BEGIN
  PERFORM public.exigir_login();
  SELECT * INTO v_forn FROM fornecedores WHERE user_id = auth.uid();
  IF NOT FOUND OR NOT v_forn.verificado OR NOT v_forn.ativo THEN
    RAISE EXCEPTION 'Seu cadastro de fornecedor precisa estar ativo e verificado';
  END IF;
  SELECT * INTO v_lista FROM listas WHERE id = (p->>'lista_id')::UUID FOR UPDATE;
  IF NOT FOUND OR v_lista.status <> 'aberta' THEN
    RAISE EXCEPTION 'Esta lista não está recebendo propostas';
  END IF;
  IF v_lista.prazo_propostas < current_date THEN
    RAISE EXCEPTION 'O prazo para propostas terminou';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM matches WHERE lista_id = v_lista.id AND fornecedor_id = v_forn.id) THEN
    RAISE EXCEPTION 'Esta oportunidade não é compatível com o seu cadastro';
  END IF;
  IF NULLIF(p->>'validade', '')::DATE IS NULL OR (p->>'validade')::DATE < current_date THEN
    RAISE EXCEPTION 'Informe a validade da proposta (hoje ou depois)';
  END IF;
  IF COALESCE(NULLIF(p->>'prazo_execucao_dias', '')::INTEGER, 0) <= 0 THEN
    RAISE EXCEPTION 'Informe o prazo de execução em dias';
  END IF;
  IF jsonb_array_length(COALESCE(p->'itens', '[]'::JSONB)) = 0 THEN
    RAISE EXCEPTION 'Informe o valor de ao menos um item';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p->'itens') it
    LEFT JOIN itens i ON i.id = (it->>'item_id')::UUID AND i.lista_id = v_lista.id
    WHERE i.id IS NULL OR NOT public.atende_item(v_forn.id, i.categoria_id)
       OR COALESCE(NULLIF(it->>'valor_unitario', '')::NUMERIC, -1) < 0
  ) THEN
    RAISE EXCEPTION 'Há itens que não são desta lista, sem valor, ou que você não pode atender (categoria/certificação)';
  END IF;

  SELECT * INTO v_existente FROM propostas WHERE lista_id = v_lista.id AND fornecedor_id = v_forn.id;
  IF FOUND AND v_existente.status NOT IN ('enviada', 'retirada') THEN
    RAISE EXCEPTION 'Esta proposta não pode mais ser alterada';
  END IF;

  SELECT sum((it->>'valor_unitario')::NUMERIC * i.quantidade) INTO v_total
  FROM jsonb_array_elements(p->'itens') it JOIN itens i ON i.id = (it->>'item_id')::UUID;

  INSERT INTO propostas (lista_id, fornecedor_id, status, valor_total, prazo_execucao_dias, validade, condicoes)
  VALUES (v_lista.id, v_forn.id, 'enviada', round(v_total, 2), (p->>'prazo_execucao_dias')::INTEGER, (p->>'validade')::DATE, p->>'condicoes')
  ON CONFLICT (lista_id, fornecedor_id) DO UPDATE SET status = 'enviada', valor_total = EXCLUDED.valor_total,
    prazo_execucao_dias = EXCLUDED.prazo_execucao_dias, validade = EXCLUDED.validade, condicoes = EXCLUDED.condicoes
  RETURNING id INTO v_id;

  DELETE FROM proposta_itens WHERE proposta_id = v_id;
  INSERT INTO proposta_itens (proposta_id, item_id, valor_unitario, observacao)
  SELECT v_id, (it->>'item_id')::UUID, (it->>'valor_unitario')::NUMERIC, NULLIF(it->>'observacao', '')
  FROM jsonb_array_elements(p->'itens') it;

  UPDATE matches SET status = 'proposta' WHERE lista_id = v_lista.id AND fornecedor_id = v_forn.id;

  IF v_existente.id IS NULL OR v_existente.status = 'retirada' THEN
    SELECT count(*) INTO v_qtd FROM propostas WHERE lista_id = v_lista.id AND status = 'enviada';
    SELECT min_propostas INTO v_min FROM condominios WHERE id = v_lista.condominio_id;
    FOR v_g IN SELECT public.responsaveis_lista(v_lista.id) LOOP
      PERFORM public.notificar(v_g, 'proposta_recebida',
        CASE WHEN v_qtd = v_min THEN 'Comparativo liberado: ' || v_qtd || ' propostas para ' || v_lista.titulo
             ELSE 'Nova proposta para ' || v_lista.titulo || ' (' || v_qtd || ' de ' || v_min || ')' END,
        '/listas/' || v_lista.id);
    END LOOP;
  END IF;
  RETURN v_id;
END;
$$;

/* Fornecedor retira a proposta enquanto a lista está aberta. */
CREATE OR REPLACE FUNCTION public.retirar_proposta(p_proposta UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.exigir_login();
  UPDATE propostas p SET status = 'retirada'
  WHERE p.id = p_proposta AND p.fornecedor_id = public.meu_fornecedor_id() AND p.status = 'enviada'
    AND EXISTS (SELECT 1 FROM listas l WHERE l.id = p.lista_id AND l.status = 'aberta');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta proposta não pode ser retirada';
  END IF;
END;
$$;

/* Propostas do fornecedor logado. */
CREATE OR REPLACE FUNCTION public.minhas_propostas()
RETURNS TABLE (id UUID, lista_id UUID, titulo TEXT, bairro TEXT, cidade TEXT, uf TEXT, status TEXT, valor_total NUMERIC,
               prazo_execucao_dias INTEGER, validade DATE, status_lista TEXT, contratacao_id UUID, status_contratacao TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, l.id, l.titulo::TEXT, c.bairro::TEXT, c.cidade::TEXT, c.uf::TEXT, p.status::TEXT, p.valor_total, p.prazo_execucao_dias,
         p.validade, l.status::TEXT, ct.id, ct.status::TEXT, p.updated_at
  FROM propostas p JOIN listas l ON l.id = p.lista_id JOIN condominios c ON c.id = l.condominio_id
  LEFT JOIN contratacoes ct ON ct.proposta_id = p.id AND ct.status NOT IN ('recusada', 'cancelada')
  WHERE p.fornecedor_id = public.meu_fornecedor_id()
  ORDER BY p.updated_at DESC;
$$;

/* Comparativo lado a lado. Antes do mínimo de propostas (ou do prazo), mostra só a contagem (RN05). */
CREATE OR REPLACE FUNCTION public.comparativo(p_lista UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lista listas%ROWTYPE;
  v_cond condominios%ROWTYPE;
  v_liberado BOOLEAN;
  v_recebidas INTEGER;
BEGIN
  PERFORM public.exigir_login();
  IF NOT public.pode_decidir_lista(p_lista) THEN
    RAISE EXCEPTION 'Você não tem acesso ao comparativo desta lista';
  END IF;
  SELECT * INTO v_lista FROM listas WHERE id = p_lista;
  SELECT * INTO v_cond FROM condominios WHERE id = v_lista.condominio_id;
  v_liberado := public.comparativo_liberado(p_lista);
  SELECT count(*) INTO v_recebidas FROM propostas WHERE lista_id = p_lista AND status IN ('enviada', 'escolhida');

  RETURN jsonb_build_object(
    'liberado', v_liberado, 'recebidas', v_recebidas, 'minimo', v_cond.min_propostas,
    'prazo_propostas', v_lista.prazo_propostas, 'limite_conselho', v_cond.limite_conselho,
    'conselheiros', (SELECT count(*) FROM membros WHERE condominio_id = v_cond.id AND papel = 'conselheiro' AND status = 'ativo'),
    'pode_escolher', (v_lista.escopo = 'unidade' AND v_lista.criado_por = auth.uid())
                     OR (v_lista.escopo = 'condominio' AND public.eh_gestor(v_cond.id)),
    'itens', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', i.id, 'descricao', i.descricao, 'quantidade', i.quantidade,
                'unidade_medida', i.unidade_medida, 'categoria', cat.nome) ORDER BY cat.nome, i.descricao), '[]'::JSONB)
              FROM itens i JOIN categorias cat ON cat.id = i.categoria_id WHERE i.lista_id = p_lista),
    'propostas', CASE WHEN NOT v_liberado THEN '[]'::JSONB ELSE (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id, 'status', p.status, 'valor_total', p.valor_total, 'prazo_execucao_dias', p.prazo_execucao_dias,
        'validade', p.validade, 'condicoes', p.condicoes, 'enviada_em', p.updated_at,
        'fornecedor', jsonb_build_object('id', f.id, 'nome', COALESCE(f.nome_fantasia, f.razao_social), 'verificado', f.verificado,
                        'cidade', f.cidade, 'uf', f.uf, 'nota', r.media, 'avaliacoes', r.total),
        'score', m.score, 'motivos', m.motivos,
        'itens', (SELECT COALESCE(jsonb_agg(jsonb_build_object('item_id', pi.item_id, 'valor_unitario', pi.valor_unitario,
                    'observacao', pi.observacao)), '[]'::JSONB) FROM proposta_itens pi WHERE pi.proposta_id = p.id)
      ) ORDER BY p.valor_total), '[]'::JSONB)
      FROM propostas p JOIN fornecedores f ON f.id = p.fornecedor_id
      LEFT JOIN matches m ON m.lista_id = p.lista_id AND m.fornecedor_id = p.fornecedor_id
      CROSS JOIN LATERAL public.reputacao_fornecedor(f.id) r
      WHERE p.lista_id = p_lista AND p.status IN ('enviada', 'escolhida', 'recusada')) END
  );
END;
$$;

-- ============================================================ Contratação e conselho

/* Escolhe a proposta. Acima do limite, em lista do condomínio com conselheiros ativos, vai para o conselho (RN06). */
CREATE OR REPLACE FUNCTION public.escolher_proposta(p_proposta UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prop propostas%ROWTYPE;
  v_lista listas%ROWTYPE;
  v_cond condominios%ROWTYPE;
  v_exige BOOLEAN;
  v_id UUID;
  v_forn_user UUID;
BEGIN
  PERFORM public.exigir_login();
  SELECT * INTO v_prop FROM propostas WHERE id = p_proposta FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta não encontrada';
  END IF;
  SELECT * INTO v_lista FROM listas WHERE id = v_prop.lista_id FOR UPDATE;
  SELECT * INTO v_cond FROM condominios WHERE id = v_lista.condominio_id;
  IF NOT ((v_lista.escopo = 'unidade' AND v_lista.criado_por = auth.uid())
          OR (v_lista.escopo = 'condominio' AND public.eh_gestor(v_cond.id))) THEN
    RAISE EXCEPTION 'Somente o síndico ou a administradora escolhe a proposta';
  END IF;
  IF v_lista.status <> 'aberta' THEN
    RAISE EXCEPTION 'Esta lista não está em fase de escolha';
  END IF;
  IF NOT public.comparativo_liberado(v_lista.id) THEN
    RAISE EXCEPTION 'Aguarde o mínimo de % propostas ou o fim do prazo', v_cond.min_propostas;
  END IF;
  IF v_prop.status <> 'enviada' OR v_prop.validade < current_date THEN
    RAISE EXCEPTION 'Esta proposta não está válida para escolha';
  END IF;

  v_exige := v_lista.escopo = 'condominio' AND v_prop.valor_total > v_cond.limite_conselho
             AND EXISTS (SELECT 1 FROM membros WHERE condominio_id = v_cond.id AND papel = 'conselheiro' AND status = 'ativo');

  INSERT INTO contratacoes (lista_id, proposta_id, status, exige_conselho)
  VALUES (v_lista.id, v_prop.id, CASE WHEN v_exige THEN 'aguardando_aprovacao' ELSE 'aprovada' END, v_exige)
  RETURNING id INTO v_id;
  UPDATE propostas SET status = 'escolhida' WHERE id = v_prop.id;
  SELECT user_id INTO v_forn_user FROM fornecedores WHERE id = v_prop.fornecedor_id;

  IF v_exige THEN
    UPDATE listas SET status = 'em_aprovacao' WHERE id = v_lista.id;
    PERFORM public.notificar(m.user_id, 'aprovacao_pendente', 'Aprovação do conselho: ' || v_lista.titulo, '/contratacoes/' || v_id)
    FROM membros m WHERE m.condominio_id = v_cond.id AND m.papel = 'conselheiro' AND m.status = 'ativo';
  ELSE
    PERFORM public.concluir_escolha(v_id);
  END IF;
  RETURN v_id;
END;
$$;

/* Efetiva a escolha aprovada: lista contratada, demais propostas recusadas e avisos (interna). */
CREATE OR REPLACE FUNCTION public.concluir_escolha(p_contratacao UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ct contratacoes%ROWTYPE;
  v_prop propostas%ROWTYPE;
  v_titulo TEXT;
BEGIN
  SELECT * INTO v_ct FROM contratacoes WHERE id = p_contratacao;
  SELECT * INTO v_prop FROM propostas WHERE id = v_ct.proposta_id;
  SELECT titulo INTO v_titulo FROM listas WHERE id = v_ct.lista_id;
  UPDATE contratacoes SET status = 'aprovada' WHERE id = p_contratacao;
  UPDATE listas SET status = 'contratada' WHERE id = v_ct.lista_id;
  PERFORM public.notificar(f.user_id, 'proposta_recusada', 'Outra proposta foi escolhida: ' || v_titulo, '/propostas')
  FROM propostas p JOIN fornecedores f ON f.id = p.fornecedor_id
  WHERE p.lista_id = v_ct.lista_id AND p.id <> v_prop.id AND p.status = 'enviada';
  UPDATE propostas SET status = 'recusada' WHERE lista_id = v_ct.lista_id AND id <> v_prop.id AND status = 'enviada';
  PERFORM public.notificar((SELECT user_id FROM fornecedores WHERE id = v_prop.fornecedor_id), 'proposta_aprovada',
    'Sua proposta foi aprovada: ' || v_titulo || '. Os contatos estão liberados.', '/contratacoes/' || p_contratacao);
  PERFORM public.notificar(g, 'contratacao_aprovada', 'Contratação aprovada: ' || v_titulo, '/contratacoes/' || p_contratacao)
  FROM public.responsaveis_lista(v_ct.lista_id) g;
END;
$$;

/* Voto do conselheiro. Aprova com maioria simples dos conselheiros ativos; empate ou maioria contra recusa. */
CREATE OR REPLACE FUNCTION public.votar_contratacao(p_contratacao UUID, p_aprova BOOLEAN, p_comentario TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ct contratacoes%ROWTYPE;
  v_lista listas%ROWTYPE;
  v_total INTEGER;
  v_sim INTEGER;
  v_nao INTEGER;
BEGIN
  PERFORM public.exigir_login();
  SELECT * INTO v_ct FROM contratacoes WHERE id = p_contratacao FOR UPDATE;
  IF NOT FOUND OR v_ct.status <> 'aguardando_aprovacao' THEN
    RAISE EXCEPTION 'Esta contratação não está aguardando aprovação';
  END IF;
  SELECT * INTO v_lista FROM listas WHERE id = v_ct.lista_id;
  IF NOT EXISTS (SELECT 1 FROM membros WHERE condominio_id = v_lista.condominio_id AND user_id = auth.uid()
                 AND papel = 'conselheiro' AND status = 'ativo') THEN
    RAISE EXCEPTION 'Somente conselheiros ativos votam';
  END IF;
  INSERT INTO aprovacoes (contratacao_id, user_id, aprova, comentario)
  VALUES (p_contratacao, auth.uid(), p_aprova, p_comentario)
  ON CONFLICT (contratacao_id, user_id) DO UPDATE SET aprova = EXCLUDED.aprova, comentario = EXCLUDED.comentario, created_at = now();

  SELECT count(*) INTO v_total FROM membros WHERE condominio_id = v_lista.condominio_id AND papel = 'conselheiro' AND status = 'ativo';
  SELECT count(*) FILTER (WHERE a.aprova), count(*) FILTER (WHERE NOT a.aprova) INTO v_sim, v_nao
  FROM aprovacoes a JOIN membros m ON m.user_id = a.user_id AND m.condominio_id = v_lista.condominio_id
    AND m.papel = 'conselheiro' AND m.status = 'ativo'
  WHERE a.contratacao_id = p_contratacao;

  IF v_sim * 2 > v_total THEN
    PERFORM public.concluir_escolha(p_contratacao);
    RETURN 'aprovada';
  ELSIF (v_total - v_nao) * 2 <= v_total THEN
    UPDATE contratacoes SET status = 'recusada' WHERE id = p_contratacao;
    UPDATE propostas SET status = 'enviada' WHERE id = v_ct.proposta_id;
    UPDATE listas SET status = 'aberta' WHERE id = v_ct.lista_id;
    PERFORM public.notificar(g, 'contratacao_recusada', 'O conselho recusou a proposta escolhida para ' || v_lista.titulo, '/listas/' || v_lista.id)
    FROM public.responsaveis_lista(v_lista.id) g;
    RETURN 'recusada';
  END IF;
  RETURN 'aguardando_aprovacao';
END;
$$;

/* Avança o status da contratação: em_execucao, concluida ou cancelada. */
CREATE OR REPLACE FUNCTION public.atualizar_contratacao(p_contratacao UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ct contratacoes%ROWTYPE;
  v_lista listas%ROWTYPE;
  v_forn_user UUID;
  v_contratante BOOLEAN;
  v_fornecedor BOOLEAN;
BEGIN
  PERFORM public.exigir_login();
  SELECT * INTO v_ct FROM contratacoes WHERE id = p_contratacao FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contratação não encontrada';
  END IF;
  SELECT * INTO v_lista FROM listas WHERE id = v_ct.lista_id;
  SELECT f.user_id INTO v_forn_user FROM propostas p JOIN fornecedores f ON f.id = p.fornecedor_id WHERE p.id = v_ct.proposta_id;
  v_contratante := (v_lista.escopo = 'unidade' AND v_lista.criado_por = auth.uid())
                   OR (v_lista.escopo = 'condominio' AND public.eh_gestor(v_lista.condominio_id));
  v_fornecedor := v_forn_user = auth.uid();

  IF p_status = 'em_execucao' AND v_ct.status = 'aprovada' AND (v_contratante OR v_fornecedor) THEN
    UPDATE contratacoes SET status = 'em_execucao' WHERE id = p_contratacao;
  ELSIF p_status = 'concluida' AND v_ct.status IN ('aprovada', 'em_execucao') AND v_contratante THEN
    UPDATE contratacoes SET status = 'concluida', concluida_em = now() WHERE id = p_contratacao;
    UPDATE listas SET status = 'encerrada' WHERE id = v_lista.id;
    PERFORM public.notificar(v_forn_user, 'avaliar', 'Serviço concluído: avalie o condomínio', '/contratacoes/' || p_contratacao);
    PERFORM public.notificar(g, 'avaliar', 'Serviço concluído: avalie o fornecedor', '/contratacoes/' || p_contratacao)
    FROM public.responsaveis_lista(v_lista.id) g;
  ELSIF p_status = 'cancelada' AND v_ct.status IN ('aguardando_aprovacao', 'aprovada', 'em_execucao') AND v_contratante THEN
    UPDATE contratacoes SET status = 'cancelada' WHERE id = p_contratacao;
    IF v_ct.status = 'aguardando_aprovacao' THEN
      UPDATE propostas SET status = 'enviada' WHERE id = v_ct.proposta_id;
      UPDATE listas SET status = 'aberta' WHERE id = v_lista.id;
    ELSE
      UPDATE listas SET status = 'cancelada' WHERE id = v_lista.id;
      PERFORM public.notificar(v_forn_user, 'contratacao_cancelada', 'Contratação cancelada: ' || v_lista.titulo, '/contratacoes/' || p_contratacao);
    END IF;
  ELSE
    RAISE EXCEPTION 'Mudança de status não permitida';
  END IF;
END;
$$;

/* Contratações do usuário (como contratante, conselheiro ou fornecedor). */
CREATE OR REPLACE FUNCTION public.minhas_contratacoes()
RETURNS TABLE (id UUID, lista_id UUID, titulo TEXT, condominio TEXT, fornecedor TEXT, valor_total NUMERIC, status TEXT,
               exige_conselho BOOLEAN, votos_sim INTEGER, votos_nao INTEGER, conselheiros INTEGER, meu_voto BOOLEAN,
               lado TEXT, pode_votar BOOLEAN, pode_gerir BOOLEAN, ja_avaliei BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ct.id, l.id, l.titulo::TEXT,
         CASE WHEN f.user_id = auth.uid() THEN c.bairro || ' · ' || c.cidade ELSE c.nome END::TEXT,
         COALESCE(f.nome_fantasia, f.razao_social)::TEXT, p.valor_total, ct.status::TEXT, ct.exige_conselho,
         (SELECT count(*)::INTEGER FROM aprovacoes a WHERE a.contratacao_id = ct.id AND a.aprova),
         (SELECT count(*)::INTEGER FROM aprovacoes a WHERE a.contratacao_id = ct.id AND NOT a.aprova),
         (SELECT count(*)::INTEGER FROM membros m WHERE m.condominio_id = c.id AND m.papel = 'conselheiro' AND m.status = 'ativo'),
         (SELECT a.aprova FROM aprovacoes a WHERE a.contratacao_id = ct.id AND a.user_id = auth.uid()),
         CASE WHEN f.user_id = auth.uid() THEN 'fornecedor' ELSE 'contratante' END,
         ct.status = 'aguardando_aprovacao' AND EXISTS (SELECT 1 FROM membros m WHERE m.condominio_id = c.id AND m.user_id = auth.uid()
           AND m.papel = 'conselheiro' AND m.status = 'ativo'),
         (l.escopo = 'unidade' AND l.criado_por = auth.uid()) OR (l.escopo = 'condominio' AND public.eh_gestor(c.id)),
         EXISTS (SELECT 1 FROM avaliacoes av WHERE av.contratacao_id = ct.id
           AND av.papel = CASE WHEN f.user_id = auth.uid() THEN 'fornecedor' ELSE 'contratante' END),
         ct.created_at
  FROM contratacoes ct JOIN listas l ON l.id = ct.lista_id JOIN condominios c ON c.id = l.condominio_id
  JOIN propostas p ON p.id = ct.proposta_id JOIN fornecedores f ON f.id = p.fornecedor_id
  WHERE f.user_id = auth.uid() OR public.pode_decidir_lista(l.id)
  ORDER BY (ct.status = 'aguardando_aprovacao') DESC, ct.created_at DESC;
$$;

/* Contatos liberados depois da aprovação (RN04): endereço do condomínio e responsáveis ↔ dados do fornecedor. */
CREATE OR REPLACE FUNCTION public.contatos_contratacao(p_contratacao UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ct contratacoes%ROWTYPE;
  v_lista listas%ROWTYPE;
  v_cond condominios%ROWTYPE;
  v_forn fornecedores%ROWTYPE;
BEGIN
  PERFORM public.exigir_login();
  SELECT * INTO v_ct FROM contratacoes WHERE id = p_contratacao;
  IF NOT FOUND OR v_ct.status NOT IN ('aprovada', 'em_execucao', 'concluida') THEN
    RAISE EXCEPTION 'Os contatos são liberados depois da aprovação';
  END IF;
  SELECT * INTO v_lista FROM listas WHERE id = v_ct.lista_id;
  SELECT * INTO v_cond FROM condominios WHERE id = v_lista.condominio_id;
  SELECT f.* INTO v_forn FROM propostas p JOIN fornecedores f ON f.id = p.fornecedor_id WHERE p.id = v_ct.proposta_id;
  IF NOT (v_forn.user_id = auth.uid() OR public.pode_decidir_lista(v_lista.id)) THEN
    RAISE EXCEPTION 'Você não participa desta contratação';
  END IF;
  RETURN jsonb_build_object(
    'condominio', jsonb_build_object('nome', v_cond.nome, 'cep', v_cond.cep, 'logradouro', v_cond.logradouro, 'numero', v_cond.numero,
                   'bairro', v_cond.bairro, 'cidade', v_cond.cidade, 'uf', v_cond.uf, 'unidade', v_lista.unidade),
    'responsaveis', (SELECT COALESCE(jsonb_agg(jsonb_build_object('nome', pf.nome, 'telefone', pf.telefone,
                       'papel', COALESCE((SELECT m.papel FROM membros m WHERE m.condominio_id = v_cond.id AND m.user_id = pf.user_id), 'administradora'))), '[]'::JSONB)
                     FROM perfis pf WHERE pf.user_id IN (SELECT public.responsaveis_lista(v_lista.id))),
    'fornecedor', jsonb_build_object('nome', COALESCE(v_forn.nome_fantasia, v_forn.razao_social), 'razao_social', v_forn.razao_social,
                   'documento', v_forn.documento, 'telefone', v_forn.telefone, 'email', v_forn.email_contato,
                   'cidade', v_forn.cidade, 'uf', v_forn.uf)
  );
END;
$$;

/* Avaliação mútua depois da conclusão (uma por lado). */
CREATE OR REPLACE FUNCTION public.avaliar(p_contratacao UUID, p_nota SMALLINT, p_comentario TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ct contratacoes%ROWTYPE;
  v_lista listas%ROWTYPE;
  v_forn_user UUID;
  v_papel TEXT;
BEGIN
  PERFORM public.exigir_login();
  SELECT * INTO v_ct FROM contratacoes WHERE id = p_contratacao;
  IF NOT FOUND OR v_ct.status <> 'concluida' THEN
    RAISE EXCEPTION 'A avaliação é liberada quando o serviço é concluído';
  END IF;
  SELECT * INTO v_lista FROM listas WHERE id = v_ct.lista_id;
  SELECT f.user_id INTO v_forn_user FROM propostas p JOIN fornecedores f ON f.id = p.fornecedor_id WHERE p.id = v_ct.proposta_id;
  IF v_forn_user = auth.uid() THEN
    v_papel := 'fornecedor';
  ELSIF (v_lista.escopo = 'unidade' AND v_lista.criado_por = auth.uid())
        OR (v_lista.escopo = 'condominio' AND public.eh_gestor(v_lista.condominio_id)) THEN
    v_papel := 'contratante';
  ELSE
    RAISE EXCEPTION 'Você não participa desta contratação';
  END IF;
  IF p_nota NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'A nota vai de 1 a 5';
  END IF;
  INSERT INTO avaliacoes (contratacao_id, avaliador_id, papel, nota, comentario)
  VALUES (p_contratacao, auth.uid(), v_papel, p_nota, p_comentario);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Esta contratação já foi avaliada por este lado';
END;
$$;

-- ============================================================ Painel e rotina

/* Indicadores do usuário: lado contratante e lado fornecedor. */
CREATE OR REPLACE FUNCTION public.painel()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := public.exigir_login();
  v_forn fornecedores%ROWTYPE;
  v_contr JSONB;
  v_lado_forn JSONB := NULL;
  v_rep RECORD;
BEGIN
  SELECT jsonb_build_object(
    'condominios', (SELECT count(*) FROM public.meus_condominios() mc WHERE mc.status = 'ativo'),
    'listas_abertas', (SELECT count(*) FROM public.minhas_listas() ml WHERE ml.status = 'aberta'),
    'sugestoes', (SELECT count(*) FROM public.minhas_listas() ml WHERE ml.status = 'sugestao'),
    'propostas_30d', (SELECT count(*) FROM propostas p JOIN listas l ON l.id = p.lista_id
                      WHERE p.created_at > now() - interval '30 days' AND public.pode_decidir_lista(l.id)),
    'aprovacoes_pendentes', (SELECT count(*) FROM public.minhas_contratacoes() mc WHERE mc.pode_votar AND mc.meu_voto IS NULL),
    'em_andamento', (SELECT count(*) FROM public.minhas_contratacoes() mc WHERE mc.lado = 'contratante'
                     AND mc.status IN ('aprovada', 'em_execucao')),
    'membros_pendentes', (SELECT COALESCE(sum(mc.membros_pendentes), 0) FROM public.meus_condominios() mc)
  ) INTO v_contr;

  SELECT * INTO v_forn FROM fornecedores WHERE user_id = v_uid;
  IF FOUND THEN
    SELECT * INTO v_rep FROM public.reputacao_fornecedor(v_forn.id);
    v_lado_forn := jsonb_build_object(
      'verificado', v_forn.verificado, 'ativo', v_forn.ativo,
      'oportunidades', (SELECT count(*) FROM matches m JOIN listas l ON l.id = m.lista_id
                        WHERE m.fornecedor_id = v_forn.id AND l.status = 'aberta' AND m.status IN ('sugerido', 'visto')),
      'propostas_30d', (SELECT count(*) FROM propostas WHERE fornecedor_id = v_forn.id AND created_at > now() - interval '30 days'),
      'escolhidas', (SELECT count(*) FROM propostas WHERE fornecedor_id = v_forn.id AND status = 'escolhida'),
      'em_andamento', (SELECT count(*) FROM public.minhas_contratacoes() mc WHERE mc.lado = 'fornecedor' AND mc.status IN ('aprovada', 'em_execucao')),
      'nota', v_rep.media, 'avaliacoes', v_rep.total,
      'documentos_em_analise', (SELECT count(*) FROM documentos WHERE fornecedor_id = v_forn.id AND status = 'em_analise'),
      'categorias', (SELECT count(*) FROM fornecedor_categorias WHERE fornecedor_id = v_forn.id)
    );
  END IF;

  RETURN jsonb_build_object('contratante', v_contr, 'fornecedor', v_lado_forn,
    'nao_lidas', (SELECT count(*) FROM notificacoes WHERE user_id = v_uid AND NOT lida));
END;
$$;

/* Rotina diária: expira propostas vencidas e encerra listas sem propostas 30 dias após o prazo. */
CREATE OR REPLACE FUNCTION public.expirar()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prop INTEGER;
  v_listas INTEGER;
BEGIN
  UPDATE propostas SET status = 'expirada' WHERE status = 'enviada' AND validade < current_date;
  GET DIAGNOSTICS v_prop = ROW_COUNT;
  UPDATE listas l SET status = 'encerrada'
  WHERE l.status = 'aberta' AND l.prazo_propostas < current_date - 30
    AND NOT EXISTS (SELECT 1 FROM propostas p WHERE p.lista_id = l.id AND p.status = 'enviada');
  GET DIAGNOSTICS v_listas = ROW_COUNT;
  RETURN jsonb_build_object('propostas_expiradas', v_prop, 'listas_encerradas', v_listas);
END;
$$;

-- Funções internas: fora da API (só chamadas por outras funções ou pelo agendador).
REVOKE EXECUTE ON FUNCTION public.notificar(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calcular_matches(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gravar_matches(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.concluir_escolha(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expirar() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gestores_do_condominio(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.responsaveis_lista(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.atende_item(UUID, UUID) FROM PUBLIC, anon;

-- Fim da migração 03
