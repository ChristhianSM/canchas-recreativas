# 🚀 Guía Rápida - Sistema de Geolocalización

## 📱 Para Usuarios

### Cómo Usar en Móvil

1. **Abrir página de canchas**
   - Ir a: `https://tu-dominio.com/canchas`

2. **Activar ubicación**
   - Hacer clic en botón "📍 Cerca de mí" (arriba a la derecha)
   - Aceptar permiso de ubicación cuando el navegador lo solicite

3. **Ver canchas cercanas**
   - La lista se reordena automáticamente
   - Las canchas más cercanas aparecen primero
   - Cada cancha muestra su distancia (ej: "2.5km")

4. **Filtrar por distancia (opcional)**
   - Abrir filtros (botón "Filtros")
   - Buscar sección "📍 Radio de distancia"
   - Seleccionar radio deseado (1km, 3km, 5km, etc.)
   - Solo se mostrarán canchas dentro de ese radio

5. **Desactivar ubicación**
   - Hacer clic en la X del badge "Cerca de ti"
   - La lista vuelve a orden normal

### Cómo Usar en Desktop

1. **Abrir página de canchas**
   - Ir a: `https://tu-dominio.com/canchas`

2. **Activar ubicación**
   - Hacer clic en "📍 Cerca de mí" (en sidebar izquierdo o header)
   - Aceptar permiso de ubicación

3. **Ver y filtrar**
   - Mismo proceso que en móvil
   - Filtro de radio está en el sidebar

## 👨‍💻 Para Desarrolladores

### Instalación
Ya está instalado. Solo necesitas:
```bash
npm run dev
```

### Archivos Principales
```
lib/geolocation-utils.ts          - Utilidades
components/ubicacion-button.tsx   - Componente del botón
app/canchas/page.tsx              - Integración
components/cancha-card.tsx        - Mostrar distancia
components/advanced-filters.tsx   - Filtro de radio
```

### Uso Básico
```typescript
import { UbicacionButton } from '@/components/ubicacion-button';
import { ordenarPorDistancia } from '@/lib/geolocation-utils';

// Estado
const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);

// Componente
<UbicacionButton
  onUbicacionObtenida={(coords) => setUbicacion(coords)}
  onUbicacionLimpiada={() => setUbicacion(null)}
  ubicacionActual={ubicacion}
/>

// Ordenar por distancia
if (ubicacion) {
  const ordenadas = ordenarPorDistancia(canchas, ubicacion);
}
```

### API Disponible

#### Obtener Ubicación
```typescript
import { obtenerUbicacionActual } from '@/lib/geolocation-utils';

const coords = await obtenerUbicacionActual();
// { lat: -5.1945, lng: -80.6328 }
```

#### Calcular Distancia
```typescript
import { calcularDistancia } from '@/lib/geolocation-utils';

const distancia = calcularDistancia(
  { lat: -5.1945, lng: -80.6328 },  // Punto A
  { lat: -5.2000, lng: -80.6400 }   // Punto B
);
// 0.8 (km)
```

#### Formatear Distancia
```typescript
import { formatearDistancia } from '@/lib/geolocation-utils';

formatearDistancia(0.5);   // "500m"
formatearDistancia(2.5);   // "2.5km"
formatearDistancia(10.0);  // "10.0km"
```

#### Ordenar por Distancia
```typescript
import { ordenarPorDistancia } from '@/lib/geolocation-utils';

const ordenadas = ordenarPorDistancia(canchas, ubicacion);
// Retorna array con campo 'distancia' agregado
```

#### Filtrar por Radio
```typescript
import { filtrarPorRadio } from '@/lib/geolocation-utils';

const cercanas = filtrarPorRadio(canchas, ubicacion, 3); // 3km
// Retorna solo canchas a ≤ 3km
```

#### Cache
```typescript
import { 
  guardarUbicacion, 
  obtenerUbicacionGuardada,
  limpiarUbicacion 
} from '@/lib/geolocation-utils';

// Guardar
guardarUbicacion({ lat: -5.1945, lng: -80.6328 });

// Obtener (null si expiró o no existe)
const ubicacion = obtenerUbicacionGuardada();

// Limpiar
limpiarUbicacion();
```

## 🔧 Configuración

