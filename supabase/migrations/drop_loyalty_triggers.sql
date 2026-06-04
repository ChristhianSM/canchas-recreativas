-- Eliminar todos los triggers de loyalty.
-- La lógica de sellos pasa a ser manejada explícitamente en el código TypeScript.
DROP TRIGGER IF EXISTS trg_sello_reserva ON reservas;
DROP TRIGGER IF EXISTS trg_sello_partido ON partidos;
DROP TRIGGER IF EXISTS trg_sello_resena ON resenas;
