import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';
import {
  isPublicacionDeporte,
  isPublicacionEstado,
  isPublicacionTipo,
} from '@/lib/publicaciones';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function slugify(value: string) {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return base || 'publicacion';
}

function createSlug(titulo: string) {
  return `${slugify(titulo)}-${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const normalized = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(0, 10);
}

async function getDuenoContext(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      ),
    };
  }

  const sb = createServiceClient();

  const { data: perfil, error: perfilError } = await sb
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
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
    .eq('usuario_id', user.id);

  if (relacionesError) {
    return {
      errorResponse: NextResponse.json(
        { error: relacionesError.message },
        { status: 500 }
      ),
    };
  }

  const canchasDelDueno = (relaciones ?? [])
    .map((r: any) => r.cancha_id as string)
    .filter(Boolean);

  return { sb, userId: user.id, canchasDelDueno };
}

export async function GET(req: NextRequest) {
  const context = await getDuenoContext(req);
  if ('errorResponse' in context) return context.errorResponse;

  const { sb, canchasDelDueno } = context;

  if (!canchasDelDueno.length) return NextResponse.json([]);

  const { data: relaciones, error: relacionesError } = await sb
    .from('publicacion_canchas')
    .select('publicacion_id, cancha_id, canchas(id, nombre)')
    .in('cancha_id', canchasDelDueno);

  if (relacionesError) {
    return NextResponse.json(
      { error: relacionesError.message },
      { status: 500 }
    );
  }

  const publicacionIds = Array.from(
    new Set(
      (relaciones ?? [])
        .map((relacion: any) => relacion.publicacion_id as string)
        .filter(Boolean)
    )
  );

  if (!publicacionIds.length) return NextResponse.json([]);

  const { data: publicaciones, error: publicacionesError } = await sb
    .from('publicaciones')
    .select('*')
    .in('id', publicacionIds)
    .order('creado_en', { ascending: false });

  if (publicacionesError) {
    return NextResponse.json(
      { error: publicacionesError.message },
      { status: 500 }
    );
  }

  const canchasPorPublicacion = new Map<
    string,
    Array<{ id: string; nombre: string | null }>
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
    });
    canchasPorPublicacion.set(publicacionId, canchas);
  }

  const noticias = (publicaciones ?? []).map((publicacion: any) => ({
    ...publicacion,
    canchas: canchasPorPublicacion.get(publicacion.id) ?? [],
  }));

  return NextResponse.json(noticias);
}

export async function POST(req: NextRequest) {
  const context = await getDuenoContext(req);
  if ('errorResponse' in context) return context.errorResponse;

  const { sb, userId, canchasDelDueno } = context;

  if (!canchasDelDueno.length) {
    return NextResponse.json(
      { error: 'No tienes canchas asignadas' },
      { status: 403 }
    );
  }

  const body = await req.json();
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
    return NextResponse.json(
      { error: 'Tipo de publicacion invalido' },
      { status: 400 }
    );
  }

  if (!isPublicacionEstado(estado)) {
    return NextResponse.json({ error: 'Estado invalido' }, { status: 400 });
  }

  if (!isNonEmptyString(titulo)) {
    return NextResponse.json({ error: 'Titulo requerido' }, { status: 400 });
  }

  if (!isNonEmptyString(resumen)) {
    return NextResponse.json({ error: 'Resumen requerido' }, { status: 400 });
  }

  if (!isNonEmptyString(contenido)) {
    return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 });
  }

  if (deporte && !isPublicacionDeporte(deporte)) {
    return NextResponse.json({ error: 'Deporte invalido' }, { status: 400 });
  }

  const canchasSeleccionadas = todasLasCanchas
    ? canchasDelDueno
    : Array.isArray(canchaIds)
      ? canchaIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];

  if (!canchasSeleccionadas.length) {
    return NextResponse.json(
      { error: 'Selecciona al menos una cancha' },
      { status: 400 }
    );
  }

  const canchasNoAutorizadas = canchasSeleccionadas.filter(
    (canchaId) => !canchasDelDueno.includes(canchaId)
  );

  if (canchasNoAutorizadas.length > 0) {
    return NextResponse.json(
      { error: 'No autorizado para una o mas canchas' },
      { status: 403 }
    );
  }

  const publicadoEn = estado === 'publicado' ? new Date().toISOString() : null;
  const slug = createSlug(titulo);

  const { data: publicacion, error: publicacionError } = await sb
    .from('publicaciones')
    .insert({
      autor_id: userId,
      tipo,
      estado,
      titulo: titulo.trim(),
      slug,
      resumen: resumen.trim(),
      contenido: contenido.trim(),
      imagen_url: isNonEmptyString(imagenUrl) ? imagenUrl.trim() : null,
      deporte: deporte || null,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      hora: hora || null,
      precio: isNonEmptyString(precio) ? precio.trim() : null,
      tags: normalizeTags(tags),
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

  const relacionesPublicacion = canchasSeleccionadas.map((canchaId) => ({
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

  return NextResponse.json({ ok: true, publicacion }, { status: 201 });
}
