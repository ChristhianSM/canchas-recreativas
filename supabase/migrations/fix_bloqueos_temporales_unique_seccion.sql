-- ============================================================
-- Fix: bloqueos_temporales bloqueaba TODAS las secciones entre sí
-- ============================================================
-- El constraint unique(cancha_id, fecha, hora) no consideraba seccion_id,
-- así que un hold de 5 min en la Sección A impedía (por violación de
-- unique constraint, no por lógica de negocio) crear un hold en la
-- Sección B o C para el mismo horario, aunque son espacios independientes.
--
-- Reemplazo por dos índices únicos parciales:
--   1) Una sola sección concreta puede tener un hold activo a la vez.
--   2) Una sola "cancha completa" (seccion_id NULL) puede tener un hold
--      activo a la vez.
-- Esto permite holds simultáneos en distintas secciones del mismo slot,
-- pero sigue evitando holds duplicados dentro de la misma sección o de
-- la cancha completa.

-- Buscar y eliminar TODOS los índices/constraints unique(cancha_id, fecha, hora)
-- existentes sobre la tabla (puede haber más de uno: un constraint con nombre
-- propio y un índice único plano con nombre autogenerado, por ejemplo), sin
-- importar si están respaldados por un constraint formal o son un índice suelto.
DO $$
DECLARE
  idx RECORD;
BEGIN
  FOR idx IN
    SELECT ic.relname AS index_name, con.conname AS constraint_name
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    LEFT JOIN pg_constraint con ON con.conindid = i.indexrelid
    WHERE tc.relname = 'bloqueos_temporales'
      AND i.indisunique
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname)
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = k.attnum
      ) = ARRAY['cancha_id', 'fecha', 'hora']::text[]
  LOOP
    IF idx.constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.bloqueos_temporales DROP CONSTRAINT %I', idx.constraint_name);
    ELSE
      EXECUTE format('DROP INDEX public.%I', idx.index_name);
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS bloqueos_temporales_unique_seccion
  ON public.bloqueos_temporales (cancha_id, fecha, hora, seccion_id)
  WHERE seccion_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bloqueos_temporales_unique_completa
  ON public.bloqueos_temporales (cancha_id, fecha, hora)
  WHERE seccion_id IS NULL;
