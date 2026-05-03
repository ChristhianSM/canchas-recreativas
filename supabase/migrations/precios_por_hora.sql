-- Agrega soporte de precios por hora a la tabla canchas
-- Ejemplo de valor:
-- { "06:00": 80, "07:00": 80, "18:00": 100, "19:00": 100, "20:00": 100 }
-- Si una hora no aparece en el mapa, se usa precio_por_hora como fallback.

ALTER TABLE public.canchas
  ADD COLUMN IF NOT EXISTS precios_por_hora jsonb DEFAULT '{}'::jsonb;
