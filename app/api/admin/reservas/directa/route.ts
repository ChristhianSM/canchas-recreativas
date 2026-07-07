import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';
import { crearReservasDirectas } from '@/lib/reservas-directas';

// POST — crear reserva directa para cliente fijo (superadmin)
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const admin = await verifyAdmin(token);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();

  const body = await req.json();
  const { cancha_id, cancha_nombre, cliente_nombre, cliente_telefono, fecha, hora, precio, metodo_pago, semanas = 1, seccion_id, seccion_nombre } = body;

  if (!cancha_id || !cancha_nombre || !cliente_nombre || !fecha || !hora || precio == null || !metodo_pago) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const { data: cancha } = await sb.from('canchas').select('id').eq('id', cancha_id).maybeSingle();
  if (!cancha) return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });

  return crearReservasDirectas({ sb, cancha_id, cancha_nombre, cliente_nombre, cliente_telefono, fecha, hora, precio, metodo_pago, semanas, seccion_id: seccion_id ?? null, seccion_nombre: seccion_nombre ?? null });
}
