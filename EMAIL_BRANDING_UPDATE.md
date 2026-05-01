# Actualización de Branding en Emails

## Cambios Realizados

Se actualizó el branding de los correos electrónicos de "Cancha Piura" a "CanchaGo" y se agregó el logo de la aplicación.

### 1. **Nombre del remitente**
- ❌ Antes: `'Cancha Piura'`
- ✅ Ahora: `'CanchaGo'`

### 2. **Header del email**
- ❌ Antes: Emoji ⚽ + texto "Cancha Piura"
- ✅ Ahora: Logo de CanchaGo (`/images/logo.png`)
  - Altura: 48px
  - Ancho: automático (mantiene proporción)
  - Centrado en el header

### 3. **Footer del email**
- ❌ Antes: "Este correo fue enviado automáticamente por Cancha Piura"
- ✅ Ahora: "Este correo fue enviado automáticamente por CanchaGo"

## Archivos Modificados

### `lib/email.ts`
- Función `sendReservaRecibidaEmail()`:
  - Actualizado `fromName` default a `'CanchaGo'`
  - Reemplazado emoji + texto por `<img>` del logo
  - Actualizado footer con nuevo nombre
  
- Función `sendReservaEmail()`:
  - Actualizado `fromName` default a `'CanchaGo'`
  - Reemplazado emoji + texto por `<img>` del logo
  - Actualizado footer con nuevo nombre

### `app/api/debug-email/route.ts`
- Actualizado nombre del remitente a `'CanchaGo'`
- Actualizado subject del email de prueba

## Tipos de Emails Afectados

### 1. **Email de Reserva Recibida** (Pendiente)
```
Asunto: ⏳ Reserva recibida — [Nombre de la cancha]
Estado: Pendiente de confirmación
```

### 2. **Email de Reserva Confirmada**
```
Asunto: ✅ Reserva confirmada — [Nombre de la cancha]
Estado: Confirmada
```

### 3. **Email de Reserva Rechazada**
```
Asunto: ❌ Reserva rechazada — [Nombre de la cancha]
Estado: Rechazada
```

## Estructura del Header

```html
<tr>
  <td style="background:#111827;padding:28px 32px;text-align:center;">
    <img src="${baseUrl}/images/logo.png" alt="CanchaGo" style="height:48px;width:auto;margin:0 auto;display:block;" />
    <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">Sistema de reservas</p>
  </td>
</tr>
```

## Notas Importantes

1. **Logo URL**: El logo se carga desde `${baseUrl}/images/logo.png`, donde `baseUrl` es el dominio de la aplicación (ej: `https://canchago.com`)

2. **Compatibilidad**: El logo usa estilos inline para máxima compatibilidad con clientes de email

3. **Fallback**: Si el logo no carga, el atributo `alt="CanchaGo"` mostrará el nombre de la aplicación

4. **Responsive**: El logo mantiene su proporción (aspect ratio) automáticamente con `width:auto`

## Testing

Para probar los emails actualizados:

```bash
# Email de prueba
GET /api/debug-email?to=tu@correo.com

# Crear una reserva real para recibir los emails actualizados
```

## Resultado Visual

### Antes
```
┌─────────────────────────┐
│   ⚽ Cancha Piura       │
│   Sistema de reservas   │
└─────────────────────────┘
```

### Ahora
```
┌─────────────────────────┐
│   [LOGO CANCHAGO]       │
│   Sistema de reservas   │
└─────────────────────────┘
```

---

**Fecha de actualización**: 2026-04-30
**Archivos modificados**: 2
**Funciones actualizadas**: 3
