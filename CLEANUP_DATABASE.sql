-- ============================================================================
-- SCRIPT DE LIMPIEZA DE BASE DE DATOS - CanchaPiura
-- ============================================================================
-- Este script limpia la base de datos y deja solo:
-- - 3 usuarios de prueba (admin, dueño, usuario normal)
-- - Algunas canchas de prueba
-- - Asignaciones de canchas al dueño
-- ============================================================================

-- 1. LIMPIAR RESERVAS
DELETE FROM reservas;

-- 2. LIMPIAR BLOQUEOS TEMPORALES
DELETE FROM bloqueos_temporales;

-- 3. LIMPIAR FAVORITOS
DELETE FROM favoritos;

-- 4. LIMPIAR RESEÑAS
DELETE FROM resenas;

-- 5. LIMPIAR NOTIFICACIONES
DELETE FROM notificaciones;

-- 6. LIMPIAR CUPONES
DELETE FROM cupones;

-- 7. LIMPIAR LOYALTY
DELETE FROM loyalty;

-- 8. LIMPIAR DEVOLUCIONES
DELETE FROM devoluciones;

-- 9. LIMPIAR ASIGNACIONES DE CANCHAS AL DUEÑO
DELETE FROM duenos_canchas;

-- 10. LIMPIAR HORARIOS BLOQUEADOS
DELETE FROM horarios_bloqueados;

-- 11. LIMPIAR USUARIOS (excepto los 3 de prueba)
-- Primero, obtener los IDs de los usuarios de prueba desde auth.users
-- Luego eliminar todos los demás
DELETE FROM usuarios 
WHERE email NOT IN ('admin@canchago.com', 'dueno@canchago.com', 'usuario@canchago.com');

-- 12. ACTUALIZAR LOS 3 USUARIOS DE PRUEBA CON DATOS CORRECTOS
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

-- 13. LIMPIAR CANCHAS (mantener solo 3 de prueba)
-- Primero, obtener los IDs de las canchas que queremos mantener
-- Luego eliminar todas las demás
DELETE FROM canchas 
WHERE nombre NOT IN (
  'Complejo Deportivo Los Algarrobos',
  'Arena Sport Center',
  'Club Vóley Piura'
);

-- 14. ASIGNAR CANCHAS AL DUEÑO
-- Obtener el ID del dueño y asignarle las canchas
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

-- 15. VERIFICAR DATOS FINALES
-- Usuarios
SELECT 'USUARIOS FINALES:' as info;
SELECT id, nombre, email, rol, telefono FROM usuarios ORDER BY creado_en;

-- Canchas
SELECT 'CANCHAS FINALES:' as info;
SELECT id, nombre, tipo, distrito, activa FROM canchas ORDER BY nombre;

-- Asignaciones de canchas al dueño
SELECT 'ASIGNACIONES DE CANCHAS AL DUEÑO:' as info;
SELECT 
  u.nombre as dueño,
  c.nombre as cancha,
  c.tipo
FROM duenos_canchas dc
JOIN usuarios u ON dc.usuario_id = u.id
JOIN canchas c ON dc.cancha_id = c.id
ORDER BY c.nombre;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. El administrador (superadmin) tiene acceso a TODAS las canchas
-- 2. El dueño (dueno) solo tiene acceso a las canchas asignadas
-- 3. El usuario normal (usuario) solo puede hacer reservas
-- 4. Todas las reservas, bloqueos y datos temporales han sido eliminados
-- 5. Los IDs de los usuarios se mantienen igual (de auth.users)
-- ============================================================================
