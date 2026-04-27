# Verificación Completa: Recuperación de Contraseña

## Guía Paso a Paso para Diagnosticar el Problema

### Paso 1: Verificar Configuración en Supabase Dashboard

#### 1.1 Redirect URLs

1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. Project Settings (engranaje abajo a la izquierda)
4. Authentication → URL Configuration
5. Busca "Redirect URLs"

**Debe contener**:
```
http://localhost:3000/auth/reset-password
```

Si NO está, **AGREGA ESTA URL** y guarda.

#### 1.2 Email Template

1. Project Settings → Email Templates
2. Busca "Password Reset"
3. Verifica que esté **habilitado** (toggle verde)
4. Haz click en "Edit" para revisar el contenido

**Debe contener**:
```
{{ .ConfirmationURL }}
```

Si NO está habilitado, **HABILÍTALO** y guarda.

#### 1.3 Email Sender

1. Project Settings → Email Templates
2. Busca "Email Sender" en la parte superior
3. Verifica que esté configurado

**Debe tener**:
- From Email: algo como `noreply@...`
- From Name: `Cancha Piura` o similar

---

### Paso 2: Probar Envío de Email

#### 2.1 Enviar Email de Prueba desde Supabase

1. Project Settings → Email Templates
2. Busca "Password Reset"
3. Haz click en "Send Test Email"
4. Ingresa tu email
5. Haz click en "Send"

**Resultado esperado**: Recibes un email en 1-2 minutos

**Si NO recibes**:
- Revisa carpeta de spam
- Verifica que el email esté correcto
- Revisa los logs en Supabase Dashboard → Logs → Auth

#### 2.2 Probar desde la App

1. Ve a http://localhost:3000/recuperar-contrasena
2. Ingresa tu email
3. Haz click en "Enviar link de recuperación"

**Resultado esperado**: Ves "Revisa tu correo"

**Si ves error**:
- Abre DevTools (F12)
- Ve a Console
- Copia el error exacto
- Proporciona el error

---

### Paso 3: Revisar el Email Recibido

#### 3.1 Contenido del Email

Cuando recibas el email:
1. Abre el email
2. Busca el link de recuperación
3. Haz click derecho en el link
4. Selecciona "Copiar link"
5. Pega en un editor de texto

**Debe verse así**:
```
https://localhost:3000/auth/reset-password?code=abc123def456...
```

O en producción:
```
https://tudominio.com/auth/reset-password?code=abc123def456...
```

**Debe tener**:
- ✅ `?code=...` (PKCE flow) O
- ✅ `?access_token=...&refresh_token=...` (legacy flow)

**Si NO tiene parámetros**:
- El email template está mal configurado
- Ve a Paso 1.2 y verifica el template

#### 3.2 Probar el Link

1. Copia el link del email
2. Pégalo en la barra de direcciones
3. Presiona Enter

**Resultado esperado**: Ves la página "Nueva contraseña"

**Si ves error**:
- Abre DevTools (F12)
- Ve a Console
- Copia el error exacto
- Proporciona el error

---

### Paso 4: Revisar Logs en DevTools

#### 4.1 Abrir DevTools

1. Presiona F12 (o Ctrl+Shift+I en Windows/Linux, Cmd+Option+I en Mac)
2. Ve a la pestaña "Console"

#### 4.2 Revisar Logs

Cuando hagas click en el link de recuperación, deberías ver logs como:

```
URL params: [["code","abc123def456..."]]
Using PKCE flow with code: abc123def456...
Session established successfully
```

**Si ves error**:
```
Error exchanging code: ...
```

Copia el error exacto y proporciona.

#### 4.3 Probar Manualmente

En la consola de DevTools, ejecuta:

```javascript
// Ver parámetros de la URL
const params = new URLSearchParams(window.location.search);
console.log('Code:', params.get('code'));
console.log('Access Token:', params.get('access_token'));
console.log('Refresh Token:', params.get('refresh_token'));
console.log('Error Code:', params.get('error_code'));
console.log('Error Description:', params.get('error_description'));
```

Copia la salida y proporciona.

---

### Paso 5: Revisar Logs en Supabase

1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. Logs (en el menú izquierdo)
4. Selecciona "Auth"
5. Busca intentos de reset de contraseña

**Busca eventos como**:
- `password_recovery_requested`
- `password_recovery_token_created`
- `password_recovery_token_used`

**Si ves errores**, copia el error exacto.

---

### Paso 6: Verificar Base de Datos

#### 6.1 Verificar que el Usuario Existe

1. Ve a Supabase Dashboard
2. Authentication → Users
3. Busca tu email en la lista

**Debe estar ahí**.

Si NO está:
- Registra un nuevo usuario primero
- Ve a http://localhost:3000/registro
- Completa el formulario

#### 6.2 Verificar Tabla de Usuarios

1. Ve a Supabase Dashboard
2. SQL Editor
3. Ejecuta:

```sql
SELECT id, email, created_at FROM auth.users WHERE email = 'tu@correo.com';
```

**Debe retornar una fila**.

---

## Checklist de Verificación

Marca cada paso que completaste:

- [ ] Redirect URL configurada en Supabase
- [ ] Email Template "Password Reset" habilitado
- [ ] Email Sender configurado
- [ ] Email de prueba enviado correctamente
- [ ] Email contiene link con `code=...` o `access_token=...`
- [ ] Link funciona (puedo acceder a /auth/reset-password)
- [ ] DevTools Console muestra "Session established successfully"
- [ ] Puedo cambiar la contraseña
- [ ] Puedo iniciar sesión con la nueva contraseña

---

## Soluciones Rápidas

### Si no recibo el email

```
1. Revisa carpeta de spam
2. Verifica que el email sea correcto
3. Espera 2-3 minutos
4. Intenta de nuevo
5. Revisa logs en Supabase Dashboard → Logs → Auth
```

### Si el link no funciona

```
1. Verifica que la Redirect URL esté en Supabase
2. Verifica que el link no haya expirado (expira en 1 hora)
3. Abre DevTools y revisa Console para errores
4. Copia el error exacto y proporciona
```

### Si el link expiró

```
1. Solicita un nuevo link
2. Haz click en el link inmediatamente después de recibirlo
3. Los links expiran después de 1 hora (esto es normal)
```

### Si ves "Link inválido"

```
1. Verifica que el link no haya expirado
2. Verifica que el link no haya sido usado antes
3. Solicita un nuevo link
4. Abre DevTools y revisa Console para errores específicos
```

---

## Información para Proporcionar si Necesitas Ayuda

Si después de esto sigue sin funcionar, proporciona:

1. **El link exacto del email** (sin datos sensibles):
   ```
   https://localhost:3000/auth/reset-password?code=...
   ```

2. **El error exacto que ves**:
   ```
   "Link inválido - El link expiró o ya fue usado"
   ```

3. **Los logs de DevTools Console**:
   - Abre DevTools (F12)
   - Ve a Console
   - Copia todo lo que ves
   - Proporciona

4. **Los logs de Supabase**:
   - Ve a Supabase Dashboard → Logs → Auth
   - Busca intentos de reset
   - Copia los errores

5. **Tu email de prueba**:
   ```
   usuario@canchago.com
   ```

---

## Próximos Pasos

1. **Sigue los pasos 1-6 arriba**
2. **Marca el checklist**
3. **Si todo está marcado**, el problema está resuelto
4. **Si algo no está marcado**, sigue la solución rápida correspondiente
5. **Si sigue sin funcionar**, proporciona la información arriba

