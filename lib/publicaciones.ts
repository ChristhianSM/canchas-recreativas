export const PUBLICACION_TIPOS = [
  'torneo',
  'escuela',
  'evento',
  'promocion',
  'noticia',
  'mantenimiento',
  'novedad',
] as const;

export const PUBLICACION_ESTADOS = ['borrador', 'publicado'] as const;

export const PUBLICACION_DEPORTES = [
  'futbol',
  'voley',
  'basquet',
  'tenis',
  'futsal',
] as const;

export type PublicacionTipo = (typeof PUBLICACION_TIPOS)[number];
export type PublicacionEstado = (typeof PUBLICACION_ESTADOS)[number];
export type PublicacionDeporte = (typeof PUBLICACION_DEPORTES)[number];

export function isPublicacionTipo(value: unknown): value is PublicacionTipo {
  return typeof value === 'string' && PUBLICACION_TIPOS.includes(value as PublicacionTipo);
}

export function isPublicacionEstado(value: unknown): value is PublicacionEstado {
  return typeof value === 'string' && PUBLICACION_ESTADOS.includes(value as PublicacionEstado);
}

export function isPublicacionDeporte(value: unknown): value is PublicacionDeporte {
  return typeof value === 'string' && PUBLICACION_DEPORTES.includes(value as PublicacionDeporte);
}
