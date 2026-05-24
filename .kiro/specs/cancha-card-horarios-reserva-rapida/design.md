# Design Document

## Feature: cancha-card-horarios-reserva-rapida

---

## Overview

El rediseño del componente `CanchaCard` agrega visualización de horarios disponibles y reserva rápida directamente desde el listado de canchas. El objetivo es reducir la fricción del flujo de reserva: el usuario puede ver los próximos slots disponibles y reservar sin navegar a la página de detalle.

El componente actual (`components/cancha-card.tsx`) es un card estático que muestra nombre, rating, dirección, precio, superficie, jugadores y extras. El rediseño mantiene toda esa información y añade:

1. Una fila de hasta 4 slots de horario disponibles para la fecha seleccionada en los filtros
2. Un indicador "+X horarios" cuando hay más de 4 disponibles
3. Un botón "Reservar" / "Ver horarios" en la parte inferior del card

El flujo de reserva rápida reutiliza exactamente la misma lógica de verificación de bloqueos y redirección a `/pago` que ya existe en `app/cancha/[id]/page.tsx`, garantizando consistencia y evitando duplicación de lógica de negocio.

---

## Architecture

### Flujo de datos

```mermaid
flowchart TD
    A[app/canchas/page.tsx] -->|filters: AdvancedFilters| B[CanchaCard]
    B -->|canchaId + fecha| C[useAvailableSlots hook]
    C -->|GET /api/canchas/detail?id=| D[API: canchas/detail]
    D -->|horariosOcupados + horariosRestringidos| C
    C -->|TimeSlot[] filtrados| B
    B -->|selectedSlot| E[QuickBookingHandler]
    E -->|GET /api/bloqueos/check| F[API: bloqueos/check]
    F -->|disponible: bool| E
    E -->|router.push /pago| G[Página de pago]
```

### Decisiones de arquitectura

**Reutilizar `/api/canchas/detail`**: El endpoint ya retorna `horariosOcupados` y `horariosRestringidos` con toda la lógica de bloqueos admin, reservas activas y bloqueos temporales. No se crea un endpoint nuevo para el card; se reutiliza el existente con los mismos datos.

**Hook `useAvailableSlots`**: La lógica de obtención y filtrado de slots se extrae a un custom hook para mantener el componente limpio y facilitar el testing. El hook encapsula: fetch lazy (IntersectionObserver), caché de 2 minutos, debounce de 300ms al cambiar fecha, y filtrado de slots pasados.

**Prop `selectedDate` desde el padre**: La fecha seleccionada en `AdvancedFilters` se pasa como prop al `CanchaCard` desde `app/canchas/page.tsx`. Esto evita que cada card maneje su propio estado de fecha y garantiza sincronización con los filtros.

**`stopPropagation` en elementos interactivos**: Los slots, el botón Reservar y el indicador "+X" usan `e.stopPropagation()` para no activar la navegación al detalle del card padre.

**Caché en memoria (Map)**: El hook usa un `Map<string, {slots, timestamp}>` a nivel de módulo (fuera del componente) para compartir caché entre instancias del mismo card y evitar refetch al re-renderizar.

---

## Components and Interfaces

### Árbol de componentes

```
CanchaCard (refactored)
├── ImageSlider (sin cambios)
├── CardInfoSection (sin cambios — nombre, rating, dirección, precio, extras)
├── SlotSelector (nuevo)
│   ├── SlotButton × N (máx 4)
│   └── MoreSlotsIndicator (condicional)
└── ReserveButton (nuevo)
```

### `CanchaCard` — props actualizadas

```typescript
interface CanchaCardProps {
  cancha: Cancha;
  distancia?: number;
  // Nuevo: fecha seleccionada en los filtros (default: hoy)
  selectedDate?: string;
  // Nuevo: rango de horas del filtro para filtrar slots mostrados
  availableHours?: string[];
}
```

### `useAvailableSlots` — hook

```typescript
interface UseAvailableSlotsOptions {
  canchaId: string;
  selectedDate: string;
  availableHours?: string[]; // filtro de horas del AdvancedFilters
  enabled?: boolean;         // false hasta que el card sea visible (lazy)
}

interface UseAvailableSlotsResult {
  slots: TimeSlot[];          // todos los disponibles para la fecha
  visibleSlots: TimeSlot[];   // primeros 4
  extraCount: number;         // max(0, slots.length - 4)
  loading: boolean;
  error: string | null;
  refetch: () => void;
}
```

### `SlotSelector` — componente

```typescript
interface SlotSelectorProps {
  slots: TimeSlot[];          // visibleSlots (máx 4)
  extraCount: number;
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  onMoreClick: () => void;    // redirige al detalle
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  canchaId: string;           // para el link del MoreSlotsIndicator
}
```

### `ReserveButton` — componente

