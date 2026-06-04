-- Fix: deduplicar loyalty y agregar constraint único en usuario_id
-- Paso 1: eliminar filas duplicadas, conservar la que tiene más sellos
DELETE FROM loyalty
WHERE id NOT IN (
  SELECT DISTINCT ON (usuario_id) id
  FROM loyalty
  ORDER BY usuario_id, sellos DESC, total_reservas DESC
);

-- Paso 2: agregar constraint único para evitar duplicados futuros
ALTER TABLE loyalty
  ADD CONSTRAINT loyalty_usuario_id_unique UNIQUE (usuario_id);
