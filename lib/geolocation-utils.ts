/**
 * Utilidades para geolocalización y cálculo de distancias
 */

export interface Coordenadas {
  lat: number;
  lng: number;
}

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * Retorna la distancia en kilómetros
 */
export function calcularDistancia(
  punto1: Coordenadas,
  punto2: Coordenadas
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(punto2.lat - punto1.lat);
  const dLng = toRad(punto2.lng - punto1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(punto1.lat)) *
      Math.cos(toRad(punto2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = R * c;

  return Math.round(distancia * 10) / 10; // Redondear a 1 decimal
}

function toRad(grados: number): number {
  return (grados * Math.PI) / 180;
}

/**
 * Formatea la distancia para mostrar al usuario
 */
export function formatearDistancia(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Obtiene la ubicación actual del usuario usando Geolocation API
 */
export async function obtenerUbicacionActual(): Promise<Coordenadas> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let mensaje = 'Error al obtener ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            mensaje = 'Permiso de ubicación denegado';
            break;
          case error.POSITION_UNAVAILABLE:
            mensaje = 'Ubicación no disponible';
            break;
          case error.TIMEOUT:
            mensaje = 'Tiempo de espera agotado';
            break;
        }
        reject(new Error(mensaje));
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 30000,
      }
    );
  });
}

/**
 * Guarda la ubicación en localStorage.
 * Si las nuevas coords difieren >500m de las guardadas, invalida cp_ciudad
 * para que no se muestre el nombre de ciudad de la ubicación anterior.
 */
export function guardarUbicacion(coords: Coordenadas): void {
  if (typeof window === 'undefined') return;

  const oldRaw = localStorage.getItem('cp_ubicacion');
  if (oldRaw) {
    try {
      const oldCoords = JSON.parse(oldRaw) as Coordenadas;
      if (calcularDistancia(oldCoords, coords) > 0.5) {
        localStorage.removeItem('cp_ciudad');
      }
    } catch {}
  }

  localStorage.setItem('cp_ubicacion', JSON.stringify(coords));
  localStorage.setItem('cp_ubicacion_time', Date.now().toString());
}

/**
 * Obtiene la ubicación guardada en localStorage
 * Retorna null si no hay o si expiró (más de 1 hora)
 */
export function obtenerUbicacionGuardada(): Coordenadas | null {
  if (typeof window === 'undefined') return null;

  const ubicacion = localStorage.getItem('cp_ubicacion');
  const tiempo = localStorage.getItem('cp_ubicacion_time');

  if (!ubicacion || !tiempo) return null;

  // Verificar si expiró (1 hora)
  const elapsed = Date.now() - Number(tiempo);
  const unaHora = 60 * 60 * 1000;

  if (elapsed > unaHora) {
    localStorage.removeItem('cp_ubicacion');
    localStorage.removeItem('cp_ubicacion_time');
    return null;
  }

  try {
    return JSON.parse(ubicacion);
  } catch {
    return null;
  }
}

/**
 * Guarda el nombre de ciudad resuelto por geocoding inverso
 */
export function guardarCiudad(city: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cp_ciudad', city);
}

/**
 * Obtiene el nombre de ciudad guardado, válido mientras las coords no hayan expirado
 */
export function obtenerCiudadGuardada(): string | null {
  if (typeof window === 'undefined') return null;
  const city = localStorage.getItem('cp_ciudad');
  const tiempo = localStorage.getItem('cp_ubicacion_time');
  if (!city || !tiempo) return null;
  const elapsed = Date.now() - Number(tiempo);
  if (elapsed > 60 * 60 * 1000) {
    localStorage.removeItem('cp_ciudad');
    return null;
  }
  return city;
}

/**
 * Limpia la ubicación guardada
 */
export function limpiarUbicacion(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cp_ubicacion');
  localStorage.removeItem('cp_ubicacion_time');
  localStorage.removeItem('cp_ciudad');
}

/**
 * Ordena canchas por distancia a un punto
 */
export function ordenarPorDistancia<T extends { coordinates: Coordenadas }>(
  canchas: T[],
  ubicacion: Coordenadas
): (T & { distancia: number })[] {
  return canchas
    .map((cancha) => ({
      ...cancha,
      distancia: calcularDistancia(ubicacion, cancha.coordinates),
    }))
    .sort((a, b) => a.distancia - b.distancia);
}

/**
 * Filtra canchas por radio de distancia
 */
export function filtrarPorRadio<T extends { coordinates: Coordenadas }>(
  canchas: T[],
  ubicacion: Coordenadas,
  radioKm: number
): T[] {
  return canchas.filter((cancha) => {
    const distancia = calcularDistancia(ubicacion, cancha.coordinates);
    return distancia <= radioKm;
  });
}

/**
 * Obtiene el centro geográfico de Piura (fallback)
 */
export function getCentroPiura(): Coordenadas {
  return {
    lat: -5.1945,
    lng: -80.6328,
  };
}

/**
 * Verifica si el navegador soporta geolocalización
 */
export function soportaGeolocalizacion(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

/**
 * Refresca la ubicación en background sin molestar al usuario.
 * Solo actúa si el permiso ya fue concedido previamente.
 * Si la nueva posición difiere >500m de la guardada, actualiza y llama al callback.
 */
export async function refrescarUbicacionEnBackground(
  onActualizada: (coords: Coordenadas) => void
): Promise<void> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;

  try {
    // Solo refrescar si el permiso ya fue concedido (sin pedir al usuario)
    if ('permissions' in navigator) {
      const perm = await navigator.permissions.query({ name: 'geolocation' });
      if (perm.state !== 'granted') return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nuevaCoords: Coordenadas = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const guardada = obtenerUbicacionGuardada();

        // Si no había ubicación guardada, guardar la nueva directamente
        if (!guardada) {
          guardarUbicacion(nuevaCoords);
          onActualizada(nuevaCoords);
          return;
        }

        // Solo actualizar si el usuario se movió más de 500m
        const distancia = calcularDistancia(guardada, nuevaCoords);
        if (distancia > 0.5) {
          guardarUbicacion(nuevaCoords);
          onActualizada(nuevaCoords);
        }
      },
      () => {
        // Fallar silenciosamente
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  } catch {
    // Fallar silenciosamente si el navegador no soporta permissions API
  }
}
