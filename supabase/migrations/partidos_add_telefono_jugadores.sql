-- Agrega telefono al JSON de jugadores en la vista partidos_con_detalles
-- El telefono se filtra en la API para mostrarse solo a miembros del partido

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
      'estado_pago',    pj.estado_pago,
      'telefono',       usr.telefono
    ) ORDER BY pj.unido_en)
    FROM public.partido_jugadores pj
    JOIN public.usuarios usr ON usr.id = pj.usuario_id
    WHERE pj.partido_id = p.id
  ) AS jugadores
FROM public.partidos p
JOIN public.canchas  c ON c.id = p.cancha_id
JOIN public.usuarios u ON u.id = p.organizador_id;
