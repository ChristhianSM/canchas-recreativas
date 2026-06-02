-- Fix: cambiar umbral de cupón de 6 a 8 sellos
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
  INSERT INTO loyalty (usuario_id, sellos, total_reservas)
  VALUES (p_usuario_id, 0, 0)
  ON CONFLICT (usuario_id) DO NOTHING;

  SELECT sellos INTO v_sellos_actuales
  FROM loyalty
  WHERE usuario_id = p_usuario_id;

  v_total            := v_sellos_actuales + p_cantidad;
  v_cupones_nuevos   := FLOOR(v_total / 8);
  v_sellos_restantes := v_total % 8;

  UPDATE loyalty SET
    sellos         = v_sellos_restantes,
    total_reservas = CASE WHEN p_es_reserva THEN total_reservas + 1 ELSE total_reservas END
  WHERE usuario_id = p_usuario_id;

  INSERT INTO loyalty_historial (usuario_id, cantidad, motivo)
  VALUES (p_usuario_id, p_cantidad, p_motivo);

  IF v_cupones_nuevos > 0 THEN
    INSERT INTO cupones (usuario_id, descuento)
    SELECT p_usuario_id, 5
    FROM generate_series(1, v_cupones_nuevos);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
