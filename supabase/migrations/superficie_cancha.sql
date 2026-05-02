-- Tipo de superficie de la cancha
-- grass          = grass natural
-- grass_sintetico = grass sintético (el más común)
-- loza           = concreto/cemento
-- cemento        = variante de loza al aire libre

ALTER TABLE public.canchas
  ADD COLUMN IF NOT EXISTS superficie text
  CHECK (superficie IN ('grass', 'grass_sintetico', 'loza', 'cemento'))
  DEFAULT 'grass_sintetico';
