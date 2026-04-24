# Troubleshooting - Reservas no aparecen

## Problema
Cuando un usuario hace una reserva, no aparece en "Mis Reservas" ni en el panel de admin.

## Causas Posibles y Soluciones

### 1. Token no se está guardando correctamente
**Síntoma:** El usuario inicia sesión pero el token no se guarda en localStorage

**Solución:**
- Verificar que `apiLogin()` retorna correctamente el token
- Verificar que `saveToken()` se está llamando en `lib/api.ts`
- Abrir DevTools → Application → Local Storage → buscar `cp_token`

### 2. Usuario no se está identificando en el endpoint
**Síntoma:** La reserva se crea pero con `usuario_id = null`

**Solución:**
- Verificar que el token se está enviando en el header `Authorization: Bearer <token>`
- Probar el endpoint `/api/auth/me` para verificar que el token es válido
- Verificar que `createServiceClient()` está usando las credenciales correctas de Supabase

### 3. Endpoint GET de reservas no retorna nada
**Síntoma:** La página de "Mis Reservas" está vacía

**Solución:**
- Verificar que el token se está enviando correctamente
- Verificar que `usuario_id` en la BD coincide con el ID del usuario autenticado
- Probar directamente en Supabase Dashboard → SQL Editor:
  ```sql
  SELECT * FROM reservas WHERE usuario_id = '<user_id>';
  ```

### 4. Problema con Row Level Security (RLS)
**Síntoma:** El endpoint retorna error 403 o datos vacíos

**Solución:**
- Verificar que las políticas RLS en Supabase están correctas
- La política debe permitir que el usuario vea solo sus propias reservas:
  ```sql
  CREATE POLICY "reservas_own" ON public.reservas
    FOR ALL USING (auth.uid() = usuario_id);
  ```

## Pasos para Verificar

### 1. Verificar que el usuario se registró correctamente
```bash
# En Supabase Dashboard → SQL Editor
SELECT * FROM usuarios WHERE email = 'test@example.com';
```

### 2. Verificar que el token es válido
```bash
# En DevTools → Network → hacer login
# Copiar el token de la respuesta
# Luego en DevTools → Console:
fetch('/api/auth/me', {
  headers: { 'Authorization': 'Bearer <token>' }
}).then(r => r.json()).then(console.log)
```

### 3. Verificar que la reserva se creó
```bash
# En Supabase Dashboard → SQL Editor
SELECT * FROM reservas ORDER BY creado_en DESC LIMIT 1;
```

### 4. Verificar que el usuario_id coincide
```bash
# Comparar el usuario_id de la reserva con el ID del usuario autenticado
SELECT id FROM usuarios WHERE email = 'test@example.com';
SELECT usuario_id FROM reservas WHERE id = '<reserva_id>';
# Deben ser iguales
```

## Cambios Realizados

✅ Endpoint GET `/api/reservas` ahora retorna array vacío en lugar de error si no hay token
✅ Endpoint POST `/api/reservas` ahora maneja mejor los errores de autenticación
✅ Función `apiGetReservas()` ahora valida que la respuesta sea un array
✅ Login ahora guarda correctamente el nombre y teléfono del usuario
✅ Registro ahora guarda los datos en `user_metadata` para que el login los recupere

## Flujo Correcto

1. Usuario se registra → se crea en Auth + tabla usuarios + loyalty
2. Usuario inicia sesión → se obtiene token + se guarda en localStorage
3. Usuario hace reserva → se envía token en header Authorization
4. Endpoint crea reserva con usuario_id del token
5. Usuario va a "Mis Reservas" → se envía token + se obtienen reservas del usuario

## Verificación Final

Después de hacer una reserva:
1. Abrir DevTools → Application → Local Storage
2. Verificar que `cp_token` existe
3. Ir a "Mis Reservas"
4. Verificar que la reserva aparece en la lista
5. Verificar que el estado es "Pendiente"


---

# Troubleshooting - Favoritos no se guardan

## Problema
Cuando un usuario marca una cancha como favorita, no se guarda en la base de datos.

## Causas Posibles y Soluciones

### 1. Token no se está enviando correctamente
**Síntoma:** El endpoint retorna error 401

