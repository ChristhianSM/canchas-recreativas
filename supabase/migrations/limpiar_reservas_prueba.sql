-- ============================================================
-- SCRIPT PARA LIMPIAR RESERVAS DE PRUEBA
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Ver todas las reservas actuales (para revisar antes de borrar)
SELECT 
  id,
  cancha_nombre,
  usuario_nombre,
  usuario_email,
  fecha,
  hora,
  precio,
  estado,
  creado_en
FROM public.reservas
ORDER BY creado_en DESC;

-- ============================================================
-- OPCIÓN A: Borrar TODAS las reservas (tabla limpia)
-- ⚠️ Descomenta solo si quieres borrar TODO
-- ============================================================
-- DELETE FROM public.reservas;

-- ============================================================
-- OPCIÓN B: Borrar solo reservas de prueba (canchas hardcodeadas)
-- Los IDs hardcodeados en lib/data.ts empiezan con 'a1b2c3d4'
-- ============================================================
DELETE FROM public.reservas
WHERE cancha_id IN (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'a1b2c3d4-0002-0002-0002-000000000002',
  'a1b2c3d4-0003-0003-0003-000000000003',
  'a1b2c3d4-0004-0004-0004-000000000004',
  'a1b2c3d4-0005-0005-0005-000000000005',
  'a1b2c3d4-0006-0006-0006-000000000006',
  'a1b2c3d4-0007-0007-0007-000000000007',
  'a1b2c3d4-0008-0008-0008-000000000008'
);

-- ============================================================
-- OPCIÓN C: Borrar solo reservas canceladas
-- ============================================================
-- DELETE FROM public.reservas WHERE estado = 'cancelada';

-- ============================================================
-- OPCIÓN D: Borrar reservas de un usuario específico
-- ============================================================
-- DELETE FROM public.reservas WHERE usuario_email = 'tu@email.com';

-- Verificar resultado
SELECT COUNT(*) as total_reservas FROM public.reservas;
