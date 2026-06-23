-- Accesorios genéricos de la cancha (reemplaza columnas hardcodeadas balon/chalecos)
-- Formato: [{"id":"uuid","nombre":"Balón","icono":"⚽","modalidad":"alquilado","precio":10}]
ALTER TABLE public.canchas
  ADD COLUMN IF NOT EXISTS accesorios jsonb DEFAULT '[]'::jsonb;

-- Accesorios seleccionados por el usuario al hacer la reserva
-- Formato: [{"id":"uuid","nombre":"Balón","icono":"⚽","precio":10}]
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS accesorios_incluidos jsonb DEFAULT '[]'::jsonb;
