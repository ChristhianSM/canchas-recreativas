-- Precios de extras en la cancha
-- disponible = true/false: si ofrece el servicio
-- precio = null: gratis, número: precio en soles
ALTER TABLE public.canchas
  ADD COLUMN IF NOT EXISTS balon_disponible    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS balon_precio        int     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS chalecos_disponible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS chalecos_precio     int     DEFAULT NULL;

-- Extras seleccionados en la reserva
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS balon_incluido    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS chalecos_incluido boolean DEFAULT false;
