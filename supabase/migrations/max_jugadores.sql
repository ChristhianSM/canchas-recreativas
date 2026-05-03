-- Máximo de jugadores por cancha
-- Valores permitidos: 8, 10, 12, 14, 16, 20, 22
-- null = el dueño no lo ha configurado

ALTER TABLE public.canchas
  ADD COLUMN IF NOT EXISTS max_jugadores int DEFAULT NULL
  CHECK (max_jugadores IN (8, 10, 12, 14, 16, 20, 22));
