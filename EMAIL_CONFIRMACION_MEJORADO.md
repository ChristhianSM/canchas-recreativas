# Email de Confirmación Mejorado - Botón "Ver mi reserva"

## Problema
Cuando el administrador confirmaba una reserva, el usuario recibía un correo de confirmación pero **no incluía el botón "Ver mi reserva"** ni el código de reserva. Esto obligaba al usuario a buscar el correo anterior (de reserva recibida) si quería cancelar la reserva.

## Solución Implementada

### 1. Actualizada la interfaz `ReservaEmailData` (`lib/email.ts`)
Agregados dos nuevos campos obligatorios:
```typescript
interface ReservaEmailData {
  // ... campos existentes
  reservaId: string;  // ✅ Nuevo
  baseUrl: string;    // ✅ Nuevo
}
```

### 2. Actualizada la función `sendReservaEmail` (`lib/email.ts`)

#### A. Extracción de parámetros:
```typescript
const { toEmail, toName, canchaNombre, fecha, hora, precio, estado, reservaId, baseUrl } = data;
```

#### B. Generación del link y código:
```typescript
const linkReserva = `${baseUrl}/mi-reserva?id=${reservaId}`;
const codigoCorto = reservaId.slice(-6).toUpperCase();
```

#### C. Agregado al HTML del correo (solo si está confirmada):
```html
<!-- Código de reserva -->
<tr>
  <td style="padding:20px 32px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#6b7280;">Código de tu reserva</p>
    <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#111827;letter-spacing:4px;">${codigoCorto}</p>
  </td>
</tr>

<!-- Botón ver reserva -->
<tr>
  <td style="padding:24px 32px 0;text-align:center;">
    <a href="${linkReserva}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">
      Ver mi reserva
    </a>
    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
      Desde este link puedes ver el estado y cancelar si lo necesitas
    </p>
  </td>
</tr>
```

**Nota:** El código y botón solo aparecen si `estado === 'confirmada'` (no en rechazadas).

### 3. Actualizadas las llamadas a `sendReservaEmail`

Se actualizaron **3 archivos** que llaman a esta función:

#### A. `app/api/reservas/[id]/route.ts`
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
await sendReservaEmail({
  // ... campos existentes
  reservaId: reserva.id,
  baseUrl,
});
```

#### B. `app/api/reservas/update/route.ts`
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
await sendReservaEmail({
  // ... campos existentes
  reservaId: reserva.id,
  baseUrl,
});
```

#### C. `app/api/admin/reservas/[id]/route.ts`
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
await sendReservaEmail({
  // ... campos existentes
  reservaId: reserva.id,
  baseUrl,
});
```

## Resultado Final

### Correo de Confirmación Ahora Incluye:

1. ✅ **Código de reserva** (6 caracteres en mayúsculas)
   - Ejemplo: `6EC428`
   - Fácil de recordar y compartir

2. ✅ **Botón "Ver mi reserva"** (verde, destacado)
   - Link directo a `/mi-reserva?id={reservaId}`
   - Permite ver el estado y cancelar si es necesario

3. ✅ **Texto explicativo**
   - "Desde este link puedes ver el estado y cancelar si lo necesitas"

### Comparación:

**Antes:**
- Correo de confirmación: ✅ Info básica, ❌ Sin botón, ❌ Sin código
- Usuario tenía que buscar el correo anterior para cancelar

**Después:**
- Correo de confirmación: ✅ Info básica, ✅ Con botón, ✅ Con código
- Usuario puede cancelar directamente desde el correo de confirmación

## Archivos Modificados

1. ✅ `lib/email.ts` - Función `sendReservaEmail` actualizada
2. ✅ `app/api/reservas/[id]/route.ts` - Llamada actualizada
3. ✅ `app/api/reservas/update/route.ts` - Llamada actualizada
4. ✅ `app/api/admin/reservas/[id]/route.ts` - Llamada actualizada

## Variable de Entorno Requerida

Asegúrate de tener configurada la variable:
```env
NEXT_PUBLIC_BASE_URL=https://tu-dominio.com
```

Si no está configurada, usa el fallback: `http://localhost:3000`

## Beneficios UX

✅ **Mejor experiencia:** Usuario tiene toda la info en un solo correo
✅ **Menos fricción:** No necesita buscar correos anteriores
✅ **Más claro:** Código de reserva visible y fácil de compartir
✅ **Acceso rápido:** Un click para ver/cancelar la reserva
✅ **Consistencia:** Ambos correos (recibida y confirmada) tienen el mismo formato
