# Feedback Visual de Filtros en Mobile

## Problema
Cuando el usuario aplicaba filtros en mobile, no tenía forma de saber si los filtros se estaban aplicando realmente, ya que el Sheet ocupaba toda la pantalla y no podía ver el listado de canchas actualizándose.

## Solución Implementada

### 1. Sheet más estrecho en mobile (`components/ui/sheet.tsx`)

#### A. Ancho del Sheet reducido
```tsx
// Antes
w-3/4  // 75% del ancho

// Después  
w-[80%] max-w-sm  // 80% del ancho en mobile, deja 20% visible del listado
```

#### B. Overlay más transparente
El overlay (fondo oscuro) ahora es mucho más transparente para permitir ver el listado detrás:

```tsx
// Antes
bg-black/50  // 50% de opacidad - muy oscuro

// Después
bg-black/20  // 20% de opacidad - permite ver el contenido detrás
```

**Beneficio:** El usuario puede ver claramente el listado de canchas actualizándose en tiempo real mientras aplica filtros.

### 2. Contador de resultados en tiempo real (`components/advanced-filters.tsx`)

#### A. Nueva prop `resultCount`
```tsx
interface AdvancedFiltersProps {
  // ... otras props
  resultCount?: number; // Contador de resultados filtrados
}
```

#### B. Contador en el header
Muestra el número de canchas encontradas justo debajo del título:
```tsx
<SheetTitle>Filtros avanzados</SheetTitle>
{resultCount !== undefined && (
  <p className="text-sm text-muted-foreground mt-1">
    {resultCount} {resultCount === 1 ? 'cancha encontrada' : 'canchas encontradas'}
  </p>
)}
```

#### C. Footer sticky con resumen
Footer fijo en la parte inferior que muestra:
- Número de resultados
- Número de filtros activos
- Botón "Ver resultados" para cerrar el Sheet

```tsx
<div className="sticky bottom-0 z-10 bg-background border-t border-border px-6 py-4">
  <div className="flex items-center justify-between gap-3">
    <div className="flex-1">
      <p className="text-sm font-medium text-foreground">
        {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
      </p>
      {activeFilterCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {activeFilterCount} {activeFilterCount === 1 ? 'filtro activo' : 'filtros activos'}
        </p>
      )}
    </div>
    <Button size="sm" onClick={() => setIsOpen(false)}>
      Ver resultados
    </Button>
  </div>
</div>
```

### 3. Integración en página de canchas (`app/canchas/page.tsx`)
Pasamos el contador de resultados filtrados al componente:

```tsx
<AdvancedFiltersComponent
  // ... otras props
  resultCount={filtered.length}  // ✅ Contador en tiempo real
/>
```

## Resultado Final

### Experiencia de Usuario Mejorada:

1. **Espacio visible del listado (15%):**
   - El usuario puede ver las canchas actualizándose en tiempo real
   - Feedback visual inmediato al aplicar/quitar filtros
   - Similar a apps como Airbnb, Booking, etc.

2. **Contador en header:**
   - "X canchas encontradas" visible al abrir filtros
   - Se actualiza en tiempo real al cambiar filtros

3. **Footer sticky:**
   - Siempre visible sin importar el scroll
   - Muestra resumen: "X resultados" + "Y filtros activos"
   - Botón "Ver resultados" para cerrar y ver el listado completo

4. **Elementos sticky:**
   - ✅ Header con título y contador (sticky top)
   - ✅ Botón de cerrar (X) (fixed top-right)
   - ✅ Footer con resumen (sticky bottom)
   - ✅ Contenido scrolleable en el medio

## Archivos Modificados

1. **`components/ui/sheet.tsx`**
   - Sheet más estrecho: `w-[85%]` en mobile
   - Botón de cerrar con mejor estilo

2. **`components/advanced-filters.tsx`**
   - Nueva prop `resultCount`
   - Contador en header
   - Footer sticky con resumen y botón

3. **`app/canchas/page.tsx`**
   - Pasando `resultCount={filtered.length}` al componente

## Comparación Visual

### Antes:
```
┌─────────────────────────┐
│  FILTROS (100% ancho)   │
│  ███████████████████    │ ← Overlay oscuro (50%)
│  [Usuario no ve nada    │
│   del listado]          │
│  ███████████████████    │
└─────────────────────────┘
```

### Después:
```
┌──────────┬────────────────┐
│ Listado  │  FILTROS       │
│ visible  │  (80% ancho)   │
│ (20%)    │  ░░░░░░░░░░░   │ ← Overlay claro (20%)
│          │                │
│ ✓ Se ve  │  Header ⬆      │
│   actuali│  Contenido     │
│   zando  │  scrolleable   │
│          │  Footer ⬇      │
│          │                │
└──────────┴────────────────┘
```

## Beneficios UX

✅ **Feedback inmediato:** Usuario ve resultados actualizándose
✅ **Confianza:** Sabe que los filtros funcionan
✅ **Información clara:** Contador de resultados siempre visible
✅ **Navegación fácil:** Botón "Ver resultados" siempre accesible
✅ **Estándar de la industria:** Similar a apps populares de búsqueda/filtrado
