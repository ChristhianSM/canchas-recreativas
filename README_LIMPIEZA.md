# 🧹 Limpieza de Base de Datos - CanchaPiura

## 📦 Archivos Incluidos

```
├── VERIFICAR_ESTADO_BD.sql          ← Ejecuta PRIMERO
├── CLEANUP_DATABASE_SAFE.sql        ← Ejecuta SEGUNDO (Recomendado)
├── CLEANUP_DATABASE.sql             ← Alternativa (más simple)
├── INSTRUCCIONES_LIMPIEZA.md        ← Instrucciones detalladas
├── RESUMEN_LIMPIEZA.md              ← Resumen ejecutivo
└── README_LIMPIEZA.md               ← Este archivo
```

## 🚀 Inicio Rápido

### Paso 1: Verificar Estado Actual (IMPORTANTE)

```sql
-- Copiar contenido de: VERIFICAR_ESTADO_BD.sql
-- Ir a: Supabase → SQL Editor
-- Pegar y ejecutar
-- Revisar los resultados
```

### Paso 2: Ejecutar Limpieza

```sql
-- Copiar contenido de: CLEANUP_DATABASE_SAFE.sql
-- Ir a: Supabase → SQL Editor
-- Pegar y ejecutar
-- Esperar a que termine
```

### Paso 3: Verificar Resultados

```sql
-- Ejecutar estas queries para verificar:

-- Ver usuarios finales
SELECT nombre, email, rol FROM usuarios;

-- Ver canchas finales
SELECT nombre, tipo, distrito FROM canchas;

-- Ver asignaciones
SELECT u.nombre, c.nombre 
FROM duenos_canchas dc
JOIN usuarios u ON dc.usuario_id = u.id
JOIN canchas c ON dc.cancha_id = c.id;
```

## 📋 Checklist Pre-Limpieza

Antes de ejecutar el script, verifica:

- [ ] Hiciste un backup de la BD
- [ ] Los 3 usuarios existen en Supabase Auth:
  - [ ] admin@canchago.com
  - [ ] dueno@canchago.com
  - [ ] usuario@canchago.com
- [ ] Las 3 canchas existen en la BD:
  - [ ] Complejo Deportivo Los Algarrobos
  - [ ] Arena Sport Center
  - [ ] Club Vóley Piura
- [ ] Estás en el ambiente CORRECTO (no producción)
- [ ] Ejecutaste VERIFICAR_ESTADO_BD.sql primero

## 👥 Usuarios Después de la Limpieza

| Email | Nombre | Rol | Acceso |
|-------|--------|-----|--------|
| admin@canchago.com | Administrador | superadmin | ✅ Todas las canchas |
| dueno@canchago.com | Dueño de Cancha | dueno | ✅ 2 canchas asignadas |
| usuario@canchago.com | Usuario Normal | usuario | ✅ Solo reservas |

## 🏟️ Canchas Después de la Limpieza

| Nombre | Tipo | Distrito | Asignado a |
|--------|------|----------|-----------|
| Complejo Deportivo Los Algarrobos | Fútbol | Piura | Dueño |
| Arena Sport Center | Fútbol | Castilla | Dueño |
| Club Vóley Piura | Vóley | Piura | Admin |

## 🔄 Flujo de Ejecución

```
1. VERIFICAR_ESTADO_BD.sql
   ↓
   Revisar resultados
   ↓
2. CLEANUP_DATABASE_SAFE.sql
   ↓
   Esperar a que termine
   ↓
3. Ejecutar queries de verificación
   ↓
   ✅ Listo para testing
```

## ⚠️ Diferencias Entre Scripts

### CLEANUP_DATABASE_SAFE.sql (Recomendado)
- ✅ Verifica que los usuarios existan
- ✅ Muestra mensajes de progreso
- ✅ Más seguro
- ✅ Mejor para debugging

### CLEANUP_DATABASE.sql (Alternativa)
- ✅ Más simple
- ✅ Más rápido
- ❌ Menos verificaciones
- ❌ Menos mensajes

## 🔍 Qué Se Elimina

### Datos Eliminados Completamente
- ❌ Todas las reservas
- ❌ Todos los bloqueos temporales
- ❌ Todos los favoritos
- ❌ Todas las reseñas
- ❌ Todas las notificaciones
- ❌ Todos los cupones
- ❌ Todos los loyalty points
- ❌ Todas las devoluciones
- ❌ Todos los horarios bloqueados
- ❌ Todos los usuarios excepto 3
- ❌ Todas las canchas excepto 3

### Datos Que Se Mantienen
- ✅ 3 usuarios de prueba
- ✅ 3 canchas de prueba
- ✅ Asignaciones de canchas al dueño

## 🛠️ Troubleshooting

### Error: "usuarios with email X not found"
**Solución**: Crea el usuario en Supabase Auth primero

### Error: "canchas with nombre X not found"
**Solución**: Verifica que el nombre de la cancha sea exacto

### Error: "Foreign key constraint"
**Solución**: Ejecuta el script SAFE en lugar del básico

### El script no termina
**Solución**: Espera más tiempo o revisa los logs de Supabase

## 📊 Estadísticas Esperadas Después

```
Usuarios: 3
Canchas: 3
Reservas: 0
Favoritos: 0
Reseñas: 0
Notificaciones: 0
Cupones: 0
Loyalty: 0
Devoluciones: 0
Bloqueos: 0
Horarios bloqueados: 0
Asignaciones de canchas: 2
```

## ✅ Verificación Post-Limpieza

Después de ejecutar el script, verifica:

1. **Usuarios**
   ```sql
   SELECT COUNT(*) FROM usuarios; -- Debe ser 3
   ```

2. **Canchas**
   ```sql
   SELECT COUNT(*) FROM canchas; -- Debe ser 3
   ```

3. **Reservas**
   ```sql
   SELECT COUNT(*) FROM reservas; -- Debe ser 0
   ```

4. **Asignaciones**
   ```sql
   SELECT COUNT(*) FROM duenos_canchas; -- Debe ser 2
   ```

## 🎯 Próximos Pasos

Después de limpiar:

1. ✅ Prueba login con los 3 usuarios
2. ✅ Verifica los roles en el panel de admin
3. ✅ Prueba las asignaciones de canchas al dueño
4. ✅ Crea reservas de prueba
5. ✅ Identifica y reporta fallos

## 📞 Soporte

Si tienes problemas:

1. Revisa INSTRUCCIONES_LIMPIEZA.md
2. Ejecuta VERIFICAR_ESTADO_BD.sql para diagnosticar
3. Revisa los logs de Supabase
4. Verifica que los usuarios existan en Auth

## 🔐 Seguridad

- ⚠️ Este script es **destructivo**
- ⚠️ Haz un **backup** antes de ejecutar
- ⚠️ Verifica que estés en el ambiente **correcto**
- ⚠️ No ejecutes en producción sin backup

## 📝 Notas

- Los IDs de los usuarios se mantienen igual
- Las canchas se pueden editar después
- El administrador tiene acceso a todas las canchas
- El dueño solo tiene acceso a canchas asignadas
- El usuario normal solo puede hacer reservas

## 🎉 ¡Listo!

Una vez completado, tu base de datos estará limpia y lista para testing con los 3 usuarios y 3 canchas de prueba.

---

**Última actualización**: 2024-04-26
**Versión**: 1.0
