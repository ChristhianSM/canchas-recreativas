import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: 'Slug requerido' }, { status: 400 });
  }

  const sb = createServiceClient();

  const { data: publicacion, error: publicacionError } = await sb
    .from('publicaciones')
    .select('*')
    .eq('slug', slug)
    .eq('estado', 'publicado')
    .maybeSingle();

  if (publicacionError) {
    return NextResponse.json(
      { error: publicacionError.message },
      { status: 500 }
    );
  }

  if (!publicacion) {
    return NextResponse.json(
      { error: 'Publicacion no encontrada' },
      { status: 404 }
    );
  }

  const { data: relaciones, error: relacionesError } = await sb
    .from('publicacion_canchas')
    .select('cancha_id, canchas(id, nombre, direccion, distrito)')
    .eq('publicacion_id', publicacion.id);

  if (relacionesError) {
    return NextResponse.json(
      { error: relacionesError.message },
      { status: 500 }
    );
  }

  const canchas = (relaciones ?? []).map((relacion: any) => {
    const cancha = Array.isArray(relacion.canchas)
      ? relacion.canchas[0]
      : relacion.canchas;

    return {
      id: relacion.cancha_id,
      nombre: cancha?.nombre ?? null,
      direccion: cancha?.direccion ?? null,
      distrito: cancha?.distrito ?? null,
    };
  });

  return NextResponse.json({ ...publicacion, canchas });
}
