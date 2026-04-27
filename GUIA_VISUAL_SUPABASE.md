# Guía Visual: Configurar Supabase para Recuperación de Contraseña

## Acceso a Supabase Dashboard

1. Ve a https://app.supabase.com
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto "CanchaPiura"

---

## Configuración 1: Redirect URLs

### Ubicación en Supabase:

```
Supabase Dashboard
  ↓
Project Settings (engranaje abajo a la izquierda)
  ↓
Authentication (en el menú izquierdo)
  ↓
URL Configuration
  ↓
Redirect URLs
```

### Qué hacer:

1. Busca el campo "Redirect URLs"
2. Verifica que contenga:
   ```
   http://localhost:3000/auth/reset-password
   ```

3. Si NO está, haz click en el campo y agrega:
   ```
   http://localhost:3000/auth/reset-password
   ```

4. Para producción, también agrega:
   ```
   https://tudominio.com/auth/reset-password
   ```

5. Haz click en **Save**

### Cómo se ve:

```
┌─────────────────────────────────────────┐
│ Redirect URLs                           │
├─────────────────────────────────────────┤
│ http://localhost:3000/auth/reset-password
│ https://canchapuira.com/auth/reset-password
│                                         │
│ [+ Add URL]                             │
│                                         │
│ [Save]                                  │
└─────────────────────────────────────────┘
```

---

## Configuración 2: Email Template

### Ubicación en Supabase:

```
Supabase Dashboard
  ↓
Project Settings (engranaje abajo a la izquierda)
  ↓
Email Templates (en el menú izquierdo)
  ↓
Password Reset
```

### Qué hacer:

1. Busca "Password Reset" en la lista de templates
2. Verifica que el toggle esté **VERDE** (habilitado)
3. Si está gris, haz click en el toggle para habilitarlo
4. Haz click en **Edit** para revisar el contenido

### Contenido del Template:

El template debe contener:
```
{{ .ConfirmationURL }}
```

Esto genera automáticamente el link de recuperación.

### Cómo se ve:

```
┌─────────────────────────────────────────┐
│ Email Templates                         │
├─────────────────────────────────────────┤
│ Password Reset              [Toggle ON]  │
│                                         │
│ [Edit]  [Send Test Email]               │
│                                         │
│ Template Preview:                       │
│ ┌─────────────────────────────────────┐ │
│ │ Recuperar Contraseña                │ │
│ │                                     │ │
│ │ Haz click en el siguiente link:      │ │
│ │ {{ .ConfirmationURL }}              │ │
│ │                                     │ │
│ │ Este link expira en 1 hora.         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Configuración 3: Email Sender

### Ubicación en Supabase:

```
Supabase Dashboard
  ↓
Project Settings
  ↓
Email Templates
  ↓
Email Sender (en la parte superior)
```

### Qué hacer:

1. Busca "Email Sender" en la parte superior
2. Verifica que esté configurado:
   - **From Email**: `noreply@...` o similar
   - **From Name**: `Cancha Piura` o tu nombre de app

3. Si no está configurado, configúralo

### Cómo se ve:

```
┌─────────────────────────────────────────┐
│ Email Sender                            │
├─────────────────────────────────────────┤
│ From Email: noreply@canchapuira.com    │
│ From Name:  Cancha Piura                │
│                                         │
│ [Save]                                  │
└─────────────────────────────────────────┘
```

---

## Prueba 1: Enviar Email de Prueba

### Ubicación en Supabase:

```
Supabase Dashboard
  ↓
Project Settings
  ↓
Email Templates
  ↓
Password Reset
  ↓
