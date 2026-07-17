import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/admin-cancha/cancha?id=xxx — obtener cancha del dueño
// PATCH /api/admin-cancha/cancha?id=xxx — editar cancha
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const canchaId = req.nextUrl.searchParams.get('id');
  if (!canchaId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const ids = (relaciones ?? []).map((r: any) => r.cancha_id as string);
  if (!ids.includes(canchaId)) {
    return NextResponse.json({ error: 'No autorizado para esta cancha' }, { status: 403 });
  }

  const { data, error } = await sb.from('canchas').select('*').eq('id', canchaId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Horarios bloqueados
  const { data: horarios } = await sb
    .from('horarios_bloqueados')
    .select('hora')
    .eq('cancha_id', canchaId);

  return NextResponse.json({ ...data, horariosRestringidos: (horarios ?? []).map((h: any) => h.hora) });
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const canchaId = req.nextUrl.searchParams.get('id');
  if (!canchaId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const ids = (relaciones ?? []).map((r: any) => r.cancha_id as string);
  if (!ids.includes(canchaId)) {
    return NextResponse.json({ error: 'No autorizado para esta cancha' }, { status: 403 });
  }

  const body = await req.json();
  const { descripcion, telefono, precioHora, amenidades, imagenes, lat, lng, direccion, distrito, preciosPorHora, preciosPorDia, balonPrecio, chalecosPrecio, balonDisponible, chalecosDisponible, superficie, maxJugadores, yapeNumero, plinNumero, horaApertura, horaCierre, accesorios } = body;

  const updateData: Record<string, any> = {
    descripcion,
    telefono,
    precio_por_hora: precioHora,
    amenidades,
    imagenes,
    precios_por_hora: preciosPorHora ?? {},
  };

  if (preciosPorDia !== undefined) updateData.precios_por_dia = preciosPorDia ?? {};

  if (lat !== undefined) updateData.lat = lat;
  if (lng !== undefined) updateData.lng = lng;
  if (direccion !== undefined) updateData.direccion = direccion;
  if (distrito !== undefined) updateData.distrito = distrito;
  if (superficie !== undefined) updateData.superficie = superficie;
  if (maxJugadores !== undefined) updateData.max_jugadores = maxJugadores ?? null;

  // Campos de extras — solo incluir si vienen en el body (por si la migración aún no se corrió)
  if (balonDisponible !== undefined) {
    updateData.balon_disponible = balonDisponible ?? false;
    updateData.balon_precio     = balonDisponible ? (balonPrecio ?? null) : null;
  }
  if (chalecosDisponible !== undefined) {
    updateData.chalecos_disponible = chalecosDisponible ?? false;
    updateData.chalecos_precio     = chalecosDisponible ? (chalecosPrecio ?? null) : null;
  }

  if (yapeNumero  !== undefined) updateData.yape_numero = yapeNumero || null;
  if (plinNumero  !== undefined) updateData.plin_numero = plinNumero || null;
  if (accesorios  !== undefined) updateData.accesorios  = accesorios ?? [];
  if (horaApertura !== undefined) updateData.hora_apertura = horaApertura;
  if (horaCierre   !== undefined) updateData.hora_cierre   = horaCierre;

  const { error: canchaError } = await sb
    .from('canchas')
    .update(updateData)
    .eq('id', canchaId);

  if (canchaError) {
    console.error('Error al actualizar cancha:', canchaError);
    return NextResponse.json({ error: canchaError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, distrito });
}
