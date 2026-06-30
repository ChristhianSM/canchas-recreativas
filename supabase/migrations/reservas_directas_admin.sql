-- Reservas directas creadas por el admin (clientes fijos / recurrentes)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS es_reserva_directa boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reservas.es_reserva_directa IS
  'true cuando la reserva fue creada manualmente por el admin para un cliente fijo (sin flujo de pago online)';
