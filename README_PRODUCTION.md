# 🏟️ CanchaPiura - Guía de Producción

## 🚀 Deploy Rápido (30 minutos)

### Opción 1: Deploy Automático con Vercel + GitHub

1. **Sube tu código a GitHub**
   ```bash
   git add .
   git commit -m "Ready for production deploy"
   git push origin main
   ```

2. **Conecta con Vercel**
   - Ve a https://vercel.com
   - Regístrate con GitHub
   - Click "New Project"
   - Selecciona tu repositorio
   - ¡Vercel detecta Next.js automáticamente!

3. **Configura Variables de Entorno**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   API_KEY_BREVO=xkeysib-...
   BREVO_FROM_EMAIL=tu@email.com
   BREVO_FROM_NAME=Cancha Piura
   ```

4. **Deploy**
   - Click "Deploy"
   - Espera 2-3 minutos
   - ¡Tu app estará en línea!

---

## 🌐 URLs de Producción

Una vez deployado, tendrás:

- **App Principal**: `https://tu-app.vercel.app`
- **Panel Admin**: `https://tu-app.vercel.app/admin`
- **Login Admin**: `https://tu-app.vercel.app/admin/login`
- **API Health**: `https://tu-app.vercel.app/api/debug`

---

## 🔧 Configuración Post-Deploy

### 1. Actualizar Supabase
En https://app.supabase.com → Tu Proyecto → Settings → Authentication:

**Site URL:**
```
https://tu-app.vercel.app
```

**Redirect URLs:**
```
https://tu-app.vercel.app/auth/reset-password
https://tu-app.vercel.app/auth/callback
```

### 2. Verificar Email Templates
En Supabase → Settings → Email Templates:
- ✅ Password Reset: Habilitado
- ✅ Email Confirmation: Habilitado (si lo usas)

### 3. Probar Funcionalidades
- [ ] Registro de usuario
- [ ] Login/Logout
- [ ] Hacer una reserva
- [ ] Filtros avanzados
- [ ] Recuperación de contraseña
- [ ] Panel de admin

---

## 📊 Monitoreo

### Vercel Dashboard
- **Deployments**: Ver historial de deploys
- **Functions**: Logs de API endpoints
- **Analytics**: Tráfico y performance
- **Domains**: Configurar dominio personalizado

### Supabase Dashboard
- **Database**: Ver datos y hacer queries
- **Auth**: Usuarios registrados
- **Logs**: Errores de API y Auth
- **Usage**: Consumo de recursos

---

## 🔒 Seguridad en Producción

### Variables de Entorno Críticas
- ✅ `SUPABASE_SERVICE_ROLE_KEY`: Solo en servidor
- ✅ `API_KEY_BREVO`: Solo en servidor
- ✅ Variables públicas: Prefijo `NEXT_PUBLIC_`

### Row Level Security (RLS)
Verifica que esté habilitado en Supabase:
```sql
-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### HTTPS
- ✅ Vercel proporciona HTTPS automáticamente
- ✅ Supabase usa HTTPS por defecto

---

## 📈 Optimización

### Performance
- ✅ Next.js optimiza automáticamente
- ✅ Vercel CDN global
- ✅ Imágenes optimizadas con `next/image`

### SEO
- ✅ Metadata configurado en `layout.tsx`
- ✅ URLs amigables
- ✅ Sitemap automático (Next.js)

### Caching
- ✅ Static Generation donde es posible
- ✅ API routes cacheadas por Vercel
- ✅ Supabase connection pooling

---

## 🚨 Troubleshooting

### Error Común 1: "Invalid redirect URL"
**Causa**: URL de Vercel no configurada en Supabase
**Solución**: Agregar URL en Supabase → Authentication → URL Configuration

### Error Común 2: "Environment variables not found"
**Causa**: Variables no configuradas en Vercel
**Solución**: Vercel Dashboard → Settings → Environment Variables

### Error Común 3: "Database connection failed"
**Causa**: Service Role Key incorrecta
**Solución**: Verificar key en Supabase → Settings → API

### Error Común 4: Build fails
**Causa**: Errores de TypeScript o dependencias
**Solución**: 
```bash
npm run build  # Probar localmente
npm run type-check  # Verificar tipos
```

---

## 📱 Dominios Personalizados

### Dominio Gratuito
Vercel te da: `https://cancha-piura.vercel.app`

### Dominio Personalizado
1. Compra dominio (ej: `canchapuira.com`)
2. Vercel → Settings → Domains
3. Agregar dominio
4. Configurar DNS según instrucciones

### Subdominios
Puedes tener múltiples:
- `app.canchapuira.com` (aplicación principal)
- `admin.canchapuira.com` (panel admin)
- `api.canchapuira.com` (API)

---

## 💰 Costos (Todo Gratuito)

### Vercel (Hobby Plan)
- ✅ 100GB bandwidth/mes
- ✅ 100 deployments/día
- ✅ Dominio .vercel.app
- ✅ HTTPS automático
- ✅ CDN global

### Supabase (Free Tier)
- ✅ 500MB database storage
- ✅ 2GB bandwidth/mes
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests

### Brevo (Free Plan)
- ✅ 300 emails/día
- ✅ Templates ilimitados
- ✅ Analytics básico

**Total: $0/mes** 🎉

---

## 🔄 CI/CD Automático

Con GitHub + Vercel:
- ✅ Push a `main` → Deploy automático
- ✅ Pull Request → Preview deploy
- ✅ Rollback con un click
- ✅ Logs en tiempo real

---

## 📞 Soporte

### Documentación
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
- **Next.js**: https://nextjs.org/docs

### Comunidades
- **Vercel Discord**: https://discord.gg/vercel
- **Supabase Discord**: https://discord.supabase.com
- **Next.js GitHub**: https://github.com/vercel/next.js

---

## 🎯 Próximos Pasos

1. **Deploy inicial** (30 min)
2. **Verificar funcionalidades** (15 min)
3. **Configurar dominio personalizado** (opcional)
4. **Configurar analytics** (Vercel Analytics)
5. **Backup de base de datos** (exportar datos)
6. **Monitoreo de errores** (Sentry)

---

¡Tu aplicación estará en línea y funcionando en menos de 1 hora! 🚀

**¿Necesitas ayuda?** Revisa `DEPLOY_INSTRUCTIONS.md` para instrucciones paso a paso detalladas.