# Plan de Implementación: Pago Parcial de Reservas

## Visión General

Implementar el flujo de pago parcial (adelanto del 20%) en CanchaGo de forma aditiva sobre la arquitectura existente de Next.js + Supabase. Los cambios son compatibles hacia atrás: las reservas existentes se comportan como `modo_pago = 'completo'` sin ninguna modificación.

## Tareas

- [x] 1. Migración de base de datos — nuevos campos en tabla `reservas`
  - Crear archivo `supabase/migrations/pago_parcial.sql` con los 5 campos nuevos: `modo_pago`, `monto_adelanto`, `saldo_pendiente`, `saldo_cobrado`, `saldo_cobrado_en`
  - Incluir `UPDATE` de retrocompatibilidad: asignar `monto_adelanto = precio` a reservas existentes
  - Agregar `ALTER COLUMN monto_adelanto SET NOT NULL` después del UPDATE
  - Crear índices `idx_reservas_modo_pago` e `idx_reservas_saldo_cobrado`
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Extender el tipo `Reserva` y la función `apiCrearReserva`
  - [x] 2.1 Agregar campos de pago parcial al interface `Reserva` en `lib/store.ts`
    - Añadir: `modoPago?: 'completo' | 'parcial'`, `montoAdelanto?: number`, `saldoPendiente?: number`, `saldoCobrado?: boolean`, `saldoCobradoEn?: string | null`
    - _Requirements: 3.1, 3.2, 9.1_

  - [x] 2.2 Extender `apiCrearReserva` en `lib/api.ts` con los nuevos parámetros
    - Añadir al tipo del parámetro: `modoPago?: 'completo' | 'parcial'`, `montoAdelanto?: number`, `saldoPendiente?: number`
    - Incluir los nuevos campos en el body del `fetch` a `POST /api/reservas`
    - _Requirements: 3.1, 3.2_

- [x] 3. Endpoint `POST /api/reservas` — aceptar y persistir pago parcial
  - [x] 3.1 Extraer y validar los nuevos campos del body en `app/api/reservas/route.ts`
    - Desestructurar `modoPago`, `montoAdelanto`, `saldoPendiente` del body
    - Si `modoPago === 'parcial'`: validar que `montoAdelanto` y `saldoPendiente` estén presentes → 400 si faltan
    - Validar que `monto_adelanto + saldo_pendiente === precio` → 400 si no cuadran
    - Validar que `modoPago` sea `'completo'` o `'parcial'` si se envía → 400 si valor inválido
    - Si `modoPago` ausente o `'completo'`: usar defaults `monto_adelanto = precio`, `saldo_pendiente = 0`
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 3.2 Persistir los nuevos campos en el INSERT de Supabase
    - Agregar al objeto de insert: `modo_pago`, `monto_adelanto`, `saldo_pendiente`, `saldo_cobrado: false`
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 3.3 Escribir tests de propiedad para la validación del endpoint
    - Crear `__tests__/pago-parcial/api-reservas.test.ts`
    - **Propiedad 1: Invariante de suma de montos** — para cualquier precio y modo, `monto_adelanto + saldo_pendiente === precio`
    - **Validates: Requirements 2.1, 2.2, 3.1, 3.2**

  - [ ]* 3.4 Escribir tests de propiedad para el cálculo del adelanto con descuento
    - **Propiedad 7: Cálculo del adelanto con descuento de cupón** — el adelanto se calcula sobre el total ya descontado y el resultado es un entero
    - **Validates: Requirements 2.4, 2.5**

- [x] 4. Checkpoint — Verificar migración y endpoint de creación
  - Asegurar que todos los tests pasan, preguntar al usuario si hay dudas antes de continuar.

- [x] 5. Endpoint `POST /api/reservas/[id]/cancelar` — política de devolución cero para pago parcial
  - [x] 5.1 Extender `calcularDevolucion` en `app/api/reservas/[id]/cancelar/route.ts`
    - Agregar rama al inicio de la función: si `reserva.modo_pago === 'parcial'`, retornar `{ devolucion: 0, penalidad: reserva.monto_adelanto, porcentaje_devolucion: 0, motivo: 'Reserva con adelanto — el monto abonado no se devuelve' }`
    - La lógica existente para `modo_pago = 'completo'` no cambia
    - _Requirements: 7.1, 7.5_

  - [x] 5.2 Actualizar el mensaje de cancelación para reservas parciales
    - En la respuesta JSON, cuando `modo_pago === 'parcial'`, incluir el mensaje: `"El adelanto de S/ {monto_adelanto} fue retenido. No hay devolución."`
    - Actualizar la notificación in-app para incluir el mensaje de retención del adelanto
    - _Requirements: 7.4, 7.5_

  - [ ]* 5.3 Escribir tests de propiedad para la lógica de cancelación
    - Crear o extender `__tests__/pago-parcial/cancelacion.test.ts`
    - **Propiedad 4: Cancelación parcial no genera devolución** — para cualquier reserva con `modo_pago = 'parcial'`, `devolucion === 0` y `penalidad === monto_adelanto`
    - **Validates: Requirements 7.1, 7.5**

  - [ ]* 5.4 Escribir tests de propiedad para cancelación de pago completo
    - **Propiedad 5: Cancelación completa respeta las reglas de tiempo** — `devolucion + penalidad === precio` para cualquier reserva con `modo_pago = 'completo'` en estado `'confirmada'`
    - **Validates: Requirements 7.2**

