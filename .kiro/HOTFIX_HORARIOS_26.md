# Hotfix: Reservas del 26 no aparecen como ocupadas

## Problema Identificado
Las reservas del día 26 no aparecían como ocupadas en el detalle de la cancha, permitiendo que otros usuarios reservaran el mismo horario.

**Causa Raíz:** Desfase de zona horaria (UTC vs Hora Local)
- El código usaba `new Date().toISOString().split('T')[0]` que convierte a UTC
- En Perú (UTC-5), esto causaba un desfase de 5 horas
- Ejemplo: Una reserva del 26 a las 10 PM (hora local) se guardaba como "2024-12-26", pero al consultar horarios ocupados, el servidor calculaba la fecha como "2024-12-27" (UTC)
- Resultado: Las reservas no aparecían como ocupadas

## Solución Implementada

### 1. Crear función utilitaria para fechas locales
**Archivo:** `lib/date-utils.ts` (NUEVO)
```typescript
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

### 2. Actualizar Backend (APIs)
Reemplazar `new Date().toISOString().split('T')[0]` con `getLocalDateString()`:

- **`app/api/canchas/detail/route.ts`** - Consulta de reservas para detalle de cancha
- **`app/api/canchas/list/route.ts`** - Consulta de reservas para listado de canchas
- **`app/api/canchas/[id]/route.ts`** - Consulta de reservas por ID
- **`app/api/bloqueos/check/route.ts`** - Verificación de disponibilidad

### 3. Actualizar Frontend
- **`app/cancha/[id]/page.tsx`** - Usar `getLocalDateString()` para fecha inicial
- **`lib/data.ts`** - Usar `getLocalDateString()` en generación de horarios
- **`lib/types.ts`** - Usar `getLocalDateString()` en filtros por defecto
- **`lib/filter-utils.ts`** - Usar `getLocalDateString()` en validaciones de horas

## Impacto
✅ Las reservas del 26 (y cualquier día) ahora aparecen correctamente como ocupadas
✅ Los horarios se muestran correctamente en cualquier zona horaria
✅ Los bloqueos temporales funcionan con fechas correctas
✅ Las comparaciones de fechas son consistentes entre cliente y servidor

## Verificación
Después de este cambio:
1. Un usuario hace una reserva para el 26 a las 10 PM
2. Otro usuario abre el detalle de la cancha
3. El horario de las 10 PM del 26 aparece como "Ocupado"
4. No se permite hacer una nueva reserva en ese horario

## Archivos Modificados
- `lib/date-utils.ts` (NUEVO)
- `lib/types.ts`
- `lib/filter-utils.ts`
- `lib/data.ts`
- `app/cancha/[id]/page.tsx`
- `app/api/canchas/detail/route.ts`
- `app/api/canchas/list/route.ts`
- `app/api/canchas/[id]/route.ts`
- `app/api/bloqueos/check/route.ts`

## Notas Técnicas
- La función `getLocalDateString()` usa la zona horaria del navegador/servidor
- No requiere cambios en la base de datos
- Compatible con todas las zonas horarias
- Las fechas se guardan en BD como strings YYYY-MM-DD (sin cambios)
