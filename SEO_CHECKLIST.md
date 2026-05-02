# ✅ Checklist de Verificación SEO

## Después del Deploy

### 1. Verificar Archivos Generados
- [ ] Visitar `https://canchago.pe/sitemap.xml` - debe mostrar el sitemap
- [ ] Visitar `https://canchago.pe/robots.txt` - debe mostrar las reglas
- [ ] Verificar que el sitemap incluye todas las canchas

### 2. Google Search Console
- [ ] Ir a [Google Search Console](https://search.google.com/search-console)
- [ ] Agregar propiedad: `https://canchago.pe`
- [ ] Verificar propiedad (método recomendado: HTML tag en `<head>`)
- [ ] Enviar sitemap: `https://canchago.pe/sitemap.xml`
- [ ] Solicitar indexación de páginas principales

### 3. Verificar Datos Estructurados
- [ ] Ir a [Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Probar URL: `https://canchago.pe`
- [ ] Probar URL de cancha: `https://canchago.pe/cancha/[id]`
- [ ] Verificar que detecta:
  - Organization schema
  - SportsActivityLocation schema
  - BreadcrumbList schema
  - AggregateRating (si hay reseñas)

### 4. Google Analytics
- [ ] Crear cuenta en [Google Analytics](https://analytics.google.com)
- [ ] Crear propiedad GA4
- [ ] Copiar Measurement ID (G-XXXXXXXXXX)
- [ ] Agregar a `.env.local`:
  ```
  NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
  ```
- [ ] Instalar: `npm install @next/third-parties`
- [ ] Agregar a `app/layout.tsx`:
  ```tsx
  import { GoogleAnalytics } from '@next/third-parties/google'
  
  // En el body:
  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
  ```

### 5. Google My Business (Opcional pero Recomendado)
- [ ] Ir a [Google Business Profile](https://www.google.com/business/)
- [ ] Crear perfil de negocio
- [ ] Agregar información:
  - Nombre: CanchaGo
  - Categoría: Servicio de reservas deportivas
  - Ubicación: Piura, Perú
  - Sitio web: https://canchago.pe
  - Teléfono
  - Horario de atención
- [ ] Verificar negocio (por correo/teléfono)
- [ ] Agregar fotos de canchas

### 6. Verificar Metadata
Abrir DevTools (F12) en cada página y verificar en `<head>`:

#### Página Principal
- [ ] `<title>` correcto
- [ ] `<meta name="description">` presente
- [ ] `<meta property="og:title">` presente
- [ ] `<meta property="og:image">` presente
- [ ] `<link rel="canonical">` presente
- [ ] JSON-LD Organization schema presente

#### Página de Cancha
- [ ] `<title>` incluye nombre de cancha
- [ ] `<meta name="description">` incluye precio y rating
- [ ] `<meta property="og:image">` usa imagen de la cancha
- [ ] JSON-LD SportsActivityLocation schema presente
- [ ] JSON-LD BreadcrumbList schema presente

### 7. Verificar Rendimiento
- [ ] Ir a [PageSpeed Insights](https://pagespeed.web.dev)
- [ ] Probar: `https://canchago.pe`
- [ ] Objetivo: Score > 90 en móvil y desktop
- [ ] Verificar Core Web Vitals:
  - LCP (Largest Contentful Paint) < 2.5s
  - FID (First Input Delay) < 100ms
  - CLS (Cumulative Layout Shift) < 0.1

### 8. Verificar Indexación (Después de 1-2 semanas)
- [ ] Buscar en Google: `site:canchago.pe`
- [ ] Verificar que aparecen páginas indexadas
- [ ] Buscar: `"CanchaGo"` - verificar que aparece tu sitio
- [ ] Buscar: `"canchas deportivas piura"` - verificar posición

### 9. Configurar Herramientas Adicionales (Opcional)
- [ ] [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [ ] [Yandex Webmaster](https://webmaster.yandex.com)
- [ ] [Ahrefs Webmaster Tools](https://ahrefs.com/webmaster-tools) (gratis)
- [ ] [Ubersuggest](https://neilpatel.com/ubersuggest/) (análisis de keywords)

### 10. Monitoreo Continuo
- [ ] Configurar alertas en Google Search Console
- [ ] Revisar Search Console semanalmente
- [ ] Monitorear Google Analytics mensualmente
- [ ] Actualizar sitemap cuando agregues nuevas canchas

## Comandos Útiles

### Verificar Build Local
```bash
npm run build
npm start
# Visitar http://localhost:3000/sitemap.xml
# Visitar http://localhost:3000/robots.txt
```

### Verificar Metadata con cURL
```bash
curl -I https://canchago.pe
curl https://canchago.pe/sitemap.xml
curl https://canchago.pe/robots.txt
```

### Verificar JSON-LD
```bash
# Extraer JSON-LD de una página
curl https://canchago.pe/cancha/123 | grep -o '<script type="application/ld+json">.*</script>'
```

## Métricas de Éxito

### Mes 1
- [ ] Sitio indexado en Google
- [ ] Al menos 10 páginas en el índice
- [ ] Primeras impresiones en Search Console

### Mes 2-3
- [ ] 100+ impresiones/día
- [ ] CTR > 2%
- [ ] Posición promedio < 50

### Mes 4-6
- [ ] 500+ impresiones/día
- [ ] CTR > 3%
- [ ] Posición promedio < 20
- [ ] Al menos 1 keyword en primera página

## Problemas Comunes

### Sitemap no se genera
- Verificar que `NEXT_PUBLIC_BASE_URL` está en `.env.local`
- Verificar que la API `/api/canchas/list` funciona
- Revisar logs del build

### Datos estructurados no se detectan
- Verificar que el JSON-LD está en el HTML (ver fuente de la página)
- Usar [Schema Markup Validator](https://validator.schema.org)
- Verificar que no hay errores de sintaxis JSON

### Páginas no se indexan
- Verificar que no están bloqueadas en `robots.txt`
- Verificar que tienen contenido único y relevante
- Solicitar indexación manual en Search Console
- Esperar 1-2 semanas (Google tarda en indexar)

### Score bajo en PageSpeed
- Optimizar imágenes (usar WebP/AVIF)
- Habilitar compresión en servidor
- Minimizar JavaScript
- Usar lazy loading para imágenes

## Recursos

- [Google Search Console](https://search.google.com/search-console)
- [Google Analytics](https://analytics.google.com)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev)
- [Schema Markup Validator](https://validator.schema.org)
- [Next.js SEO Docs](https://nextjs.org/learn/seo/introduction-to-seo)

---

**Última actualización**: Mayo 2026
