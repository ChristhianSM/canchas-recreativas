import type { PublicacionDeporte, PublicacionEstado, PublicacionTipo } from '@/lib/publicaciones';

export const PUBLICACION_TIPO_LABELS: Record<PublicacionTipo, string> = {
  torneo: 'Torneo',
  escuela: 'Escuela',
  evento: 'Evento',
  promocion: 'Promocion',
  noticia: 'Noticia',
  mantenimiento: 'Mantenimiento',
  novedad: 'Novedad',
};

export const PUBLICACION_TIPO_EMOJIS: Record<PublicacionTipo, string> = {
  torneo: '🏆',
  escuela: '📚',
  evento: '📣',
  promocion: '✨',
  noticia: '📰',
  mantenimiento: '🛠️',
  novedad: '🆕',
};

export const PUBLICACION_DEPORTE_LABELS: Record<PublicacionDeporte, string> = {
  futbol: 'Futbol',
  voley: 'Voley',
  basquet: 'Basquet',
  tenis: 'Tenis',
  futsal: 'Futsal',
};

export const PUBLICACION_ESTADO_LABELS: Record<PublicacionEstado, string> = {
  publicado: 'Publicado',
  borrador: 'Borrador',
};

export const PUBLICACION_ESTADO_STYLES: Record<PublicacionEstado, string> = {
  publicado: 'border-green-200 bg-green-100 text-green-700',
  borrador: 'border-yellow-200 bg-yellow-100 text-yellow-700',
};

export const PUBLICACION_TIPO_STYLES: Record<PublicacionTipo, string> = {
  torneo: 'border-blue-200 bg-blue-100 text-blue-700',
  escuela: 'border-purple-200 bg-purple-100 text-purple-700',
  evento: 'border-black-200 bg-white text-black-700',
  promocion: 'border-pink-200 bg-pink-100 text-pink-700',
  noticia: 'border-cyan-200 bg-cyan-100 text-cyan-700',
  mantenimiento: 'border-orange-300 bg-orange-100 text-orange-700',
  novedad: 'border-purple-200 bg-purple-100 text-purple-700',
};

export function formatPublicacionDate(value: string | null) {
  if (!value) return null;

  return new Date(value).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
