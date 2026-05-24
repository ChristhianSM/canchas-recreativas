# Requirements Document

## Introduction

El buscador avanzado del home es una funcionalidad que permite a los usuarios encontrar canchas deportivas disponibles de manera rápida e inteligente. El sistema debe detectar automáticamente la ubicación del usuario, permitir seleccionar fechas y horarios específicos, y filtrar las canchas según disponibilidad real consultada desde la base de datos. Esta funcionalidad mejora significativamente la experiencia del usuario al eliminar la necesidad de navegar manualmente por todas las canchas para encontrar disponibilidad.

## Glossary

- **Sistema_Buscador**: El componente de búsqueda avanzada ubicado en la página principal (app/page.tsx)
- **API_Geolocalización**: La API nativa del navegador (navigator.geolocation) que proporciona las coordenadas del usuario
- **Usuario**: Persona que visita la plataforma para buscar y reservar canchas deportivas
- **Cancha**: Instalación deportiva disponible para reserva
- **Horario_Disponible**: Franja horaria de una cancha que no está reservada ni bloqueada para una fecha específica
- **Selector_Calendario**: Componente interactivo que permite al usuario elegir una fecha futura
- **Selector_Horarios**: Componente que muestra horarios disponibles basados en la fecha seleccionada
- **Servicio_Geocodificación**: Servicio que convierte coordenadas geográficas en nombres de ciudades/distritos
- **Base_Datos**: Sistema Supabase que almacena información de canchas, horarios y reservas
- **Página_Resultados**: Vista que muestra las canchas filtradas según los criterios de búsqueda

## Requirements

### Requirement 1: Detección Automática de Ubicación

**User Story:** Como usuario, quiero que el sistema detecte automáticamente mi ubicación actual, para que pueda encontrar canchas cercanas sin tener que escribir mi dirección manualmente.

#### Acceptance Criteria

1. WHEN el Usuario accede a la página principal, THE Sistema_Buscador SHALL solicitar autorización para acceder a la ubicación mediante la API_Geolocalización
2. WHEN el Usuario otorga permiso de ubicación, THE Sistema_Buscador SHALL obtener las coordenadas geográficas (latitud y longitud)
3. WHEN el Sistema_Buscador obtiene las coordenadas, THE Sistema_Buscador SHALL convertir las coordenadas en un nombre de ciudad o distrito mediante el Servicio_Geocodificación
4. WHEN la ubicación detectada es Piura o un distrito de Piura, THE Sistema_Buscador SHALL mostrar el nombre del distrito en el campo de ubicación
5. WHEN la ubicación detectada no es Piura, THE Sistema_Buscador SHALL mostrar el nombre de la ciudad detectada
6. WHEN el Usuario deniega el permiso de ubicación, THE Sistema_Buscador SHALL mostrar "Mi ubicación" como texto predeterminado
7. WHEN ocurre un error en la detección de ubicación, THE Sistema_Buscador SHALL mostrar "Mi ubicación" como texto predeterminado y registrar el error en la consola

### Requirement 2: Selector de Fecha Interactivo

**User Story:** Como usuario, quiero seleccionar cualquier fecha futura en un calendario interactivo, para que pueda planificar mis reservas con anticipación.

#### Acceptance Criteria

1. THE Sistema_Buscador SHALL convertir el campo de fecha en un Selector_Calendario interactivo
2. WHEN el Usuario hace clic en el campo de fecha, THE Sistema_Buscador SHALL mostrar un calendario desplegable
3. THE Selector_Calendario SHALL permitir seleccionar únicamente fechas futuras (hoy o posteriores)
4. THE Selector_Calendario SHALL deshabilitar fechas pasadas
5. WHEN el Usuario selecciona una fecha, THE Sistema_Buscador SHALL actualizar el campo de fecha con el formato legible "Hoy, 6 de mayo" o "Mañana, 7 de mayo" o "Lunes, 8 de mayo"
6. WHEN la fecha seleccionada es hoy, THE Sistema_Buscador SHALL mostrar "Hoy" seguido de la fecha
7. WHEN la fecha seleccionada es mañana, THE Sistema_Buscador SHALL mostrar "Mañana" seguido de la fecha
8. THE Sistema_Buscador SHALL almacenar la fecha seleccionada en formato ISO (YYYY-MM-DD) para consultas a la Base_Datos

### Requirement 3: Selector de Horarios Disponibles

**User Story:** Como usuario, quiero ver solo los horarios que tienen canchas disponibles para la fecha seleccionada, para que no pierda tiempo buscando horarios sin disponibilidad.

#### Acceptance Criteria