- [x] 6. Endpoint `PATCH /api/reservas/update` — soporte para marcar saldo cobrado
  - [x] 6.1 Agregar rama para `saldo_cobrado` en `app/api/reservas/update/route.ts`
    - Desestructurar `saldo_cobrado` del body junto a los campos existentes
    - Si `saldo_cobrado !== undefined`: consultar la reserva para verificar `modo_pago`
    - Si `modo_pago !== 'parcial'`: retornar 400 `"La reserva ya está completamente pagada"`
    - Si `saldo_cobrado` ya es `true`: retornar 400 `"El saldo ya fue marcado como cobrado"`
    - Si válido: actualizar `saldo_cobrado = true` y `saldo_cobrado_en = new Date().toISOString()`
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ]* 6.2 Escribir tests de propiedad para la guarda de saldo cobrado
    - **Propiedad 6: Marcar saldo cobrado solo aplica a reservas parciales** — cualquier intento en reserva `'completo'` debe retornar 400 sin modificar la reserva
    - **Validates: Requirements 6.5**

- [x] 7. Selector de modo de pago en `/pago`
  - [x] 7.1 Agregar estado `modoPago` y cálculo de montos en `app/pago/page.tsx`
    - Añadir `const [modoPago, setModoPago] = useState<'completo' | 'parcial'>('completo')`
    - Calcular: `montoAdelanto = modoPago === 'parcial' ? Math.round(total * 0.20) : total`
    - Calcular: `saldoPendiente = modoPago === 'parcial' ? total - montoAdelanto : 0`
    - El valor `total` ya existe (precio + extras − descuento de cupón)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.5_

  - [x] 7.2 Renderizar el componente selector de modo de pago (dos tarjetas radio-style)
    - Tarjeta "Pago completo (100%)": badge "Recomendado", beneficios "Cancelación con devolución hasta 85%" y "Reserva garantizada", borde destacado cuando está seleccionada
    - Tarjeta "Pago con adelanto (20%)": mostrar `S/ {montoAdelanto} ahora · S/ {saldoPendiente} en cancha`, advertencia "⚠ Sin devolución al cancelar"
    - Resaltar visualmente la opción activa con borde/color diferenciado
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 8.4_

  - [x] 7.3 Actualizar el resumen de pago para mostrar el desglose en modo parcial
    - Cuando `modoPago === 'parcial'`: mostrar líneas "Adelanto (20%): S/ X" y "Saldo en cancha: S/ Y"
    - Cuando `modoPago === 'completo'`: mostrar "Reserva garantizada ✓" en el resumen
    - _Requirements: 2.3, 8.5_

  - [x] 7.4 Pasar los nuevos campos a `apiCrearReserva` al confirmar la reserva
    - Incluir `modoPago`, `montoAdelanto`, `saldoPendiente` en la llamada a `apiCrearReserva`
    - El `precio` enviado al servidor debe ser `montoAdelanto` (lo que se paga ahora por Yape/Plin)
    - _Requirements: 3.1, 3.2_

  - [ ]* 7.5 Escribir tests de propiedad para el cálculo de montos en el frontend
    - Crear `__tests__/pago-parcial/calculos-frontend.test.ts`
    - **Propiedad 2: Modo completo implica saldo cero** — `saldoPendiente === 0` y `montoAdelanto === total` cuando `modoPago === 'completo'`
    - **Validates: Requirements 3.2**

  - [ ]* 7.6 Escribir tests de propiedad para el adelanto del 20%
    - **Propiedad 3: Modo parcial implica adelanto del 20%** — `montoAdelanto === Math.round(total * 0.20)` y `saldoPendiente === total - montoAdelanto` para cualquier precio
    - **Validates: Requirements 2.1, 2.2, 2.5, 3.1**

- [x] 8. Checkpoint — Verificar flujo de creación de reserva parcial end-to-end
  - Asegurar que todos los tests pasan, preguntar al usuario si hay dudas antes de continuar.

