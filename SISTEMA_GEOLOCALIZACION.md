# Sistema de Geolocalización - Canchas Cercanas

## 📍 Descripción General

Sistema completo de geolocalización que permite a los usuarios encontrar canchas cercanas a su ubicación actual usando el GPS de su dispositivo móvil o navegador.

## ✨ Características Implementadas

### 1. **Botón "Cerca de mí"**
- Solicita permiso de ubicación al usuario
- Muestra estados de carga y error
- Badge visual cuando la ubicación está activa
- Botón para limpiar ubicación

### 2. **Cálculo de Distancias**
- Fórmula de Haversine para precisión geográfica
- Distancias en kilómetros con 1 decimal
- Formato automático (metros si < 1km)

### 3. **Ordenamiento por Distancia**
- Cuando hay ubicación, "Relevancia" ordena por distancia
- Mantiene otros criterios de ordenamiento disponibles
- Distancia visible en cada tarjeta de cancha

### 4. **Filtro por Radio**
- Opciones: 1km, 3km, 5km, 10km, 20km, Todas
- Solo visible cuando hay ubicación activa
- Filtra canchas dentro del radio seleccionado

### 5. **Cache de Ubicación**
- Guarda ubicación en localStorage
- Expira después de 1 hora
- Recarga automática al volver a la página

### 6. **Indicador Visual de Distancia**
- Badge con icono de navegación en cada tarjeta
- Muestra distancia formateada (ej: "2.5km", "850m")
- Solo visible cuando hay ubicación activa

## 🛠️ Archivos Modificados/Creados

### Nuevos Archivos
```
lib/geolocation-utils.ts          - Utilidades de geolocalización
components/ubicacion-button.tsx   - Componente del botón "Cerca de mí"
```

### Archivos Modificados
```
app/canchas/page.tsx              - Integración del sistema
components/cancha-card.tsx        - Mostrar distancia
components/advanced-filters.tsx   - Filtro de radio
lib/types.ts                      - Agregar radioKm a filtros
```

## 📱 Flujo de Usuario

### Paso 1: Activar Ubicación
1. Usuario hace clic en "Cerca de mí"
2. Navegador solicita permiso de ubicación
3. Sistema obtiene coordenadas GPS
4. Ubicación se guarda en localStorage (cache 1 hora)

### Paso 2: Ver Canchas Cercanas
1. Lista se reordena automáticamente por distancia
2. Cada tarjeta muestra badge con distancia
3. Selector de ordenamiento cambia a "Más cercanas"

### Paso 3: Filtrar por Radio (Opcional)
1. Usuario selecciona radio (ej: 3km)
2. Solo se muestran canchas dentro del radio
3. Contador de resultados se actualiza

### Paso 4: Limpiar Ubicación
1. Usuario hace clic en X del badge
2. Ubicación se elimina de localStorage
3. Lista vuelve a ordenamiento normal
4. Filtro de radio desaparece

## 🔧 API de Geolocalización

### Funciones Principales

#### `obtenerUbicacionActual(): Promise<Coordenadas>`
Obtiene la ubicación actual del usuario usando Geolocation API.

**Opciones:**
- `enableHighAccuracy: true` - Usa GPS si está disponible
- `timeout: 10000` - 10 segundos máximo
- `maximumAge: 300000` - Cache de 5 minutos

**Errores:**
- `PERMISSION_DENIED` - Usuario denegó permiso
- `POSITION_UNAVAILABLE` - GPS no disponible
- `TIMEOUT` - Tiempo de espera agotado

#### `calcularDistancia(punto1, punto2): number`
Calcula distancia entre dos coordenadas usando fórmula de Haversine.

**Retorna:** Distancia en kilómetros (redondeada a 1 decimal)

#### `ordenarPorDistancia(canchas, ubicacion)`
Ordena array de canchas por distancia a un punto.

**Retorna:** Array con campo `distancia` agregado

#### `filtrarPorRadio(canchas, ubicacion, radioKm)`
Filtra canchas dentro de un radio específico.

**Retorna:** Array filtrado

#### `guardarUbicacion(coords)` / `obtenerUbicacionGuardada()`
Maneja cache de ubicación en localStorage.

**Expiración:** 1 hora

## 💰 Costo y Rendimiento

### ✅ **GRATIS - 0 consultas a BD**
- Todo el cálculo es local (JavaScript)
- No requiere servicios externos
- No consume API de Google Maps
- No requiere backend adicional

### ⚡ **Rendimiento**
- Cálculo de distancia: < 1ms por cancha
- Ordenamiento: O(n log n) - muy rápido
- Cache en localStorage: instantáneo
- Sin latencia de red

## 🔒 Privacidad y Seguridad

### Permisos
- Requiere permiso explícito del usuario
- Usuario puede denegar sin afectar funcionalidad
- Ubicación nunca se envía al servidor
- Solo se guarda en localStorage del navegador

### Datos Almacenados
```javascript
localStorage.setItem('cp_ubicacion', JSON.stringify({ lat, lng }))
localStorage.setItem('cp_ubicacion_time', Date.now().toString())
```

### Expiración
- Cache expira en 1 hora
- Usuario puede limpiar manualmente
- Se limpia automáticamente al expirar

## 📊 Ejemplo de Uso

