# Troubleshooting: Error al Recuperar Contraseña

## Error: "No se pudo enviar el correo. Verifica el email ingresado."

### Causas Posibles

#### 1. El Email No Existe en Supabase Auth
**Síntoma**: El error aparece incluso con un email válido

**Solución**:
- Verifica que el usuario esté registrado en Supabase Auth
- Ve a Supabase Dashboard → Authentication → Users
- Busca el email en la lista
- Si no está, el usuario debe registrarse primero

#### 2. Supabase Email No Está Configurado
**Síntoma**: El error aparece para todos los emails

**Solución**:
- Ve a Supabase Dashboard → Project Settings → Email Templates
- Verifica que esté habilitado "Password Reset"
- Configura el template de recuperación de contraseña
- Asegúrate de que el email de remitente esté configurado

#### 3. Rate Limiting
**Síntoma**: El error aparece después de varios intentos

**Solución**:
- Espera 15-30 minutos antes de intentar de nuevo
- Supabase tiene límites de rate limiting para prevenir abuso
- Intenta con otro email si es posible

#### 4. Problema de Configuración de Supabase
**Síntoma**: El error persiste después de verificar todo

**Solución**:
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` sea correcto
- Verifica que `NEXT_PUBLIC_SUPABASE_ANON_KEY` sea correcto
- Reinicia la aplicación
- Limpia el cache del navegador

### Pasos para Diagnosticar

#### Paso 1: Verificar que el Usuario Existe
```sql
-- En Supabase SQL Editor
SELECT id, email, created_at FROM auth.users WHERE email = 'tu@correo.com';
```

Si no retorna nada, el usuario no existe.

#### Paso 2: Verificar Configuración de Email
1. Ve a Supabase Dashboard
2. Project Settings → Email Templates
3. Verifica que "Password Reset" esté habilitado
4. Revisa el template de recuperación

#### Paso 3: Revisar Logs
1. Ve a Supabase Dashboard
2. Logs → Auth
3. Busca intentos de reset de contraseña
4. Revisa los errores específicos

#### Paso 4: Probar con Supabase CLI
```bash
# Instalar Supabase CLI
npm install -g supabase

# Conectar a tu proyecto
supabase link --project-ref tu_project_ref

# Ver logs en tiempo real
supabase functions logs
```

### Soluciones Rápidas

#### Solución 1: Crear el Usuario Primero
Si el usuario no existe, debe registrarse:
1. Ve a `/registro`
2. Completa el formulario
3. Luego intenta recuperar contraseña

#### Solución 2: Usar Email de Prueba
Supabase proporciona emails de prueba:
- `test@example.com`
- `user@example.com`

Intenta con uno de estos para verificar que funciona.

#### Solución 3: Verificar Variables de Entorno
```bash
# En .env.local, verifica:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

#### Solución 4: Limpiar Cache
```bash
# Limpiar cache del navegador
# DevTools → Application → Clear Site Data

# O en la terminal:
rm -rf .next
npm run dev
```

### Verificación en Supabase Dashboard

1. **Authentication → Users**
   - Verifica que el usuario exista
   - Verifica que el email sea correcto

2. **Project Settings → Email Templates**
   - Verifica que "Password Reset" esté habilitado
   - Revisa el template

3. **Logs → Auth**
   - Busca intentos de reset
   - Revisa errores específicos

### Mensajes de Error Específicos

| Error | Causa | Solución |
|-------|-------|----------|
| "not found" | Email no existe | Registrarse primero |
| "rate limit" | Demasiados intentos | Esperar 15-30 min |
| "invalid email" | Email inválido | Verificar formato |
| "disabled" | Email deshabilitado | Contactar soporte |

### Flujo Correcto de Recuperación

```
1. Usuario va a /recuperar-contrasena
   ↓
2. Ingresa su email
   ↓
3. Sistema verifica que existe en Auth
   ↓
4. Supabase envía email de recuperación
   ↓
5. Usuario recibe email
   ↓
6. Usuario hace click en link
   ↓
7. Usuario es redirigido a /auth/reset-password
   ↓
8. Usuario ingresa nueva contraseña
   ↓
9. Contraseña se actualiza
   ↓
10. Usuario puede iniciar sesión con nueva contraseña
```

### Debugging en Consola

Abre DevTools (F12) y revisa:

```javascript
// Ver errores de Supabase
console.log('Error:', err);

// Ver respuesta completa
console.log('Response:', response);

// Ver variables de entorno
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```

### Contactar Soporte

Si nada funciona:

1. **Supabase Support**: https://supabase.com/support
2. **Discord Community**: https://discord.supabase.com
3. **GitHub Issues**: https://github.com/supabase/supabase/issues

Proporciona:
- El email que intentaste usar
- El error exacto que recibiste
- Los pasos que seguiste
- Tu proyecto ID de Supabase

### Cambios Realizados

He actualizado `app/recuperar-contrasena/page.tsx` para:
- ✅ Mostrar errores más específicos
- ✅ Agregar try-catch para errores inesperados
- ✅ Loguear errores en consola para debugging
- ✅ Diferenciar entre "email no existe" y otros errores

Ahora cuando intentes recuperar contraseña, verás mensajes más claros que te ayudarán a identificar el problema.
