-- Permite al dueño de una cancha exigir que el cliente suba comprobante
-- de pago (Yape/Plin) para poder completar la reserva. Antes, el cliente
-- podía saltarse el comprobante siempre ("Enviar sin comprobante" en /pago).
-- Default false: ninguna cancha existente cambia de comportamiento.

ALTER TABLE public.canchas
  ADD COLUMN IF NOT EXISTS comprobante_obligatorio boolean NOT NULL DEFAULT false;
