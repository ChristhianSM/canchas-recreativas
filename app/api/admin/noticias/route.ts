import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminPublicacionesContext } from '@/lib/publicaciones-superadmin-context';
import { listTodasLasPublicaciones } from '@/lib/publicaciones-queries';
import type { CrearPublicacionBody } from '@/lib/publicaciones';
import {
  createPublicacionSlug,
  validatePublicacionBody,
} from '@/lib/publicaciones-admin';
import { sendNoticiaToSuscritos } from '@/lib/email';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const context = await getSuperadminPublicacionesContext(token);
  if ('errorResponse' in context) return context.errorResponse;

  const { sb } = context;

  try {
    const noticias = await listTodasLasPublicaciones(sb);
    return NextResponse.json(noticias);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al listar publicaciones' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const context = await getSuperadminPublicacionesContext(token);
  if ('errorResponse' in context) return context.errorResponse;

  const { sb, userId, todasLasCanchas } = context;

  if (!todasLasCanchas.length) {
    return NextResponse.json(
      { error: 'No hay canchas registradas' },
      { status: 403 }
    );
  }

  const body = (await req.json()) as CrearPublicacionBody;
  const validated = validatePublicacionBody(body, todasLasCanchas);

  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error },
      { status: validated.status }
    );
  }

  const input = validated.data;
  const publicadoEn =
    input.estado === 'publicado' ? new Date().toISOString() : null;
  const slug = createPublicacionSlug(input.titulo);

  const { data: publicacion, error: publicacionError } = await sb
    .from('publicaciones')
    .insert({
      autor_id: userId,
      tipo: input.tipo,
      estado: input.estado,
      titulo: input.titulo,
      slug,
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
    })
    .select()
    .single();

  if (publicacionError || !publicacion) {
    return NextResponse.json(
      { error: publicacionError?.message ?? 'No se pudo crear la publicacion' },
      { status: 500 }
    );
  }

  const relacionesPublicacion = input.canchaIds.map((canchaId) => ({
    publicacion_id: publicacion.id,
    cancha_id: canchaId,
  }));

  const { error: relacionError } = await sb
    .from('publicacion_canchas')
    .insert(relacionesPublicacion);

  if (relacionError) {
    await sb.from('publicaciones').delete().eq('id', publicacion.id);
    return NextResponse.json({ error: relacionError.message }, { status: 500 });
  }

  if (body.notificarSuscritos && publicacion.estado === 'publicado') {
    const { data: suscritos } = await sb
      .from('suscriptores')
      .select('id, email')
      .eq('activo', true);

    if (suscritos?.length) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
      void sendNoticiaToSuscritos(publicacion, suscritos, baseUrl);
    }
  }

  return NextResponse.json({ ok: true, publicacion }, { status: 201 });
}
