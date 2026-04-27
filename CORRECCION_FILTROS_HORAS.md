# Corrección: Filtros de Horas en Filtros Avanzados

## Problema Identificado

Cuando seleccionabas una hora específica en los filtros avanzados (ej: 22:00 del día 26), la cancha con una reserva a esa hora seguía apareciendo en los resultados, cuando debería haber sido excluida.

## Causa Raíz

Había dos problemas en `lib/filter-utils.ts`:

### Problema 1: Comparación de Horas Incorrecta
En la función `hasHourPassed()`, se usaba:
```typescript
return hour <= currentTime;  // ❌ Incorrecto
```

Esto causaba que si eran las 22:00 y seleccionabas las 22:00, la comparación `"22:00" <= "22:00"` retornaba `true`, marcando la hora como "ya pasada" cuando en realidad aún estaba disponible.

### Problema 2: Lógica de Filtro Incorrecta
En la función `filterCanchas()`, se verificaba:
```typescript
// Verificar si al menos UNA hora está disponible
const hasAvailableHour = filters.availableHours.some(hour =>
  hasAvailabilityAtHour(cancha, hour, targetDate)
);
```

Esto significaba que si seleccionabas una hora, la cancha se mostraba si tenía "al menos una hora disponible", no si tenía "esa hora específica disponible".

## Solución Implementada

### Cambio 1: Comparación de Horas Correcta
```typescript
// Si la hora seleccionada es ESTRICTAMENTE menor a la hora actual, ya pasó
// Usamos < en lugar de <= para permitir la hora actual si aún no ha pasado completamente
return hour < currentTime;  // ✅ Correcto
```

Ahora usa `<` en lugar de `<=`, permitiendo que la hora actual sea seleccionable.

### Cambio 2: Lógica de Filtro Correcta
```typescript
// Verificar si TODAS las horas seleccionadas están disponibles
// Si alguna hora no está disponible, excluir la cancha
const allHoursAvailable = filters.availableHours.every(hour =>
  hasAvailabilityAtHour(cancha, hour, targetDate)
);
if (!allHoursAvailable) return false;
```

Ahora verifica que TODAS las horas seleccionadas estén disponibles. Si alguna no está disponible, la cancha es excluida.

## Comportamiento Esperado Ahora

### Escenario: Hoy es 26 de abril, son las 22:00
- **Seleccionas**: Día 26, Hora 22:00
- **Resultado**: Solo aparecen canchas que tienen la hora 22:00 disponible
- **Canchas excluidas**: Aquellas que tienen una reserva a las 22:00

### Escenario: Seleccionas múltiples horas
- **Seleccionas**: Día 26, Horas 22:00 y 23:00
- **Resultado**: Solo aparecen canchas que tienen AMBAS horas disponibles
- **Canchas excluidas**: Aquellas que tienen reserva en cualquiera de esas horas

## Archivos Modificados

- `lib/filter-utils.ts`
  - Función `hasHourPassed()`: Cambio de `<=` a `<`
  - Función `filterCanchas()`: Cambio de `.some()` a `.every()`

## Verificación

✅ Código compila sin errores
✅ Lógica de filtro es correcta
✅ Comparación de horas es correcta
✅ Comportamiento esperado implementado

## Próximos Pasos

1. Prueba seleccionando una hora específica en los filtros avanzados
2. Verifica que las canchas con reservas a esa hora sean excluidas
3. Prueba seleccionando múltiples horas
4. Verifica que solo aparezcan canchas con todas las horas disponibles

## Notas Técnicas

- La función `hasAvailabilityAtHour()` verifica:
  1. Si la hora ya pasó (usando `hasHourPassed()`)
  2. Si existe el schedule para ese día
  3. Si el slot está disponible (no reservado ni bloqueado)

- La función `filterCanchas()` ahora es más estricta:
  - Antes: Mostraba canchas si tenían "al menos una hora disponible"
  - Ahora: Muestra canchas solo si tienen "todas las horas seleccionadas disponibles"

