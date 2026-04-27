# Configuración de Supabase para Recuperación de Contraseña

## Paso 1: Configurar Redirect URLs

### En Supabase Dashboard:

1. Ve a **Project Settings** (engranaje abajo a la izquierda)
2. Selecciona **Authentication** en el menú izquierdo
3. Busca **URL Configuration**
4. En **Redirect URLs**, agrega:

**Para Desarrollo (localhost)**:
```
http://localhost:3000/auth/reset-password
```

**Para Producción**:
```
https://tudominio.com/auth/reset-password
https://www.tudominio.com/auth/reset-password
```

5. Haz click en **Save**

### Ejemplo de cómo se ve:
```
Redirect URLs:
- http://localhost:3000/auth/reset-password
- https://canchapuira.com/auth/reset-password
- https://www.canchapuira.com/auth/reset-password
```

---

## Paso 2: Configurar Email Template

### En Supabase Dashboard:

1. Ve a **Project Settings** (engranaje abajo a la izquierda)
2. Selecciona **Email Templates** en el menú izquierdo
3. Busca **Password Reset** en la lista
4. Verifica que esté **habilitado** (toggle verde)
5. Haz click en **Edit** para revisar el template

### Template Correcto:

El template debe contener:
```
{{ .ConfirmationURL }}
```

Esto genera automáticamente el link de recuperación.

**Ejemplo de template**:
```html
<h2>Recuperar Contraseña</h2>
<p>Haz click en el siguiente link para recuperar tu contraseña:</p>
<a href="{{ .ConfirmationURL }}">Recuperar Contraseña</a>
<p>Este link expira en 1 hora.</p>
```

6. Si hiciste cambios, haz click en **Save**

---

## Paso 3: Configurar Email Remitente

### En Supabase Dashboard:

1. Ve a **Project Settings**
2. Selecciona **Email Templates**
3. Busca **Email Sender** en la parte superior
4. Verifica que esté configurado:
   - **From Email**: `noreply@tudominio.com` o similar
   - **From Name**: `Cancha Piura` o tu nombre de app

### Ejemplo:
```
From Email: noreply@canchapuira.com
From Name: Cancha Piura
```

---

## Paso 4: Verificar Configuración de SMTP (Opcional)

Si usas un servicio de email externo como Brevo:

1. Ve a **Project Settings**
2. Selecciona **Email Templates**
3. Busca **SMTP Settings**
4. Verifica que esté configurado correctamente

**Para Brevo**:
- Host: `smtp-relay.brevo.com`
- Port: `587`
- Username: Tu email de Brevo
- Password: Tu API key de Brevo

---

## Paso 5: Probar la Configuración

### Test 1: Enviar Email de Prueba

1. Ve a **Project Settings**
2. Selecciona **Email Templates**
3. Busca **Password Reset**
4. Haz click en **Send Test Email**
5. Ingresa tu email
6. Verifica que recibas el email

### Test 2: Hacer Reset Completo

1. Ve a tu app en `http://localhost:3000/recuperar-contrasena`
2. Ingresa tu email
3. Verifica que recibas el email
4. Haz click en el link
5. Verifica que puedas cambiar la contraseña

### Test 3: Revisar Logs

1. Ve a **Logs** en Supabase Dashboard
2. Selecciona **Auth**
3. Busca intentos de reset
4. Revisa si hay errores

---

## Checklist de Verificación

- [ ] Redirect URL configurada en Supabase
- [ ] Email Template "Password Reset" habilitado
- [ ] Email Sender configurado
- [ ] SMTP Settings configurado (si aplica)
- [ ] Test email enviado correctamente
- [ ] Link en email funciona
- [ ] Puedo cambiar contraseña

---

## Solución de Problemas

### Problema: No recibo el email

**Soluciones**:
1. Verifica que el email esté en la carpeta de spam
2. Verifica que el usuario exista en Supabase Auth
3. Revisa los logs en Supabase Dashboard → Logs → Auth
4. Verifica que el Email Template esté habilitado

### Problema: El link no funciona

**Soluciones**:
1. Verifica que la Redirect URL esté configurada correctamente
2. Verifica que el link no haya expirado (expira en 1 hora)
3. Revisa los parámetros del link (debe tener `code=...`)
4. Abre DevTools (F12) y revisa la consola para errores

### Problema: El link expiró

**Soluciones**:
1. Los links expiran después de 1 hora (esto es normal)
2. Solicita un nuevo link
3. Haz click en el link inmediatamente después de recibirlo

### Problema: Error "invalid_code"

**Soluciones**:
1. El código es inválido o ya fue usado
2. Solicita un nuevo link
3. Verifica que no haya caracteres especiales en la URL

---

## Información Técnica

### Flujo de Recuperación de Contraseña

```
1. Usuario va a /recuperar-contrasena
   ↓
2. Ingresa su email
   ↓
3. Sistema llama a supabase.auth.resetPasswordForEmail(email)
   ↓
4. Supabase envía email con link de recuperación
   ↓
5. Email contiene: /auth/reset-password?code=xxx
   ↓
6. Usuario hace click en el link
   ↓
7. Página intercambia code por sesión: exchangeCodeForSession(code)
   ↓
8. Usuario puede cambiar contraseña
   ↓
9. Contraseña se actualiza con supabase.auth.updateUser({ password })
   ↓
10. Usuario es redirigido a /login
```

### Variables de Entorno Necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Estas ya están configuradas en `.env.local`.

---

## Comandos Útiles

### Ver logs en tiempo real (Supabase CLI)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Conectar a tu proyecto
supabase link --project-ref tu_project_ref

# Ver logs de auth
supabase functions logs
```

### Probar endpoint en terminal

```bash
# Solicitar reset de contraseña
curl -X POST https://xxxxx.supabase.co/auth/v1/recover \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@correo.com"}'
```

---

## Próximos Pasos

1. **Sigue los pasos 1-4 arriba** para configurar Supabase
2. **Haz el Test 2** para verificar que funciona
3. **Si hay problemas**, revisa la sección "Solución de Problemas"
4. **Si sigue sin funcionar**, proporciona:
   - El link exacto del email (sin datos sensibles)
   - El error exacto que ves
   - Los logs de Supabase
   - Los logs de DevTools Console