[Send Test Email]
```

### Qué hacer:

1. Haz click en **Send Test Email**
2. Ingresa tu email
3. Haz click en **Send**
4. Espera 1-2 minutos
5. Revisa tu email (incluyendo spam)

### Cómo se ve:

```
┌─────────────────────────────────────────┐
│ Send Test Email                         │
├─────────────────────────────────────────┤
│ Email: [tu@correo.com____________]      │
│                                         │
│ [Send]                                  │
└─────────────────────────────────────────┘
```

---

## Prueba 2: Probar desde la App

### En tu navegador:

1. Ve a http://localhost:3000/recuperar-contrasena
2. Ingresa tu email
3. Haz click en "Enviar link de recuperación"
4. Deberías ver "Revisa tu correo"
5. Revisa tu email (incluyendo spam)
6. Haz click en el link del email

### Cómo se ve:

```
┌─────────────────────────────────────────┐
│ ¿Olvidaste tu contraseña?               │
├─────────────────────────────────────────┤
│ Correo electrónico:                     │
│ [tu@correo.com__________________]       │
│                                         │
│ [Enviar link de recuperación]           │
└─────────────────────────────────────────┘
```

Después de hacer click:

```
┌─────────────────────────────────────────┐
│ ✓ Revisa tu correo                      │
├─────────────────────────────────────────┤
│ Enviamos un link de recuperación a      │
│ tu@correo.com                           │
│                                         │
│ Si no lo ves, revisa tu carpeta de spam.│
│                                         │
│ [Volver al inicio de sesión]            │
└─────────────────────────────────────────┘
```

---

## Revisar Logs en Supabase

### Ubicación en Supabase:

```
Supabase Dashboard
  ↓
Logs (en el menú izquierdo)
  ↓
Auth
```

### Qué buscar:

Cuando hagas un reset de contraseña, deberías ver eventos como:

```
password_recovery_requested
  ↓
password_recovery_token_created
  ↓
password_recovery_token_used (cuando haces click en el link)
```

### Cómo se ve:

```
┌─────────────────────────────────────────┐
│ Auth Logs                               │
├─────────────────────────────────────────┤
│ [Filter by event type]                  │
│                                         │
│ 2024-04-26 10:30:45                     │
│ password_recovery_requested             │
│ Email: tu@correo.com                    │
│                                         │
│ 2024-04-26 10:30:46                     │
│ password_recovery_token_created         │
│ Email: tu@correo.com                    │
│                                         │
│ 2024-04-26 10:31:12                     │
│ password_recovery_token_used            │
│ Email: tu@correo.com                    │
└─────────────────────────────────────────┘
```

---

## Checklist Visual

Marca cada paso que completaste:

### Configuración
- [ ] Redirect URL agregada en Supabase
- [ ] Email Template "Password Reset" habilitado
- [ ] Email Sender configurado

### Pruebas
- [ ] Email de prueba enviado correctamente
- [ ] Email contiene link con `code=...`
- [ ] Link funciona (puedo acceder a /auth/reset-password)
- [ ] Puedo cambiar la contraseña
- [ ] Puedo iniciar sesión con la nueva contraseña

### Logs
- [ ] Logs en Supabase muestran eventos de reset
- [ ] No hay errores en los logs

---

## Solución Rápida: Si No Funciona

### Paso 1: Verifica Redirect URL
```
Project Settings → Authentication → URL Configuration
Debe contener: http://localhost:3000/auth/reset-password
```

### Paso 2: Verifica Email Template
```
Project Settings → Email Templates → Password Reset
Debe estar HABILITADO (toggle verde)
```

### Paso 3: Revisa Logs
```
Logs → Auth
Busca errores en los eventos de reset
```

### Paso 4: Abre DevTools
```
Presiona F12
Ve a Console
Copia el error exacto
```

---

## Próximos Pasos

1. **Sigue cada configuración arriba** (1, 2, 3)
2. **Haz las pruebas** (1, 2)
3. **Revisa los logs**
4. **Marca el checklist**
5. **Si todo funciona**, ¡listo!
6. **Si no funciona**, proporciona:
   - El error exacto de DevTools Console
   - Los logs de Supabase
   - El link exacto del email

