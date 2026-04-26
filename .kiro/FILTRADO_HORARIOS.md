# Explicación del Filtrado de Horarios

## Problema Identificado
Cuando un usuario seleccionaba horarios específicos en el filtro avanzado, las canchas seguían apareciendo aunque:
1. Los horarios ya hubieran pasado (ej: seleccionar 09:00 cuando son las 10:33)
2. Los horarios estuvieran ocupados por reservas existentes

## Causa Raíz
1. El endpoint `/api/canchas/list` no estaba trayendo información de horarios ocupados
2. No se validaba si los horarios seleccionados ya habían pasado
3. El `schedule` estaba vacío (`{}`), por lo que la función `hasAvailabilityAtHour()` siempre retornaba `true`

## Solución Implementada

### 1. Actualización del Endpoint `/api/canchas/list`
**Antes:** Solo retornaba datos básicos de canchas
**Ahora:** Retorna también:
- `horariosOcupados`: Mapa de `fecha|hora` → estado (`reservado` o `en_proceso`)
- `horariosRestringidos`: Array de horas bloqueadas por el dueño

**Datos que obtiene:**
- Reservas confirmadas y pendientes para los próximos 14 días
- Bloqueos temporales activos (no expirados)
- Horarios bloqueados permanentemente por el dueño

### 2. Construcción del Schedule en Frontend
**Archivo:** `app/canchas/page.tsx`

La función `adaptCancha()` ahora:
1. Genera 14 días de horarios (06:00 a 23:00)
2. Para cada hora, verifica:
   - ¿Está en `horariosOcupados`? → `available: false`, `status: 'reservado'` o `'en_proceso'`
   - ¿Está en `horariosRestringidos`? → `available: false`, `status: 'en_proceso'`
   - Si no → `available: true`, `status: 'disponible'`

### 3. Validación de Horarios Pasados
**Archivo:** `lib/filter-utils.ts`

Nueva función `hasHourPassed()`:
```typescript
export function hasHourPassed(hour: string, date?: string): boolean {
  // Si la fecha es anterior a hoy, la hora ya pasó
  if (date < today) return true;
  
  // Si es hoy, comparar con la hora actual
  if (date === today) {
    const currentTime = `${currentHour}:${currentMinute}`;
    return hour <= currentTime; // Si la hora es menor o igual, ya pasó
  }
  
  return false; // Si la fecha es futura, no ha pasado
}
```

### 4. Lógica de Filtrado Actualizada
**Archivo:** `lib/filter-utils.ts`

Función `hasAvailabilityAtHour()` actualizada:
```typescript
export function hasAvailabilityAtHour(cancha: Cancha, hour: string, date?: string): boolean {
  // 1. Verificar si la hora ya pasó
  if (hasHourPassed(hour, date)) {
    return false; // No se puede reservar horarios pasados
  }

  // 2. Verificar disponibilidad en el schedule (reservas/bloqueos)
  const slot = daySchedule.find(s => s.time === hour);
  return slot ? slot.available : true;
}
```

## Flujo Completo de Validación

**Ejemplo: Domingo 26 de abril, 10:33 AM**

Usuario selecciona horarios: `[09:00, 10:00, 11:00, 12:00]`

### Para cada cancha, cada horario se valida:

| Horario | ¿Ya pasó? | ¿Disponible? | Resultado Final |
|---------|-----------|--------------|-----------------|
| 09:00   | ✅ Sí (10:33 > 09:00) | N/A | ❌ No válido |
| 10:00   | ✅ Sí (10:33 > 10:00) | N/A | ❌ No válido |
| 11:00   | ❌ No | ✅ Sí | ✅ Válido |
| 12:00   | ❌ No | ❌ No (reservado) | ❌ No válido |

**Resultado:** ✅ La cancha SÍ aparece (porque 11:00 es válido)

### Si el usuario selecciona solo horarios pasados u ocupados:

| Horario | ¿Ya pasó? | ¿Disponible? | Resultado Final |
|---------|-----------|--------------|-----------------|
| 09:00   | ✅ Sí | N/A | ❌ No válido |
| 10:00   | ✅ Sí | N/A | ❌ No válido |
| 12:00   | ❌ No | ❌ No (reservado) | ❌ No válido |

**Resultado:** ❌ La cancha NO aparece (ningún horario es válido)

## Casos de Uso

### ✅ Casos que SÍ muestran la cancha:
- Seleccionar horarios futuros y disponibles
- Mezclar horarios pasados con horarios futuros disponibles
- Seleccionar horarios de mañana (fecha futura)

### ❌ Casos que NO muestran la cancha:
- Seleccionar solo horarios que ya pasaron
- Seleccionar solo horarios ocupados/reservados
- Seleccionar horarios fuera del horario de funcionamiento

## Cambios Realizados

✅ `/api/canchas/list` ahora retorna horarios ocupados y bloqueados
✅ `app/canchas/page.tsx` construye el schedule correctamente con datos reales
✅ `lib/filter-utils.ts` valida horarios pasados con `hasHourPassed()`
✅ `lib/filter-utils.ts` verifica disponibilidad real con reservas y bloqueos
✅ El filtrado ahora es preciso y respeta horarios reales + tiempo actual
✅ Proyecto compila sin errores y lógica validada con tests