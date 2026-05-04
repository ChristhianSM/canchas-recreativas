# Diseño Técnico — Pago Parcial de Reservas

## Visión General

El sistema CanchaGo actualmente exige el pago del 100% del precio online al reservar. Este diseño introduce el **modo de pago parcial**: el usuario paga un adelanto del 20% al reservar online (vía Yape/Plin) y abona el 80% restante presencialmente en la cancha el día del partido.

### Objetivos del diseño

- Agregar la selección de modo de pago en la página `/pago` sin romper el flujo existente.
- Persistir los nuevos campos en la tabla `reservas` con compatibilidad hacia atrás.
- Adaptar la lógica de cancelación: reservas con pago parcial no tienen devolución.
- Exponer la información de saldo pendiente en los paneles de usuario, admin y admin-cancha.
- Destacar visualmente los beneficios del pago completo para incentivar su uso.

### Alcance

| Área | Cambio |
|---|---|
| `/pago` (frontend) | Selector de modo de pago + cálculo dinámico de montos |
| `POST /api/reservas` | Aceptar y persistir `modo_pago`, `monto_adelanto`, `saldo_pendiente` |
| `POST /api/reservas/[id]/cancelar` | Política de devolución cero para `modo_pago = 'parcial'` |
| `/mis-reservas` | Mostrar saldo pendiente e indicadores de modo de pago |
| `/admin/reservas` | Columna de modo de pago + filtro |
| `/admin-cancha/reservas` | Botón "Marcar saldo cobrado" + indicadores |
| `supabase/migrations` | Nueva migración con 5 columnas nuevas |
| `lib/store.ts` | Extender tipo `Reserva` con nuevos campos |
| `lib/api.ts` | Extender `apiCrearReserva` con nuevos parámetros |

---

## Arquitectura

El sistema sigue la arquitectura existente de CanchaGo: **Next.js App Router** con rutas API en el servidor y Supabase como base de datos. No se introduce ninguna capa nueva; los cambios son aditivos sobre los patrones ya establecidos.

```mermaid
flowchart TD
    A[Usuario en /cancha/id] -->|Selecciona fecha y hora| B[/pago?canchaId=...&precio=...]
    B --> C{Selector de modo de pago}
    C -->|Pago completo 100%| D[Flujo actual sin cambios]
    C -->|Pago parcial 20%| E[Muestra adelanto + saldo pendiente]
    D --> F[POST /api/reservas\nmodo_pago=completo]
    E --> F2[POST /api/reservas\nmodo_pago=parcial\nmonto_adelanto=20%\nsaldo_pendiente=80%]
    F --> G[(Supabase: reservas)]
    F2 --> G

    G --> H[/mis-reservas]
    G --> I[/admin/reservas]
    G --> J[/admin-cancha/reservas]

    H -->|modo_pago=parcial| K[Badge: Saldo pendiente S/ X]
    I -->|modo_pago=parcial| L[Columna Parcial + filtro]
    J -->|saldo_cobrado=false| M[Botón: Marcar saldo cobrado]
    M --> N[PATCH /api/reservas/update\nsaldo_cobrado=true]

    G --> O[POST /api/reservas/id/cancelar]
    O -->|modo_pago=parcial| P[devolucion=0, penalidad=monto_adelanto]
    O -->|modo_pago=completo| Q[Reglas existentes 85/60/30/0%]
```

### Principios de diseño

1. **Compatibilidad hacia atrás**: todos los campos nuevos tienen valores por defecto que preservan el comportamiento actual. Las reservas existentes se comportan como `modo_pago = 'completo'`.
2. **Sin nueva infraestructura**: se reutilizan los endpoints existentes con parámetros adicionales opcionales.
3. **Cálculo en el cliente, validación en el servidor**: el frontend calcula y muestra los montos; el servidor los valida y persiste.
4. **Pago completo como opción por defecto**: el selector arranca en `'completo'` para no cambiar el comportamiento esperado por usuarios actuales.

---

## Componentes e Interfaces

### 1. Selector de modo de pago (`/pago`)

Nuevo componente inline dentro de `PagoContent` en `app/pago/page.tsx`.

**Estado nuevo:**
```typescript
const [modoPago, setModoPago] = useState<'completo' | 'parcial'>('completo');
```

