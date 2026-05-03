-- Tabla de bloqueos administrativos por el dueño de cancha
-- Soporta 3 modos:
--   'permanente'         → hora bloqueada todos los días (reemplaza horarios_bloqueados)
--   'fecha_especifica'   → bloqueado solo en una fecha puntual
--   'recurrente_semanal' → bloqueado cada semana en un día específico (con rango opcional)

CREATE TABLE IF NOT EXISTS public.bloqueos_admin (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id    uuid NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  tipo         text NOT NULL CHECK (tipo IN ('permanente', 'fecha_especifica', 'recurrente_semanal')),

  -- Para tipo = 'fecha_especifica'
  fecha        date,

  -- Para tipo = 'recurrente_semanal'
  -- 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  dia_semana   int CHECK (dia_semana BETWEEN 0 AND 6),
  fecha_desde  date,   -- desde cuándo aplica (null = siempre)
  fecha_hasta  date,   -- hasta cuándo aplica (null = indefinido)

  hora_inicio  time NOT NULL,
  hora_fin     time,   -- si null, bloquea solo el slot de hora_inicio

  motivo       text,
  creado_en    timestamptz DEFAULT now(),
  creado_por   uuid REFERENCES auth.users(id)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_bloqueos_admin_cancha ON public.bloqueos_admin(cancha_id);
CREATE INDEX IF NOT EXISTS idx_bloqueos_admin_tipo   ON public.bloqueos_admin(tipo);
CREATE INDEX IF NOT EXISTS idx_bloqueos_admin_fecha  ON public.bloqueos_admin(fecha);

-- RLS
ALTER TABLE public.bloqueos_admin ENABLE ROW LEVEL SECURITY;

-- El service role puede hacer todo (para los endpoints de API)
CREATE POLICY "service_role_all" ON public.bloqueos_admin
  FOR ALL USING (true);
