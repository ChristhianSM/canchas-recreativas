# 🚀 Deploy Paso a Paso - 30 Minutos

## ✅ Pre-requisitos
- ✅ Proyecto verificado y listo
- ✅ Cuenta de GitHub
- ✅ Proyecto de Supabase funcionando

---

## 📋 Paso 1: Subir a GitHub (5 minutos)

### 1.1 Crear repositorio en GitHub
1. Ve a https://github.com
2. Click en **"New repository"**
3. Nombre: `cancha-piura` (o el que prefieras)
4. Descripción: `Sistema de reservas de canchas deportivas`
5. **Público** o **Privado** (tu elección)
6. **NO** marcar "Add README" (ya tienes archivos)
7. Click **"Create repository"**

### 1.2 Subir tu código
```bash
# En tu terminal, dentro de la carpeta del proyecto:
git add .
git commit -m "Ready for production deploy"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/cancha-piura.git
git push -u origin main
```

**✅ Verificar**: Ve a tu repositorio en GitHub y confirma que todos los archivos están ahí.

---

## 🌐 Paso 2: Deploy en Vercel (10 minutos)

### 2.1 Crear cuenta en Vercel
1. Ve a https://vercel.com
2. Click **"Sign Up"**
3. Selecciona **"Continue with GitHub"**
4. Autoriza Vercel para acceder a tus repositorios

### 2.2 Importar proyecto
1. En el dashboard de Vercel, click **"New Project"**
2. Busca tu repositorio `cancha-piura`
3. Click **"Import"**
4. Vercel detectará automáticamente que es Next.js ✅

### 2.3 Configurar variables de entorno
**IMPORTANTE**: Antes de hacer deploy, configura estas variables:

En la sección **"Environment Variables"**:

```env
NEXT_PUBLIC_SUPABASE_URL
Valor: https://xxxxx.supabase.co
```

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: eyJhbGc... (tu anon key de Supabase)
```

```env
SUPABASE_SERVICE_ROLE_KEY
Valor: eyJhbGc... (tu service role key de Supabase)
```

```env
API_KEY_BREVO
Valor: xkeysib-... (tu API key de Brevo)
```

```env
BREVO_FROM_EMAIL
Valor: tu@email.com
```

```env
BREVO_FROM_NAME
Valor: Cancha Piura
```

### 2.4 Deploy
1. Click **"Deploy"**
2. Espera 2-3 minutos ⏳
3. ¡Verás "Congratulations"! 🎉

**Tu app estará en**: `https://cancha-piura-xxx.vercel.app`

---

## ⚙️ Paso 3: Configurar Supabase (10 minutos)

### 3.1 Actualizar URLs en Supabase
1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. **Settings** → **Authentication** → **URL Configuration**

**Site URL** (cambiar de localhost):
```
https://cancha-piura-xxx.vercel.app
```

**Redirect URLs** (agregar estas dos):
```
https://cancha-piura-xxx.vercel.app/auth/reset-password
https://cancha-piura-xxx.vercel.app/auth/callback
```

4. Click **"Save"**

### 3.2 Verificar Email Templates
1. **Settings** → **Email Templates**
2. Verificar que **"Password Reset"** esté habilitado ✅
3. Si no está habilitado, activarlo

---

## 🧪 Paso 4: Probar la Aplicación (5 minutos)

### 4.1 Funcionalidades básicas
Ve a tu app en `https://cancha-piura-xxx.vercel.app` y prueba:

- [ ] **Página principal carga** ✅
- [ ] **Ver canchas** ✅
- [ ] **Registrarse como usuario** ✅
- [ ] **Iniciar sesión** ✅
- [ ] **Hacer una reserva** ✅
- [ ] **Filtros avanzados** ✅
- [ ] **Cerrar sesión** ✅

### 4.2 Panel de administración
Ve a `https://cancha-piura-xxx.vercel.app/admin/login`:

- [ ] **Login como admin** (admin@canchago.com) ✅
- [ ] **Ver dashboard** ✅
- [ ] **Ver reservas** ✅
- [ ] **Ver usuarios** ✅

### 4.3 Recuperación de contraseña
1. Ve a login → "¿Olvidaste tu contraseña?"
2. Ingresa tu email
3. Verifica que recibes el email
4. Haz click en el link
5. Cambia la contraseña

---

## 🎉 ¡Listo! Tu App Está en Producción

### URLs importantes:
- **App Principal**: `https://cancha-piura-xxx.vercel.app`
- **Panel Admin**: `https://cancha-piura-xxx.vercel.app/admin`
- **API Health**: `https://cancha-piura-xxx.vercel.app/api/debug`

### Credenciales de prueba:
- **Admin**: admin@canchago.com / admin123
- **Dueño**: dueno@canchago.com / dueno123
- **Usuario**: usuario@canchago.com / usuario123

---

## 🔧 Configuración Opcional

### Dominio personalizado
Si quieres `canchapuira.com` en lugar de `.vercel.app`:

1. Compra el dominio en Namecheap, GoDaddy, etc.
2. En Vercel → **Settings** → **Domains**
3. Agregar dominio personalizado
4. Configurar DNS según instrucciones

### Analytics
1. En Vercel → **Analytics** → **Enable**
2. Ver estadísticas de tráfico gratis

### Monitoring
1. En Vercel → **Functions** → **View Logs**
2. Monitorear errores de API

---

## 🚨 Si Algo Sale Mal

### Error: "Invalid redirect URL"
**Solución**: Verifica que agregaste la URL de Vercel en Supabase → Authentication

### Error: "Environment variables not found"
**Solución**: Ve a Vercel → Settings → Environment Variables y verifica que todas estén configuradas

### Error: "Build failed"
**Solución**: Ve a Vercel → Deployments → Click en el deploy fallido → Ver logs

### La app no carga
**Solución**: Ve a Vercel → Functions → View Logs para ver errores

---

## 📞 Necesitas Ayuda?

1. **Vercel Support**: https://vercel.com/help
2. **Supabase Docs**: https://supabase.com/docs
3. **Discord Communities**: Vercel y Supabase tienen Discord activos

---

## 🎯 Próximos Pasos

1. **Compartir tu app** con amigos y familia
2. **Agregar más canchas** desde el panel admin
3. **Configurar dominio personalizado**
4. **Agregar Google Analytics**
5. **Backup de base de datos**

---

**¡Felicidades! Tu aplicación está oficialmente en línea y funcionando! 🚀🎉**

**Tiempo total**: ~30 minutos
**Costo**: $0 (completamente gratis)
**Resultado**: App profesional en producción