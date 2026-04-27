# Diagnóstico: Error "Link inválido" en Recuperación de Contraseña

## Problema
El usuario recibe el email de recuperación pero al hacer click en el link, aparece:
**"Link inválido - El link expiró o ya fue usado"**

## Causas Más Probables

### 1. ❌ Redirect URL No Configurada en Supabase
**Síntoma**: El link se ve correcto pero no funciona

**Verificación**:
1. Ve a Supabase Dashboard
2. Project Settings → Authentication → URL Configuration
3. Busca "Redirect URLs"
4. Verifica que incluya: `http://localhost:3000/auth/reset-password` (desarrollo)
5. Y también: `https://tudominio.com/auth/reset-password` (producción)

**Solución**:
- Agrega la URL de redirect correcta
- Guarda los cambios
- Intenta de nuevo

### 2. ❌ Email Template No Habilitado
**Síntoma**: El email se envía pero con link incorrecto

**Verificación**:
1. Ve a Supabase Dashboard
2. Project Settings → Email Templates
3. Busca "Password Reset"
4. Verifica que esté habilitado (toggle verde)
5. Revisa el template - debe incluir `{{ .ConfirmationURL }}`

**Solución**:
- Habilita el template si está deshabilitado
- Verifica que el template sea correcto
- Guarda los cambios

### 3. ❌ Problema con PKCE Flow
**Síntoma**: El código no se intercambia correctamente

**Verificación**:
1. Abre DevTools (F12)
2. Ve a Network
3. Haz click en el link de recuperación
4. Busca la request a `/auth/reset-password`
5. Revisa los parámetros de la URL:
   - Debe tener `?code=...` (PKCE flow)
   - O `?access_token=...&refresh_token=...` (legacy flow)

**Solución**:
- Si no hay parámetros, el link está mal formado
- Verifica que el email template en Supabase sea correcto

### 4. ❌ Link Expirado
**Síntoma**: El link funciona inmediatamente pero no después de 1 hora

**Verificación**:
- Los links de Supabase expiran después de 1 hora
- Esto es normal y esperado

**Solución**:
- Solicita un nuevo link si pasó más de 1 hora

## Pasos para Diagnosticar

### Paso 1: Verificar Configuración de Supabase

```
1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. Project Settings (engranaje abajo a la izquierda)
4. Authentication
5. Verifica:
   - ✅ URL Configuration → Redirect URLs
   - ✅ Email Templates → Password Reset (habilitado)
```

### Paso 2: Revisar el Email Recibido

Cuando recibas el email de recuperación:
1. Abre el email
2. Haz click derecho en el link
3. Selecciona "Copiar link"
4. Pega en un editor de texto
5. Verifica que contenga:
   - `code=...` (PKCE) O
   - `access_token=...&refresh_token=...` (legacy)

**Ejemplo de link correcto**:
```
https://tudominio.com/auth/reset-password?code=abc123def456
```

### Paso 3: Revisar Logs en Supabase

1. Ve a Supabase Dashboard
2. Logs → Auth
3. Busca intentos de reset de contraseña
4. Revisa los errores específicos

### Paso 4: Probar en DevTools

Abre DevTools (F12) y ejecuta:

```javascript
// Ver parámetros de la URL actual
const params = new URLSearchParams(window.location.search);
console.log('Code:', params.get('code'));
console.log('Access Token:', params.get('access_token'));
console.log('Refresh Token:', params.get('refresh_token'));

// Ver si hay sesión activa
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

## Soluciones Rápidas

### Solución 1: Agregar Redirect URL

1. Ve a Supabase Dashboard
2. Project Settings → Authentication
3. URL Configuration → Redirect URLs
4. Agrega:
   - `http://localhost:3000/auth/reset-password` (desarrollo)
   - `https://tudominio.com/auth/reset-password` (producción)
5. Guarda
6. Intenta de nuevo

### Solución 2: Verificar Email Template

1. Ve a Supabase Dashboard
2. Project Settings → Email Templates
3. Busca "Password Reset"
4. Verifica que esté habilitado
5. Revisa que el template contenga `{{ .ConfirmationURL }}`
6. Guarda
7. Intenta de nuevo

### Solución 3: Limpiar Cache y Cookies

```javascript
// En DevTools Console:
localStorage.clear();
sessionStorage.clear();
// Luego recarga la página
location.reload();
```

### Solución 4: Usar Link Directo

Si el email no funciona, puedes probar el link directamente:

1. Copia el link del email
2. Pégalo en la barra de direcciones
3. Presiona Enter
4. Si funciona, el problema es con el email
5. Si no funciona, el problema es con la configuración de Supabase

## Checklist de Verificación

- [ ] Redirect URL está configurada en Supabase
- [ ] Email Template "Password Reset" está habilitado
- [ ] El email contiene un link con `code=...` o `access_token=...`
- [ ] El link no ha expirado (menos de 1 hora)
- [ ] El usuario existe en Supabase Auth
- [ ] No hay problemas de CORS
- [ ] Las variables de entorno son correctas

## Información Técnica

### Flujo PKCE (Recomendado)
```
1. Usuario solicita reset
2. Supabase envía email con link: /auth/reset-password?code=xxx
3. Página intercambia code por sesión: exchangeCodeForSession(code)
4. Usuario puede cambiar contraseña
```

### Flujo Legacy (Antiguo)
```
1. Usuario solicita reset
2. Supabase envía email con link: /auth/reset-password?access_token=xxx&refresh_token=yyy
3. Página establece sesión: setSession({ access_token, refresh_token })
4. Usuario puede cambiar contraseña
```

## Próximos Pasos

1. **Verifica la configuración de Supabase** (Paso 1 arriba)
2. **Revisa el email recibido** (Paso 2 arriba)
3. **Abre DevTools y revisa los logs** (Paso 4 arriba)
4. **Aplica la solución correspondiente**

Si después de esto sigue sin funcionar, proporciona:
- El link exacto del email (sin datos sensibles)
- El error exacto que ves
- Los logs de Supabase
- Los logs de DevTools Console