### Código de Integración
```typescript
import { UbicacionButton } from '@/components/ubicacion-button';
import { ordenarPorDistancia, filtrarPorRadio } from '@/lib/geolocation-utils';

// Estado
const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);

// Handlers
const handleUbicacionObtenida = (coords: Coordenadas) => {
  setUbicacion(coords);
};

const handleUbicacionLimpiada = () => {
  setUbicacion(null);
  setFilters(prev => ({ ...prev, radioKm: undefined }));
};

// Filtrado y ordenamiento
const filtered = useMemo(() => {
  let result = filterCanchas(canchas, filters);
  
  // Filtrar por radio si hay ubicación
  if (ubicacion && filters.radioKm) {
    result = filtrarPorRadio(result, ubicacion, filters.radioKm);
  }
  
  // Ordenar por distancia si hay ubicación
  if (ubicacion && sortBy === 'relevancia') {
    return ordenarPorDistancia(result, ubicacion);
  }
  
  return sortCanchas(result, sortBy);
}, [canchas, filters, sortBy, ubicacion]);

// Componente
<UbicacionButton
  onUbicacionObtenida={handleUbicacionObtenida}
  onUbicacionLimpiada={handleUbicacionLimpiada}
  ubicacionActual={ubicacion}
/>
```

## 🎨 UI/UX

### Estados del Botón

#### Sin Ubicación
```
┌─────────────────┐
│ 📍 Cerca de mí  │
└─────────────────┘
```

#### Cargando
```
┌──────────────────────────────┐
│ ⏳ Obteniendo ubicación...   │
└──────────────────────────────┘
```

#### Con Ubicación
```
┌──────────────────┐
│ 📍 Cerca de ti ✕ │
└──────────────────┘
```

#### Error
```
┌─────────────────┐
│ 📍 Cerca de mí  │
└─────────────────┘
⚠️ Permiso de ubicación denegado
```

### Badge de Distancia en Tarjeta
```
┌────────────────────────────────┐
│ Cancha Los Pinos               │
│ 📍 Av. Grau 123      🧭 2.5km  │
│ ⭐ 4.5 (12)                    │
│ S/ 50/hora                     │
└────────────────────────────────┘
```

### Filtro de Radio
```
┌─────────────────────────────┐
│ 📍 Radio de distancia       │
├─────────────────────────────┤
│ [Todas] [1km] [3km] [5km]   │
│ [10km] [20km]               │
├─────────────────────────────┤
│ ℹ️ Mostrando canchas a menos│
│   de 3 km de tu ubicación   │
└─────────────────────────────┘
```

## 🧪 Testing

### Casos de Prueba

#### 1. Permiso Concedido
- ✅ Ubicación se obtiene correctamente
- ✅ Badge "Cerca de ti" aparece
- ✅ Lista se reordena por distancia
- ✅ Distancias aparecen en tarjetas

#### 2. Permiso Denegado
- ✅ Mensaje de error se muestra
- ✅ Botón vuelve a estado inicial
- ✅ Lista mantiene orden normal

#### 3. GPS No Disponible
- ✅ Mensaje de error apropiado
- ✅ Funcionalidad no se rompe

#### 4. Cache de Ubicación
- ✅ Ubicación se guarda en localStorage
- ✅ Se recarga al volver a la página
- ✅ Expira después de 1 hora

#### 5. Filtro de Radio
- ✅ Solo aparece con ubicación activa
- ✅ Filtra correctamente por distancia
- ✅ Se limpia al limpiar ubicación

#### 6. Responsive
- ✅ Funciona en móvil
- ✅ Funciona en tablet
- ✅ Funciona en desktop

## 🚀 Próximas Mejoras (Opcionales)

### Fase 2 - Mapa Interactivo
- [ ] Integrar mapa con marcadores
- [ ] Mostrar ubicación del usuario
- [ ] Mostrar canchas en el mapa
- [ ] Click en marcador para ver detalles

### Fase 3 - Rutas y Navegación
- [ ] Botón "Cómo llegar"
- [ ] Integración con Google Maps
- [ ] Tiempo estimado de llegada
- [ ] Opciones de transporte

### Fase 4 - Geofencing
- [ ] Notificaciones de canchas cercanas
- [ ] Ofertas basadas en ubicación
- [ ] Recordatorios al acercarse a la cancha

## 📝 Notas Técnicas

### Fórmula de Haversine
```javascript
const R = 6371; // Radio de la Tierra en km
const dLat = toRad(punto2.lat - punto1.lat);
const dLng = toRad(punto2.lng - punto1.lng);

const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(toRad(punto1.lat)) * Math.cos(toRad(punto2.lat)) *
          Math.sin(dLng/2) * Math.sin(dLng/2);

const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
const distancia = R * c;
```

### Precisión
- **Alta precisión**: ±10 metros (con GPS)
- **Media precisión**: ±100 metros (con WiFi)
- **Baja precisión**: ±1000 metros (con IP)

### Compatibilidad
- ✅ Chrome 5+
- ✅ Firefox 3.5+
- ✅ Safari 5+
- ✅ Edge 12+
- ✅ iOS Safari 3.2+
- ✅ Android Browser 2.1+

## 🎯 Conclusión

Sistema de geolocalización completo, gratuito y eficiente que mejora significativamente la experiencia del usuario al buscar canchas cercanas. No requiere servicios externos, no consume consultas a BD, y funciona perfectamente en dispositivos móviles.

**Costo total: S/ 0.00/mes** 🎉
