import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';
import { reasignarSeccionReserva, verificarDisponibilidadDestinos } from '@/lib/reasignar-reserva';

// GET /api/admin/reservas/reasignar?reservaId=xxx — disponibilidad de destinos para el selector
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const adminUser = await verifyAdmin(token);
  if (!adminUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const reservaId = req.nextUrl.searchParams.get('reservaId');
  if (!reservaId) return NextResponse.json({ error: 'reservaId requerido' }, { status: 400 });

  const sb = createServiceClient();
  const resultado = await verificarDisponibilidadDestinos(sb, { reservaId });
  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  return NextResponse.json(resultado);
}

// PATCH /api/admin/reservas/reasignar — mover una reserva entre "cancha completa" y una sección
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const adminUser = await verifyAdmin(token);
  if (!adminUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { reservaId, seccionIdDestino } = await req.json();
  if (!reservaId) return NextResponse.json({ error: 'reservaId requerido' }, { status: 400 });

  const sb = createServiceClient();

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
