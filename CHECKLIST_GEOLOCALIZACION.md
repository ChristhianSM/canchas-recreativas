# ✅ Checklist de Verificación - Sistema de Geolocalización

## 📋 Antes de Probar

### Requisitos
- [ ] Build exitoso (`npm run build`)
- [ ] Servidor corriendo (`npm run dev`)
- [ ] Navegador con soporte de geolocalización (Chrome, Safari, Firefox)
- [ ] Dispositivo con GPS (móvil) o ubicación habilitada (desktop)

## 🖥️ Pruebas en Desktop

### 1. Página de Canchas - Sidebar
- [ ] Abrir http://localhost:3000/canchas
- [ ] Verificar que aparece botón "Cerca de mí" en sidebar (desktop)
- [ ] Hacer clic en "Cerca de mí"
- [ ] Navegador solicita permiso de ubicación
- [ ] Aceptar permiso
- [ ] Botón cambia a badge "Cerca de ti" con X
- [ ] Lista de canchas se reordena
- [ ] Selector de ordenamiento cambia a "Más cercanas"

### 2. Indicadores de Distancia
- [ ] Cada tarjeta de cancha muestra badge con distancia
- [ ] Badge tiene icono de navegación (🧭)
- [ ] Distancia está formateada correctamente (ej: "2.5km", "850m")
- [ ] Badge tiene estilo visual correcto (color primario)

### 3. Filtro de Radio
- [ ] Aparece nueva sección "Radio de distancia" en filtros
- [ ] Opciones disponibles: Todas, 1km, 3km, 5km, 10km, 20km
- [ ] Seleccionar "3km"
- [ ] Lista se filtra mostrando solo canchas a menos de 3km
- [ ] Contador de resultados se actualiza
- [ ] Mensaje informativo aparece debajo del filtro

### 4. Limpiar Ubicación
- [ ] Hacer clic en X del badge "Cerca de ti"
- [ ] Badge desaparece
- [ ] Botón "Cerca de mí" vuelve a aparecer
- [ ] Lista vuelve a orden normal
- [ ] Filtro de radio desaparece
- [ ] Distancias desaparecen de las tarjetas

### 5. Cache de Ubicación
- [ ] Activar ubicación
- [ ] Recargar página (F5)
- [ ] Ubicación se mantiene activa
- [ ] Lista sigue ordenada por distancia
- [ ] Esperar 1 hora y recargar
- [ ] Ubicación expira y se limpia automáticamente

## 📱 Pruebas en Móvil

### 1. Página de Canchas - Header
- [ ] Abrir en móvil: http://[tu-ip]:3000/canchas
- [ ] Verificar que aparece botón "Cerca de mí" en header superior
- [ ] Hacer clic en "Cerca de mí"
- [ ] Sistema solicita permiso de ubicación
- [ ] Aceptar permiso
- [ ] Badge "Cerca de ti" aparece
- [ ] Lista se reordena por distancia

### 2. Filtros en Sheet (Móvil)
- [ ] Hacer clic en botón "Filtros"
- [ ] Sheet se abre desde la derecha
- [ ] Scroll hasta "Radio de distancia"
- [ ] Filtro de radio está visible
- [ ] Seleccionar radio (ej: 5km)
- [ ] Cerrar sheet
- [ ] Lista se filtra correctamente

### 3. Responsive
- [ ] Botón se ve bien en móvil
- [ ] Badge se ve bien en móvil
- [ ] Distancias en tarjetas se ven bien
- [ ] Filtro de radio se ve bien en sheet
- [ ] No hay overflow horizontal
- [ ] Todo es clickeable/tapeable

## 🧪 Pruebas de Errores

### 1. Permiso Denegado
- [ ] Hacer clic en "Cerca de mí"
- [ ] Denegar permiso de ubicación
- [ ] Mensaje de error aparece: "Permiso de ubicación denegado"
- [ ] Botón vuelve a estado normal
- [ ] No hay errores en consola
- [ ] Página sigue funcionando normalmente

### 2. GPS No Disponible
- [ ] Deshabilitar ubicación en sistema operativo
- [ ] Hacer clic en "Cerca de mí"
- [ ] Mensaje de error apropiado aparece
- [ ] No hay errores en consola

### 3. Timeout
- [ ] En área sin señal GPS
- [ ] Hacer clic en "Cerca de mí"
- [ ] Esperar 10 segundos
- [ ] Mensaje de timeout aparece
- [ ] No hay errores en consola

### 4. Sin Soporte de Geolocalización
- [ ] Abrir en navegador antiguo (IE11)
- [ ] Botón no aparece o está deshabilitado
- [ ] Mensaje apropiado se muestra
- [ ] Página sigue funcionando

## 🔍 Pruebas de Consola

### 1. Sin Errores
- [ ] Abrir DevTools → Console
- [ ] Activar ubicación
- [ ] No hay errores en consola
- [ ] No hay warnings importantes

### 2. localStorage
- [ ] Abrir DevTools → Application → Local Storage
- [ ] Activar ubicación
- [ ] Verificar que existe `cp_ubicacion`
- [ ] Verificar que existe `cp_ubicacion_time`
- [ ] Valores son correctos (JSON con lat/lng y timestamp)