**Solución:**
- Verificar que el usuario está logueado
- Verificar que `getToken()` retorna el token correctamente
- Verificar que el header `Authorization: Bearer <token>` se está enviando

### 2. Endpoint retorna error al buscar favorito existente
**Síntoma:** El endpoint retorna error 500 al intentar agregar favorito

**Solución:**
- El problema era que `.single()` lanzaba error cuando no encontraba resultados
- Ya fue arreglado: ahora usa un array y verifica `existing.length > 0`

### 3. RLS bloqueando inserciones
**Síntoma:** El endpoint retorna error 403

**Solución:**
- Verificar que la política RLS permite inserciones:
  ```sql
  CREATE POLICY "favoritos_own" ON public.favoritos
    FOR ALL USING (auth.uid() = usuario_id);
  ```

## Cambios Realizados

✅ Endpoint POST `/api/favoritos` ahora maneja correctamente cuando no hay resultados
✅ Página de cancha ahora usa `apiToggleFavorito()` cuando el usuario está logueado
✅ Página de cancha usa localStorage cuando el usuario es invitado

## Flujo Correcto

1. Usuario logueado hace click en corazón
2. Se llama a `apiToggleFavorito(canchaId)`
3. Endpoint verifica si ya existe el favorito
4. Si existe, lo borra; si no existe, lo agrega
5. Se actualiza el estado local `isFav`
6. En "Mis Reservas" → "Favoritas" aparece la cancha

## Verificación

Después de marcar una cancha como favorita:
1. Abrir DevTools → Network → buscar request a `/api/favoritos`
2. Verificar que retorna `{ agregado: true }`
3. Ir a "Mis Reservas" → "Favoritas"
4. Verificar que la cancha aparece en la lista
5. En Supabase Dashboard → SQL Editor:
   ```sql
   SELECT * FROM favoritos WHERE usuario_id = '<user_id>';
   ```


---

# Troubleshooting - Nombre de usuario no aparece en header

## Problema
Después de iniciar sesión, el nombre del usuario no aparece en el header.

## Causas Posibles y Soluciones

### 1. Usuario no se está guardando en localStorage
**Síntoma:** El header muestra botones de "Iniciar Sesión" y "Registrarse"

**Solución:**
- Verificar que `saveUser()` se está llamando después del login
- Abrir DevTools → Application → Local Storage
- Buscar `cancha_piura_user` o `cp_user`
- Verificar que contiene el nombre, email y teléfono

### 2. Header no se está actualizando después del login
**Síntoma:** El usuario se guarda pero el header no se actualiza

**Solución:**
- El header ahora escucha el evento `user-login`
- Después del login, se dispara `window.dispatchEvent(new Event('user-login'))`
- Esto hace que el header se actualice automáticamente

### 3. Nombre vacío o incorrecto
**Síntoma:** El header muestra un nombre vacío o incorrecto

**Solución:**
- Verificar que el endpoint de login retorna correctamente `user.name`
- Verificar que el registro guarda el nombre en `user_metadata`
- Verificar que `saveUser()` recibe el nombre correcto

## Cambios Realizados

✅ Header ahora escucha cambios en localStorage
✅ Header ahora escucha evento personalizado `user-login`
✅ Login dispara evento `user-login` después de guardar el usuario
✅ Registro dispara evento `user-login` después de auto-login
✅ Header obtiene usuario de `cp_user` (nuevo) o `cancha_piura_user` (legacy)

## Flujo Correcto

1. Usuario inicia sesión
2. Endpoint retorna token + datos del usuario (name, email, phone)
3. Se guarda token en `cp_token`
4. Se guarda usuario en `cancha_piura_user`
5. Se dispara evento `user-login`
6. Header escucha el evento y se actualiza
7. Header muestra el nombre del usuario

## Verificación

Después de iniciar sesión:
1. Abrir DevTools → Application → Local Storage
2. Verificar que `cancha_piura_user` contiene:
   ```json
   {
     "name": "Juan Pérez",
     "email": "juan@example.com",
     "phone": "987654321"
   }
   ```
3. Verificar que el header muestra el nombre "Juan Pérez"
4. Verificar que el avatar muestra la inicial "J"
