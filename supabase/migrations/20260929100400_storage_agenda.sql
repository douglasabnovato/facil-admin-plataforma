-- 05 — Storage e agenda
-- Buckets: documentos (privado, pasta <fornecedor_id>/), fotos-necessidades (privado, pasta <condominio_id>/<lista_id>/)
-- e avatares (público, pasta <user_id>/). Agenda diária da função expirar() pelo pg_cron, quando disponível.

INSERT INTO storage.buckets (id, name, public) VALUES
  ('documentos', 'documentos', false),
  ('fotos-necessidades', 'fotos-necessidades', false),
  ('avatares', 'avatares', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documentos: fornecedor envia" ON storage.objects;
DROP POLICY IF EXISTS "documentos: fornecedor e admin leem" ON storage.objects;
DROP POLICY IF EXISTS "documentos: fornecedor apaga" ON storage.objects;
DROP POLICY IF EXISTS "fotos: membros enviam" ON storage.objects;
DROP POLICY IF EXISTS "fotos: quem vê a lista lê" ON storage.objects;
DROP POLICY IF EXISTS "avatares: dono envia" ON storage.objects;
DROP POLICY IF EXISTS "avatares: dono altera" ON storage.objects;

CREATE POLICY "documentos: fornecedor envia" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = public.meu_fornecedor_id()::TEXT);
CREATE POLICY "documentos: fornecedor e admin leem" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND ((storage.foldername(name))[1] = public.meu_fornecedor_id()::TEXT OR public.eh_admin()));
CREATE POLICY "documentos: fornecedor apaga" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = public.meu_fornecedor_id()::TEXT);

CREATE POLICY "fotos: membros enviam" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-necessidades' AND public.eh_membro(((storage.foldername(name))[1])::UUID));
CREATE POLICY "fotos: quem vê a lista lê" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-necessidades' AND (
    public.eh_membro(((storage.foldername(name))[1])::UUID)
    OR EXISTS (SELECT 1 FROM public.matches m WHERE m.lista_id::TEXT = (storage.foldername(name))[2]
               AND m.fornecedor_id = public.meu_fornecedor_id())));

CREATE POLICY "avatares: dono envia" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "avatares: dono altera" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'faciladmin-expirar';
    PERFORM cron.schedule('faciladmin-expirar', '15 6 * * *', 'SELECT public.expirar()');
  ELSE
    RAISE NOTICE 'pg_cron indisponível: agende public.expirar() manualmente';
  END IF;
END $$;

-- Fim da migração 05