**Cálculo de montos:**
```typescript
// total ya existe (precio + extras - descuento)
const montoAdelanto   = modoPago === 'parcial' ? Math.round(total * 0.20) : total;
const saldoPendiente  = modoPago === 'parcial' ? total - montoAdelanto : 0;
const montoPagarAhora = montoAdelanto; // lo que el usuario transfiere por Yape/Plin
```

**UI del selector** — dos tarjetas radio-style:

```
┌─────────────────────────────────────────────────────────┐
│  ✓ Pago completo (100%)          [RECOMENDADO]          │
│  S/ 120 ahora                                           │
│  ✓ Cancelación con devolución hasta 85%                 │
│  ✓ Reserva garantizada                                  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│    Pago con adelanto (20%)                              │
│  S/ 24 ahora · S/ 96 en cancha                         │
│  ⚠ Sin devolución al cancelar                          │
└─────────────────────────────────────────────────────────┘
```

### 2. Resumen de pago actualizado

El bloque de resumen existente en `/pago` se extiende para mostrar el desglose cuando `modoPago === 'parcial'`:

```
Precio base:          S/ 100
Extras (balón):       S/  20
Descuento cupón:     -S/   5
─────────────────────────────
Total reserva:        S/ 115
Adelanto (20%):       S/  23   ← pagas ahora
Saldo en cancha:      S/  92   ← pagas el día del partido
```

### 3. Extensión de `apiCrearReserva` en `lib/api.ts`

```typescript
export async function apiCrearReserva(data: {
  // ... campos existentes ...
  modoPago?: 'completo' | 'parcial';
  montoAdelanto?: number;
  saldoPendiente?: number;
}) { ... }
```

### 4. Endpoint `POST /api/reservas` — cambios

Nuevos campos aceptados en el body:

```typescript
const { modoPago, montoAdelanto, saldoPendiente, ...camposExistentes } = body;
```

Validación adicional:
- Si `modoPago === 'parcial'`: requerir `montoAdelanto` y `saldoPendiente`.
- Si `modoPago === 'completo'` o ausente: `monto_adelanto = precio`, `saldo_pendiente = 0`.

Insert actualizado:
```typescript
await sb.from('reservas').insert({
  ...camposExistentes,
  modo_pago:       modoPago ?? 'completo',
  monto_adelanto:  montoAdelanto ?? precio,
  saldo_pendiente: saldoPendiente ?? 0,
  saldo_cobrado:   false,
});
```

### 5. Endpoint `POST /api/reservas/[id]/cancelar` — cambios

La función `calcularDevolucion` se extiende para respetar `modo_pago`:

```typescript
function calcularDevolucion(reserva: any): CancelacionResult {
  // NUEVO: pago parcial → sin devolución siempre
  if (reserva.modo_pago === 'parcial') {
    return {
      success: true,
      devolucion: 0,
      penalidad: reserva.monto_adelanto,
      porcentaje_devolucion: 0,
      motivo: 'Reserva con adelanto — el monto abonado no se devuelve',
    };
  }
  // ... lógica existente para modo_pago = 'completo' ...
}
```

### 6. Endpoint `PATCH /api/reservas/update` — nuevo campo

Acepta `saldo_cobrado` y `saldo_cobrado_en` además de los campos existentes:

```typescript
const { estado, devolucion_procesada, saldo_cobrado } = body;

if (saldo_cobrado !== undefined) {
  // Verificar que la reserva es de modo parcial
  const { data: reserva } = await sb.from('reservas').select('modo_pago').eq('id', reservaId).single();
  if (reserva?.modo_pago !== 'parcial') {
    return NextResponse.json({ error: 'La reserva ya está completamente pagada' }, { status: 400 });
  }
  await sb.from('reservas').update({
    saldo_cobrado: true,
    saldo_cobrado_en: new Date().toISOString(),
  }).eq('id', reservaId);
}
```

### 7. Panel `/mis-reservas` — cambios en `ReservaCard`

- Si `modo_pago === 'parcial'` y estado `'confirmada'`: mostrar badge "Saldo pendiente en cancha: S/ {saldo_pendiente}".
- Si `modo_pago === 'parcial'` y estado `'pendiente'`: mostrar "Adelanto enviado — pendiente de confirmación".
- Si `modo_pago === 'completo'`: mostrar badge "Pago completo ✓".
- En el modal de detalle: mostrar desglose adelanto / saldo / total.

