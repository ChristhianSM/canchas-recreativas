-- Ejecutar esto en Supabase SQL Editor DESPUÉS de crear el bucket manualmente
-- Dashboard → Storage → New bucket → nombre: "comprobantes" → Public: ON

-- Política: permitir al service role subir comprobantes
CREATE POLICY "Service role puede subir comprobantes"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'comprobantes');

-- Política: acceso público de lectura
CREATE POLICY "Comprobantes son públicos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'comprobantes');

-- Política: service role puede actualizar (upsert)
CREATE POLICY "Service role puede actualizar comprobantes"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'comprobantes');
