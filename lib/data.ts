import { Cancha, TimeSlot } from './types';

function generateTimeSlots(date: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const hours = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];
  
  hours.forEach((time, index) => {
    const isAvailable = Math.random() > 0.3;
    slots.push({
      id: `${date}-${index}`,
      time,
      available: isAvailable,
      price: time >= '18:00' ? 80 : 60,
      status: isAvailable ? 'disponible' : 'reservado',
    });
  });
  
  return slots;
}

function generateSchedule(): { [key: string]: TimeSlot[] } {
  const schedule: { [key: string]: TimeSlot[] } = {};
  const today = new Date();
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    schedule[dateString] = generateTimeSlots(dateString);
  }
  
  return schedule;
}

export const canchas: Cancha[] = [
  {
    id: 'a1b2c3d4-0001-0001-0001-000000000001',
    name: 'Complejo Deportivo Los Algarrobos',
    type: 'futbol',
    address: 'Av. Los Algarrobos 1250, Piura',
    district: 'Piura',
    description: 'Cancha de grass sintético de última generación con iluminación LED profesional. Ideal para partidos nocturnos y entrenamientos.',
    images: [
      'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=600&fit=crop',
    ],
    rating: 0,
    reviewCount: 0,
    pricePerHour: 80,
    amenities: ['Estacionamiento', 'Vestidores', 'Duchas', 'Cafetería', 'WiFi'],
    coordinates: { lat: -5.1945, lng: -80.6328 },
    schedule: generateSchedule(),
    phone: '+51 973 456 789',
    featured: true,
  },
  {
    id: 'a1b2c3d4-0002-0002-0002-000000000002',
    name: 'Arena Sport Center',
    type: 'futbol',
    address: 'Calle Las Palmeras 456, Castilla',
    district: 'Castilla',
    description: 'Centro deportivo moderno con 3 canchas de fútbol 7 y una de fútbol 11. Superficie de grass sintético premium.',
    images: [
      'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&h=600&fit=crop',
    ],
    rating: 0,
    reviewCount: 0,
    pricePerHour: 70,
    amenities: ['Estacionamiento', 'Vestidores', 'Tienda deportiva'],
    coordinates: { lat: -5.1891, lng: -80.6150 },
    schedule: generateSchedule(),
    phone: '+51 974 567 890',
    featured: true,
  },
  {
    id: 'a1b2c3d4-0003-0003-0003-000000000003',
    name: 'Club Vóley Piura',
    type: 'voley',
    address: 'Jr. Tacna 789, Piura',
    district: 'Piura',
    description: 'Canchas profesionales de vóley con piso de madera y arena. Perfectas para entrenamientos y torneos.',
    images: [
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1592656094267-764a45160876?w=800&h=600&fit=crop',
    ],
    rating: 0,
    reviewCount: 0,
    pricePerHour: 50,
    amenities: ['Estacionamiento', 'Vestidores', 'Duchas', 'Tribunas'],
    coordinates: { lat: -5.1978, lng: -80.6289 },
    schedule: generateSchedule(),
    phone: '+51 975 678 901',
  },
  {
    id: 'a1b2c3d4-0004-0004-0004-000000000004',
    name: 'Piura Basketball Club',
    type: 'basquet',
    address: 'Av. Grau 1500, Piura',
    district: 'Piura',
    description: 'Cancha techada de basketball con tableros profesionales y piso de parquet. Ambiente climatizado.',
    images: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800&h=600&fit=crop',
    ],
    rating: 0,
    reviewCount: 0,
    pricePerHour: 60,
    amenities: ['Estacionamiento', 'Vestidores', 'Aire acondicionado', 'Cafetería'],
    coordinates: { lat: -5.1912, lng: -80.6245 },
    schedule: generateSchedule(),
    phone: '+51 976 789 012',
    featured: true,
  },
  {
    id: 'a1b2c3d4-0005-0005-0005-000000000005',
    name: 'Tenis Club Piura',
    type: 'tenis',
    address: 'Urb. San Eduardo Lote 15, Piura',
    district: 'Piura',
    description: 'Club exclusivo con 4 canchas de tenis de arcilla y 2 de cemento. Clases con instructores certificados.',
    images: [
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=600&fit=crop',
    ],
    rating: 0,
    reviewCount: 0,
    pricePerHour: 45,
    amenities: ['Estacionamiento', 'Vestidores', 'Duchas', 'Pro Shop', 'Restaurante'],
    coordinates: { lat: -5.2001, lng: -80.6412 },
    schedule: generateSchedule(),
    phone: '+51 977 890 123',
  },
  {
    id: 'a1b2c3d4-0006-0006-0006-000000000006',
    name: 'Futsal Arena Piura',
    type: 'futsal',
    address: 'Av. Sánchez Cerro 2100, Piura',
    district: 'Piura',
    description: 'Cancha techada de futsal con piso sintético de alta calidad. Iluminación profesional y sonido ambiente.',
    images: [
      'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1552667466-07770ae110d0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&h=600&fit=crop',
    ],
    rating: 0,
    reviewCount: 0,
    pricePerHour: 65,
    amenities: ['Estacionamiento', 'Vestidores', 'Cafetería', 'WiFi'],
    coordinates: { lat: -5.1856, lng: -80.6178 },
    schedule: generateSchedule(),
    phone: '+51 978 901 234',
  },
  {
    id: 'a1b2c3d4-0007-0007-0007-000000000007',
    name: 'Complejo La Unión',
    type: 'futbol',
    address: 'Av. Panamericana Km 3, La Unión',
    district: 'La Unión',
    description: 'Gran complejo con canchas de fútbol 5, 7 y 11. Área de parrillas disponible para eventos.',
    images: [
      'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=600&fit=crop',
    ],
    rating: 0,
    reviewCount: 0,
    pricePerHour: 55,
    amenities: ['Estacionamiento amplio', 'Vestidores', 'Zona de parrillas', 'Área infantil'],
    coordinates: { lat: -5.2234, lng: -80.5890 },
    schedule: generateSchedule(),
    phone: '+51 979 012 345',
  },
  {
    id: 'a1b2c3d4-0008-0008-0008-000000000008',
    name: 'Vóley Playa Colán',
    type: 'voley',
    address: 'Playa Colán, Paita',
    district: 'Colán',
    description: 'Canchas de vóley playa con vista al mar. Disfruta del deporte con el mejor clima de Piura.',
    images: [
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1593786247379-74aacf63f7e8?w=800&h=600&fit=crop',
    ],
    rating: 0,
    reviewCount: 0,
    pricePerHour: 40,
    amenities: ['Duchas', 'Sombrillas', 'Venta de bebidas', 'Alquiler de equipos'],
    coordinates: { lat: -4.9567, lng: -81.0678 },
    schedule: generateSchedule(),
    phone: '+51 980 123 456',
  },
];

export function getCanchaById(id: string): Cancha | undefined {
  return canchas.find(cancha => cancha.id === id);
}

export function getCanchasByType(type: Cancha['type']): Cancha[] {
  return canchas.filter(cancha => cancha.type === type);
}

export function getFeaturedCanchas(): Cancha[] {
  return canchas.filter(cancha => cancha.featured);
}

export function searchCanchas(query: string): Cancha[] {
  const lowerQuery = query.toLowerCase();
  return canchas.filter(cancha => 
    cancha.name.toLowerCase().includes(lowerQuery) ||
    cancha.address.toLowerCase().includes(lowerQuery) ||
    cancha.district.toLowerCase().includes(lowerQuery)
  );
}
