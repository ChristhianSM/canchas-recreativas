import type { Publicacion, PublicacionDeporte, PublicacionEstado, PublicacionTipo } from '@/lib/publicaciones';
import { publicacionFechaInput, publicacionHoraInput } from '@/lib/publicaciones-admin';

export type PublicacionFormState = {
  tipo: PublicacionTipo;
  titulo: string;
  resumen: string;
  contenido: string;
  imagenUrl: string;
  canchaIds: string[];
  deporte: PublicacionDeporte | '';
  fechaInicio: string;
  fechaFin: string;
  hora: string;
  precio: string;
  estado: PublicacionEstado;
};

export const initialPublicacionForm: PublicacionFormState = {
  tipo: 'torneo',
  titulo: '',
  resumen: '',
  contenido: '',
  imagenUrl: '',
  canchaIds: [],
  deporte: '',
  fechaInicio: '',
  fechaFin: '',
  hora: '',
  precio: '',
  estado: 'borrador',
};

export function publicacionToForm(publicacion: Publicacion): PublicacionFormState {
  return {
    tipo: publicacion.tipo,
    titulo: publicacion.titulo,
    resumen: publicacion.resumen,
    contenido: publicacion.contenido,
    imagenUrl: publicacion.imagen_url ?? '',
    canchaIds: publicacion.canchas?.map((cancha) => cancha.id) ?? [],
    deporte: publicacion.deporte ?? '',
    fechaInicio: publicacionFechaInput(publicacion.fecha_inicio),
    fechaFin: publicacionFechaInput(publicacion.fecha_fin),
    hora: publicacionHoraInput(publicacion.hora),
    precio: publicacion.precio ?? '',
    estado: publicacion.estado,
  };
}

function sortedStringArray(values: string[]) {
  return [...values].sort();
}

function stringArraysEqual(a: string[], b: string[]) {
  const left = sortedStringArray(a);
  const right = sortedStringArray(b);
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function isPublicacionFormDirty(
  form: PublicacionFormState,
  tags: string[],
  publicacion: Publicacion
) {
  const original = publicacionToForm(publicacion);
  const originalTags = publicacion.tags ?? [];

  const keys = Object.keys(original) as (keyof PublicacionFormState)[];
  for (const key of keys) {
    if (key === 'canchaIds') {
      if (!stringArraysEqual(form.canchaIds, original.canchaIds)) return true;
      continue;
    }
    if (form[key] !== original[key]) return true;
  }

  return !stringArraysEqual(tags, originalTags);
}
