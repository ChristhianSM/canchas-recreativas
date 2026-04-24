-- ============================================================
-- CanchaPiura — Seed de canchas de prueba
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema.sql
-- ============================================================

insert into public.canchas (id, nombre, tipo, direccion, distrito, descripcion, imagenes, rating, total_resenas, precio_por_hora, amenidades, lat, lng, telefono, destacada, activa)
values
  (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Complejo Deportivo Los Algarrobos',
    'futbol',
    'Av. Los Algarrobos 1250, Piura',
    'Piura',
    'Cancha de grass sintético de última generación con iluminación LED profesional. Ideal para partidos nocturnos y entrenamientos.',
    array[
      'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=600&fit=crop'
    ],
    4.8, 156, 80,
    array['Estacionamiento','Vestidores','Duchas','Cafetería','WiFi'],
    -5.1945, -80.6328, '+51 973 456 789', true, true
  ),
  (
    'a1b2c3d4-0002-0002-0002-000000000002',
    'Arena Sport Center',
    'futbol',
    'Calle Las Palmeras 456, Castilla',
    'Castilla',
    'Centro deportivo moderno con 3 canchas de fútbol 7 y una de fútbol 11. Superficie de grass sintético premium.',
    array[
      'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&h=600&fit=crop'
    ],
    4.6, 98, 70,
    array['Estacionamiento','Vestidores','Tienda deportiva'],
    -5.1891, -80.6150, '+51 974 567 890', true, true
  ),
  (
    'a1b2c3d4-0003-0003-0003-000000000003',
    'Club Vóley Piura',
    'voley',
    'Jr. Tacna 789, Piura',
    'Piura',
    'Canchas profesionales de vóley con piso de madera y arena. Perfectas para entrenamientos y torneos.',
    array[
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1592656094267-764a45160876?w=800&h=600&fit=crop'
    ],
    4.7, 72, 50,
    array['Estacionamiento','Vestidores','Duchas','Tribunas'],
    -5.1978, -80.6289, '+51 975 678 901', false, true
  ),
  (
    'a1b2c3d4-0004-0004-0004-000000000004',
    'Piura Basketball Club',
    'basquet',
    'Av. Grau 1500, Piura',
    'Piura',
    'Cancha techada de basketball con tableros profesionales y piso de parquet. Ambiente climatizado.',
    array[
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800&h=600&fit=crop'
    ],
    4.5, 45, 60,
    array['Estacionamiento','Vestidores','Aire acondicionado','Cafetería'],
    -5.1912, -80.6245, '+51 976 789 012', true, true
  ),
  (
    'a1b2c3d4-0005-0005-0005-000000000005',
    'Tenis Club Piura',
    'tenis',
    'Urb. San Eduardo Lote 15, Piura',
    'Piura',
    'Club exclusivo con 4 canchas de tenis de arcilla y 2 de cemento. Clases con instructores certificados.',
    array[
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=600&fit=crop'
    ],
    4.9, 38, 45,
    array['Estacionamiento','Vestidores','Duchas','Pro Shop','Restaurante'],
    -5.2001, -80.6412, '+51 977 890 123', false, true
  ),
  (
    'a1b2c3d4-0006-0006-0006-000000000006',
    'Futsal Arena Piura',
    'futsal',
    'Av. Sánchez Cerro 2100, Piura',
    'Piura',
    'Cancha techada de futsal con piso sintético de alta calidad. Iluminación profesional y sonido ambiente.',
    array[
      'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1552667466-07770ae110d0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&h=600&fit=crop'
    ],
    4.4, 89, 65,
    array['Estacionamiento','Vestidores','Cafetería','WiFi'],
    -5.1856, -80.6178, '+51 978 901 234', false, true
  ),
  (
    'a1b2c3d4-0007-0007-0007-000000000007',
    'Complejo La Unión',
    'futbol',
    'Av. Panamericana Km 3, La Unión',
    'La Unión',
    'Gran complejo con canchas de fútbol 5, 7 y 11. Área de parrillas disponible para eventos.',
    array[
      'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=600&fit=crop'
    ],
    4.3, 67, 55,
    array['Estacionamiento amplio','Vestidores','Zona de parrillas','Área infantil'],
    -5.2234, -80.5890, '+51 979 012 345', false, true
  ),
  (
    'a1b2c3d4-0008-0008-0008-000000000008',
    'Vóley Playa Colán',
    'voley',
    'Playa Colán, Paita',
    'Colán',
    'Canchas de vóley playa con vista al mar. Disfruta del deporte con el mejor clima de Piura.',
    array[
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1593786247379-74aacf63f7e8?w=800&h=600&fit=crop'
    ],
    4.6, 52, 40,
    array['Duchas','Sombrillas','Venta de bebidas','Alquiler de equipos'],
    -4.9567, -81.0678, '+51 980 123 456', false, true
  )
on conflict (id) do nothing;
