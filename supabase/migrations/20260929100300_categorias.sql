-- 04 — Categorias iniciais e configuração do match
-- Serviços e produtos mais pedidos por condomínios. Certificações exigidas por categoria (RN03):
-- elétrica → NR-10; trabalho em altura/fachada → NR-35; extintores e brigada → credenciamento dos bombeiros.
-- O admin ajusta a lista depois pelo painel (ou por SQL). Reexecutar não duplica (ON CONFLICT).

INSERT INTO public.categorias (slug, nome, grupo, certificacoes) VALUES
  ('eletrica', 'Manutenção elétrica', 'servico', '{nr10}'),
  ('hidraulica', 'Hidráulica e bombas', 'servico', '{}'),
  ('limpeza', 'Limpeza e conservação', 'servico', '{}'),
  ('limpeza-caixa-dagua', 'Limpeza de caixa d''água', 'servico', '{}'),
  ('portaria-cftv', 'Portaria, CFTV e controle de acesso', 'servico', '{}'),
  ('jardinagem', 'Jardinagem e paisagismo', 'servico', '{}'),
  ('pintura', 'Pintura', 'servico', '{}'),
  ('fachada-altura', 'Fachada e trabalho em altura', 'servico', '{nr35}'),
  ('impermeabilizacao', 'Impermeabilização', 'servico', '{}'),
  ('elevadores', 'Manutenção de elevadores', 'servico', '{}'),
  ('extintores-incendio', 'Extintores e combate a incêndio', 'servico', '{credenciamento_bombeiros}'),
  ('dedetizacao', 'Dedetização e controle de pragas', 'servico', '{}'),
  ('piscina', 'Manutenção de piscina', 'servico', '{}'),
  ('engenharia-laudos', 'Engenharia, laudos e vistorias', 'servico', '{}'),
  ('marcenaria-serralheria', 'Marcenaria e serralheria', 'servico', '{}'),
  ('produtos-limpeza', 'Produtos de limpeza', 'produto', '{}'),
  ('material-eletrico', 'Material elétrico e iluminação', 'produto', '{}'),
  ('material-hidraulico', 'Material hidráulico', 'produto', '{}'),
  ('equipamentos-seguranca', 'Equipamentos de segurança (EPI, câmeras)', 'produto', '{}'),
  ('jardim-insumos', 'Insumos de jardim', 'produto', '{}')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.config_match (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Fim da migração 04