### 8. Panel `/admin/reservas` — cambios

- Nueva columna "Modo" en la tabla con badge "Parcial" / "Completo".
- Filtro por `modo_pago` en los tabs o como selector adicional.
- Modal de detalle: mostrar adelanto cobrado, saldo pendiente y total.

### 9. Panel `/admin-cancha/reservas` — cambios

- Nueva columna "Saldo" que muestra el `saldo_pendiente` cuando `saldo_cobrado = false`.
- Botón "Marcar saldo cobrado" en el modal de detalle para reservas con `modo_pago = 'parcial'` y `saldo_cobrado = false`.
- Indicador "Pago completo ✓" cuando `saldo_cobrado = true`.

### 10. Tipo `Reserva` en `lib/store.ts`

```typescript
export interface Reserva {
  // ... campos existentes ...
  modoPago?: 'completo' | 'parcial';
  montoAdelanto?: number;
  saldoPendiente?: number;
  saldoCobrado?: boolean;
  saldoCobradoEn?: string | null;
}
```

---

## Modelos de Datos

### Migración SQL

Archivo: `supabase/migrations/pago_parcial.sql`

```sql
-- Nuevos campos para soporte de pago parcial en reservas
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS modo_pago        text        NOT NULL DEFAULT 'completo'
    CHECK (modo_pago IN ('completo', 'parcial')),
  ADD COLUMN IF NOT EXISTS monto_adelanto   integer,
  ADD COLUMN IF NOT EXISTS saldo_pendiente  integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_cobrado    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saldo_cobrado_en timestamptz;

-- Retrocompatibilidad: reservas existentes quedan como pago completo
-- monto_adelanto = precio para todas las reservas existentes
UPDATE public.reservas
  SET monto_adelanto = precio
  WHERE monto_adelanto IS NULL;

-- Hacer monto_adelanto NOT NULL después de rellenar los valores
ALTER TABLE public.reservas
  ALTER COLUMN monto_adelanto SET NOT NULL;

-- Índice para filtrar por modo de pago en los paneles admin
CREATE INDEX IF NOT EXISTS idx_reservas_modo_pago
  ON public.reservas(modo_pago);

-- Índice para saldo pendiente de cobro (panel admin-cancha)
CREATE INDEX IF NOT EXISTS idx_reservas_saldo_cobrado
  ON public.reservas(saldo_cobrado)
  WHERE modo_pago = 'parcial';
```

### Esquema extendido de la tabla `reservas`

| Columna | Tipo | Default | Descripción |
|---|---|---|---|
| `modo_pago` | `text` | `'completo'` | `'completo'` o `'parcial'` |
| `monto_adelanto` | `integer` | `precio` (via UPDATE) | Monto pagado online (100% o 20%) |
| `saldo_pendiente` | `integer` | `0` | Monto a pagar en cancha (0% o 80%) |
| `saldo_cobrado` | `boolean` | `false` | Si el admin-cancha cobró el saldo |
| `saldo_cobrado_en` | `timestamptz` | `null` | Timestamp del cobro presencial |

### Invariantes de datos

- `monto_adelanto + saldo_pendiente = precio` para toda reserva.
- Si `modo_pago = 'completo'`: `saldo_pendiente = 0` y `monto_adelanto = precio`.
- Si `modo_pago = 'parcial'`: `monto_adelanto = round(precio * 0.20)` y `saldo_pendiente = precio - monto_adelanto`.
- `saldo_cobrado = true` solo es posible cuando `modo_pago = 'parcial'`.
- `saldo_cobrado_en` es `null` si y solo si `saldo_cobrado = false`.

### Reglas de cancelación por modo de pago

| `modo_pago` | `estado` | `devolucion_calculada` | `penalidad_aplicada` |
|---|---|---|---|
| `'parcial'` | cualquiera | `0` | `monto_adelanto` |
| `'completo'` | `'pendiente'` | `precio` (100%) | `0` |
| `'completo'` | `'confirmada'` (>4h) | `precio * 0.85` | `precio * 0.15` |
| `'completo'` | `'confirmada'` (2-4h) | `precio * 0.60` | `precio * 0.40` |
| `'completo'` | `'confirmada'` (1-2h) | `precio * 0.30` | `precio * 0.70` |
| `'completo'` | `'confirmada'` (<1h) | `0` | `precio` |

