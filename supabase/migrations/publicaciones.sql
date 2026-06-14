-- ============================================================
-- Publicaciones de canchas
-- Cubre noticias, torneos, escuelas, eventos, promociones, etc.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla principal de publicaciones
CREATE TABLE IF NOT EXISTS public.publicaciones (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  autor_id       uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tipo           text NOT NULL CHECK (
    tipo IN ('torneo', 'escuela', 'evento', 'promocion', 'noticia', 'mantenimiento', 'novedad')
  ),
  estado         text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado')),
  titulo         text NOT NULL,
  slug           text NOT NULL UNIQUE,
  resumen        text NOT NULL,
  contenido      text NOT NULL,
  imagen_url     text,
  deporte        text CHECK (deporte IS NULL OR deporte IN ('futbol', 'voley', 'basquet', 'tenis', 'futsal')),
  fecha_inicio   date,
  fecha_fin      date,
  hora           text,
  precio         text,
  tags           text[] DEFAULT '{}',
  creado_en      timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now(),
  publicado_en   timestamptz,

  CONSTRAINT publicaciones_fecha_fin_check CHECK (
    fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio
  )
);

-- Relacion publicacion - canchas
CREATE TABLE IF NOT EXISTS public.publicacion_canchas (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  publicacion_id uuid NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  cancha_id      uuid NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  creado_en      timestamptz DEFAULT now(),

  UNIQUE (publicacion_id, cancha_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_publicaciones_slug
  ON public.publicaciones(slug);

CREATE INDEX IF NOT EXISTS idx_publicaciones_estado
  ON public.publicaciones(estado);

CREATE INDEX IF NOT EXISTS idx_publicaciones_tipo
  ON public.publicaciones(tipo);

CREATE INDEX IF NOT EXISTS idx_publicaciones_publicado_en
  ON public.publicaciones(publicado_en DESC);

CREATE INDEX IF NOT EXISTS idx_publicacion_canchas_publicacion
  ON public.publicacion_canchas(publicacion_id);

CREATE INDEX IF NOT EXISTS idx_publicacion_canchas_cancha
  ON public.publicacion_canchas(cancha_id);

-- RLS
ALTER TABLE public.publicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacion_canchas ENABLE ROW LEVEL SECURITY;

-- Lectura publica: solo publicaciones publicadas.
DROP POLICY IF EXISTS "publicaciones_public_read" ON public.publicaciones;
CREATE POLICY "publicaciones_public_read" ON public.publicaciones
  FOR SELECT
  USING (estado = 'publicado');

-- Lectura publica de relaciones solo si la publicacion esta publicada.
DROP POLICY IF EXISTS "publicacion_canchas_public_read" ON public.publicacion_canchas;
CREATE POLICY "publicacion_canchas_public_read" ON public.publicacion_canchas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.publicaciones p
      WHERE p.id = publicacion_id
        AND p.estado = 'publicado'
    )
  );

-- Las escrituras se realizan desde endpoints con service role.
DROP POLICY IF EXISTS "publicaciones_service_role_all" ON public.publicaciones;
CREATE POLICY "publicaciones_service_role_all" ON public.publicaciones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "publicacion_canchas_service_role_all" ON public.publicacion_canchas;
CREATE POLICY "publicacion_canchas_service_role_all" ON public.publicacion_canchas
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
