-- ============================================================================
-- SCRIPT DE LIMPIEZA SEGURO - CanchaPiura
-- ============================================================================
-- Versión segura que verifica existencia antes de hacer cambios
-- ============================================================================

-- Verificar que los usuarios de prueba existen
DO $$
DECLARE
  admin_id UUID;
  dueno_id UUID;
  usuario_id UUID;
BEGIN
  -- Obtener IDs de los usuarios
  SELECT id INTO admin_id FROM usuarios WHERE email = 'admin@canchago.com';
  SELECT id INTO dueno_id FROM usuarios WHERE email = 'dueno@canchago.com';
  SELECT id INTO usuario_id FROM usuarios WHERE email = 'usuario@canchago.com';

  -- Verificar que existen
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Usuario admin@canchago.com no encontrado en la BD';
  END IF;
  IF dueno_id IS NULL THEN
    RAISE EXCEPTION 'Usuario dueno@canchago.com no encontrado en la BD';
  END IF;
  IF usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuario usuario@canchago.com no encontrado en la BD';
  END IF;

  RAISE NOTICE 'Usuarios encontrados:';
  RAISE NOTICE 'Admin: %', admin_id;
  RAISE NOTICE 'Dueño: %', dueno_id;
  RAISE NOTICE 'Usuario: %', usuario_id;
END $$;

-- ============================================================================
-- PASO 1: LIMPIAR DATOS RELACIONADOS
-- ============================================================================

RAISE NOTICE 'Limpiando datos relacionados...';

-- Limpiar reservas
DELETE FROM reservas;
RAISE NOTICE 'Reservas eliminadas';

-- Limpiar bloqueos temporales
DELETE FROM bloqueos_temporales;
RAISE NOTICE 'Bloqueos temporales eliminados';

-- Limpiar favoritos
DELETE FROM favoritos;
RAISE NOTICE 'Favoritos eliminados';

-- Limpiar reseñas
DELETE FROM resenas;
RAISE NOTICE 'Reseñas eliminadas';

-- Limpiar notificaciones
DELETE FROM notificaciones;
RAISE NOTICE 'Notificaciones eliminadas';

-- Limpiar cupones
DELETE FROM cupones;
RAISE NOTICE 'Cupones eliminados';

-- Limpiar loyalty
DELETE FROM loyalty;
RAISE NOTICE 'Loyalty eliminado';

-- Limpiar devoluciones
DELETE FROM devoluciones;
RAISE NOTICE 'Devoluciones eliminadas';

-- Limpiar horarios bloqueados
DELETE FROM horarios_bloqueados;
RAISE NOTICE 'Horarios bloqueados eliminados';

-- ============================================================================
-- PASO 2: LIMPIAR USUARIOS (excepto los 3 de prueba)
-- ============================================================================

RAISE NOTICE 'Limpiando usuarios...';

DELETE FROM usuarios 
WHERE email NOT IN ('admin@canchago.com', 'dueno@canchago.com', 'usuario@canchago.com');

RAISE NOTICE 'Usuarios no esenciales eliminados';

-- ============================================================================
-- PASO 3: ACTUALIZAR LOS 3 USUARIOS DE PRUEBA
-- ============================================================================

RAISE NOTICE 'Actualizando usuarios de prueba...';

UPDATE usuarios 
SET 
  nombre = 'Administrador',
  rol = 'superadmin',
  telefono = '999999999',
  creado_en = NOW()
WHERE email = 'admin@canchago.com';

UPDATE usuarios 
SET 
  nombre = 'Dueño de Cancha',
  rol = 'dueno',
  telefono = '988888888',
  creado_en = NOW()
WHERE email = 'dueno@canchago.com';

UPDATE usuarios 
SET 
  nombre = 'Usuario Normal',
  rol = 'usuario',
  telefono = '977777777',
  creado_en = NOW()
WHERE email = 'usuario@canchago.com';

RAISE NOTICE 'Usuarios de prueba actualizados';

-- ============================================================================
-- PASO 4: LIMPIAR ASIGNACIONES DE CANCHAS
-- ============================================================================

RAISE NOTICE 'Limpiando asignaciones de canchas...';

DELETE FROM duenos_canchas;

RAISE NOTICE 'Asignaciones de canchas eliminadas';

-- ============================================================================
-- PASO 5: LIMPIAR CANCHAS (mantener solo 3)
-- ============================================================================

RAISE NOTICE 'Limpiando canchas...';

DELETE FROM canchas 
WHERE nombre NOT IN (
  'Complejo Deportivo Los Algarrobos',
  'Arena Sport Center',
  'Club Vóley Piura'
);

RAISE NOTICE 'Canchas no esenciales eliminadas';

-- ============================================================================
-- PASO 6: ASIGNAR CANCHAS AL DUEÑO
-- ============================================================================

RAISE NOTICE 'Asignando canchas al dueño...';

INSERT INTO duenos_canchas (usuario_id, cancha_id)
SELECT 
  u.id,
  c.id
FROM usuarios u, canchas c
WHERE u.email = 'dueno@canchago.com'
  AND c.nombre IN (
    'Complejo Deportivo Los Algarrobos',
    'Arena Sport Center'
  )
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Canchas asignadas al dueño';

-- ============================================================================
-- PASO 7: VERIFICACIÓN FINAL
-- ============================================================================

RAISE NOTICE '========================================';
RAISE NOTICE 'LIMPIEZA COMPLETADA EXITOSAMENTE';
RAISE NOTICE '========================================';

-- Mostrar usuarios finales
RAISE NOTICE 'USUARIOS FINALES:';
SELECT 
  nombre,
  email,
  rol,
  telefono
FROM usuarios
ORDER BY creado_en;

-- Mostrar canchas finales
RAISE NOTICE 'CANCHAS FINALES:';
SELECT 
  nombre,
  tipo,
  distrito,
  activa
FROM canchas
ORDER BY nombre;

-- Mostrar asignaciones
RAISE NOTICE 'ASIGNACIONES DE CANCHAS:';
SELECT 
  u.nombre as dueño,
  c.nombre as cancha,
  c.tipo
FROM duenos_canchas dc
JOIN usuarios u ON dc.usuario_id = u.id
JOIN canchas c ON dc.cancha_id = c.id
ORDER BY c.nombre;

RAISE NOTICE '========================================';
RAISE NOTICE 'Limpieza completada. Verifica los datos arriba.';
RAISE NOTICE '========================================';
