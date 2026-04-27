# Tarjeta Rápida: Recuperación de Contraseña

## 🚀 Solución Rápida (12 minutos)

### Paso 1: Configurar Redirect URL
```
Supabase Dashboard
  → Project Settings
  → Authentication
  → URL Configuration
  → Redirect URLs
  → Agregar: http://localhost:3000/auth/reset-password
  → Save
```

### Paso 2: Verificar Email Template
```
Supabase Dashboard
  → Project Settings
  → Email Templates
  → Password Reset
  → Verificar que esté HABILITADO (toggle verde)
```

### Paso 3: Probar
```
1. Ve a http://localhost:3000/recuperar-contrasena
2. Ingresa tu email
3. Haz click en "Enviar link de recuperación"
4. Revisa tu email
5. Haz click en el link
6. Ingresa tu nueva contraseña
7. ¡Listo!
```

---

## ❌ Si No Funciona

### Error: "Link inválido"
```
1. Verifica que Redirect URL esté en Supabase
2. Verifica que Email Template esté habilitado
3. Abre DevTools (F12) → Console
4. Copia el error exacto
5. Proporciona el error
```

### No recibo el email
```
1. Revisa carpeta de spam
2. Espera 2-3 minutos
3. Verifica que el email sea correcto
4. Revisa logs en Supabase Dashboard → Logs → Auth
```

### El link expiró
```
1. Los links expiran después de 1 hora (normal)
2. Solicita un nuevo link
3. Haz click inmediatamente después de recibirlo
```

---

## 📋 Checklist

- [ ] Redirect URL configurada
- [ ] Email Template habilitado
- [ ] Email recibido
- [ ] Link funciona
- [ ] Contraseña actualizada
- [ ] Puedo iniciar sesión

---

## 📚 Documentos Disponibles

| Documento | Propósito |
|-----------|-----------|
| **RESUMEN_RECUPERACION_CONTRASENA.md** | Resumen general del problema y solución |
| **CONFIGURAR_SUPABASE_RESET_PASSWORD.md** | Guía paso a paso de configuración |
| **GUIA_VISUAL_SUPABASE.md** | Guía visual con dónde hacer click |
| **VERIFICAR_RESET_PASSWORD.md** | Checklist completo de verificación |
| **DIAGNOSTICO_RECUPERACION_CONTRASENA.md** | Diagnóstico detallado del problema |

---

## 🔧 Debugging

### Abrir DevTools
```
Windows/Linux: F12 o Ctrl+Shift+I
Mac: Cmd+Option+I
```

### Ver logs
```
1. Abre DevTools
2. Ve a Console
3. Intenta recuperar contraseña
4. Copia el error exacto
```

### Revisar parámetros de URL
```javascript
// En DevTools Console:
const params = new URLSearchParams(window.location.search);
console.log('Code:', params.get('code'));
console.log('Error:', params.get('error_code'));
```

---

## 🌐 URLs Importantes

| URL | Propósito |
|-----|-----------|
| `http://localhost:3000/recuperar-contrasena` | Solicitar reset |
| `http://localhost:3000/auth/reset-password` | Cambiar contraseña |
| `http://localhost:3000/login` | Iniciar sesión |
| `https://app.supabase.com` | Dashboard de Supabase |

---

## 📞 Información para Proporcionar si Necesitas Ayuda

```
1. El error exacto que ves
2. El link del email (sin datos sensibles)
3. Los logs de DevTools Console
4. Los logs de Supabase Dashboard → Logs → Auth
5. Tu email de prueba
```

---

## ✅ Verificación Final

Después de configurar, verifica que:

1. ✅ Redirect URL está en Supabase
2. ✅ Email Template está habilitado
3. ✅ Recibes el email
4. ✅ El link funciona
5. ✅ Puedo cambiar la contraseña
6. ✅ Puedo iniciar sesión con la nueva contraseña

**Si todo está marcado, ¡el problema está resuelto!**

---

## 🎯 Próximos Pasos

1. **Lee RESUMEN_RECUPERACION_CONTRASENA.md** (2 minutos)
2. **Sigue los 3 pasos arriba** (12 minutos)
3. **Verifica el checklist** (5 minutos)
4. **¡Listo!** (19 minutos total)

