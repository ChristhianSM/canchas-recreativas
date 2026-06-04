-- ==========================================================
-- Migración: Tabla loyalty_historial + agregar_sellos() actualizado
-- Ejecutar DESPUÉS de loyalty_triggers.sql
-- ==========================================================

-- Tabla de historial de sellos
CREATE TABLE IF NOT EXISTS public.loyalty_historial (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cantidad   INT NOT NULL,
  motivo     TEXT NOT NULL CHECK (motivo IN ('reserva', 'partido', 'resena')),
  creado_en  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loyalty_historial_usuario
  ON loyalty_historial (usuario_id, creado_en DESC);

ALTER TABLE loyalty_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ven_su_historial"
  ON loyalty_historial FOR SELECT
  USING (usuario_id = auth.uid());


-- ==========================================================
-- Actualizar agregar_sellos() para registrar en el historial
-- ==========================================================
CREATE OR REPLACE FUNCTION agregar_sellos(
  p_usuario_id  UUID,
  p_cantidad    INT,
  p_es_reserva  BOOLEAN DEFAULT FALSE,
  p_motivo      TEXT    DEFAULT 'reserva'
)
RETURNS VOID AS $$
DECLARE
  v_sellos_actuales  INT;
  v_total            INT;
  v_cupones_nuevos   INT;
  v_sellos_restantes INT;
BEGIN
  -- Crear fila de loyalty si no existe
  INSERT INTO loyalty (usuario_id, sellos, total_reservas)
  VALUES (p_usuario_id, 0, 0)
  ON CONFLICT (usuario_id) DO NOTHING;

  SELECT sellos INTO v_sellos_actuales
  FROM loyalty
  WHERE usuario_id = p_usuario_id;

  v_total            := v_sellos_actuales + p_cantidad;
  v_cupones_nuevos   := FLOOR(v_total / 6);
  v_sellos_restantes := v_total % 6;

  UPDATE loyalty SET
    sellos         = v_sellos_restantes,
    total_reservas = CASE WHEN p_es_reserva THEN total_reservas + 1 ELSE total_reservas END
  WHERE usuario_id = p_usuario_id;

  -- Registrar en historial
  INSERT INTO loyalty_historial (usuario_id, cantidad, motivo)
  VALUES (p_usuario_id, p_cantidad, p_motivo);

  IF v_cupones_nuevos > 0 THEN
    INSERT INTO cupones (usuario_id, descuento)
    SELECT p_usuario_id, 5
    FROM generate_series(1, v_cupones_nuevos);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================================
-- Actualizar los triggers para pasar el motivo correcto
-- ==========================================================
CREATE OR REPLACE FUNCTION fn_sello_reserva()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'confirmada' AND (OLD.estado IS NULL OR OLD.estado <> 'confirmada') THEN
    PERFORM agregar_sellos(NEW.usuario_id, 1, TRUE, 'reserva');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_sello_partido()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM agregar_sellos(NEW.organizador_id, 2, FALSE, 'partido');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_sello_resena()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM agregar_sellos(NEW.usuario_id, 1, FALSE, 'resena');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
