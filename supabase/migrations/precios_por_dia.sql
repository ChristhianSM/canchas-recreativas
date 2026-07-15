-- ============================================================
-- Precio por día de la semana (combinable con precio por hora)
-- ============================================================
-- Agrega una capa más de precio: promociones por día de la semana
-- (ej. lunes más barato), donde cada día puede tener su propia
-- grilla de precios por hora independiente.
--
-- Ejemplo de valor:
-- {
--   "lunes":  { "base": 60,  "precios_por_hora": { "20:00": 70 } },
--   "martes": { "base": 100, "precios_por_hora": { "20:00": 120 } }
-- }
--
-- Si un día no aparece en el mapa, se usa precios_por_hora / precio_por_hora
-- como respaldo (retrocompatible, no afecta canchas existentes).
-- Claves de día válidas: lunes, martes, miercoles, jueves, viernes, sabado, domingo.

ALTER TABLE public.canchas
  ADD COLUMN IF NOT EXISTS precios_por_dia jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.cancha_secciones
  ADD COLUMN IF NOT EXISTS precios_por_dia jsonb DEFAULT '{}'::jsonb;
