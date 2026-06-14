import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import {
  isPublicacionDeporte,
  isPublicacionTipo,
} from '@/lib/publicaciones';

export async function GET(req: NextRequest) {
  const sb = createServiceClient();
  const tipo = req.nextUrl.searchParams.get('tipo');
  const deporte = req.nextUrl.searchParams.get('deporte');

  if (tipo && !isPublicacionTipo(tipo)) {
    return NextResponse.json({ error: 'Tipo de publicacion invalido' }, { status: 400 });
  }

  if (deporte && !isPublicacionDeporte(deporte)) {
    return NextResponse.json({ error: 'Deporte invalido' }, { status: 400 });
  }

  let query = sb
    .from('publicaciones')
    .select('*')
    .eq('estado', 'publicado')
    .order('publicado_en', { ascending: false, nullsFirst: false });

  if (tipo) query = query.eq('tipo', tipo);
  if (deporte) query = query.eq('deporte', deporte);

  const { data: publicaciones, error: publicacionesError } = await query;

  if (publicacionesError) {
    return NextResponse.json(
      { error: publicacionesError.message },
      { status: 500 }
    );
  }

  const publicacionIds = (publicaciones ?? []).map((publicacion: any) => publicacion.id as string);

  if (!publicacionIds.length) return NextResponse.json([]);

  const { data: relaciones, error: relacionesError } = await sb
    .from('publicacion_canchas')
    .select('publicacion_id, cancha_id, canchas(id, nombre, direccion, distrito)')
    .in('publicacion_id', publicacionIds);

  if (relacionesError) {
    return NextResponse.json(
      { error: relacionesError.message },
      { status: 500 }
    );
  }

  const canchasPorPublicacion = new Map<
    string,
    Array<{ id: string; nombre: string | null; direccion: string | null; distrito: string | null }>
  >();

  for (const relacion of relaciones ?? []) {
    const publicacionId = (relacion as any).publicacion_id as string;
    const cancha = Array.isArray((relacion as any).canchas)
      ? (relacion as any).canchas[0]
      : (relacion as any).canchas;

    const canchas = canchasPorPublicacion.get(publicacionId) ?? [];
    canchas.push({
      id: (relacion as any).cancha_id,
      nombre: cancha?.nombre ?? null,
      direccion: cancha?.direccion ?? null,
      distrito: cancha?.distrito ?? null,
    });
    canchasPorPublicacion.set(publicacionId, canchas);
  }

  const noticias = (publicaciones ?? []).map((publicacion: any) => ({
    ...publicacion,
    canchas: canchasPorPublicacion.get(publicacion.id) ?? [],
  }));

  return NextResponse.json(noticias);
}
