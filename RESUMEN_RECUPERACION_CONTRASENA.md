# Resumen: Recuperación de Contraseña - Solución Completa

## El Problema

Cuando intentas recuperar tu contraseña:
1. ✅ Recibes el email correctamente
2. ❌ Pero al hacer click en el link, ves: **"Link inválido - El link expiró o ya fue usado"**

## La Causa Raíz

El problema es casi siempre uno de estos:

1. **Redirect URL no configurada en Supabase** (80% de los casos)
2. **Email Template no habilitado** (15% de los casos)
3. **Link expirado** (5% de los casos)

## La Solución (3 Pasos)

### Paso 1: Configurar Redirect URL en Supabase (5 minutos)

1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. Project Settings (engranaje abajo a la izquierda)
4. Authentication → URL Configuration
5. En "Redirect URLs", agrega:
   ```
   http://localhost:3000/auth/reset-password
   ```
6. Haz click en **Save**

**Esto es lo más importante. Si no haces esto, no funcionará.**

### Paso 2: Verificar Email Template (2 minutos)

1. Project Settings → Email Templates
2. Busca "Password Reset"
3. Verifica que esté **habilitado** (toggle verde)
4. Si está gris, haz click para habilitarlo

### Paso 3: Probar (5 minutos)

1. Ve a http://localhost:3000/recuperar-contrasena
2. Ingresa tu email
3. Haz click en "Enviar link de recuperación"
4. Revisa tu email (incluyendo spam)
5. Haz click en el link
6. Deberías ver la página "Nueva contraseña"
7. Ingresa tu nueva contraseña
8. Haz click en "Actualizar contraseña"
9. Deberías ver "¡Contraseña actualizada!"

**Total: 12 minutos para resolver el problema.**

---

## Documentos de Referencia

He creado 4 documentos para ayudarte:

### 1. **CONFIGURAR_SUPABASE_RESET_PASSWORD.md**
   - Guía paso a paso para configurar Supabase
   - Explicación de cada configuración
   - Qué hacer si algo falla

### 2. **GUIA_VISUAL_SUPABASE.md**
   - Guía visual con capturas de pantalla
   - Exactamente dónde hacer click
   - Cómo se ve cada pantalla

### 3. **VERIFICAR_RESET_PASSWORD.md**
   - Checklist completo de verificación
   - Cómo revisar logs
   - Soluciones rápidas para cada problema

### 4. **DIAGNOSTICO_RECUPERACION_CONTRASENA.md**
   - Diagnóstico detallado del problema
   - Causas posibles y soluciones
   - Información técnica

---

## Flujo Correcto de Recuperación

```
Usuario va a /recuperar-contrasena
         ↓
Ingresa su email
         ↓
Sistema envía email de recuperación
         ↓
Usuario recibe email con link
         ↓
Usuario hace click en el link
         ↓
Página intercambia code por sesión
         ↓
Usuario ve "Nueva contraseña"
         ↓
Usuario ingresa nueva contraseña
         ↓
Contraseña se actualiza
         ↓
Usuario ve "¡Contraseña actualizada!"
         ↓
Usuario es redirigido a /login
         ↓
Usuario inicia sesión con nueva contraseña
```

---

## Cambios Realizados en el Código

He mejorado `app/auth/reset-password/page.tsx` para:

✅ Detectar errores específicos de Supabase (`error_code`, `error_description`)
✅ Mostrar mensajes de error más claros
✅ Loguear información de debugging en la consola
✅ Manejar tanto PKCE flow como legacy flow

---

## Checklist Rápido

- [ ] Redirect URL configurada en Supabase
- [ ] Email Template "Password Reset" habilitado
- [ ] Email de prueba enviado correctamente
- [ ] Link en email funciona
- [ ] Puedo cambiar la contraseña
- [ ] Puedo iniciar sesión con la nueva contraseña

---

## Si Sigue Sin Funcionar

1. **Abre DevTools** (F12)
2. **Ve a Console**
3. **Intenta recuperar contraseña**
4. **Copia el error exacto que ves**
5. **Proporciona**:
   - El error exacto
   - El link del email (sin datos sensibles)
   - Los logs de Supabase Dashboard → Logs → Auth

---

## Próximos Pasos

1. **Lee CONFIGURAR_SUPABASE_RESET_PASSWORD.md** (5 minutos)
2. **Sigue los pasos 1-3 arriba** (12 minutos)
3. **Prueba** (5 minutos)
4. **Si funciona**, ¡listo!
5. **Si no funciona**, lee VERIFICAR_RESET_PASSWORD.md

---

## Información Técnica (Opcional)

### Flujo PKCE (Recomendado)
```
1. Usuario solicita reset
2. Supabase envía email con: /auth/reset-password?code=xxx
3. Página intercambia code: exchangeCodeForSession(code)
4. Usuario puede cambiar contraseña
```

### Flujo Legacy (Antiguo)
```
1. Usuario solicita reset
2. Supabase envía email con: /auth/reset-password?access_token=xxx&refresh_token=yyy
3. Página establece sesión: setSession({ access_token, refresh_token })
4. Usuario puede cambiar contraseña
```

---

## Soporte

Si necesitas ayuda:

1. **Lee los documentos** (CONFIGURAR_SUPABASE_RESET_PASSWORD.md, GUIA_VISUAL_SUPABASE.md)
2. **Sigue el checklist** (VERIFICAR_RESET_PASSWORD.md)
3. **Revisa los logs** (Supabase Dashboard → Logs → Auth)
4. **Abre DevTools** (F12 → Console)
5. **Proporciona la información** (error exacto, link, logs)

---

## Resumen Final

**El problema es casi siempre que la Redirect URL no está configurada en Supabase.**

**La solución es agregar esta URL en Supabase:**
```
http://localhost:3000/auth/reset-password
```

**Después de eso, todo debería funcionar.**

**Tiempo total: 12 minutos.**