```typescript
interface ReserveButtonProps {
  selectedSlot: TimeSlot | null;
  loading: boolean;           // reservando en proceso
  hasSlots: boolean;          // hay slots disponibles
  hasError: boolean;
  onClick: () => void;
}
```

El texto del botón sigue esta lógica:
- `hasError || !hasSlots` → "Ver detalle"
- `selectedSlot !== null` → "Reservar"
- `selectedSlot === null && hasSlots` → "Ver horarios"

---

## Data Models

### Tipos existentes reutilizados sin cambios

```typescript
// lib/types.ts — sin modificaciones
interface TimeSlot {
  id: string;
  time: string;        // formato "HH:mm" (24h)
  available: boolean;
  price: number;
  status: 'disponible' | 'reservado' | 'en_proceso';
}

interface Cancha {
  // ... todos los campos actuales
  balonDisponible?: boolean;
  balonPrecio?: number | null;
  chalecoDisponible?: boolean;
  chalecosPrecio?: number | null;
}
```

### Estructura de caché del hook

```typescript
// Caché a nivel de módulo (fuera del componente)
interface CacheEntry {
  slots: TimeSlot[];
  timestamp: number; // Date.now()
}

const slotsCache = new Map<string, CacheEntry>();
// key: `${canchaId}|${fecha}`
// TTL: 2 minutos (120_000 ms)
```

### Función `buildScheduleFromDetail`

Reutiliza la misma lógica que `buildSchedule` en `app/cancha/[id]/page.tsx`:

```typescript
function buildScheduleFromDetail(
  horariosRestringidos: string[],
  horariosOcupados: Record<string, 'reservado' | 'en_proceso'>,
  precioBase: number,
  preciosPorHora: Record<string, number>,
  fecha: string,
): TimeSlot[]
```

Esta función se extrae a `lib/horario-utils.ts` para ser compartida entre `CanchaCard` y `app/cancha/[id]/page.tsx`, eliminando la duplicación actual.

### Función `filterAvailableSlots`

```typescript
function filterAvailableSlots(
  slots: TimeSlot[],
  fecha: string,
  availableHours?: string[],
): TimeSlot[]
// Filtra: status === 'disponible' AND no pasado AND dentro de availableHours (si aplica)
// Ordena: cronológicamente por time
```

### Función `parseTime24` y `formatTime24`

Extraídas a `lib/horario-utils.ts`:

