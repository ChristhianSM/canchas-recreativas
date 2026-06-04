-- ==========================================================
-- Migración: Lógica de sellos de loyalty movida a la DB
-- Reemplaza el código TypeScript en las rutas de Next.js
-- ==========================================================

-- Función principal: agrega sellos, genera cupones si corresponde
CREATE OR REPLACE FUNCTION agregar_sellos(
  p_usuario_id  UUID,
  p_cantidad    INT,
  p_es_reserva  BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
DECLARE
  v_sellos_actuales INT;
  v_total           INT;
  v_cupones_nuevos  INT;
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

  IF v_cupones_nuevos > 0 THEN
    INSERT INTO cupones (usuario_id, descuento)
    SELECT p_usuario_id, 5
    FROM generate_series(1, v_cupones_nuevos);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------
-- Trigger 1: Reserva confirmada → 1 sello
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sello_reserva()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'confirmada' AND (OLD.estado IS NULL OR OLD.estado <> 'confirmada') THEN
    PERFORM agregar_sellos(NEW.usuario_id, 1, TRUE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sello_reserva ON reservas;
CREATE TRIGGER trg_sello_reserva
  AFTER UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION fn_sello_reserva();


-- ----------------------------------------------------------
-- Trigger 2: Partido creado → 2 sellos al organizador
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sello_partido()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM agregar_sellos(NEW.organizador_id, 2, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sello_partido ON partidos;
CREATE TRIGGER trg_sello_partido
  AFTER INSERT ON partidos
  FOR EACH ROW EXECUTE FUNCTION fn_sello_partido();


-- ----------------------------------------------------------
-- Trigger 3: Reseña creada → 1 sello
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sello_resena()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM agregar_sellos(NEW.usuario_id, 1, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sello_resena ON resenas;
CREATE TRIGGER trg_sello_resena
  AFTER INSERT ON resenas
  FOR EACH ROW EXECUTE FUNCTION fn_sello_resena();
