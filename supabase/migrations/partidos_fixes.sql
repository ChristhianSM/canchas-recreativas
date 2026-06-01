-- ============================================================
-- Fixes al schema de partidos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Eliminar la vista que depende de la columna antes de alterarla
DROP VIEW IF EXISTS public.partidos_con_detalles;

-- 2. precio_por_persona con techo (ceil) en lugar de división entera
--    Ej: S/100 ÷ 3 jugadores = S/34 (no S/33)
ALTER TABLE public.partidos DROP COLUMN precio_por_persona;
ALTER TABLE public.partidos
  ADD COLUMN precio_por_persona int
  GENERATED ALWAYS AS (
    CEIL(precio_total::numeric / jugadores_max)::int
  ) STORED;

-- 3. Recrear la vista con los mismos datos
CREATE OR REPLACE VIEW public.partidos_con_detalles AS
SELECT
  p.*,
  c.nombre          AS cancha_nombre,
  c.distrito        AS cancha_distrito,
  c.imagenes[1]     AS cancha_imagen,
  u.nombre          AS organizador_nombre,
  (
    SELECT json_agg(json_build_object(
      'usuario_id',    pj.usuario_id,
      'nombre',        usr.nombre,
      'inicial',       upper(left(usr.nombre, 1)),
      'es_organizador', pj.es_organizador,
      'estado_pago',   pj.estado_pago
    ) ORDER BY pj.unido_en)
    FROM public.partido_jugadores pj
    JOIN public.usuarios usr ON usr.id = pj.usuario_id
    WHERE pj.partido_id = p.id
  ) AS jugadores
FROM public.partidos p
JOIN public.canchas  c ON c.id = p.cancha_id
JOIN public.usuarios u ON u.id = p.organizador_id;

-- 4. No puede existir dos partidos para la misma cancha en el mismo horario
ALTER TABLE public.partidos
  ADD CONSTRAINT partidos_cancha_fecha_hora_uq
  UNIQUE (cancha_id, fecha, hora);