### 3. Network
- [ ] Abrir DevTools → Network
- [ ] Activar ubicación
- [ ] NO debe haber requests adicionales
- [ ] Todo es local (JavaScript)

## 📊 Pruebas de Funcionalidad

### 1. Ordenamiento Correcto
- [ ] Activar ubicación
- [ ] Primera cancha es la más cercana
- [ ] Última cancha es la más lejana
- [ ] Distancias están en orden ascendente

### 2. Filtro de Radio Correcto
- [ ] Activar ubicación
- [ ] Seleccionar radio de 3km
- [ ] Todas las canchas mostradas están a ≤ 3km
- [ ] Ninguna cancha > 3km aparece
- [ ] Contador de resultados es correcto

### 3. Combinación de Filtros
- [ ] Activar ubicación
- [ ] Seleccionar radio de 5km
- [ ] Agregar filtro de deporte (ej: Fútbol)
- [ ] Agregar filtro de precio
- [ ] Todos los filtros funcionan juntos
- [ ] Resultados son correctos

### 4. Cambio de Ordenamiento
- [ ] Activar ubicación (orden por distancia)
- [ ] Cambiar a "Menor precio"
- [ ] Lista se reordena por precio
- [ ] Distancias siguen apareciendo
- [ ] Cambiar a "Más cercanas"
- [ ] Lista vuelve a orden por distancia

## 🎨 Pruebas Visuales

### 1. Botón "Cerca de mí"
- [ ] Icono de ubicación (📍) visible
- [ ] Texto legible
- [ ] Hover effect funciona
- [ ] Estados visuales correctos (normal, cargando, activo)

### 2. Badge "Cerca de ti"
- [ ] Color primario aplicado
- [ ] Icono de ubicación relleno
- [ ] Botón X visible y clickeable
- [ ] Hover effect en X

### 3. Badge de Distancia en Tarjeta
- [ ] Icono de navegación visible
- [ ] Distancia legible
- [ ] Color primario aplicado
- [ ] Posición correcta (al lado de dirección)

### 4. Filtro de Radio
- [ ] Botones bien espaciados
- [ ] Botón seleccionado resaltado
- [ ] Hover effect funciona
- [ ] Mensaje informativo legible

## 🚀 Pruebas de Rendimiento

### 1. Velocidad
- [ ] Cálculo de distancias es instantáneo
- [ ] Ordenamiento es rápido (< 100ms)
- [ ] Filtrado es rápido (< 100ms)
- [ ] No hay lag al activar ubicación

### 2. Con Muchas Canchas
- [ ] Probar con 50+ canchas
- [ ] Cálculo sigue siendo rápido
- [ ] No hay lag en UI
- [ ] Scroll es fluido

## 📱 Pruebas en Diferentes Dispositivos

### Móviles
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Tablet (iPad/Android)

### Desktop
- [ ] Chrome
- [ ] Firefox
- [ ] Safari (macOS)
- [ ] Edge

### Resoluciones
- [ ] 320px (móvil pequeño)
- [ ] 375px (móvil estándar)
- [ ] 768px (tablet)
- [ ] 1024px (desktop pequeño)
- [ ] 1920px (desktop grande)

## ✅ Checklist Final

### Funcionalidad
- [ ] Botón "Cerca de mí" funciona
- [ ] Ubicación se obtiene correctamente
- [ ] Distancias se calculan correctamente
- [ ] Ordenamiento por distancia funciona
- [ ] Filtro de radio funciona
- [ ] Cache de ubicación funciona
- [ ] Limpiar ubicación funciona

### UI/UX
- [ ] Todos los estados visuales correctos
- [ ] Responsive en todos los tamaños
- [ ] Animaciones fluidas
- [ ] Mensajes de error claros
- [ ] Iconos visibles y apropiados

### Errores
- [ ] Sin errores en consola
- [ ] Manejo correcto de permisos denegados
- [ ] Manejo correcto de GPS no disponible
- [ ] Manejo correcto de timeout
- [ ] Página no se rompe en ningún caso

### Rendimiento
- [ ] Cálculos rápidos
- [ ] Sin lag en UI
- [ ] Sin requests adicionales
- [ ] Cache funciona correctamente

### Compatibilidad
- [ ] Funciona en Chrome
- [ ] Funciona en Safari
- [ ] Funciona en Firefox
- [ ] Funciona en móvil
- [ ] Funciona en tablet
- [ ] Funciona en desktop

## 🎯 Resultado Esperado

Al completar este checklist:
- ✅ Sistema de geolocalización 100% funcional
- ✅ Sin errores ni bugs
- ✅ Experiencia de usuario fluida
- ✅ Listo para producción

## 📝 Notas

Si encuentras algún problema:
1. Verificar consola del navegador
2. Verificar permisos de ubicación
3. Verificar que GPS está habilitado
4. Probar en otro navegador/dispositivo
5. Revisar documentación en `SISTEMA_GEOLOCALIZACION.md`
