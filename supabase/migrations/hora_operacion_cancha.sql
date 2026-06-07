-- Horario de operación por cancha
-- hora_apertura: primera hora disponible para reservas (ej. '08:00')
-- hora_cierre:   última hora disponible para reservas (ej. '22:00')
ALTER TABLE canchas
  ADD COLUMN IF NOT EXISTS hora_apertura TEXT NOT NULL DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS hora_cierre   TEXT NOT NULL DEFAULT '23:00';
