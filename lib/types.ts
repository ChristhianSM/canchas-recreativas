export type SuperficieType = 'grass' | 'grass_sintetico' | 'loza' | 'cemento';

export const superficieLabels: Record<SuperficieType, string> = {
  grass:           'Grass natural',
  grass_sintetico: 'Grass sintético',
  loza:            'Loza',
  cemento:         'Cemento',
};

export const superficieIcons: Record<SuperficieType, string> = {
  grass:           '🌿',
  grass_sintetico: '🟩',
  loza:            '🏗️',
  cemento:         '⬜',
};

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  price: number;
  status: 'disponible' | 'reservado' | 'en_proceso';
}

export interface Cancha {
  id: string;
  name: string;
  type: 'futbol' | 'voley' | 'basquet' | 'tenis' | 'futsal';
  address: string;
  district: string;
  description: string;
  images: string[];
  rating: number;
  reviewCount: number;
  pricePerHour: number;
  amenities: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  schedule: {
    [key: string]: TimeSlot[];
  };
  phone: string;
  featured?: boolean;
  superficie?: SuperficieType | null;
  maxJugadores?: number | null;
  balonDisponible?: boolean;
  balonPrecio?: number | null;
  chalecoDisponible?: boolean;
  chalecosPrecio?: number | null;
}

export type SportType = Cancha['type'];

export const sportLabels: Record<SportType, string> = {
  futbol: 'Fútbol',
  voley: 'Vóley',
  basquet: 'Básquet',
  tenis: 'Tenis',
  futsal: 'Futsal',
};

export const sportIcons: Record<SportType, string> = {
  futbol: '⚽',
  voley: '🏐',
  basquet: '🏀',
  tenis: '🎾',
  futsal: '⚽',
};

// Filtros avanzados
export interface AdvancedFilters {
  sports: SportType[];
  priceRange: [number, number];
  minRating: number;
  amenities: string[];
  districts: string[];
  selectedDate: string;
  availableHours: string[];
  onlyFeatured: boolean;
  searchQuery: string;
  conBalon: boolean;
  conChalecos: boolean;
  superficies: SuperficieType[];
  minJugadores: number; // 0 = sin filtro
  radioKm?: number; // Radio de distancia en km (opcional)
}

// Importar aquí para evitar circular dependency
import { getLocalDateString } from './date-utils';

export const DEFAULT_FILTERS: AdvancedFilters = {
  sports: [],
  priceRange: [0, 200],
  minRating: 0,
  amenities: [],
  districts: [],
  selectedDate: getLocalDateString(),
  availableHours: [],
  onlyFeatured: false,
  searchQuery: '',
  conBalon: false,
  conChalecos: false,
  superficies: [],
  minJugadores: 0,
};
