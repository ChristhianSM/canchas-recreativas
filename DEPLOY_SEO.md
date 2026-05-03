# 🚀 Deploy con Optimizaciones SEO

## Pre-Deploy Checklist

### 1. Variables de Entorno
Asegúrate de configurar en tu plataforma de hosting (Vercel/Netlify/etc.):

```env
NEXT_PUBLIC_BASE_URL=https://canchago.pe
```

### 2. Verificar Build Local
```bash
npm run build
npm start
```

Luego visitar:
- http://localhost:3000/sitemap.xml
- http://localhost:3000/robots.txt

## Deploy

### Opción 1: Vercel (Recomendado)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configurar variable de entorno
vercel env add NEXT_PUBLIC_BASE_URL production
# Valor: https://canchago.pe
```

### Opción 2: Netlify
```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Configurar variable de entorno en Netlify Dashboard
# Site settings > Environment variables
# NEXT_PUBLIC_BASE_URL = https://canchago.pe
```

### Opción 3: Manual
1. Hacer build: `npm run build`
2. Subir carpeta `.next` y archivos necesarios
3. Configurar variable de entorno en el servidor
4. Iniciar: `npm start`

## Post-Deploy Verificación

### 1. Verificar Archivos SEO (5 minutos)
```bash
# Sitemap
curl https://canchago.pe/sitemap.xml

# Robots
curl https://canchago.pe/robots.txt

# Metadata de página principal
curl -I https://canchago.pe
```

Verificar manualmente en navegador:
- ✅ https://canchago.pe/sitemap.xml - debe mostrar XML con todas las URLs
- ✅ https://canchago.pe/robots.txt - debe mostrar reglas de robots

### 2. Verificar Datos Estructurados (10 minutos)
1. Ir a [Rich Results Test](https://search.google.com/test/rich-results)
2. Probar: `https://canchago.pe`
   - Debe detectar: **Organization** schema
3. Probar: `https://canchago.pe/cancha/[id]` (usar ID real)
   - Debe detectar: **SportsActivityLocation** schema
   - Debe detectar: **BreadcrumbList** schema
   - Debe detectar: **AggregateRating** (si hay reseñas)

