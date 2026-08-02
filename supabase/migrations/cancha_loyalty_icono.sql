-- ── Ícono del sello de fidelización por cancha ────────────────────────
-- Cada cancha puede elegir un emoji representativo (su "mascota") que se
-- muestra en cada sello ganado dentro de su tarjeta de fidelización.

ALTER TABLE public.cancha_loyalty_config
  ADD COLUMN IF NOT EXISTS icono text DEFAULT '⭐';
