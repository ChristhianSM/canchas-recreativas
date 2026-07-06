import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';
import { crearReservasDirectas } from '@/lib/reservas-directas';

// POST — crear reserva directa para cliente fijo (dueño de cancha)
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();

  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);
  const canchaIds = (relaciones ?? []).map((r: any) => r.cancha_id);

  const body = await req.json();
  const { cancha_id, cancha_nombre, cliente_nombre, cliente_telefono, fecha, hora, precio, metodo_pago, semanas = 1, seccion_id, seccion_nombre } = body;

  if (!cancha_id || !cancha_nombre || !cliente_nombre || !fecha || !hora || precio == null || !metodo_pago) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }
  if (!canchaIds.includes(cancha_id)) {
    return NextResponse.json({ error: 'No autorizado para esta cancha' }, { status: 403 });
  }

  return crearReservasDirectas({ sb, cancha_id, cancha_nombre, cliente_nombre, cliente_telefono, fecha, hora, precio, metodo_pago, semanas, seccion_id: seccion_id ?? null, seccion_nombre: seccion_nombre ?? null });
}
