-- Evita el double-booking a nivel de base de datos: dos reservas activas
-- (pendiente o confirmada) no pueden coexistir para la misma cancha+fecha+hora
-- (y misma seccion, si aplica). El check en app/api/reservas/route.ts ya
-- rechaza esto en el caso normal, pero no es atomico frente a peticiones
-- concurrentes; este indice es el respaldo a nivel de BD.

CREATE UNIQUE INDEX IF NOT EXISTS reservas_unique_seccion_activa
  ON public.reservas (cancha_id, fecha, hora, seccion_id)
  WHERE seccion_id IS NOT NULL AND estado IN ('pendiente', 'confirmada');

CREATE UNIQUE INDEX IF NOT EXISTS reservas_unique_completa_activa
  ON public.reservas (cancha_id, fecha, hora)
  WHERE seccion_id IS NULL AND estado IN ('pendiente', 'confirmada');
