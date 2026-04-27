# ✅ Checklist de Deploy - CanchaPiura

## 📋 Pre-Deploy
- [ ] Código funcionando en local
- [ ] Variables de entorno configuradas
- [ ] Base de datos Supabase funcionando
- [ ] Cuenta de GitHub creada
- [ ] Proyecto verificado con `node scripts/pre-deploy-check.js`

## 🚀 Deploy
- [ ] Código subido a GitHub
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy exitoso (sin errores)
- [ ] URL de producción obtenida

## ⚙️ Configuración Post-Deploy
- [ ] Site URL actualizada en Supabase
- [ ] Redirect URLs agregadas en Supabase
- [ ] Email templates verificados en Supabase
- [ ] Políticas RLS verificadas

## 🧪 Testing
- [ ] Página principal carga
- [ ] Registro de usuario funciona
- [ ] Login/logout funciona
- [ ] Hacer reserva funciona
- [ ] Filtros avanzados funcionan
- [ ] Panel admin accesible
- [ ] Recuperación de contraseña funciona
- [ ] API endpoints responden

## 📊 Monitoreo
- [ ] Logs de Vercel configurados
- [ ] Logs de Supabase monitoreados
- [ ] Analytics habilitado (opcional)
- [ ] Alertas configuradas (opcional)

## 🔒 Seguridad
- [ ] Variables sensibles solo en servidor
- [ ] HTTPS habilitado (automático en Vercel)
- [ ] RLS habilitado en Supabase
- [ ] Credenciales de prueba funcionando

## 📱 Opcional
- [ ] Dominio personalizado configurado
- [ ] CDN para imágenes configurado
- [ ] Backup de base de datos programado
- [ ] Monitoring de errores (Sentry)

---

## 🎯 URLs de Verificación

Después del deploy, verifica estas URLs:

- [ ] `https://tu-app.vercel.app` - Página principal
- [ ] `https://tu-app.vercel.app/login` - Login
- [ ] `https://tu-app.vercel.app/registro` - Registro
- [ ] `https://tu-app.vercel.app/canchas` - Lista de canchas
- [ ] `https://tu-app.vercel.app/admin` - Panel admin
- [ ] `https://tu-app.vercel.app/api/debug` - API health check

---

## 🚨 Troubleshooting Rápido

### ❌ Build Failed
```bash
# Probar build local
npm run build
npm run type-check
```

### ❌ Environment Variables
```bash
# Verificar en Vercel Dashboard
Settings → Environment Variables
```

### ❌ Supabase Connection
```bash
# Verificar URLs en Supabase
Authentication → URL Configuration
```

### ❌ Email Issues
```bash
# Verificar en Supabase
Email Templates → Password Reset
```

---

## ✅ Deploy Exitoso

Si todos los checkboxes están marcados:

🎉 **¡Felicidades! Tu aplicación está en producción!**

- **URL**: `https://tu-app.vercel.app`
- **Admin**: `https://tu-app.vercel.app/admin`
- **Costo**: $0/mes
- **Tiempo**: ~30 minutos

---

## 📞 Soporte

Si necesitas ayuda:
1. Lee `DEPLOY_PASO_A_PASO.md`
2. Revisa `DEPLOY_INSTRUCTIONS.md`
3. Consulta logs en Vercel/Supabase
4. Busca en Discord communities

**¡Tu app está lista para el mundo! 🌍🚀**