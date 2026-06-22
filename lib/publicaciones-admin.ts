import {
  isPublicacionDeporte,
  isPublicacionEstado,
  isPublicacionTipo,
  publicacionMuestraPrecio,
  publicacionRequiereFechaFin,
  publicacionRequierePrecio,
  type CrearPublicacionBody,
  type PublicacionDeporte,
  type PublicacionEstado,
  type PublicacionTipo,
} from '@/lib/publicaciones';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizePublicacionTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const normalized = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(0, 10);
}

export function createPublicacionSlug(titulo: string) {
  const base = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${base || 'publicacion'}-${crypto.randomUUID().slice(0, 8)}`;
}

export type PublicacionInputNormalizado = {
  tipo: PublicacionTipo;
  estado: PublicacionEstado;
  titulo: string;
  resumen: string;
  contenido: string;
  imagenUrl: string | null;
  deporte: PublicacionDeporte | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  hora: string | null;
  precio: string | null;
  tags: string[];
  canchaIds: string[];
};

export function validatePublicacionBody(
  body: CrearPublicacionBody,
  canchasDelDueno: string[]
):
  | { ok: false; error: string; status: number }
  | { ok: true; data: PublicacionInputNormalizado } {
  const {
    tipo,
    estado = 'borrador',
    titulo,
    resumen,
    contenido,
    imagenUrl,
    deporte,
    fechaInicio,
    fechaFin,
    hora,
    precio,
    tags,
    canchaIds,
    todasLasCanchas = false,
  } = body;

  if (!isPublicacionTipo(tipo)) {
    return { ok: false, error: 'Tipo de publicacion invalido', status: 400 };
  }

  if (!isPublicacionEstado(estado)) {
    return { ok: false, error: 'Estado invalido', status: 400 };
  }

  if (!isNonEmptyString(titulo)) {
    return { ok: false, error: 'Titulo requerido', status: 400 };
  }

  if (!isNonEmptyString(resumen)) {
    return { ok: false, error: 'Resumen requerido', status: 400 };
  }

  if (!isNonEmptyString(contenido)) {
    return { ok: false, error: 'Contenido requerido', status: 400 };
  }

  if (deporte && !isPublicacionDeporte(deporte)) {
    return { ok: false, error: 'Deporte invalido', status: 400 };
  }

  if (publicacionRequiereFechaFin(tipo) && !isNonEmptyString(fechaFin)) {
    return {
      ok: false,
      error: 'Fecha de fin requerida para torneos',
      status: 400,
    };
  }

  if (
    isNonEmptyString(fechaFin) &&
    isNonEmptyString(fechaInicio) &&
    fechaFin < fechaInicio
  ) {
    return {
      ok: false,
      error: 'La fecha de fin no puede ser anterior al inicio',
      status: 400,
    };
  }

  if (publicacionRequierePrecio(tipo) && !isNonEmptyString(precio)) {
    return { ok: false, error: 'Precio requerido para torneos', status: 400 };
  }

  const precioNormalizado =
    publicacionMuestraPrecio(tipo) && isNonEmptyString(precio)
      ? precio.trim()
      : null;

  const canchasSeleccionadas = todasLasCanchas
    ? canchasDelDueno
    : Array.isArray(canchaIds)
      ? canchaIds.filter((id): id is string => typeof id === 'string')
      : [];

  if (!canchasSeleccionadas.length) {
    return {
      ok: false,
      error: 'Selecciona al menos una cancha',
      status: 400,
    };
  }

  const canchasNoAutorizadas = canchasSeleccionadas.filter(
    (canchaId) => !canchasDelDueno.includes(canchaId)
  );

  if (canchasNoAutorizadas.length > 0) {
    return {
      ok: false,
      error: 'No autorizado para una o mas canchas',
      status: 403,
    };
  }

  return {
    ok: true,
    data: {
      tipo,
      estado,
      titulo: titulo.trim(),
      resumen: resumen.trim(),
      contenido: contenido.trim(),
      imagenUrl: isNonEmptyString(imagenUrl) ? imagenUrl.trim() : null,
      deporte: deporte || null,
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      hora: hora || null,
      precio: precioNormalizado,
      tags: normalizePublicacionTags(tags),
      canchaIds: canchasSeleccionadas,
    },
  };
}

export function publicacionFechaInput(value: string | null | undefined) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function publicacionHoraInput(value: string | null | undefined) {
  if (!value) return '';
  return value.length >= 5 ? value.slice(0, 5) : value;
}
