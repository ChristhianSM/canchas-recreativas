# Botón de Cerrar Sticky en Filtros Avanzados (Mobile)

## Problema
En mobile, cuando el usuario abría los filtros avanzados y hacía scroll hacia abajo, el botón de cerrar (X) desaparecía de la vista. Esto obligaba al usuario a hacer scroll hacia arriba para poder cerrar el panel de filtros.

## Solución Implementada

### 1. Modificación del Sheet Component (`components/ui/sheet.tsx`)
**Cambios en el botón de cerrar:**
- ✅ Cambiado de `absolute` a `fixed` para que se mantenga en la misma posición en la pantalla
- ✅ Agregado `z-50` para asegurar que esté por encima del contenido
- ✅ Agregado `bg-background border border-border` para mejor visibilidad
- ✅ Agregado `p-1.5 shadow-md` para mejor apariencia y contraste
- ✅ Cambiado `rounded-xs` a `rounded-sm` para mejor estética

**Antes:**
```tsx
<SheetPrimitive.Close className="... absolute top-4 right-4 rounded-xs ...">
```

**Después:**
```tsx
<SheetPrimitive.Close className="... fixed top-4 right-4 z-50 rounded-sm ... bg-background border border-border p-1.5 shadow-md">
```

### 2. Modificación del Advanced Filters Component (`components/advanced-filters.tsx`)
**Reestructuración del SheetContent:**
- ✅ Separado el header del contenido scrolleable
- ✅ Header fijo con `sticky top-0 z-10` y borde inferior
- ✅ Contenido scrolleable en un contenedor `flex-1 overflow-y-auto`
- ✅ Padding apropiado para cada sección

**Antes:**
```tsx
<SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-6">
  <SheetHeader>
    <SheetTitle>Filtros avanzados</SheetTitle>
  </SheetHeader>
  <div className="pr-4">
    {filterContent}
  </div>
</SheetContent>
```

**Después:**
```tsx
<SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
  {/* Header fijo con botón de cerrar */}
  <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
    <SheetHeader>
      <SheetTitle>Filtros avanzados</SheetTitle>
    </SheetHeader>
  </div>
  
  {/* Contenido scrolleable */}
  <div className="flex-1 overflow-y-auto px-6 py-4">
    {filterContent}
  </div>
</SheetContent>
```

## Resultado

### Comportamiento Nuevo:
1. **Botón de cerrar (X) siempre visible:** Se mantiene fijo en la esquina superior derecha sin importar cuánto scroll haga el usuario
2. **Header sticky:** El título "Filtros avanzados" también se mantiene visible al hacer scroll
3. **Mejor UX:** El usuario puede cerrar el panel de filtros en cualquier momento sin necesidad de hacer scroll hacia arriba
4. **Mejor visibilidad:** El botón tiene fondo, borde y sombra para destacar sobre el contenido

### Archivos Modificados:
- ✅ `components/ui/sheet.tsx` - Botón de cerrar ahora es `fixed` con mejor estilo
- ✅ `components/advanced-filters.tsx` - Estructura mejorada con header sticky y contenido scrolleable

## Notas Técnicas

- El botón de cerrar usa `fixed` en lugar de `absolute` para mantener su posición relativa al viewport
- El `z-50` asegura que esté por encima de todo el contenido del sheet
- El header usa `sticky top-0` para mantenerse visible al hacer scroll
- La estructura `flex flex-col` permite que el contenido sea scrolleable mientras el header permanece fijo
