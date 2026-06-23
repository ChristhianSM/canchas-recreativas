-- ============================================================
-- SEED PRODUCCIÓN — CanchaGo Piura
-- Ejecutar en Supabase → SQL Editor
-- ADVERTENCIA: elimina todos los datos transaccionales
-- ============================================================

-- ── 1. LIMPIAR DATOS (orden respeta FKs) ──────────────────────

DELETE FROM public.notificaciones;
DELETE FROM public.partido_jugadores;
DELETE FROM public.partidos;
DELETE FROM public.publicacion_canchas;
DELETE FROM public.publicaciones;
DELETE FROM public.cancha_cupones;
DELETE FROM public.cancha_sellos;
DELETE FROM public.cancha_loyalty_config;
DELETE FROM public.loyalty_historial;
DELETE FROM public.loyalty;
DELETE FROM public.cupones;
DELETE FROM public.resenas;
DELETE FROM public.reservas;
DELETE FROM public.horarios_bloqueados;
DELETE FROM public.bloqueos_admin;
DELETE FROM public.bloqueos_temporales;
DELETE FROM public.duenos_canchas;
DELETE FROM public.favoritos;
DELETE FROM public.canchas;

-- ── 2. INSERTAR 6 CANCHAS DE PRODUCCIÓN ───────────────────────

INSERT INTO public.canchas (
  nombre, tipo, direccion, distrito, descripcion,
  imagenes, precio_por_hora, amenidades,
  lat, lng, telefono, destacada, activa, accesorios
) VALUES

-- 1. Fútbol · Los Algarrobos
(
  'Complejo Deportivo Los Algarrobos',
  'futbol',
  'Av. Los Algarrobos 1250',
  'Piura',
  'Complejo con 2 canchas de fútbol 7 en césped sintético de última generación. Perfectas para partidos nocturnos gracias a su iluminación LED de alto rendimiento.',
  ARRAY[
    'https://images.unsplash.com/photo-1551958219-acbc4c7e2ad4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1537572790624-2ed08a3ac64f?auto=format&fit=crop&w=800&q=80'
  ],
  80,
  ARRAY['Césped sintético','Iluminación LED','Vestuarios','Estacionamiento','Cafetería'],
  -5.1658, -80.6587,
  '073 300 101',
  true, true,
  '[]'::jsonb
),

-- 2. Fútbol · El Bosque
(
  'Canchas Sintéticas El Bosque',
  'futbol',
  'Av. Sánchez Cerro 850, Urb. El Bosque',
  'Piura',
  'Canchas de fútbol 8 con pasto sintético y sistema de drenaje. Ambiente familiar y seguro, ideal para ligas y torneos locales.',
  ARRAY[
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=800&q=80'
  ],
  70,
  ARRAY['Césped sintético','Vestuarios','Tribuna','Estacionamiento'],
  -5.1802, -80.6301,
  '073 300 202',
  true, true,
  '[]'::jsonb
),

-- 3. Futsal · Castilla
(
  'Sport Futsal Castilla',
  'futsal',
  'Av. Guardia Civil 430, Castilla',
  'Castilla',
  'Cancha de futsal techada con piso vinílico de alta tracción. La mejor opción en Castilla para entrenamientos y partidos de sala.',
  ARRAY[
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80'
  ],
  55,
  ARRAY['Techado','Piso vinílico','Iluminación LED','Vestuarios','Zona de calentamiento'],
  -5.1795, -80.6103,
  '073 300 303',
  false, true,
  '[]'::jsonb
),

-- 4. Vóley · Miraflores
(
  'Academia Vóley Miraflores',
  'voley',
  'Calle Los Pinos 220, Urb. Miraflores',
  'Piura',
  'Dos canchas de vóley con arena importada y red reglamentaria. Clases grupales disponibles de lunes a sábado.',
  ARRAY[
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1602012141142-a9b3f6f32c37?auto=format&fit=crop&w=800&q=80'
  ],
  50,
  ARRAY['Arena importada','Red reglamentaria','Duchas','Gradas'],
  -5.1697, -80.6350,
  '073 300 404',
  false, true,
  '[]'::jsonb
),

-- 5. Básquet · Ignacio Merino
(
  'Polideportivo Ignacio Merino',
  'basquet',
  'Jr. Los Libertadores 315, Urb. Ignacio Merino',
  'Piura',
  'Cancha de básquetbol con piso de madera pulida y tableros regulables. Espacio ideal para entrenamientos y campeonatos barriales.',
  ARRAY[
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=800&q=80'
  ],
  50,
  ARRAY['Piso de madera','Tableros regulables','Gradas','Estacionamiento'],
  -5.2070, -80.6280,
  '073 300 505',
  false, true,
  '[]'::jsonb
),

-- 6. Tenis · Club Grau
(
  'Tennis Club Grau',
  'tenis',
  'Av. Grau 780, Urb. Club Grau',
  'Piura',
  'Dos canchas de tenis en arcilla con iluminación nocturna profesional. Clases con instructor certificado disponibles bajo reserva.',
  ARRAY[
    'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80'
  ],
  70,
  ARRAY['Cancha de arcilla','Iluminación nocturna','Vestuarios','Pro shop','Instructor disponible'],
  -5.1920, -80.6450,
  '073 300 606',
  true, true,
  '[]'::jsonb
);

-- ── 3. VERIFICACIÓN ───────────────────────────────────────────

SELECT nombre, tipo, distrito, precio_por_hora, destacada
FROM public.canchas
ORDER BY creado_en;
