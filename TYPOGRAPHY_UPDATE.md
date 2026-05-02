# Actualización de Tipografía - CanchaGo

## Nueva Tipografía Implementada

Se actualizó la tipografía de la aplicación para hacerla más llamativa, moderna y profesional.

---

## Fuentes Seleccionadas

### 1. **Poppins** (Títulos y Encabezados)
- **Uso**: Títulos principales (h1, h2, h3, h4, h5, h6)
- **Pesos**: 400, 500, 600, 700, 800, 900
- **Características**:
  - Geométrica y moderna
  - Excelente legibilidad en tamaños grandes
  - Personalidad distintiva
  - Muy popular en diseño web moderno
- **Variable CSS**: `--font-display`
- **Clase Tailwind**: `font-display`

### 2. **Inter** (Cuerpo de Texto)
- **Uso**: Texto del cuerpo, párrafos, botones, labels
- **Características**:
  - Diseñada específicamente para pantallas
  - Excelente legibilidad en tamaños pequeños
  - Neutral y profesional
  - Optimizada para UI
- **Variable CSS**: `--font-sans`
- **Clase Tailwind**: `font-sans` (por defecto)

---

## Archivos Modificados

### 1. `app/layout.tsx`
```typescript
// Antes
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

// Ahora
import { Inter, Poppins } from 'next/font/google'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
});

// Body actualizado
<body className={`${inter.variable} ${poppins.variable} font-sans ...`}>
```

### 2. `app/globals.css`

#### Variables CSS
```css
@theme inline {
  --font-sans: var(--font-inter), 'Inter', system-ui, sans-serif;
  --font-display: var(--font-poppins), 'Poppins', system-ui, sans-serif;
  --font-mono: 'Geist Mono', 'Geist Mono Fallback';
}
```

#### Reglas Globales
```css
/* Tipografía personalizada */
.font-display {
  font-family: var(--font-display);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.text-display {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.03em;
}
```

### 3. `app/page.tsx`

Actualizados todos los títulos principales:

```tsx
// Hero Title
<h1 className="... font-extrabold ... tracking-tighter font-display">
  Encuentra y reserva tu cancha deportiva ideal
</h1>

// Section Titles
<h2 className="... font-extrabold ... font-display tracking-tight">
  ¿Por qué elegir CanchaGo?
</h2>

// CTA Title
<h2 className="... font-black ... font-display tracking-tighter">
  ¿Listo para tu próximo partido?
</h2>

// Feature Titles
<h3 className="font-extrabold ... font-display">
  {title}
</h3>
```

---

## Jerarquía Tipográfica

### Títulos Principales (Hero)
- **Fuente**: Poppins
- **Peso**: 800-900 (extrabold/black)
- **Tamaño**: 4xl → 7xl (responsive)
- **Tracking**: -0.03em (tighter)
- **Leading**: 1.05

### Títulos de Sección (h2)
- **Fuente**: Poppins
- **Peso**: 700-800 (bold/extrabold)
- **Tamaño**: 3xl → 5xl (responsive)
- **Tracking**: -0.02em (tight)

### Subtítulos (h3)
- **Fuente**: Poppins
- **Peso**: 700-800 (bold/extrabold)
- **Tamaño**: lg → xl
- **Tracking**: -0.02em

### Cuerpo de Texto
- **Fuente**: Inter
- **Peso**: 400-600 (normal/medium/semibold)
- **Tamaño**: sm → lg
- **Tracking**: normal

### Botones y Labels
- **Fuente**: Inter
- **Peso**: 500-700 (medium/semibold/bold)
- **Tamaño**: sm → base

---

## Clases de Utilidad

### Fuente Display (Poppins)
```html
<!-- Aplicar Poppins manualmente -->
<div class="font-display">Texto con Poppins</div>

<!-- Texto display extra bold -->
<div class="text-display">Título Impactante</div>
```

### Fuente Sans (Inter) - Por defecto
```html
<!-- Inter se aplica automáticamente -->
<p>Este texto usa Inter</p>

<!-- Aplicar explícitamente -->
<div class="font-sans">Texto con Inter</div>
```