---

## Propiedades de Corrección

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas.*

### Propiedad 1: Invariante de suma de montos

*Para cualquier* reserva válida, la suma de `monto_adelanto` y `saldo_pendiente` debe ser igual al `precio` total de la reserva.

**Validates: Requirements 2.1, 2.2, 3.1, 3.2**

---

### Propiedad 2: Modo completo implica saldo cero

*Para cualquier* reserva con `modo_pago = 'completo'`, el `saldo_pendiente` debe ser `0` y el `monto_adelanto` debe ser igual al `precio`.

**Validates: Requirements 3.2**

---

### Propiedad 3: Modo parcial implica adelanto del 20%

*Para cualquier* precio total y reserva con `modo_pago = 'parcial'`, el `monto_adelanto` debe ser igual a `round(precio * 0.20)` y el `saldo_pendiente` debe ser `precio - monto_adelanto`.

**Validates: Requirements 2.1, 2.2, 2.5, 3.1**

---

### Propiedad 4: Cancelación parcial no genera devolución

*Para cualquier* reserva con `modo_pago = 'parcial'` que sea cancelada, `devolucion_calculada` debe ser `0` y `penalidad_aplicada` debe ser igual a `monto_adelanto`, independientemente del tiempo de anticipación.

**Validates: Requirements 7.1, 7.5**

---

### Propiedad 5: Cancelación completa respeta las reglas de tiempo

*Para cualquier* reserva con `modo_pago = 'completo'` en estado `'confirmada'` que sea cancelada, la suma de `devolucion_calculada` y `penalidad_aplicada` debe ser igual al `precio` total, y el porcentaje de devolución debe corresponder al tramo de tiempo correcto (85%, 60%, 30% o 0%).

**Validates: Requirements 7.2**

---

### Propiedad 6: Marcar saldo cobrado solo aplica a reservas parciales

*Para cualquier* intento de marcar `saldo_cobrado = true` en una reserva con `modo_pago = 'completo'`, el sistema debe retornar un error 400 y la reserva no debe ser modificada.

**Validates: Requirements 6.5**

---

### Propiedad 7: Cálculo del adelanto con descuento de cupón

*Para cualquier* precio base, extras y descuento de cupón, el `monto_adelanto` en modo parcial debe calcularse sobre el `precio_total` ya descontado (no sobre el precio bruto), y el resultado debe ser un entero (sin decimales).

**Validates: Requirements 2.4, 2.5**

---

## Manejo de Errores

### Errores en `POST /api/reservas`

| Condición | HTTP | Mensaje |
|---|---|---|
| `modo_pago = 'parcial'` sin `monto_adelanto` | 400 | `"Faltan campos requeridos: monto_adelanto"` |
| `modo_pago = 'parcial'` sin `saldo_pendiente` | 400 | `"Faltan campos requeridos: saldo_pendiente"` |
| `monto_adelanto + saldo_pendiente ≠ precio` | 400 | `"Los montos no cuadran con el precio total"` |
| `modo_pago` con valor inválido | 400 | `"modo_pago debe ser 'completo' o 'parcial'"` |

### Errores en `PATCH /api/reservas/update` (saldo cobrado)

| Condición | HTTP | Mensaje |
|---|---|---|
| Reserva con `modo_pago = 'completo'` | 400 | `"La reserva ya está completamente pagada"` |
| Reserva ya tiene `saldo_cobrado = true` | 400 | `"El saldo ya fue marcado como cobrado"` |
| Reserva no encontrada | 404 | `"Reserva no encontrada"` |

### Errores en el frontend (`/pago`)

- Si el usuario intenta enviar sin seleccionar modo de pago: no aplica (hay un default).
- Si el cálculo de adelanto resulta en 0 (precio = 0): mostrar advertencia y deshabilitar el modo parcial.

### Compatibilidad hacia atrás

Las reservas existentes sin los nuevos campos se tratan como `modo_pago = 'completo'` en todos los componentes frontend mediante el operador `??`:

```typescript
const modoPago = r.modo_pago ?? 'completo';
const saldoPendiente = r.saldo_pendiente ?? 0;
```

