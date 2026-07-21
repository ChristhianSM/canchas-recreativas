-- Soporte para reasignar una reserva ya creada entre "cancha completa" y sus secciones
-- (ej. el usuario reservó por error la cancha de 11 en vez de una sección de 7).
--
-- precio_previo_reasignacion: precio que tenía la reserva antes de la última reasignación
-- diferencia_reasignacion:    positivo = a favor del usuario (se le entrega al llegar a jugar),
--                              negativo = el usuario debe pagar más en cancha
-- diferencia_reasignacion_saldada: si la diferencia ya fue entregada/cobrada en persona
-- reasignado_en:               timestamp de la última reasignación

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS precio_previo_reasignacion integer,
  ADD COLUMN IF NOT EXISTS diferencia_reasignacion integer,
  ADD COLUMN IF NOT EXISTS diferencia_reasignacion_saldada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS diferencia_reasignacion_saldada_en timestamptz,
  ADD COLUMN IF NOT EXISTS reasignado_en timestamptz;

-- Permite notificar al usuario cuando su reserva es movida de cancha completa a una sección (o viceversa)
ALTER TABLE public.notificaciones
  DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;

ALTER TABLE public.notificaciones
  ADD CONSTRAINT notificaciones_tipo_check
  CHECK (tipo IN ('confirmada', 'rechazada', 'cancelada', 'favorito', 'nueva_reserva', 'reasignada'));

-- ============================================================================
-- ROLLBACK — para deshacer esta migración, descomenta el bloque de abajo y
-- ejecútalo en el editor SQL de Supabase. No se ejecuta solo: son comentarios.
-- ============================================================================
-- DELETE FROM public.notificaciones WHERE tipo = 'reasignada';
--
-- ALTER TABLE public.notificaciones
--   DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
--
-- ALTER TABLE public.notificaciones
--   ADD CONSTRAINT notificaciones_tipo_check
--   CHECK (tipo IN ('confirmada', 'rechazada', 'cancelada', 'favorito', 'nueva_reserva'));
--
-- ALTER TABLE public.reservas
--   DROP COLUMN IF EXISTS precio_previo_reasignacion,
--   DROP COLUMN IF EXISTS diferencia_reasignacion,
--   DROP COLUMN IF EXISTS diferencia_reasignacion_saldada,
--   DROP COLUMN IF EXISTS diferencia_reasignacion_saldada_en,
--   DROP COLUMN IF EXISTS reasignado_en;
