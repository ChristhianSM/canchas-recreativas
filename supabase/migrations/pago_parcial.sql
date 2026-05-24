-- Nuevos campos para soporte de pago parcial en reservas
-- modo_pago:        'completo' (100% online) o 'parcial' (20% adelanto + 80% en cancha)
-- monto_adelanto:   monto pagado online (100% o 20% del precio)
-- saldo_pendiente:  monto a pagar presencialmente en cancha (0% o 80%)
-- saldo_cobrado:    indica si el admin-cancha ya cobró el saldo presencial
-- saldo_cobrado_en: timestamp del momento en que se registró el cobro presencial

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS modo_pago        text        NOT NULL DEFAULT 'completo'
    CHECK (modo_pago IN ('completo', 'parcial')),
  ADD COLUMN IF NOT EXISTS monto_adelanto   integer,
  ADD COLUMN IF NOT EXISTS saldo_pendiente  integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_cobrado    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saldo_cobrado_en timestamptz;

-- Retrocompatibilidad: reservas existentes quedan como pago completo
-- monto_adelanto = precio para todas las reservas que no tengan valor en ese campo
UPDATE public.reservas
  SET monto_adelanto = precio
  WHERE monto_adelanto IS NULL;

-- Hacer monto_adelanto NOT NULL después de rellenar los valores existentes
ALTER TABLE public.reservas
  ALTER COLUMN monto_adelanto SET NOT NULL;

-- Índice para filtrar por modo de pago en los paneles admin
CREATE INDEX IF NOT EXISTS idx_reservas_modo_pago
  ON public.reservas(modo_pago);

-- Índice parcial para saldo pendiente de cobro (panel admin-cancha)
-- Solo indexa reservas parciales, que son las que requieren seguimiento de cobro
CREATE INDEX IF NOT EXISTS idx_reservas_saldo_cobrado
  ON public.reservas(saldo_cobrado)
  WHERE modo_pago = 'parcial';
