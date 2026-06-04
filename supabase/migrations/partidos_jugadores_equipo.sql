-- Agrega jugadores_equipo a la tabla partidos
-- jugadores_equipo: total del partido (para dividir el precio, ej. 10)
-- jugadores_max:    cupos que el organizador abre para que otros se unan (ej. 4)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.partidos
ADD COLUMN IF NOT EXISTS jugadores_equipo INT;

-- Backwards compat: partidos existentes tienen equipo = max
UPDATE public.partidos
SET jugadores_equipo = jugadores_max
WHERE jugadores_equipo IS NULL;

ALTER TABLE public.partidos
ALTER COLUMN jugadores_equipo SET NOT NULL;

-- Recrear la vista para incluir el nuevo campo
DROP VIEW IF EXISTS public.partidos_con_detalles;

CREATE VIEW public.partidos_con_detalles AS
SELECT
  p.*,
  c.nombre       AS cancha_nombre,
  c.distrito     AS cancha_distrito,
  c.imagenes[1]  AS cancha_imagen,
  c.lat          AS cancha_lat,
  c.lng          AS cancha_lng,
  u.nombre       AS organizador_nombre,
  (
    SELECT json_agg(json_build_object(
      'usuario_id',     pj.usuario_id,
      'nombre',         usr.nombre,
      'inicial',        upper(left(usr.nombre, 1)),
      'es_organizador', pj.es_organizador,
      'estado_pago',    pj.estado_pago
    ) ORDER BY pj.unido_en)
    FROM public.partido_jugadores pj
    JOIN public.usuarios usr ON usr.id = pj.usuario_id
    WHERE pj.partido_id = p.id
  ) AS jugadores
FROM public.partidos p
JOIN public.canchas  c ON c.id = p.cancha_id
JOIN public.usuarios u ON u.id = p.organizador_id;