- [x] 9. Panel `/mis-reservas` — mostrar información de pago parcial
  - [x] 9.1 Extender el mapeo de datos en `reload()` para incluir los nuevos campos
    - En `app/mis-reservas/page.tsx`, agregar al objeto mapeado: `modoPago: r.modo_pago ?? 'completo'`, `montoAdelanto: r.monto_adelanto`, `saldoPendiente: r.saldo_pendiente ?? 0`, `saldoCobrado: r.saldo_cobrado ?? false`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 9.2 Actualizar `ReservaCard` para mostrar badges e indicadores de pago parcial
    - Si `modoPago === 'parcial'` y estado `'confirmada'`: mostrar badge "Saldo pendiente en cancha: S/ {saldoPendiente}"
    - Si `modoPago === 'parcial'` y estado `'pendiente'`: mostrar "Adelanto enviado — pendiente de confirmación"
    - Si `modoPago === 'completo'`: mostrar badge "Pago completo ✓"
    - _Requirements: 4.1, 4.2, 4.4, 8.6_

  - [x] 9.3 Actualizar el modal de detalle para mostrar el desglose adelanto / saldo / total
    - Agregar sección de desglose cuando `modoPago === 'parcial'`: adelanto pagado online, saldo a pagar en cancha, precio total
    - _Requirements: 4.3_

  - [x] 9.4 Actualizar el mensaje de cancelación para reservas parciales
    - En el componente o modal de cancelación, si `modoPago === 'parcial'`: mostrar "Al cancelar una reserva con adelanto, perderás el monto abonado (S/ {montoAdelanto}). No hay devolución."
    - _Requirements: 7.3_

- [x] 10. Panel `/admin/reservas` — columna de modo de pago y filtro
  - [x] 10.1 Extender el mapeo de datos en `reload()` para incluir los nuevos campos
    - En `app/admin/reservas/page.tsx`, agregar al objeto mapeado: `modoPago: r.modo_pago ?? 'completo'`, `montoAdelanto: r.monto_adelanto`, `saldoPendiente: r.saldo_pendiente ?? 0`
    - _Requirements: 5.1, 5.2_

  - [x] 10.2 Agregar columna "Modo" en la tabla de reservas del panel admin
    - Mostrar badge "Parcial" (color naranja/amarillo) o "Completo" (color verde) según `modoPago`
    - _Requirements: 5.1_

  - [x] 10.3 Agregar filtro por `modo_pago` en los tabs o como selector adicional
    - Añadir tab o selector "Parcial" / "Completo" para filtrar la lista
    - _Requirements: 5.3_

  - [x] 10.4 Actualizar el modal de detalle para mostrar adelanto, saldo pendiente y total
    - Cuando `modoPago === 'parcial'`: mostrar desglose "Adelanto cobrado online: S/ X", "Saldo pendiente en cancha: S/ Y", "Pago total: S/ Z"
    - _Requirements: 5.2, 5.4_

- [x] 11. Panel `/admin-cancha/reservas` — botón "Marcar saldo cobrado"
  - [x] 11.1 Extender el tipo `Reserva` local y el mapeo de datos en `reload()`
    - En `app/admin-cancha/reservas/page.tsx`, agregar al tipo local: `modo_pago`, `monto_adelanto`, `saldo_pendiente`, `saldo_cobrado`, `saldo_cobrado_en`
    - Agregar al mapeo en `reload()`: los nuevos campos con defaults `?? 'completo'`, `?? 0`, `?? false`
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 11.2 Agregar columna "Saldo" en la tabla del panel admin-cancha
    - Mostrar `saldo_pendiente` cuando `modo_pago === 'parcial'` y `saldo_cobrado === false`
    - Mostrar "Pago completo ✓" cuando `saldo_cobrado === true`
    - _Requirements: 6.3, 6.4_

  - [x] 11.3 Agregar función `marcarSaldoCobrado` y botón en el modal de detalle
    - Implementar `marcarSaldoCobrado(id: string)` que llama a `PATCH /api/reservas/update` con `{ saldo_cobrado: true }`
    - En el modal de detalle, mostrar botón "Marcar saldo cobrado" cuando `modo_pago === 'parcial'` y `saldo_cobrado === false`
    - Mostrar indicador "Pago completo ✓" cuando `saldo_cobrado === true`
    - Usar optimistic update: actualizar estado local inmediatamente, luego confirmar con el servidor
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 12. Checkpoint final — Verificar todos los flujos y tests
  - Asegurar que todos los tests pasan, preguntar al usuario si hay dudas antes de continuar.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los tests de propiedad usan **fast-check** con mínimo 100 iteraciones (`numRuns: 100`)
- Cada test de propiedad debe incluir el tag: `// Feature: pago-parcial-reservas, Property N: <texto>`
- La compatibilidad hacia atrás se garantiza con el operador `??` en todos los componentes frontend: `r.modo_pago ?? 'completo'`, `r.saldo_pendiente ?? 0`
- El `precio` en el campo de la reserva sigue siendo el monto total; `monto_adelanto` es lo que se paga online