### Timeout de GPS
Editar en `lib/geolocation-utils.ts`:
```typescript
{
  timeout: 10000, // 10 segundos (default)
}
```

### Expiración de Cache
Editar en `lib/geolocation-utils.ts`:
```typescript
const unaHora = 60 * 60 * 1000; // 1 hora (default)
```

### Precisión de GPS
Editar en `lib/geolocation-utils.ts`:
```typescript
{
  enableHighAccuracy: true, // true = GPS, false = WiFi/IP
}
```

## 🐛 Troubleshooting

### Problema: Botón no aparece
**Solución:** Verificar que el navegador soporta geolocalización
```typescript
import { soportaGeolocalizacion } from '@/lib/geolocation-utils';

if (!soportaGeolocalizacion()) {
  console.log('Navegador no soporta geolocalización');
}
```

### Problema: Permiso denegado
**Solución:** Usuario debe habilitar permisos en configuración del navegador
- Chrome: Configuración → Privacidad → Configuración de sitios → Ubicación
- Safari: Preferencias → Sitios web → Ubicación

### Problema: GPS no funciona
**Solución:** Verificar que GPS está habilitado en el dispositivo
- iOS: Ajustes → Privacidad → Servicios de ubicación
- Android: Ajustes → Ubicación

### Problema: Distancias incorrectas
**Solución:** Verificar que coordenadas de canchas son correctas
```sql
SELECT id, nombre, lat, lng FROM canchas;
```

### Problema: Cache no expira
**Solución:** Limpiar localStorage manualmente
```javascript
localStorage.removeItem('cp_ubicacion');
localStorage.removeItem('cp_ubicacion_time');
```

## 📊 Monitoreo

### Verificar en Producción
```javascript
// En consola del navegador
localStorage.getItem('cp_ubicacion');
localStorage.getItem('cp_ubicacion_time');
```

### Logs de Debug
```typescript
// Agregar en lib/geolocation-utils.ts
console.log('Ubicación obtenida:', coords);
console.log('Distancia calculada:', distancia);
```

## 🎯 Casos de Uso

### 1. Usuario Busca Cancha Cercana
```
Usuario → Abre app → Click "Cerca de mí" → Acepta permiso
→ Ve canchas ordenadas por distancia → Reserva la más cercana
```

### 2. Usuario Filtra por Radio
```
Usuario → Activa ubicación → Abre filtros → Selecciona "3km"
→ Ve solo canchas a menos de 3km → Reserva
```

### 3. Usuario Compara Distancias
```
Usuario → Activa ubicación → Ve distancia en cada tarjeta
→ Compara opciones → Elige la mejor combinación precio/distancia
```

## 💡 Tips

### Para Usuarios
- ✅ Acepta permiso de ubicación para mejor experiencia
- ✅ Usa filtro de radio para limitar búsqueda
- ✅ Distancia se calcula en línea recta (no ruta real)
- ✅ Ubicación se guarda por 1 hora (no necesitas reactivar)

### Para Desarrolladores
- ✅ Todo es local, no consume BD
- ✅ Usa Haversine para precisión
- ✅ Cache en localStorage (1 hora)
- ✅ Maneja errores gracefully
- ✅ Responsive y mobile-first

## 📚 Documentación Completa

Para más detalles, ver:
- `SISTEMA_GEOLOCALIZACION.md` - Documentación técnica completa
- `RESUMEN_GEOLOCALIZACION.md` - Resumen ejecutivo
- `CHECKLIST_GEOLOCALIZACION.md` - Checklist de testing

## 🆘 Soporte

Si tienes problemas:
1. Revisar consola del navegador (F12)
2. Verificar permisos de ubicación
3. Probar en otro navegador
4. Revisar documentación completa
5. Contactar al equipo de desarrollo

## ✅ Checklist Rápido

- [ ] Build exitoso (`npm run build`)
- [ ] Servidor corriendo (`npm run dev`)
- [ ] Botón "Cerca de mí" visible
- [ ] Permiso de ubicación funciona
- [ ] Distancias aparecen en tarjetas
- [ ] Filtro de radio funciona
- [ ] Sin errores en consola

## 🎉 ¡Listo!

El sistema está completamente funcional y listo para usar.

**Costo: S/ 0.00/mes** 💰
**Tiempo de implementación: Completado** ✅
**Estado: Producción** 🚀
