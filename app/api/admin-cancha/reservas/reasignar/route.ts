import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';
import { reasignarSeccionReserva, verificarDisponibilidadDestinos } from '@/lib/reasignar-reserva';

async function verificarOwnership(sb: ReturnType<typeof createServiceClient>, userId: string, reservaId: string) {
  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', userId);

  const canchaIds = (relaciones ?? []).map((r: any) => r.cancha_id);

  const { data: reserva } = await sb
    .from('reservas')
    .select('cancha_id')
    .eq('id', reservaId)
    .maybeSingle();

  if (!reserva) return { autorizado: false, status: 404, error: 'Reserva no encontrada' };
  if (!canchaIds.includes(reserva.cancha_id)) {
    return { autorizado: false, status: 403, error: 'No autorizado para esta reserva' };
  }
  return { autorizado: true as const };
}

// GET /api/admin-cancha/reservas/reasignar?reservaId=xxx — disponibilidad de destinos para el selector
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const reservaId = req.nextUrl.searchParams.get('reservaId');
  if (!reservaId) return NextResponse.json({ error: 'reservaId requerido' }, { status: 400 });

  const sb = createServiceClient();
  const ownership = await verificarOwnership(sb, user.id, reservaId);
  if (!ownership.autorizado) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

  const resultado = await verificarDisponibilidadDestinos(sb, { reservaId });
  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  return NextResponse.json(resultado);
}

// PATCH /api/admin-cancha/reservas/reasignar — mover una reserva entre "cancha completa" y una sección
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { reservaId, seccionIdDestino } = await req.json();
  if (!reservaId) return NextResponse.json({ error: 'reservaId requerido' }, { status: 400 });

  const sb = createServiceClient();
  const ownership = await verificarOwnership(sb, user.id, reservaId);
  if (!ownership.autorizado) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

  const resultado = await reasignarSeccionReserva(sb, {
    reservaId,
    seccionIdDestino: seccionIdDestino ?? null,
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  return NextResponse.json({
    ok: true,
    diferencia: resultado.diferencia,
    nuevoPrecioTotal: resultado.nuevoPrecioTotal,
    seccionIdDestino: resultado.seccionIdDestino,
  });
}