### Letter Spacing
```html
<!-- Títulos grandes -->
<h1 class="tracking-tighter">-0.03em</h1>

<!-- Títulos medianos -->
<h2 class="tracking-tight">-0.02em</h2>

<!-- Texto normal -->
<p class="tracking-normal">0em</p>
```

---

## Pesos de Fuente

### Poppins (Display)
- `font-normal` (400) - Texto regular
- `font-medium` (500) - Énfasis suave
- `font-semibold` (600) - Subtítulos
- `font-bold` (700) - Títulos estándar
- `font-extrabold` (800) - Títulos destacados
- `font-black` (900) - Títulos hero

### Inter (Sans)
- `font-normal` (400) - Texto del cuerpo
- `font-medium` (500) - Labels, botones
- `font-semibold` (600) - Énfasis
- `font-bold` (700) - Botones importantes

---

## Aplicación Automática

Gracias a las reglas CSS globales, **todos los encabezados (h1-h6) usan automáticamente Poppins** sin necesidad de agregar clases adicionales:

```tsx
// Esto ya usa Poppins automáticamente
<h1>Título Principal</h1>
<h2>Subtítulo</h2>
<h3>Sección</h3>

// El resto del texto usa Inter por defecto
<p>Este párrafo usa Inter</p>
<button>Este botón usa Inter</button>
```

---

## Optimizaciones

### Font Display: Swap
```typescript
display: 'swap'
```
- Muestra texto inmediatamente con fuente del sistema
- Cambia a la fuente custom cuando carga
- Evita FOIT (Flash of Invisible Text)
- Mejora Core Web Vitals

### Subsets
```typescript
subsets: ["latin"]
```
- Solo carga caracteres latinos
- Reduce tamaño del archivo
- Mejora tiempo de carga

### Variable Fonts
```typescript
variable: '--font-poppins'
```
- Permite usar la fuente con CSS variables
- Más flexible y mantenible
- Mejor para temas y personalización

---

## Comparación Visual

### Antes
```
Títulos: Inter (neutral, menos impacto)
Cuerpo: Inter
Peso: Mayormente 600-700
Tracking: Normal
```

### Ahora
```
Títulos: Poppins (geométrica, moderna, llamativa)
Cuerpo: Inter (legible, profesional)
Peso: 700-900 en títulos (más impacto)
Tracking: Tighter (-0.02em a -0.03em)
```

---

## Resultado

### Impacto Visual
- ✅ Títulos más llamativos y modernos
- ✅ Mejor jerarquía visual
- ✅ Personalidad distintiva
- ✅ Más profesional y contemporáneo

### Legibilidad
- ✅ Títulos grandes muy legibles (Poppins)
- ✅ Texto del cuerpo optimizado (Inter)
- ✅ Contraste claro entre títulos y cuerpo
- ✅ Tracking ajustado para mejor lectura

### Performance
- ✅ Font display: swap (sin FOIT)
- ✅ Solo subsets necesarios
- ✅ Pesos específicos cargados
- ✅ Variables CSS para flexibilidad

---

## Uso en Otros Componentes

Para aplicar la nueva tipografía en otros componentes:

```tsx
// Títulos principales
<h1 className="text-4xl font-extrabold font-display tracking-tighter">
  Título Hero
</h1>

// Títulos de sección
<h2 className="text-3xl font-bold font-display tracking-tight">
  Sección
</h2>

// Subtítulos
<h3 className="text-xl font-semibold font-display">
  Subtítulo
</h3>

// Texto destacado
<p className="text-lg font-display font-semibold">
  Texto importante con Poppins
</p>

// Texto normal (usa Inter automáticamente)
<p className="text-base">
  Texto del cuerpo
</p>
```

---

**Fecha de implementación**: 2026-04-30
**Fuentes agregadas**: Poppins (display), Inter (sans)
**Archivos modificados**: 3
**Clases CSS agregadas**: 2 (font-display, text-display)
**Reglas globales**: h1-h6 usan Poppins automáticamente
