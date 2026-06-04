-- Agregar estado 'pendiente' a la tabla partidos
-- Los partidos ahora nacen en pendiente y pasan a abierto al ser confirmados por el admin

ALTER TABLE public.partidos DROP CONSTRAINT IF EXISTS partidos_estado_check;
ALTER TABLE public.partidos ADD CONSTRAINT partidos_estado_check
  CHECK (estado IN ('pendiente', 'abierto', 'completo', 'cancelado', 'finalizado'));

ALTER TABLE public.partidos ALTER COLUMN estado SET DEFAULT 'pendiente';
