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
  availableHours: string[];
  onlyFeatured: boolean;
  searchQuery: string;
}

export const DEFAULT_FILTERS: AdvancedFilters = {
  sports: [],
  priceRange: [0, 200],
  minRating: 0,
  amenities: [],
  districts: [],
  availableHours: [],
  onlyFeatured: false,
  searchQuery: '',
};
