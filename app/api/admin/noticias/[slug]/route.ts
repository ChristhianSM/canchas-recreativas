import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminPublicacionesContext } from '@/lib/publicaciones-superadmin-context';
import { getPublicacionPorSlug } from '@/lib/publicaciones-queries';
import { isPublicacionEstado, type CrearPublicacionBody } from '@/lib/publicaciones';
import { validatePublicacionBody } from '@/lib/publicaciones-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: 'Slug requerido' }, { status: 400 });
  }

  const context = await getSuperadminPublicacionesContext(token);
  if ('errorResponse' in context) return context.errorResponse;

  const { sb } = context;

  try {
    const resultado = await getPublicacionPorSlug(sb, slug);
    if (!resultado) {
      return NextResponse.json(
        { error: 'Publicacion no encontrada' },
        { status: 404 }
      );
    }

    const { publicacion, canchas } = resultado;
    return NextResponse.json({ ...publicacion, canchas });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al cargar publicacion' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: 'Slug requerido' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const estado = body?.estado;

  if (!isPublicacionEstado(estado)) {
    return NextResponse.json({ error: 'Estado invalido' }, { status: 400 });
  }

  const context = await getSuperadminPublicacionesContext(token);
  if ('errorResponse' in context) return context.errorResponse;

  const { sb } = context;

  try {
    const resultado = await getPublicacionPorSlug(sb, slug);
    if (!resultado) {
      return NextResponse.json(
        { error: 'Publicacion no encontrada' },
        { status: 404 }
      );
    }

    const { publicacion, canchas } = resultado;

    if (publicacion.estado === estado) {
      return NextResponse.json(
        { error: `La publicacion ya esta en estado ${estado}` },
        { status: 409 }
      );
    }

    const ahora = new Date().toISOString();
    const publicadoEn =
      estado === 'publicado' ? publicacion.publicado_en ?? ahora : null;

    const { data: publicacionActualizada, error: updateError } = await sb
      .from('publicaciones')
      .update({
        estado,
        publicado_en: publicadoEn,
        actualizado_en: ahora,
      })
      .eq('id', publicacion.id)
      .select()
      .single();

    if (updateError || !publicacionActualizada) {
      return NextResponse.json(
        { error: updateError?.message ?? 'No se pudo actualizar la publicacion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      publicacion: { ...publicacionActualizada, canchas },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar publicacion' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: 'Slug requerido' }, { status: 400 });
  }

  const context = await getSuperadminPublicacionesContext(token);
  if ('errorResponse' in context) return context.errorResponse;

  const { sb, todasLasCanchas } = context;

  try {
    const resultado = await getPublicacionPorSlug(sb, slug);
    if (!resultado) {
      return NextResponse.json(
        { error: 'Publicacion no encontrada' },
        { status: 404 }
      );
    }

    const { publicacion } = resultado;
    const body = (await req.json()) as CrearPublicacionBody;
    const validated = validatePublicacionBody(body, todasLasCanchas);

    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: validated.status }
      );
    }

    const input = validated.data;
    const ahora = new Date().toISOString();
    const publicadoEn =
      input.estado === 'publicado'
        ? publicacion.publicado_en ?? ahora
        : null;

    const { data: publicacionActualizada, error: updateError } = await sb
      .from('publicaciones')
      .update({
        tipo: input.tipo,
        estado: input.estado,
        titulo: input.titulo,
        resumen: input.resumen,
        contenido: input.contenido,
        imagen_url: input.imagenUrl,
        deporte: input.deporte,
        fecha_inicio: input.fechaInicio,
        fecha_fin: input.fechaFin,
        hora: input.hora,
        precio: input.precio,
        tags: input.tags,
        publicado_en: publicadoEn,
        actualizado_en: ahora,
      })
      .eq('id', publicacion.id)
      .select()
      .single();

    if (updateError || !publicacionActualizada) {
      return NextResponse.json(
        { error: updateError?.message ?? 'No se pudo actualizar la publicacion' },
        { status: 500 }
      );
    }

    const { error: deleteRelacionesError } = await sb
      .from('publicacion_canchas')
      .delete()
      .eq('publicacion_id', publicacion.id);

    if (deleteRelacionesError) {
      return NextResponse.json(
        { error: deleteRelacionesError.message },
        { status: 500 }
      );
    }

    const relacionesPublicacion = input.canchaIds.map((canchaId) => ({
      publicacion_id: publicacion.id,
      cancha_id: canchaId,
    }));

    const { error: insertRelacionesError } = await sb
      .from('publicacion_canchas')
      .insert(relacionesPublicacion);

    if (insertRelacionesError) {
      return NextResponse.json(
        { error: insertRelacionesError.message },
        { status: 500 }
      );
    }

    const { data: canchasData, error: canchasError } = await sb
      .from('canchas')
      .select('id, nombre, direccion, distrito, lat, lng')
      .in('id', input.canchaIds);

    if (canchasError) {
      return NextResponse.json({ error: canchasError.message }, { status: 500 });
    }

    const canchas = (canchasData ?? []).map((cancha) => ({
      id: cancha.id,
      nombre: cancha.nombre ?? null,
      direccion: cancha.direccion ?? null,
      distrito: cancha.distrito ?? null,
      lat: cancha.lat ?? null,
      lng: cancha.lng ?? null,
    }));

    return NextResponse.json({
      ok: true,
      publicacion: { ...publicacionActualizada, canchas },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar publicacion' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: 'Slug requerido' }, { status: 400 });
  }

  const context = await getSuperadminPublicacionesContext(token);
  if ('errorResponse' in context) return context.errorResponse;

  const { sb } = context;

  try {
    const resultado = await getPublicacionPorSlug(sb, slug);
    if (!resultado) {
      return NextResponse.json(
        { error: 'Publicacion no encontrada' },
        { status: 404 }
      );
    }

    const { publicacion } = resultado;

    const { error: deleteError } = await sb
      .from('publicaciones')
      .delete()
      .eq('id', publicacion.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message ?? 'No se pudo eliminar la publicacion' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al eliminar publicacion' },
      { status: 500 }
    );
  }
}
