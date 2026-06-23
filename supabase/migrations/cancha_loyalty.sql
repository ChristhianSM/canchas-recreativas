-- ── Sistema de fidelización por cancha ─────────────────────────────────
-- Cada cancha puede tener su propio programa de sellos con umbral y premio
-- configurables. Los sellos son independientes por usuario y por cancha.

-- ── Config del programa de sellos por cancha ──────────────────────────
CREATE TABLE IF NOT EXISTS public.cancha_loyalty_config (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cancha_id           uuid REFERENCES public.canchas(id) ON DELETE CASCADE UNIQUE NOT NULL,
  activo              boolean DEFAULT false,
  umbral              int DEFAULT 8 CHECK (umbral >= 1 AND umbral <= 50),
  premio_tipo         text DEFAULT 'descuento_fijo'
                        CHECK (premio_tipo IN ('descuento_fijo', 'descuento_porcentaje', 'hora_gratis', 'personalizado')),
  premio_valor        int DEFAULT 5,
  premio_descripcion  text DEFAULT '',
  creado_en           timestamptz DEFAULT now(),
  actualizado_en      timestamptz DEFAULT now()
);

-- ── Sellos por usuario por cancha ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cancha_sellos (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      uuid REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  cancha_id       uuid REFERENCES public.canchas(id) ON DELETE CASCADE NOT NULL,
  sellos          int DEFAULT 0 CHECK (sellos >= 0),
  total_reservas  int DEFAULT 0 CHECK (total_reservas >= 0),
  UNIQUE(usuario_id, cancha_id)
);

-- ── Cupones ganados por usuario por cancha ────────────────────────────
CREATE TABLE IF NOT EXISTS public.cancha_cupones (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id          uuid REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  cancha_id           uuid REFERENCES public.canchas(id) ON DELETE CASCADE NOT NULL,
  cancha_nombre       text NOT NULL DEFAULT '',
  premio_tipo         text NOT NULL,
  premio_valor        int,
  premio_descripcion  text DEFAULT '',
  usado               boolean DEFAULT false,
  generado_en         timestamptz DEFAULT now(),
  usado_en            timestamptz
);

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.cancha_loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancha_sellos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancha_cupones        ENABLE ROW LEVEL SECURITY;

-- Config: cualquiera puede leer (para mostrar el programa al reservar)
CREATE POLICY "cancha_loyalty_config_public_read" ON public.cancha_loyalty_config
  FOR SELECT USING (true);

-- Config: solo service_role puede escribir (gestionado desde el backend)
CREATE POLICY "cancha_loyalty_config_service_write" ON public.cancha_loyalty_config
  FOR ALL USING (true);

-- Sellos: el usuario solo ve los suyos
CREATE POLICY "cancha_sellos_own_read" ON public.cancha_sellos
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "cancha_sellos_service_write" ON public.cancha_sellos
  FOR ALL USING (true);

-- Cupones: el usuario solo ve los suyos
CREATE POLICY "cancha_cupones_own_read" ON public.cancha_cupones
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "cancha_cupones_service_write" ON public.cancha_cupones
  FOR ALL USING (true);

-- ── Índices ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cancha_sellos_usuario   ON public.cancha_sellos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cancha_sellos_cancha    ON public.cancha_sellos(cancha_id);
CREATE INDEX IF NOT EXISTS idx_cancha_cupones_usuario  ON public.cancha_cupones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cancha_cupones_cancha   ON public.cancha_cupones(cancha_id);

-- ── Función: agregar sello por cancha ─────────────────────────────────
-- Se llama al confirmar una reserva. Verifica si la cancha tiene programa
-- activo, suma el sello y genera un cupón automáticamente si se alcanza
-- el umbral configurado por el administrador.
CREATE OR REPLACE FUNCTION agregar_sellos_cancha(
  p_usuario_id  UUID,
  p_cancha_id   UUID,
  p_cantidad    INT DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_config             RECORD;
  v_sellos_actuales    INT;
  v_total              INT;
  v_cupones_nuevos     INT;
  v_sellos_restantes   INT;
  v_cancha_nombre      TEXT;
  i                    INT;
BEGIN
  SELECT * INTO v_config
  FROM cancha_loyalty_config
  WHERE cancha_id = p_cancha_id AND activo = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT nombre INTO v_cancha_nombre
  FROM canchas
  WHERE id = p_cancha_id;

  INSERT INTO cancha_sellos (usuario_id, cancha_id, sellos, total_reservas)
  VALUES (p_usuario_id, p_cancha_id, 0, 0)
  ON CONFLICT (usuario_id, cancha_id) DO NOTHING;

  SELECT sellos INTO v_sellos_actuales
  FROM cancha_sellos
  WHERE usuario_id = p_usuario_id AND cancha_id = p_cancha_id;

  v_total            := v_sellos_actuales + p_cantidad;
  v_cupones_nuevos   := FLOOR(v_total / v_config.umbral);
  v_sellos_restantes := v_total % v_config.umbral;

  UPDATE cancha_sellos SET
    sellos         = v_sellos_restantes,
    total_reservas = total_reservas + 1
  WHERE usuario_id = p_usuario_id AND cancha_id = p_cancha_id;

  FOR i IN 1..v_cupones_nuevos LOOP
    INSERT INTO cancha_cupones (
      usuario_id, cancha_id, cancha_nombre,
      premio_tipo, premio_valor, premio_descripcion
    )
    VALUES (
      p_usuario_id,
      p_cancha_id,
      v_cancha_nombre,
      v_config.premio_tipo,
      v_config.premio_valor,
      v_config.premio_descripcion
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
