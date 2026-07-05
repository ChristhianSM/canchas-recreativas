-- ============================================================
-- Secciones de cancha (canchas divisibles en partes independientes)
-- Permite que una cancha grande se alquile completa o por secciones
-- Ejemplo: cancha grande → Sección A, B, C (7v7 cada una) + cancha completa (11v11)
-- ============================================================

-- Tabla de secciones
CREATE TABLE IF NOT EXISTS public.cancha_secciones (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cancha_id        uuid REFERENCES public.canchas(id) ON DELETE CASCADE NOT NULL,
  nombre           text NOT NULL,          -- "A", "B", "C", "Mitad", etc.
  descripcion      text,
  max_jugadores    int,
  precio_por_hora  int NOT NULL,
  precios_por_hora jsonb DEFAULT '{}'::jsonb,
  orden            int DEFAULT 0,          -- para ordenar en la UI
  activa           boolean DEFAULT true,
  creado_en        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cancha_secciones_cancha ON public.cancha_secciones(cancha_id);

-- RLS
ALTER TABLE public.cancha_secciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secciones_public_read" ON public.cancha_secciones
  FOR SELECT USING (true);

CREATE POLICY "secciones_service_all" ON public.cancha_secciones
  FOR ALL USING (true)
  WITH CHECK (true);

-- Permisos de tabla (necesario cuando se crea por SQL, no por el UI de Supabase)
GRANT SELECT ON public.cancha_secciones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cancha_secciones TO authenticated;
GRANT ALL ON public.cancha_secciones TO service_role;

-- Agregar seccion_id a reservas (null = cancha completa, uuid = sección específica)
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS seccion_id uuid REFERENCES public.cancha_secciones(id) ON DELETE SET NULL;

-- Agregar seccion_id a bloqueos_temporales
ALTER TABLE public.bloqueos_temporales
  ADD COLUMN IF NOT EXISTS seccion_id uuid REFERENCES public.cancha_secciones(id) ON DELETE SET NULL;