```typescript
// Convierte "18:00" → { hours: 18, minutes: 0 }
function parseTime24(time: string): { hours: number; minutes: number }

// Convierte { hours: 18, minutes: 0 } → "18:00"
function formatTime24(hours: number, minutes: number): string

// Convierte "18:00" → "6:00 PM"
function formatTo12Hour(time24: string): string

// Verifica si un slot ya pasó (para el día actual)
function isSlotPasado(selectedDate: string, slotTime: string): boolean
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Filtrado de slots disponibles

*Para cualquier* lista de TimeSlots con estados mixtos ('disponible', 'reservado', 'en_proceso') y cualquier fecha, `filterAvailableSlots` SHALL retornar únicamente slots con `status === 'disponible'` y `available === true`.

**Validates: Requirements 1.5, 1.6**

---

### Property 2: Exclusión de slots pasados en el día actual

*Para cualquier* lista de TimeSlots disponibles en la fecha de hoy, `filterAvailableSlots` SHALL excluir todos los slots cuya hora ya haya pasado según el reloj del sistema.

**Validates: Requirements 1.7**

---

### Property 3: Límite de slots visibles

*Para cualquier* lista de N slots disponibles, `SlotSelector` SHALL mostrar exactamente `min(N, 4)` slots y el `extraCount` SHALL ser `max(0, N - 4)`.

**Validates: Requirements 2.1, 3.1, 3.5**

---

### Property 4: Consistencia del indicador de horarios adicionales

*Para cualquier* lista de slots disponibles, el `MoreSlotsIndicator` SHALL mostrarse si y solo si `extraCount > 0`, y SHALL mostrar exactamente el valor de `extraCount`.

**Validates: Requirements 3.1, 3.2, 3.5**

---

### Property 5: Round-trip de parsing de horarios

*Para cualquier* string de tiempo en formato 24h válido (HH:mm), `formatTime24(parseTime24(time).hours, parseTime24(time).minutes)` SHALL producir el mismo string original.

**Validates: Requirements 11.1, 11.2, 11.4**

---

### Property 6: Orden cronológico de slots

*Para cualquier* lista de slots disponibles retornada por `filterAvailableSlots`, los slots SHALL estar ordenados de menor a mayor por hora (cronológicamente).

**Validates: Requirements 2.3**

---

### Property 7: Texto del botón según estado

*Para cualquier* combinación de `(selectedSlot, hasSlots, hasError)`, el texto del `ReserveButton` SHALL ser determinístico: "Ver detalle" cuando `hasError || !hasSlots`, "Reservar" cuando `selectedSlot !== null && hasSlots`, "Ver horarios" cuando `selectedSlot === null && hasSlots && !hasError`.

**Validates: Requirements 4.6, 9.7**

---

### Property 8: Selección única por card

*Para cualquier* secuencia de clicks en slots del `SlotSelector`, en todo momento SHALL haber como máximo un slot seleccionado por card.

**Validates: Requirements 2.7**

---

### Property 9: Filtro de horas respeta el rango de AdvancedFilters

*Para cualquier* lista de slots disponibles y cualquier rango de horas `availableHours` no vacío, todos los slots retornados por `filterAvailableSlots` SHALL tener su `time` dentro del conjunto `availableHours`.

**Validates: Requirements 8.2**

---

### Property 10: Caché TTL

*Para cualquier* par `(canchaId, fecha)`, si se obtienen slots y luego se vuelve a solicitar dentro de los 2 minutos siguientes, el hook SHALL retornar los datos cacheados sin realizar una nueva llamada al API.

**Validates: Requirements 10.2**

---

## Error Handling

### Errores de red al obtener horarios

- El hook `useAvailableSlots` captura errores de fetch y expone `error: string | null`
- El `SlotSelector` muestra un mensaje de error con botón "Reintentar" que llama a `refetch()`
- El `ReserveButton` cambia a "Ver detalle" y redirige al detalle de la cancha
- La información del card (nombre, precio, extras) permanece visible en todo momento

### Horario ocupado al intentar reservar

Reutiliza el mismo flujo que `app/cancha/[id]/page.tsx`:
- Se llama a `/api/bloqueos/check` antes de redirigir a pago
- Si `disponible: false`, se muestra un toast de error y se refresca la lista de slots
- El slot ocupado desaparece de la lista visible

### Sin horarios disponibles

- `SlotSelector` muestra "Sin horarios disponibles para esta fecha"
- `ReserveButton` muestra "Ver horarios" y redirige al detalle
- El card mantiene toda su información visible

### Usuario no autenticado

- El flujo de reserva rápida sigue el mismo patrón que la página de detalle
- Si el usuario no está logueado, la redirección a `/pago` maneja la autenticación (el flujo de pago ya soporta invitados)

---

## Testing Strategy

### Enfoque dual

Se usan dos tipos de tests complementarios:

1. **Unit tests (Jest + React Testing Library)**: casos concretos, estados de UI, integración entre componentes
2. **Property-based tests (fast-check)**: propiedades universales sobre funciones puras de `lib/horario-utils.ts`

### Tests de propiedades (fast-check)

Cada propiedad del documento se implementa como un test de fast-check con mínimo 100 iteraciones.

**Archivo**: `lib/__tests__/horario-utils.property.test.ts`

```typescript
// Ejemplo de estructura
import fc from 'fast-check';
import { filterAvailableSlots, parseTime24, formatTime24, buildScheduleFromDetail } from '../horario-utils';

// Feature: cancha-card-horarios-reserva-rapida, Property 5: Round-trip de parsing de horarios
test('round-trip parseTime24/formatTime24', () => {
  fc.assert(fc.property(
    fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 })
    ),
    ([h, m]) => {
      const time = formatTime24(h, m);
      const parsed = parseTime24(time);
      return formatTime24(parsed.hours, parsed.minutes) === time;
    }
  ), { numRuns: 100 });
});
```

**Generadores necesarios**:
- `fc.record({ id, time, available, price, status })` para TimeSlot
- `fc.array(timeSlotArb)` para listas de slots
- `fc.constantFrom(...HORAS)` para tiempos válidos

### Tests unitarios (Jest + RTL)

**Archivo**: `components/__tests__/cancha-card.test.tsx`

Casos a cubrir:
- Skeleton loader visible durante carga
- Mensaje de error con botón reintentar
- Mensaje "Sin horarios disponibles" cuando array vacío
- Máximo 4 slots visibles
- Indicador "+X" visible/oculto según cantidad
- Click en slot → selección visual
- Click en otro slot → cambia selección (solo uno activo)
- Botón "Reservar" con slot seleccionado → llama a handler
- Botón "Ver horarios" sin slot → redirige al detalle
- `stopPropagation` en slots y botón (no navega al detalle)
- Información de extras siempre visible (todos los estados)
- Accesibilidad: `role="button"`, `aria-pressed`, `aria-label`

### Tests de integración

**Archivo**: `app/__tests__/canchas-page.integration.test.tsx`

- Cambio de fecha en filtros → slots actualizados en todos los cards
- Cambio de `availableHours` → slots filtrados correctamente
- Flujo completo: seleccionar slot → click Reservar → verificación → redirección a `/pago`

### Configuración de fast-check

```typescript
// jest.config.ts — sin cambios necesarios
// fast-check se instala como devDependency: npm install --save-dev fast-check
```

Cada property test usa el tag de comentario:
```typescript
// Feature: cancha-card-horarios-reserva-rapida, Property N: <texto de la propiedad>
```
