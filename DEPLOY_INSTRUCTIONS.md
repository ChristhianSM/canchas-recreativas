# 🚀 Instrucciones de Deploy - CanchaPiura

## Resumen
- **Hosting**: Vercel (Gratuito)
- **Base de Datos**: Supabase (Gratuito)
- **Dominio**: Subdominio de Vercel (Gratuito)
- **Email**: Brevo (Gratuito hasta 300 emails/día)

---

## Paso 1: Preparar Supabase para Producción

### 1.1 Configurar URL de Producción
1. Ve a tu proyecto en https://app.supabase.com
2. **Settings** → **Authentication** → **URL Configuration**
3. En **Site URL**, cambia de `http://localhost:3000` a tu dominio de Vercel:
   ```
   https://tu-app-name.vercel.app
   ```
4. En **Redirect URLs**, agrega:
   ```
   https://tu-app-name.vercel.app/auth/reset-password
   https://tu-app-name.vercel.app/auth/callback
   ```

### 1.2 Verificar Variables de Entorno
1. **Settings** → **API**
2. Copia estos valores (los necesitarás en Vercel):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGc...`
   - **service_role**: `eyJhbGc...` (¡Mantén esto secreto!)

---

## Paso 2: Deploy en Vercel

### 2.1 Crear Cuenta en Vercel
1. Ve a https://vercel.com
2. Regístrate con tu cuenta de GitHub
3. Conecta tu repositorio de GitHub

### 2.2 Importar Proyecto
1. Click en **"New Project"**
2. Selecciona tu repositorio de GitHub
3. Vercel detectará automáticamente que es Next.js

### 2.3 Configurar Variables de Entorno
En la sección **Environment Variables**, agrega:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
API_KEY_BREVO=xkeysib-...
BREVO_FROM_EMAIL=tu@email.com
BREVO_FROM_NAME=Cancha Piura
```

### 2.4 Deploy
1. Click en **"Deploy"**
2. Espera 2-3 minutos
3. ¡Tu app estará en línea!

---

## Paso 3: Configurar Dominio Personalizado (Opcional)

### 3.1 Dominio Gratuito
Vercel te da un dominio gratuito como:
```
https://cancha-piura.vercel.app
```

### 3.2 Dominio Personalizado (Opcional)
Si quieres un dominio como `canchapuira.com`:
1. Compra el dominio en Namecheap, GoDaddy, etc.
2. En Vercel → **Settings** → **Domains**
3. Agrega tu dominio personalizado
4. Configura los DNS según las instrucciones

---

## Paso 4: Verificar Funcionamiento

### 4.1 Checklist Post-Deploy
- [ ] La página principal carga correctamente
- [ ] Puedes registrarte como usuario
- [ ] Puedes iniciar sesión
- [ ] Las canchas se muestran correctamente
- [ ] Los filtros funcionan
- [ ] Puedes hacer una reserva
- [ ] La recuperación de contraseña funciona

### 4.2 URLs Importantes
- **App Principal**: `https://tu-app.vercel.app`
- **Admin Panel**: `https://tu-app.vercel.app/admin`
- **API Health**: `https://tu-app.vercel.app/api/debug`

---

## Paso 5: Monitoreo y Mantenimiento

### 5.1 Logs en Vercel
1. Ve a tu proyecto en Vercel
2. **Functions** → **View Function Logs**
3. Aquí puedes ver errores y logs de la API

### 5.2 Logs en Supabase
1. Ve a tu proyecto en Supabase
2. **Logs** → **API** / **Auth** / **Database**
3. Monitorea errores y uso

### 5.3 Límites Gratuitos
- **Vercel**: 100GB bandwidth/mes, 100 deployments/día
- **Supabase**: 500MB storage, 2GB bandwidth/mes
- **Brevo**: 300 emails/día

---

## Troubleshooting Común

### Error: "Invalid redirect URL"
**Solución**: Verifica que agregaste la URL de Vercel en Supabase → Authentication → URL Configuration

### Error: "Environment variables not found"
**Solución**: Verifica que todas las variables estén configuradas en Vercel → Settings → Environment Variables

### Error: "Database connection failed"
**Solución**: Verifica que `SUPABASE_SERVICE_ROLE_KEY` sea correcta y tenga permisos

### Error: "Email not sending"
**Solución**: Verifica la configuración de Brevo y que el API key sea válido

---

## Comandos Útiles

### Deploy Manual (si usas Vercel CLI)
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Ver Logs en Tiempo Real
```bash
vercel logs tu-app-name.vercel.app
```

### Rollback a Versión Anterior
En Vercel Dashboard → **Deployments** → Click en versión anterior → **Promote to Production**

---

## Próximos Pasos Recomendados

1. **Configurar Analytics**: Vercel Analytics (gratuito)
2. **Configurar Monitoring**: Sentry para errores
3. **Backup de BD**: Exportar datos de Supabase regularmente
4. **CDN para Imágenes**: Cloudinary (plan gratuito)
5. **Dominio Personalizado**: Cuando estés listo para producción real

---

## Soporte

Si tienes problemas:
1. **Vercel Docs**: https://vercel.com/docs
2. **Supabase Docs**: https://supabase.com/docs
3. **Next.js Docs**: https://nextjs.org/docs
4. **Community**: Discord de Vercel/Supabase

¡Tu app estará en línea en menos de 30 minutos! 🎉