---

## Estrategia de Testing

### Tests unitarios (ejemplo-based)

1. **Cálculo de adelanto**: verificar que `round(115 * 0.20) = 23` y `saldo = 92`.
2. **Cálculo con cupón**: precio 120, descuento 5 → total 115 → adelanto 23.
3. **Cancelación parcial**: reserva con `modo_pago = 'parcial'` → `devolucion = 0`, `penalidad = monto_adelanto`.
4. **Cancelación completa pendiente**: `devolucion = precio`, `penalidad = 0`.
5. **Error saldo cobrado en completo**: PATCH con `saldo_cobrado = true` en reserva completa → 400.
6. **Migración**: reservas existentes tienen `monto_adelanto = precio` y `saldo_pendiente = 0`.

### Tests de propiedad (property-based)

Se usará **fast-check** (TypeScript/JavaScript), configurado con mínimo 100 iteraciones por propiedad.

Cada test de propiedad referencia su propiedad del diseño con el tag:
`// Feature: pago-parcial-reservas, Property N: <texto>`

**Propiedad 1** — Invariante de suma:
```typescript
fc.assert(fc.property(
  fc.integer({ min: 10, max: 500 }),  // precio
  fc.constantFrom('completo', 'parcial'),
  (precio, modoPago) => {
    const { montoAdelanto, saldoPendiente } = calcularMontos(precio, modoPago);
    return montoAdelanto + saldoPendiente === precio;
  }
), { numRuns: 100 });
```

**Propiedad 3** — Adelanto del 20%:
```typescript
fc.assert(fc.property(
  fc.integer({ min: 1, max: 1000 }),
  (precio) => {
    const { montoAdelanto, saldoPendiente } = calcularMontos(precio, 'parcial');
    return montoAdelanto === Math.round(precio * 0.20)
      && saldoPendiente === precio - montoAdelanto;
  }
), { numRuns: 100 });
```

**Propiedad 4** — Cancelación parcial sin devolución:
```typescript
fc.assert(fc.property(
  fc.record({
    precio: fc.integer({ min: 10, max: 500 }),
    monto_adelanto: fc.integer({ min: 1, max: 100 }),
    modo_pago: fc.constant('parcial'),
    estado: fc.constantFrom('pendiente', 'confirmada'),
    fecha: fc.date(),
    hora: fc.constantFrom('08:00', '14:00', '20:00'),
  }),
  (reserva) => {
    const resultado = calcularDevolucion(reserva);
    return resultado.devolucion === 0
      && resultado.penalidad === reserva.monto_adelanto;
  }
), { numRuns: 100 });
```

**Propiedad 5** — Cancelación completa suma al precio:
```typescript
fc.assert(fc.property(
  fc.record({
    precio: fc.integer({ min: 10, max: 500 }),
    modo_pago: fc.constant('completo'),
    estado: fc.constant('confirmada'),
    fecha: fc.date({ min: new Date() }),
    hora: fc.constantFrom('08:00', '14:00', '20:00'),
  }),
  (reserva) => {
    const resultado = calcularDevolucion(reserva);
    return resultado.devolucion + resultado.penalidad === reserva.precio;
  }
), { numRuns: 100 });
```

**Propiedad 7** — Adelanto con descuento es entero:
```typescript
fc.assert(fc.property(
  fc.integer({ min: 10, max: 500 }),  // precioBase
  fc.integer({ min: 0, max: 20 }),    // extras
  fc.integer({ min: 0, max: 10 }),    // descuento
  (precioBase, extras, descuento) => {
    const total = Math.max(0, precioBase + extras - descuento);
    const adelanto = calcularAdelanto(total, 'parcial');
    return Number.isInteger(adelanto) && adelanto === Math.round(total * 0.20);
  }
), { numRuns: 100 });
```

### Tests de integración

1. Flujo completo: crear reserva parcial → confirmar → cancelar → verificar `devolucion = 0`.
2. Flujo admin-cancha: crear reserva parcial → confirmar → marcar saldo cobrado → verificar `saldo_cobrado = true`.
3. Migración: ejecutar SQL en BD de test → verificar que reservas existentes tienen `monto_adelanto = precio`.
4. Error guard: intentar marcar saldo cobrado en reserva completa → verificar 400.
