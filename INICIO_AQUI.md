# 🎯 COMIENZA AQUÍ: Recuperación de Contraseña

## ¿Cuál es el Problema?

Cuando intentas recuperar tu contraseña:
- ✅ Recibes el email
- ❌ Pero el link dice "Link inválido"

---

## 🚀 Solución Rápida (12 minutos)

### Paso 1: Configurar Supabase (5 minutos)

1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. **Project Settings** (engranaje abajo a la izquierda)
4. **Authentication** → **URL Configuration**
5. En **Redirect URLs**, agrega:
   ```
   http://localhost:3000/auth/reset-password
   ```
6. Haz click en **Save**

### Paso 2: Verificar Email (2 minutos)

1. **Project Settings** → **Email Templates**
2. Busca **"Password Reset"**
3. Verifica que esté **habilitado** (toggle verde)

### Paso 3: Probar (5 minutos)

1. Ve a http://localhost:3000/recuperar-contrasena
2. Ingresa tu email
3. Haz click en "Enviar link de recuperación"
4. Revisa tu email
5. Haz click en el link
6. Ingresa tu nueva contraseña
7. ¡Listo!

---

## 📚 ¿Necesitas Más Ayuda?

### 📱 Tengo 2 minutos
→ Lee: **TARJETA_RAPIDA_RESET_PASSWORD.md**

### 📖 Tengo 5 minutos
→ Lee: **RESUMEN_RECUPERACION_CONTRASENA.md**

### 🔧 Tengo 15 minutos
→ Lee: **CONFIGURAR_SUPABASE_RESET_PASSWORD.md**

### 👁️ Prefiero ver dónde hacer click
→ Lee: **GUIA_VISUAL_SUPABASE.md**

### ✅ Quiero verificar todo
→ Lee: **VERIFICAR_RESET_PASSWORD.md**

### 🐛 Algo no funciona
→ Lee: **DIAGNOSTICO_RECUPERACION_CONTRASENA.md**

### 📋 Quiero ver todo
→ Lee: **INDICE_RECUPERACION_CONTRASENA.md**

---

## 📊 Documentación Disponible

```
10 Documentos Creados
├─ 65 KB de documentación
├─ 3000+ líneas
├─ 50+ checklist items
├─ 10+ soluciones rápidas
└─ 15+ ejemplos de código
```

---

## ✅ Checklist Rápido

- [ ] Redirect URL agregada en Supabase
- [ ] Email Template habilitado
- [ ] Email recibido
- [ ] Link funciona
- [ ] Contraseña actualizada
- [ ] Puedo iniciar sesión

---

## 🆘 Si No Funciona

### Error: "Link inválido"
→ Verifica que Redirect URL esté en Supabase (Paso 1)

### No recibo el email
→ Revisa carpeta de spam y espera 2-3 minutos

### El link expiró
→ Los links expiran después de 1 hora (normal)

### Sigue sin funcionar
→ Lee: **DIAGNOSTICO_RECUPERACION_CONTRASENA.md**

---

## 🎯 Próximos Pasos

1. **Sigue los 3 pasos arriba** (12 minutos)
2. **Verifica el checklist** (5 minutos)
3. **¡Listo!** (17 minutos total)

---

## 📞 Necesito Ayuda

Si después de los 3 pasos sigue sin funcionar:

1. Abre DevTools (F12)
2. Ve a Console
3. Copia el error exacto
4. Lee: **DIAGNOSTICO_RECUPERACION_CONTRASENA.md**

---

## 🎉 ¡Listo!

**El problema debería estar resuelto en 12 minutos.**

Si tienes preguntas, lee la documentación correspondiente.

