# Resumen: Limpieza de Base de Datos CanchaPiura

## 📋 Archivos Creados

1. **CLEANUP_DATABASE.sql** - Script básico de limpieza
2. **CLEANUP_DATABASE_SAFE.sql** - Script seguro con verificaciones
3. **INSTRUCCIONES_LIMPIEZA.md** - Instrucciones detalladas

## 🎯 Objetivo

Limpiar la base de datos y dejar solo:
- ✅ 3 usuarios de prueba
- ✅ 3 canchas de prueba
- ✅ Asignaciones de canchas al dueño

## 👥 Usuarios Finales

```
Email: admin@canchago.com
Nombre: Administrador
Rol: superadmin (acceso a todas las canchas)
Teléfono: 999999999

Email: dueno@canchago.com
Nombre: Dueño de Cancha
Rol: dueno (acceso solo a canchas asignadas)
Teléfono: 988888888

Email: usuario@canchago.com
Nombre: Usuario Normal
Rol: usuario (solo puede hacer reservas)
Teléfono: 977777777
```

## 🏟️ Canchas Finales

```
1. Complejo Deportivo Los Algarrobos
   - Tipo: Fútbol
   - Distrito: Piura
   - Asignado a: Dueño

2. Arena Sport Center
   - Tipo: Fútbol
   - Distrito: Castilla
   - Asignado a: Dueño

3. Club Vóley Piura
   - Tipo: Vóley
   - Distrito: Piura
   - Asignado a: Nadie (solo admin)
```

## 🔧 Qué Se Elimina

- ❌ Todas las reservas
- ❌ Todos los bloqueos temporales
- ❌ Todos los favoritos
- ❌ Todas las reseñas
- ❌ Todas las notificaciones
- ❌ Todos los cupones
- ❌ Todos los loyalty points
- ❌ Todas las devoluciones
- ❌ Todos los horarios bloqueados
- ❌ Todos los usuarios excepto los 3 de prueba
- ❌ Todas las canchas excepto las 3 de prueba

## 📝 Cómo Usar

### Opción 1: Script Seguro (Recomendado)

```sql
-- Copiar contenido de CLEANUP_DATABASE_SAFE.sql
-- Ir a Supabase → SQL Editor
-- Pegar y ejecutar
```

### Opción 2: Script Básico

```sql
-- Copiar contenido de CLEANUP_DATABASE.sql
-- Ir a Supabase → SQL Editor
-- Pegar y ejecutar
```

## ⚠️ Requisitos Previos

1. Los 3 usuarios deben existir en Supabase Auth:
   - admin@canchago.com
   - dueno@canchago.com
   - usuario@canchago.com

2. Las 3 canchas deben existir en la BD:
   - Complejo Deportivo Los Algarrobos
   - Arena Sport Center
   - Club Vóley Piura

## ✅ Verificación Después

Después de ejecutar el script, verifica:

```sql
-- Ver usuarios
SELECT nombre, email, rol FROM usuarios;

-- Ver canchas
SELECT nombre, tipo, distrito FROM canchas;

-- Ver asignaciones
SELECT u.nombre, c.nombre 
FROM duenos_canchas dc
JOIN usuarios u ON dc.usuario_id = u.id
JOIN canchas c ON dc.cancha_id = c.id;
```

## 🔐 Permisos y Acceso

### Administrador (superadmin)
- ✅ Acceso a TODAS las canchas
- ✅ Ver todas las reservas
- ✅ Gestionar usuarios
- ✅ Ver reportes

### Dueño (dueno)
- ✅ Acceso solo a canchas asignadas (2)
- ✅ Ver reservas de sus canchas
- ✅ Gestionar horarios de sus canchas
- ❌ No puede ver otras canchas

### Usuario Normal (usuario)
- ✅ Ver todas las canchas
- ✅ Hacer reservas
- ✅ Ver sus reservas
- ❌ No puede gestionar canchas

## 🚀 Próximos Pasos

1. Ejecuta el script SQL
2. Verifica que los datos sean correctos
3. Prueba login con los 3 usuarios
4. Crea reservas de prueba
5. Prueba los paneles de admin y dueño
6. Identifica y reporta fallos

## 📞 Soporte

Si tienes problemas:
1. Revisa INSTRUCCIONES_LIMPIEZA.md
2. Verifica que los usuarios existan en Auth
3. Verifica que las canchas existan en la BD
4. Usa el script SAFE en lugar del básico

## 📌 Notas Importantes

- El script es **destructivo** - elimina datos
- Haz un **backup** antes de ejecutar
- Verifica que estés en el ambiente **correcto**
- Los IDs de los usuarios se mantienen igual
- Las canchas se pueden editar después