1. THE Sistema_Buscador SHALL convertir el campo de hora en un Selector_Horarios interactivo
2. WHEN el Usuario selecciona una fecha, THE Sistema_Buscador SHALL consultar la Base_Datos para obtener horarios con disponibilidad
3. THE Sistema_Buscador SHALL consultar horarios desde las 06:00 hasta las 23:00 horas
4. WHEN el Sistema_Buscador consulta horarios, THE Sistema_Buscador SHALL excluir horarios que estén completamente reservados o bloqueados
5. WHEN el Usuario hace clic en el campo de hora, THE Selector_Horarios SHALL mostrar únicamente horarios con al menos una cancha disponible
6. THE Selector_Horarios SHALL mostrar los horarios en formato de 12 horas con AM/PM
7. WHEN el Usuario selecciona un horario, THE Sistema_Buscador SHALL actualizar el campo de hora con el formato seleccionado
8. WHEN no hay horarios disponibles para la fecha seleccionada, THE Selector_Horarios SHALL mostrar el mensaje "No hay horarios disponibles para esta fecha"

### Requirement 4: Consulta de Disponibilidad en Tiempo Real

**User Story:** Como usuario, quiero que el sistema consulte la disponibilidad real de las canchas desde la base de datos, para que la información mostrada sea precisa y actualizada.

#### Acceptance Criteria

1. THE Sistema_Buscador SHALL crear un endpoint API para consultar horarios disponibles por fecha
2. WHEN el endpoint recibe una fecha, THE Sistema_Buscador SHALL consultar la tabla de reservas en la Base_Datos
3. THE Sistema_Buscador SHALL consultar la tabla de bloqueos_temporales en la Base_Datos
4. THE Sistema_Buscador SHALL consultar la tabla de bloqueos_admin en la Base_Datos
5. THE Sistema_Buscador SHALL consultar la tabla de horarios_bloqueados en la Base_Datos
6. WHEN el Sistema_Buscador procesa los datos, THE Sistema_Buscador SHALL identificar horarios donde al menos una cancha está disponible
7. THE Sistema_Buscador SHALL excluir horarios donde todas las canchas están reservadas o bloqueadas
8. THE Sistema_Buscador SHALL retornar una lista de horarios disponibles en formato de 24 horas (HH:00)

### Requirement 5: Filtrado y Redirección a Resultados

**User Story:** Como usuario, quiero que al hacer clic en "Buscar canchas" el sistema me muestre solo las canchas que cumplen con mis criterios de ubicación, fecha y hora, para que pueda encontrar rápidamente la cancha ideal.

#### Acceptance Criteria

1. WHEN el Usuario hace clic en el botón "Buscar canchas", THE Sistema_Buscador SHALL validar que se haya seleccionado una fecha
2. WHEN el Usuario hace clic en el botón "Buscar canchas", THE Sistema_Buscador SHALL validar que se haya seleccionado un horario
3. WHEN las validaciones son exitosas, THE Sistema_Buscador SHALL construir una URL con parámetros de búsqueda (ubicación, fecha, hora)
4. THE Sistema_Buscador SHALL redirigir al Usuario a la Página_Resultados con los parámetros de búsqueda
5. WHEN la Página_Resultados recibe los parámetros, THE Sistema_Buscador SHALL filtrar las canchas según la ubicación detectada
6. WHEN la Página_Resultados filtra por ubicación, THE Sistema_Buscador SHALL priorizar canchas del mismo distrito
7. THE Sistema_Buscador SHALL filtrar canchas que tengan disponibilidad en la fecha y hora seleccionadas
8. THE Sistema_Buscador SHALL mostrar las canchas filtradas ordenadas por relevancia (destacadas primero, luego por rating)

### Requirement 6: Manejo de Estados de Carga y Errores

**User Story:** Como usuario, quiero recibir retroalimentación visual cuando el sistema está procesando mi búsqueda o cuando ocurre un error, para que sepa qué está sucediendo en todo momento.

#### Acceptance Criteria

1. WHEN el Sistema_Buscador está consultando horarios disponibles, THE Sistema_Buscador SHALL mostrar un indicador de carga en el Selector_Horarios
2. WHEN el Sistema_Buscador está detectando la ubicación, THE Sistema_Buscador SHALL mostrar un indicador de carga en el campo de ubicación
3. WHEN la consulta de horarios falla, THE Sistema_Buscador SHALL mostrar un mensaje de error "No se pudieron cargar los horarios disponibles"
4. WHEN la detección de ubicación falla, THE Sistema_Buscador SHALL permitir al Usuario continuar con la búsqueda usando "Mi ubicación" como predeterminado
5. WHEN el Usuario intenta buscar sin seleccionar fecha, THE Sistema_Buscador SHALL mostrar un mensaje de validación "Por favor selecciona una fecha"
6. WHEN el Usuario intenta buscar sin seleccionar hora, THE Sistema_Buscador SHALL mostrar un mensaje de validación "Por favor selecciona un horario"
7. THE Sistema_Buscador SHALL ocultar los indicadores de carga cuando las operaciones se completen exitosamente o fallen