### 3. Google Search Console (15 minutos)
1. Ir a [Google Search Console](https://search.google.com/search-console)
2. Click en "Agregar propiedad"
3. Seleccionar "Prefijo de URL"
4. Ingresar: `https://canchago.pe`
5. Verificar propiedad:
   - **Método recomendado**: Etiqueta HTML
   - Copiar el código de verificación
   - Agregar a `app/layout.tsx` en el `<head>`:
     ```tsx
     <meta name="google-site-verification" content="TU_CODIGO_AQUI" />
     ```
   - Hacer commit y redeploy
   - Click en "Verificar"
6. Una vez verificado:
   - Ir a "Sitemaps" en el menú lateral
   - Agregar sitemap: `https://canchago.pe/sitemap.xml`
   - Click en "Enviar"

### 4. Google Analytics (10 minutos)
1. Ir a [Google Analytics](https://analytics.google.com)
2. Crear cuenta si no tienes
3. Crear propiedad:
   - Nombre: CanchaGo
   - URL: https://canchago.pe
   - Industria: Deportes y recreación
4. Copiar Measurement ID (formato: G-XXXXXXXXXX)
5. Instalar dependencia:
   ```bash
   npm install @next/third-parties
   ```
6. Agregar a `app/layout.tsx`:
   ```tsx
   import { GoogleAnalytics } from '@next/third-parties/google'
   
   // Dentro del <body>, después de {children}:
   {process.env.NODE_ENV === 'production' && (
     <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
   )}
   ```
7. Agregar variable de entorno:
   ```env
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```
8. Redeploy

### 5. Solicitar Indexación (5 minutos)
En Google Search Console:
1. Ir a "Inspección de URLs"
2. Ingresar: `https://canchago.pe`
3. Click en "Solicitar indexación"
4. Repetir para:
   - `https://canchago.pe/canchas`
   - `https://canchago.pe/cancha/[id]` (2-3 canchas principales)

## Verificación Completa

### Checklist Final
- [ ] Sitemap accesible y con contenido
- [ ] Robots.txt accesible
- [ ] Rich Results Test pasa sin errores
- [ ] Google Search Console verificado
- [ ] Sitemap enviado a Google
- [ ] Google Analytics configurado
- [ ] Indexación solicitada para páginas principales
- [ ] Metadata visible en código fuente
- [ ] JSON-LD schemas presentes

### Verificar Metadata Manualmente
Abrir DevTools (F12) en cada página y buscar en `<head>`:

**Página Principal:**
```html
<title>CanchaGo — Reserva tu cancha deportiva en Piura</title>
<meta name="description" content="...">
<meta property="og:title" content="...">
<meta property="og:image" content="...">
<link rel="canonical" href="https://canchago.pe">
<script type="application/ld+json">{"@type":"Organization"...}</script>
```

**Página de Cancha:**
```html
<title>Nombre Cancha — Reserva tu cancha en Distrito | CanchaGo</title>
<meta name="description" content="...">
<meta property="og:image" content="[imagen de la cancha]">
<link rel="canonical" href="https://canchago.pe/cancha/123">
<script type="application/ld+json">{"@type":"SportsActivityLocation"...}</script>
<script type="application/ld+json">{"@type":"BreadcrumbList"...}</script>
```

## Monitoreo Post-Deploy

### Primera Semana
- [ ] Día 1: Verificar que sitemap se generó correctamente
- [ ] Día 2: Verificar en Search Console que no hay errores de rastreo
- [ ] Día 3: Verificar primeras impresiones en Search Console
- [ ] Día 7: Revisar páginas indexadas (`site:canchago.pe` en Google)

### Primer Mes
- [ ] Semana 1: Verificar indexación completa
- [ ] Semana 2: Revisar primeras keywords en Search Console
- [ ] Semana 3: Analizar páginas con más impresiones
- [ ] Semana 4: Optimizar páginas con bajo CTR

## Problemas Comunes

### Sitemap no se genera
**Síntoma**: Error 404 en `/sitemap.xml`

**Solución**:
1. Verificar que `app/sitemap.ts` existe
2. Verificar variable `NEXT_PUBLIC_BASE_URL`
3. Hacer rebuild: `npm run build`

### Datos estructurados no se detectan
**Síntoma**: Rich Results Test no encuentra schemas

**Solución**:
1. Ver código fuente de la página (Ctrl+U)
2. Buscar `<script type="application/ld+json">`
3. Verificar que el JSON es válido en [JSONLint](https://jsonlint.com)
4. Si no aparece, verificar que el componente `CanchaSEO` está montado

### Google Search Console no verifica
**Síntoma**: Error al verificar propiedad

**Solución**:
1. Verificar que la etiqueta meta está en el `<head>`
2. Hacer hard refresh (Ctrl+Shift+R)
3. Verificar en código fuente que la etiqueta está presente
4. Intentar método alternativo (archivo HTML)

### Páginas no se indexan
**Síntoma**: `site:canchago.pe` no muestra resultados después de 2 semanas

**Solución**:
1. Verificar que no están bloqueadas en `robots.txt`
2. Verificar que tienen contenido único (no duplicado)
3. Solicitar indexación manual en Search Console
4. Verificar que no hay errores de rastreo en Search Console
5. Esperar más tiempo (puede tardar hasta 4 semanas)

## Recursos Rápidos

- **Search Console**: https://search.google.com/search-console
- **Analytics**: https://analytics.google.com
- **Rich Results Test**: https://search.google.com/test/rich-results
- **PageSpeed**: https://pagespeed.web.dev
- **Schema Validator**: https://validator.schema.org

## Soporte

Si encuentras problemas:
1. Revisar `SEO_CHECKLIST.md` para troubleshooting
2. Revisar `SEO_OPTIMIZATIONS.md` para detalles técnicos
3. Verificar logs del servidor
4. Buscar en [Next.js Discussions](https://github.com/vercel/next.js/discussions)

---

**Tiempo estimado total**: 45-60 minutos
**Dificultad**: Media
**Resultado**: Sitio 100% optimizado para SEO
