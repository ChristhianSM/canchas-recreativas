-- Agregar campos simples para manejar cancelaciones
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS cancelado_en timestamptz;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS devolucion_calculada numeric(10,2);
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS penalidad_aplicada numeric(10,2);
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS porcentaje_devolucion integer;