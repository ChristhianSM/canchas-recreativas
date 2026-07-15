import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

function getOwnerToken(req: NextRequest) {
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
}

async function getOwnerCanchaIds(sb: ReturnType<typeof createServiceClient>, token: string): Promise<string[]> {
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return [];
  const { data } = await sb.from('duenos_canchas').select('cancha_id').eq('usuario_id', user.id);
  return (data ?? []).map((r: any) => r.cancha_id as string);
}

// GET /api/admin-cancha/secciones?canchaId=xxx
export async function GET(req: NextRequest) {
  const token = getOwnerToken(req);
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const canchaId = req.nextUrl.searchParams.get('canchaId');
  if (!canchaId) return NextResponse.json({ error: 'canchaId requerido' }, { status: 400 });

  const sb = createServiceClient();
  const ids = await getOwnerCanchaIds(sb, token);
  if (!ids.includes(canchaId)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { data, error } = await sb
    .from('cancha_secciones')
    .select('*')
    .eq('cancha_id', canchaId)
    .order('orden', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin-cancha/secciones — crear sección
export async function POST(req: NextRequest) {
  const token = getOwnerToken(req);
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { canchaId, nombre, descripcion, maxJugadores, precioHora, preciosPorHora, preciosPorDia, orden } = body;

  if (!canchaId || !nombre || !precioHora) {
    return NextResponse.json({ error: 'canchaId, nombre y precioHora son requeridos' }, { status: 400 });
  }

  const sb = createServiceClient();
  const ids = await getOwnerCanchaIds(sb, token);
  if (!ids.includes(canchaId)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { data, error } = await sb
    .from('cancha_secciones')
    .insert({
      cancha_id:        canchaId,
      nombre,
      descripcion:      descripcion ?? null,
      max_jugadores:    maxJugadores ?? null,
      precio_por_hora:  precioHora,
      precios_por_hora: preciosPorHora ?? {},
      precios_por_dia:  preciosPorDia ?? {},
      orden:            orden ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin-cancha/secciones?id=xxx — editar sección
export async function PATCH(req: NextRequest) {
  const token = getOwnerToken(req);
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const seccionId = req.nextUrl.searchParams.get('id');
  if (!seccionId) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const sb = createServiceClient();

  // Verificar que la sección pertenece a una cancha del dueño
  const { data: seccion } = await sb
    .from('cancha_secciones')
    .select('cancha_id')
    .eq('id', seccionId)
    .single();

  if (!seccion) return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 });

  const ids = await getOwnerCanchaIds(sb, token);
  if (!ids.includes(seccion.cancha_id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const body = await req.json();
  const { nombre, descripcion, maxJugadores, precioHora, preciosPorHora, preciosPorDia, orden, activa } = body;

  const updateData: Record<string, any> = {};
  if (nombre !== undefined)        updateData.nombre            = nombre;
  if (descripcion !== undefined)   updateData.descripcion       = descripcion ?? null;
  if (maxJugadores !== undefined)  updateData.max_jugadores     = maxJugadores ?? null;
  if (precioHora !== undefined)    updateData.precio_por_hora   = precioHora;
  if (preciosPorHora !== undefined) updateData.precios_por_hora = preciosPorHora ?? {};
  if (preciosPorDia !== undefined)  updateData.precios_por_dia  = preciosPorDia ?? {};
  if (orden !== undefined)         updateData.orden             = orden;
  if (activa !== undefined)        updateData.activa            = activa;

  const { error } = await sb.from('cancha_secciones').update(updateData).eq('id', seccionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin-cancha/secciones?id=xxx — eliminar sección
export async function DELETE(req: NextRequest) {
  const token = getOwnerToken(req);
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const seccionId = req.nextUrl.searchParams.get('id');
  if (!seccionId) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const sb = createServiceClient();

  const { data: seccion } = await sb
    .from('cancha_secciones')
    .select('cancha_id')
    .eq('id', seccionId)
    .single();

  if (!seccion) return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 });

  const ids = await getOwnerCanchaIds(sb, token);
  if (!ids.includes(seccion.cancha_id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { error } = await sb.from('cancha_secciones').delete().eq('id', seccionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
