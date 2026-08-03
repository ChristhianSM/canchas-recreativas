-- ── Bloqueos por sección ───────────────────────────────────────────────
-- Permite que un bloqueo admin aplique solo a una sección de la cancha
-- (ej. "Sección A ocupada por una academia de lunes a viernes 5-7pm")
-- en vez de bloquear siempre toda la cancha.
-- seccion_id = null → el bloqueo sigue aplicando a toda la cancha (comportamiento actual).

ALTER TABLE public.bloqueos_admin
  ADD COLUMN IF NOT EXISTS seccion_id uuid REFERENCES public.cancha_secciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bloqueos_admin_seccion ON public.bloqueos_admin(seccion_id);
