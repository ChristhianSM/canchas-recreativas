-- Agrega 'nueva_reserva' al check constraint de notificaciones.tipo
-- Usado para notificar al dueño cuando llega una reserva nueva.

ALTER TABLE public.notificaciones
  DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;

ALTER TABLE public.notificaciones
  ADD CONSTRAINT notificaciones_tipo_check
  CHECK (tipo IN ('confirmada', 'rechazada', 'cancelada', 'favorito', 'nueva_reserva'));
