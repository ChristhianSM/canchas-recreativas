-- Corrige el CHECK constraint de metodo_pago en reservas.
-- El constraint original solo permitía ('yape','Plim') — faltaba 'efectivo'
-- y había un typo ('Plim' en lugar de 'plin').

ALTER TABLE public.reservas
  DROP CONSTRAINT IF EXISTS reservas_metodo_pago_check;

ALTER TABLE public.reservas
  ADD CONSTRAINT reservas_metodo_pago_check
  CHECK (metodo_pago IN ('yape', 'plin', 'efectivo'));
