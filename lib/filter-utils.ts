import { Cancha, AdvancedFilters } from './types';
import { getLocalDateString } from './date-utils';

/**
 * Obtiene todas las amenidades únicas de las canchas
 */
export function getAllAmenities(canchas: Cancha[]): string[] {
  const amenitiesSet = new Set<string>();
  canchas.forEach(cancha => {
    if (cancha.amenities && Array.isArray(cancha.amenities)) {
      cancha.amenities.forEach(a => {
        if (a && a.trim()) amenitiesSet.add(a.trim());
      });
    }
  });
  return Array.from(amenitiesSet).sort();
}

/**
 * Obtiene todos los distritos únicos
 */
export function getAllDistricts(canchas: Cancha[]): string[] {
  const districtsSet = new Set<string>();
  canchas.forEach(cancha => {
    if (cancha.district && cancha.district.trim()) {
      districtsSet.add(cancha.district.trim());
    }
  });
  return Array.from(districtsSet).sort();
}

/**
 * Obtiene el rango de precios mín/máx
 */
export function getPriceRange(canchas: Cancha[]): [number, number] {
  if (canchas.length === 0) return [0, 100];
  const prices = canchas
    .map(c => c.pricePerHour)
    .filter(p => typeof p === 'number' && p > 0);
  if (prices.length === 0) return [0, 100];
  return [Math.min(...prices), Math.max(...prices)];
}

/**
 * Verifica si una hora ya pasó (comparada con la hora actual)
 */
export function hasHourPassed(hour: string, date?: string): boolean {
  // Si no se especifica fecha, usar hoy
  if (!date) {
    date = getLocalDateString();
  }

  const today = getLocalDateString();
  
  // Si la fecha es anterior a hoy, la hora ya pasó
  if (date < today) {
    return true;
  }

  // Si es hoy, comparar con la hora actual
  if (date === today) {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    // Si la hora seleccionada es ESTRICTAMENTE menor a la hora actual, ya pasó
    // Usamos < en lugar de <= para permitir la hora actual si aún no ha pasado completamente
    return hour < currentTime;
  }

  // Si la fecha es futura, la hora no ha pasado
  return false;
}

/**
 * Verifica si una cancha tiene disponibilidad en una hora específica
 * Considera: horarios pasados, horarios de funcionamiento y reservas
 */
export function hasAvailabilityAtHour(cancha: Cancha, hour: string, date?: string): boolean {
  // Si no se especifica fecha, usar hoy con fecha local
  if (!date) {
    date = getLocalDateString();
  }

  // 1. Verificar si la hora ya pasó
  if (hasHourPassed(hour, date)) {
    return false;
  }

  // Si no hay schedule, asumir que está disponible
  if (!cancha.schedule || Object.keys(cancha.schedule).length === 0) {
    return true;
  }

  const daySchedule = cancha.schedule[date];
  if (!daySchedule) return true; // Si no hay datos para ese día, asumir disponible

  const slot = daySchedule.find(s => s.time === hour);

  // 2. Si no existe el slot, la cancha no opera a esa hora
  if (!slot) {
    return false;
  }

  // 3. Retornar la disponibilidad del slot (considera reservas y horarios bloqueados)
  return slot.available;
}

/**
 * Filtra canchas según los criterios especificados
 */
export function filterCanchas(canchas: Cancha[], filters: AdvancedFilters, date?: string): Cancha[] {
  // Usar la fecha del filtro si no se proporciona
  const targetDate = date || filters.selectedDate || getLocalDateString();

  return canchas.filter(cancha => {
    // Validar que la cancha tenga datos básicos
    if (!cancha.id || !cancha.name) {
      return false;
    }

    // Filtro por deporte
    if (filters.sports.length > 0 && !filters.sports.includes(cancha.type)) {
      return false;
    }

    // Filtro por rango de precio
    const price = cancha.pricePerHour || 0;
    if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
      return false;
    }

    // Filtro por rating mínimo
    const rating = cancha.rating || 0;
    if (rating < filters.minRating) {
      return false;
    }

    // Filtro por amenidades (debe tener AL MENOS UNA de las seleccionadas)
    if (filters.amenities.length > 0) {
      const canchAmenities = cancha.amenities || [];
      const hasSomeAmenities = filters.amenities.some(amenity =>
        canchAmenities.some(a => a && a.trim().toLowerCase() === amenity.trim().toLowerCase())
      );
      if (!hasSomeAmenities) return false;
    }

    // Filtro por distritos (case-insensitive)
    if (filters.districts.length > 0) {
      const canchDistrict = (cancha.district || '').trim().toLowerCase();
      const matchesDistrict = filters.districts.some(d =>
        d.trim().toLowerCase() === canchDistrict
      );
      if (!matchesDistrict) return false;
    }

    // Filtro por horas disponibles (con fecha específica)
    if (filters.availableHours.length > 0) {
      // Verificar si AL MENOS UNA de las horas seleccionadas está disponible
      // Esto permite que el usuario vea canchas con disponibilidad en cualquiera de los horarios
      const someHoursAvailable = filters.availableHours.some(hour =>
        hasAvailabilityAtHour(cancha, hour, targetDate)
      );
      if (!someHoursAvailable) return false;
    }

    // Filtro por destacadas
    if (filters.onlyFeatured && !cancha.featured) {
      return false;
    }

    // Filtro por balón disponible
    if (filters.conBalon && !cancha.balonDisponible) {
      return false;
    }

    // Filtro por chalecos disponibles
    if (filters.conChalecos && !cancha.chalecoDisponible) {
      return false;
    }

    // Filtro por superficie
    if (filters.superficies.length > 0) {
      if (!cancha.superficie || !filters.superficies.includes(cancha.superficie as any)) {
        return false;
      }
    }

    // Filtro por mínimo de jugadores
    if (filters.minJugadores > 0) {
      if (!cancha.maxJugadores || cancha.maxJugadores < filters.minJugadores) {
        return false;
      }
    }

    // Filtro por búsqueda de texto
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = (cancha.name || '').toLowerCase().includes(query);
      const matchesAddress = (cancha.address || '').toLowerCase().includes(query);
      const matchesDistrict = (cancha.district || '').toLowerCase().includes(query);
      const matchesDescription = (cancha.description || '').toLowerCase().includes(query);

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
      return sorted.sort((a, b) => (a.pricePerHour || 0) - (b.pricePerHour || 0));
    case 'precio-desc':
      return sorted.sort((a, b) => (b.pricePerHour || 0) - (a.pricePerHour || 0));
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'nombre':
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    case 'relevancia':
    default:
      return sorted;
  }
}