### Requirement 7: Persistencia de Selección del Usuario

**User Story:** Como usuario, quiero que mis selecciones de ubicación, fecha y hora se mantengan mientras navego por la página, para que no tenga que volver a ingresarlas si decido modificar mi búsqueda.

#### Acceptance Criteria

1. WHEN el Usuario selecciona una ubicación, THE Sistema_Buscador SHALL almacenar la selección en el estado del componente
2. WHEN el Usuario selecciona una fecha, THE Sistema_Buscador SHALL almacenar la selección en el estado del componente
3. WHEN el Usuario selecciona un horario, THE Sistema_Buscador SHALL almacenar la selección en el estado del componente
4. WHEN el Usuario cambia la fecha, THE Sistema_Buscador SHALL mantener la ubicación seleccionada
5. WHEN el Usuario cambia la fecha, THE Sistema_Buscador SHALL limpiar la selección de horario y recargar horarios disponibles
6. THE Sistema_Buscador SHALL mantener las selecciones visibles en los campos del buscador hasta que el Usuario las modifique

### Requirement 8: Integración con Servicio de Geocodificación

**User Story:** Como usuario, quiero que el sistema convierta automáticamente mis coordenadas GPS en un nombre de ubicación legible, para que pueda entender fácilmente dónde estoy ubicado.

#### Acceptance Criteria

1. THE Sistema_Buscador SHALL utilizar un Servicio_Geocodificación para convertir coordenadas en direcciones
2. WHEN el Sistema_Buscador obtiene coordenadas, THE Sistema_Buscador SHALL enviar latitud y longitud al Servicio_Geocodificación
3. THE Servicio_Geocodificación SHALL retornar información de ciudad, distrito y país
4. WHEN el Servicio_Geocodificación retorna datos de Perú, THE Sistema_Buscador SHALL extraer el nombre del distrito o ciudad
5. WHEN el Servicio_Geocodificación retorna datos de Piura, THE Sistema_Buscador SHALL mostrar el distrito específico (Castilla, Veintiséis de Octubre, etc.)
6. WHEN el Servicio_Geocodificación falla o no retorna datos, THE Sistema_Buscador SHALL usar "Mi ubicación" como valor predeterminado
7. THE Sistema_Buscador SHALL almacenar las coordenadas originales para cálculos de distancia posteriores

### Requirement 9: Optimización de Rendimiento

**User Story:** Como usuario, quiero que el buscador responda rápidamente a mis interacciones, para que pueda encontrar canchas sin demoras frustrantes.

#### Acceptance Criteria

1. WHEN el Usuario selecciona una fecha, THE Sistema_Buscador SHALL consultar horarios disponibles en menos de 2 segundos
2. THE Sistema_Buscador SHALL implementar debouncing para evitar consultas excesivas a la Base_Datos
3. THE Sistema_Buscador SHALL cachear los horarios disponibles por fecha durante 30 segundos
4. WHEN el Usuario cambia rápidamente entre fechas, THE Sistema_Buscador SHALL cancelar consultas pendientes anteriores
5. THE Sistema_Buscador SHALL cargar el Selector_Calendario de forma asíncrona para no bloquear la renderización inicial
6. THE Sistema_Buscador SHALL cargar el Servicio_Geocodificación de forma asíncrona
7. WHEN la página carga por primera vez, THE Sistema_Buscador SHALL mostrar valores predeterminados inmediatamente sin esperar la geolocalización

### Requirement 10: Accesibilidad y Usabilidad Móvil

**User Story:** Como usuario móvil, quiero que el buscador sea fácil de usar en mi teléfono, para que pueda buscar canchas desde cualquier lugar.

#### Acceptance Criteria

1. THE Selector_Calendario SHALL ser táctil y optimizado para dispositivos móviles
2. THE Selector_Horarios SHALL mostrar opciones con tamaño de toque mínimo de 44x44 píxeles
3. THE Sistema_Buscador SHALL mantener el diseño responsive en pantallas desde 320px de ancho
4. WHEN el Usuario interactúa con selectores en móvil, THE Sistema_Buscador SHALL prevenir el zoom automático del navegador
5. THE Sistema_Buscador SHALL usar selectores nativos del sistema operativo cuando sea apropiado
6. THE Sistema_Buscador SHALL incluir etiquetas ARIA para lectores de pantalla
7. WHEN el Usuario navega con teclado, THE Sistema_Buscador SHALL permitir navegación completa entre todos los campos

