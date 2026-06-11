import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';

async function getCanchasDelDueno(userId: string) {
  const sb = createServiceClient();

  const { data: perfil, error: perfilError } = await sb
    .from('usuarios')
    .select('rol')
    .eq('id', userId)
    .single();

  if (perfilError) {
    return {
      errorResponse: NextResponse.json(
        { error: perfilError.message },
        { status: 500 }
      ),
    };
  }

  if (perfil?.rol !== 'dueno') {
    return {
      errorResponse: NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      ),
    };
  }

  const { data: relaciones, error: relacionesError } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', userId);

  if (relacionesError) {
    return {
      errorResponse: NextResponse.json(
        { error: relacionesError.message },
        { status: 500 }
      ),
    };
  }

  const canchasDelDueno = (relaciones ?? [])
    .map((relacion: any) => relacion.cancha_id as string)
    .filter(Boolean);

  return { sb, canchasDelDueno };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);

  if (!user) {
    console.warn('[admin-cancha/noticias/[slug]] Token no valido', {
      hasToken: Boolean(token),
      tokenParts: token?.split('.').length ?? 0,
    });
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: 'Slug requerido' }, { status: 400 });
  }

  const context = await getCanchasDelDueno(user.id);
  if ('errorResponse' in context) return context.errorResponse;

  const { sb, canchasDelDueno } = context;

  if (!canchasDelDueno.length) {
    return NextResponse.json(
      { error: 'Publicacion no encontrada' },
      { status: 404 }
    );
  }

  const { data: publicacion, error: publicacionError } = await sb
    .from('publicaciones')
    .select('*')
    .eq('slug', slug)
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

  const { data: relacionesPublicacion, error: relacionesError } = await sb
    .from('publicacion_canchas')
    .select('cancha_id, canchas(id, nombre, direccion, distrito)')
    .eq('publicacion_id', publicacion.id)
    .in('cancha_id', canchasDelDueno);

  if (relacionesError) {
    return NextResponse.json(
      { error: relacionesError.message },
      { status: 500 }
    );
  }

  if (!relacionesPublicacion?.length) {
    return NextResponse.json(
      { error: 'Publicacion no encontrada' },
      { status: 404 }
    );
  }

  const canchas = relacionesPublicacion.map((relacion: any) => {
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
