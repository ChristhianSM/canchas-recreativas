-- ============================================================================
-- SCRIPT DE VERIFICACIÓN - Estado Actual de la Base de Datos
-- ============================================================================
-- Ejecuta este script ANTES de limpiar para ver el estado actual
-- ============================================================================

RAISE NOTICE '========================================';
RAISE NOTICE 'VERIFICACIÓN DE ESTADO DE LA BD';
RAISE NOTICE '========================================';

-- ============================================================================
-- 1. CONTAR USUARIOS
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '1. USUARIOS ACTUALES:';
RAISE NOTICE '---';

SELECT 
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN rol = 'superadmin' THEN 1 END) as admins,
  COUNT(CASE WHEN rol = 'dueno' THEN 1 END) as duenos,
  COUNT(CASE WHEN rol = 'usuario' THEN 1 END) as usuarios_normales
FROM usuarios;

-- Listar todos los usuarios
SELECT 
  nombre,
  email,
  rol,
  telefono,
  creado_en
FROM usuarios
ORDER BY creado_en DESC;

-- ============================================================================
-- 2. CONTAR CANCHAS
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '2. CANCHAS ACTUALES:';
RAISE NOTICE '---';

SELECT 
  COUNT(*) as total_canchas,
  COUNT(CASE WHEN tipo = 'futbol' THEN 1 END) as futbol,
  COUNT(CASE WHEN tipo = 'voley' THEN 1 END) as voley,
  COUNT(CASE WHEN tipo = 'basquet' THEN 1 END) as basquet,
  COUNT(CASE WHEN tipo = 'tenis' THEN 1 END) as tenis,
  COUNT(CASE WHEN tipo = 'futsal' THEN 1 END) as futsal
FROM canchas;

-- Listar todas las canchas
SELECT 
  nombre,
  tipo,
  distrito,
  activa,
  precio_por_hora
FROM canchas
ORDER BY nombre;

-- ============================================================================
-- 3. CONTAR RESERVAS
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '3. RESERVAS ACTUALES:';
RAISE NOTICE '---';

SELECT 
  COUNT(*) as total_reservas,
  COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
  COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as confirmadas,
  COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as canceladas,
  COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas
FROM reservas;

-- ============================================================================
-- 4. CONTAR OTROS DATOS
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '4. OTROS DATOS:';
RAISE NOTICE '---';

SELECT 
  (SELECT COUNT(*) FROM favoritos) as favoritos,
  (SELECT COUNT(*) FROM resenas) as resenas,
  (SELECT COUNT(*) FROM notificaciones) as notificaciones,
  (SELECT COUNT(*) FROM cupones) as cupones,
  (SELECT COUNT(*) FROM loyalty) as loyalty,
  (SELECT COUNT(*) FROM devoluciones) as devoluciones,
  (SELECT COUNT(*) FROM bloqueos_temporales) as bloqueos_temporales,
  (SELECT COUNT(*) FROM horarios_bloqueados) as horarios_bloqueados,
  (SELECT COUNT(*) FROM duenos_canchas) as asignaciones_canchas;

-- ============================================================================
-- 5. VERIFICAR USUARIOS DE PRUEBA
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '5. USUARIOS DE PRUEBA:';
RAISE NOTICE '---';

SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM usuarios WHERE email = 'admin@canchago.com') THEN '✓ Admin existe'
    ELSE '✗ Admin NO existe'
  END as admin_status,
  CASE 
    WHEN EXISTS(SELECT 1 FROM usuarios WHERE email = 'dueno@canchago.com') THEN '✓ Dueño existe'
    ELSE '✗ Dueño NO existe'
  END as dueno_status,
  CASE 
    WHEN EXISTS(SELECT 1 FROM usuarios WHERE email = 'usuario@canchago.com') THEN '✓ Usuario existe'
    ELSE '✗ Usuario NO existe'
  END as usuario_status;

-- ============================================================================
-- 6. VERIFICAR CANCHAS DE PRUEBA
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '6. CANCHAS DE PRUEBA:';
RAISE NOTICE '---';

SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM canchas WHERE nombre = 'Complejo Deportivo Los Algarrobos') THEN '✓ Cancha 1 existe'
    ELSE '✗ Cancha 1 NO existe'
  END as cancha1_status,
  CASE 
    WHEN EXISTS(SELECT 1 FROM canchas WHERE nombre = 'Arena Sport Center') THEN '✓ Cancha 2 existe'
    ELSE '✗ Cancha 2 NO existe'
  END as cancha2_status,
  CASE 
    WHEN EXISTS(SELECT 1 FROM canchas WHERE nombre = 'Club Vóley Piura') THEN '✓ Cancha 3 existe'
    ELSE '✗ Cancha 3 NO existe'
  END as cancha3_status;

-- ============================================================================
-- 7. RESUMEN FINAL
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'RESUMEN:';
RAISE NOTICE '========================================';

RAISE NOTICE 'Total de usuarios: %', (SELECT COUNT(*) FROM usuarios);
RAISE NOTICE 'Total de canchas: %', (SELECT COUNT(*) FROM canchas);
RAISE NOTICE 'Total de reservas: %', (SELECT COUNT(*) FROM reservas);
RAISE NOTICE 'Total de datos a limpiar: %', 
  (SELECT COUNT(*) FROM favoritos) +
  (SELECT COUNT(*) FROM resenas) +
  (SELECT COUNT(*) FROM notificaciones) +
  (SELECT COUNT(*) FROM cupones) +
  (SELECT COUNT(*) FROM loyalty) +
  (SELECT COUNT(*) FROM devoluciones) +
  (SELECT COUNT(*) FROM bloqueos_temporales) +
  (SELECT COUNT(*) FROM horarios_bloqueados);

RAISE NOTICE '';
RAISE NOTICE 'Si todo está correcto, ejecuta CLEANUP_DATABASE_SAFE.sql';
RAISE NOTICE '========================================';
