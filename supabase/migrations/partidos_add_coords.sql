-- Agrega cancha_lat y cancha_lng a la vista partidos_con_detalles
-- Ejecutar en Supabase SQL Editor
-- DROP es seguro: la vista no contiene datos propios

drop view if exists public.partidos_con_detalles;

create view public.partidos_con_detalles as
select
  p.*,
  c.nombre          as cancha_nombre,
  c.distrito        as cancha_distrito,
  c.imagenes[1]     as cancha_imagen,
  c.lat             as cancha_lat,
  c.lng             as cancha_lng,
  u.nombre          as organizador_nombre,
  (
    select json_agg(json_build_object(
      'usuario_id',    pj.usuario_id,
      'nombre',        usr.nombre,
      'inicial',       upper(left(usr.nombre, 1)),
      'es_organizador', pj.es_organizador,
      'estado_pago',   pj.estado_pago
    ) order by pj.unido_en)
    from public.partido_jugadores pj
    join public.usuarios usr on usr.id = pj.usuario_id
    where pj.partido_id = p.id
  ) as jugadores
from public.partidos p
join public.canchas  c on c.id = p.cancha_id
join public.usuarios u on u.id = p.organizador_id;
