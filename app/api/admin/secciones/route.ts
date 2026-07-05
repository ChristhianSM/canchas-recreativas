import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

function getToken(req: NextRequest) {
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
}

// GET /api/admin/secciones?canchaId=xxx
export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const canchaId = req.nextUrl.searchParams.get('canchaId');
  if (!canchaId) return NextResponse.json({ error: 'canchaId requerido' }, { status: 400 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('cancha_secciones')
    .select('*')
    .eq('cancha_id', canchaId)
    .order('orden', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/secciones — crear sección
export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { canchaId, nombre, descripcion, maxJugadores, precioHora, preciosPorHora, orden } = body;
  if (!canchaId || !nombre || !precioHora) {
    return NextResponse.json({ error: 'canchaId, nombre y precioHora son requeridos' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('cancha_secciones')
    .insert({
      cancha_id:        canchaId,
      nombre,
      descripcion:      descripcion ?? null,
      max_jugadores:    maxJugadores ?? null,
      precio_por_hora:  precioHora,
      precios_por_hora: preciosPorHora ?? {},
      orden:            orden ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/secciones?id=xxx
export async function PATCH(req: NextRequest) {
  const token = getToken(req);
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const seccionId = req.nextUrl.searchParams.get('id');
  if (!seccionId) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const body = await req.json();
  const { nombre, descripcion, maxJugadores, precioHora, preciosPorHora, orden, activa } = body;

  const updateData: Record<string, any> = {};
  if (nombre !== undefined)         updateData.nombre            = nombre;
  if (descripcion !== undefined)    updateData.descripcion       = descripcion ?? null;
  if (maxJugadores !== undefined)   updateData.max_jugadores     = maxJugadores ?? null;
  if (precioHora !== undefined)     updateData.precio_por_hora   = precioHora;
  if (preciosPorHora !== undefined) updateData.precios_por_hora  = preciosPorHora ?? {};
  if (orden !== undefined)          updateData.orden             = orden;
  if (activa !== undefined)         updateData.activa            = activa;

  const sb = createServiceClient();
  const { error } = await sb.from('cancha_secciones').update(updateData).eq('id', seccionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/secciones?id=xxx
export async function DELETE(req: NextRequest) {
  const token = getToken(req);
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const seccionId = req.nextUrl.searchParams.get('id');
  if (!seccionId) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const sb = createServiceClient();
  const { error } = await sb.from('cancha_secciones').delete().eq('id', seccionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
