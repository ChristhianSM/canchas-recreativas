# Instrucciones de Limpieza de Base de Datos - CanchaPiura

## Requisitos Previos

1. **Crear los 3 usuarios en Supabase Auth** (si no existen):
   - `admin@canchago.com` (contraseña: la que prefieras)
   - `dueno@canchago.com` (contraseña: la que prefieras)
   - `usuario@canchago.com` (contraseña: la que prefieras)

2. **Obtener los IDs de los usuarios** desde Supabase:
   - Ve a Supabase Dashboard → Authentication → Users
   - Copia los IDs de los 3 usuarios

## Pasos para Ejecutar la Limpieza

### Opción 1: Usar Supabase SQL Editor (Recomendado)

1. Ve a tu proyecto en Supabase
2. Abre **SQL Editor** en el panel izquierdo
3. Crea una nueva query
4. Copia el contenido de `CLEANUP_DATABASE.sql`
5. **IMPORTANTE**: Antes de ejecutar, reemplaza los emails en el script si son diferentes
6. Haz clic en **Run** (o presiona Ctrl+Enter)
7. Verifica los resultados en las consultas SELECT al final

### Opción 2: Usar psql (Línea de Comandos)

```bash
# Conectar a tu base de datos Supabase
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Ejecutar el script
\i CLEANUP_DATABASE.sql
```

## Qué Hace el Script

### 1. Limpia Datos Temporales
- ✅ Elimina todas las reservas
- ✅ Elimina bloqueos temporales
- ✅ Elimina favoritos
- ✅ Elimina reseñas
- ✅ Elimina notificaciones
- ✅ Elimina cupones
- ✅ Elimina loyalty points
- ✅ Elimina devoluciones

### 2. Limpia Usuarios
- ✅ Elimina todos los usuarios excepto los 3 de prueba
- ✅ Actualiza los datos de los 3 usuarios de prueba

### 3. Limpia Canchas
- ✅ Mantiene solo 3 canchas de prueba:
  - Complejo Deportivo Los Algarrobos (Fútbol)
  - Arena Sport Center (Fútbol)
  - Club Vóley Piura (Vóley)

### 4. Asigna Canchas al Dueño
- ✅ Asigna 2 canchas al dueño:
  - Complejo Deportivo Los Algarrobos
  - Arena Sport Center
- ✅ El administrador tiene acceso a todas las canchas

## Usuarios Finales

| Email | Nombre | Rol | Teléfono |
|-------|--------|-----|----------|
| admin@canchago.com | Administrador | superadmin | 999999999 |
| dueno@canchago.com | Dueño de Cancha | dueno | 988888888 |
| usuario@canchago.com | Usuario Normal | usuario | 977777777 |

## Canchas Finales

| Nombre | Tipo | Distrito | Asignado a |
|--------|------|----------|-----------|
| Complejo Deportivo Los Algarrobos | Fútbol | Piura | Dueño |
| Arena Sport Center | Fútbol | Castilla | Dueño |
| Club Vóley Piura | Vóley | Piura | - |

## Verificación

Después de ejecutar el script, verifica:

1. **Usuarios**: Deberías ver 3 usuarios
2. **Canchas**: Deberías ver 3 canchas
3. **Asignaciones**: El dueño debe tener 2 canchas asignadas

## Notas Importantes

⚠️ **ADVERTENCIA**: Este script es destructivo y elimina datos. Asegúrate de:
- Hacer un backup de tu base de datos antes
- Ejecutar en el ambiente correcto (no en producción sin backup)
- Verificar que los emails sean correctos

## Rollback (Si Algo Sale Mal)

Si necesitas revertir los cambios:
1. Restaura desde un backup de Supabase
2. O contacta al soporte de Supabase

## Próximos Pasos

Después de limpiar la base de datos:

1. **Prueba el login** con los 3 usuarios
2. **Verifica los roles** en el panel de admin
3. **Prueba las asignaciones** de canchas al dueño
4. **Crea reservas de prueba** para testing

## Troubleshooting

### Error: "usuarios with email X not found"
- Asegúrate de que los usuarios existen en Supabase Auth
- Verifica que los emails sean exactos

### Error: "canchas with nombre X not found"
- Verifica que los nombres de las canchas sean exactos
- Usa el SQL Editor para ver qué canchas existen

### Error: "Foreign key constraint"
- Asegúrate de ejecutar las eliminaciones en el orden correcto
- El script ya está ordenado correctamente

## Contacto

Si tienes problemas, revisa:
1. Los logs de Supabase
2. La consola del navegador (DevTools)
3. Los endpoints de la API
