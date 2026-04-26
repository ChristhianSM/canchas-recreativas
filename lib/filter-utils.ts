import { Cancha, AdvancedFilters } from './types';

/**
 * Obtiene todas las amenidades únicas de las canchas
 */
export function getAllAmenities(canchas: Cancha[]): string[] {
  const amenitiesSet = new Set<string>();
  canchas.forEach(cancha => {
    cancha.amenities.forEach(a => amenitiesSet.add(a));
  });
  return Array.from(amenitiesSet).sort();
}

/**
 * Obtiene todos los distritos únicos
 */
export function getAllDistricts(canchas: Cancha[]): string[] {
  const districtsSet = new Set(canchas.map(c => c.district));
  return Array.from(districtsSet).sort();
}

/**
 * Obtiene el rango de precios mín/máx
 */
export function getPriceRange(canchas: Cancha[]): [number, number] {
  if (canchas.length === 0) return [0, 100];
  const prices = canchas.map(c => c.pricePerHour);
  return [Math.min(...prices), Math.max(...prices)];
}

/**
 * Verifica si una cancha tiene disponibilidad en una hora específica
 */
export function hasAvailabilityAtHour(cancha: Cancha, hour: string, date?: string): boolean {
  // Si no se especifica fecha, usar hoy
  if (!date) {
    const today = new Date().toISOString().split('T')[0];
    date = today;
  }

  const daySchedule = cancha.schedule[date];
  if (!daySchedule) return false;

  const slot = daySchedule.find(s => s.time === hour);
  return slot ? slot.available : false;
}

/**
 * Filtra canchas según los criterios especificados
 */
export function filterCanchas(canchas: Cancha[], filters: AdvancedFilters, date?: string): Cancha[] {
  return canchas.filter(cancha => {
    // Filtro por deporte
    if (filters.sports.length > 0 && !filters.sports.includes(cancha.type)) {
      return false;
    }

    // Filtro por rango de precio
    if (cancha.pricePerHour < filters.priceRange[0] || cancha.pricePerHour > filters.priceRange[1]) {
      return false;
    }

    // Filtro por rating mínimo
    if (cancha.rating < filters.minRating) {
      return false;
    }

    // Filtro por amenidades (debe tener TODAS las seleccionadas)
    if (filters.amenities.length > 0) {
      const hasAllAmenities = filters.amenities.every(amenity =>
        cancha.amenities.includes(amenity)
      );
      if (!hasAllAmenities) return false;
    }

    // Filtro por distritos
    if (filters.districts.length > 0 && !filters.districts.includes(cancha.district)) {
      return false;
    }

    // Filtro por horas disponibles
    if (filters.availableHours.length > 0) {
      const hasAvailableHour = filters.availableHours.some(hour =>
        hasAvailabilityAtHour(cancha, hour, date)
      );
      if (!hasAvailableHour) return false;
    }

    // Filtro por destacadas
    if (filters.onlyFeatured && !cancha.featured) {
      return false;
    }

    // Filtro por búsqueda de texto
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = cancha.name.toLowerCase().includes(query);
      const matchesAddress = cancha.address.toLowerCase().includes(query);
      const matchesDistrict = cancha.district.toLowerCase().includes(query);
      const matchesDescription = cancha.description.toLowerCase().includes(query);

      if (!matchesName && !matchesAddress && !matchesDistrict && !matchesDescription) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Ordena las canchas según un criterio
 */
export type SortOption = 'relevancia' | 'precio-asc' | 'precio-desc' | 'rating' | 'nombre';

export function sortCanchas(canchas: Cancha[], sortBy: SortOption): Cancha[] {
  const sorted = [...canchas];

  switch (sortBy) {
    case 'precio-asc':
      return sorted.sort((a, b) => a.pricePerHour - b.pricePerHour);
    case 'precio-desc':
      return sorted.sort((a, b) => b.pricePerHour - a.pricePerHour);
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'nombre':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'relevancia':
    default:
      return sorted;
  }
}
