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

export type CrearPublicacionBody = {
  tipo: PublicacionTipo;
  estado?: PublicacionEstado;
  titulo: string;
  resumen: string;
  contenido: string;
  imagenUrl?: string | null;
  deporte?: PublicacionDeporte | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  hora?: string | null;
  precio?: string | null;
  tags?: string[];
  canchaIds?: string[];
  todasLasCanchas?: boolean;
};

export type NoticiasQueryParams = {
  tipo?: PublicacionTipo;
  deporte?: PublicacionDeporte;
};

export type CanchaPublicacionResumen = {
  id: string;
  nombre: string | null;
  direccion?: string | null;
  distrito?: string | null;
};

export type Publicacion = {
  id: string;
  tipo: PublicacionTipo;
  estado: PublicacionEstado;
  titulo: string;
  slug: string;
  resumen: string;
  contenido: string;
  imagen_url: string | null;
  deporte: PublicacionDeporte | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  hora: string | null;
  precio: string | null;
  tags: string[] | null;
  creado_en: string | null;
  actualizado_en: string | null;
  publicado_en: string | null;
  canchas: CanchaPublicacionResumen[];
};

export function isPublicacionTipo(value: unknown): value is PublicacionTipo {
  return typeof value === 'string' && PUBLICACION_TIPOS.includes(value as PublicacionTipo);
}

export function isPublicacionEstado(value: unknown): value is PublicacionEstado {
  return typeof value === 'string' && PUBLICACION_ESTADOS.includes(value as PublicacionEstado);
}

export function isPublicacionDeporte(value: unknown): value is PublicacionDeporte {
  return typeof value === 'string' && PUBLICACION_DEPORTES.includes(value as PublicacionDeporte);
}
