import type { createServiceClient } from '@/lib/supabase';

type ServiceClient = ReturnType<typeof createServiceClient>;

export async function listPublicacionesPorCanchas(
  sb: ServiceClient,
  canchaIds: string[]
) {
  if (!canchaIds.length) return [];

  const { data: relaciones, error: relacionesError } = await sb
    .from('publicacion_canchas')
    .select('publicacion_id, cancha_id, canchas(id, nombre)')
    .in('cancha_id', canchaIds);

  if (relacionesError) {
    throw new Error(relacionesError.message);
  }

  const publicacionIds = Array.from(
    new Set(
      (relaciones ?? [])
        .map((relacion: { publicacion_id: string }) => relacion.publicacion_id)
        .filter(Boolean)
    )
  );

  if (!publicacionIds.length) return [];

  const { data: publicaciones, error: publicacionesError } = await sb
    .from('publicaciones')
    .select('*')
    .in('id', publicacionIds)
    .order('creado_en', { ascending: false });

  if (publicacionesError) {
    throw new Error(publicacionesError.message);
  }

  return attachCanchas(publicaciones ?? [], relaciones ?? []);
}

export async function listTodasLasPublicaciones(sb: ServiceClient) {
  const { data: publicaciones, error: publicacionesError } = await sb
    .from('publicaciones')
    .select('*')
    .order('creado_en', { ascending: false });

  if (publicacionesError) {
    throw new Error(publicacionesError.message);
  }

  if (!publicaciones?.length) return [];

  const publicacionIds = publicaciones.map((publicacion) => publicacion.id);

  const { data: relaciones, error: relacionesError } = await sb
    .from('publicacion_canchas')
    .select('publicacion_id, cancha_id, canchas(id, nombre)')
    .in('publicacion_id', publicacionIds);

  if (relacionesError) {
    throw new Error(relacionesError.message);
  }

  return attachCanchas(publicaciones, relaciones ?? []);
}

function attachCanchas(
  publicaciones: Array<{ id: string }>,
  relaciones: Array<{
    publicacion_id: string;
    cancha_id: string;
    canchas: unknown;
  }>
) {
  const canchasPorPublicacion = new Map<
    string,
    Array<{ id: string; nombre: string | null }>
  >();

  for (const relacion of relaciones) {
    const cancha = Array.isArray(relacion.canchas)
      ? relacion.canchas[0]
      : relacion.canchas;
    const canchaRecord = cancha as { nombre?: string | null } | null | undefined;
    const canchas = canchasPorPublicacion.get(relacion.publicacion_id) ?? [];
    canchas.push({
      id: relacion.cancha_id,
      nombre: canchaRecord?.nombre ?? null,
    });
    canchasPorPublicacion.set(relacion.publicacion_id, canchas);
  }

  return publicaciones.map((publicacion) => ({
    ...publicacion,
    canchas: canchasPorPublicacion.get(publicacion.id) ?? [],
  }));
}

export async function getPublicacionPorSlug(
  sb: ServiceClient,
  slug: string,
  canchaIds?: string[]
) {
  const { data: publicacion, error: publicacionError } = await sb
    .from('publicaciones')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (publicacionError) {
    throw new Error(publicacionError.message);
  }

  if (!publicacion) {
    return null;
  }

  let query = sb
    .from('publicacion_canchas')
    .select('cancha_id, canchas(id, nombre, direccion, distrito, lat, lng)')
    .eq('publicacion_id', publicacion.id);

  if (canchaIds?.length) {
    query = query.in('cancha_id', canchaIds);
  }

  const { data: relacionesPublicacion, error: relacionesError } = await query;

  if (relacionesError) {
    throw new Error(relacionesError.message);
  }

  if (canchaIds?.length && !relacionesPublicacion?.length) {
    return null;
  }

  const canchas = (relacionesPublicacion ?? []).map((relacion) => {
    const cancha = Array.isArray(relacion.canchas)
      ? relacion.canchas[0]
      : relacion.canchas;

    return {
      id: relacion.cancha_id,
      nombre: cancha?.nombre ?? null,
      direccion: cancha?.direccion ?? null,
      distrito: cancha?.distrito ?? null,
      lat: cancha?.lat ?? null,
      lng: cancha?.lng ?? null,
    };
  });

  return { publicacion, canchas };
}
