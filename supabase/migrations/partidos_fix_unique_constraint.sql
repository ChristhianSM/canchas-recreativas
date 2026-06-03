-- Reemplazar el unique constraint por un índice parcial
-- El constraint anterior bloqueaba el horario incluso cuando el partido estaba cancelado/finalizado

ALTER TABLE public.partidos DROP CONSTRAINT IF EXISTS partidos_cancha_fecha_hora_uq;

CREATE UNIQUE INDEX partidos_cancha_fecha_hora_uq
  ON public.partidos (cancha_id, fecha, hora)
  WHERE estado NOT IN ('cancelado', 'finalizado');
