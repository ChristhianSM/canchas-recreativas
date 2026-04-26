import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET público — obtener reserva por ID (sin autenticación)
// Usado por invitados que acceden desde el link del email
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const sb = createServiceClient();

  const { data: reserva, error } = await sb
    .from('reservas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !reserva) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }

  // Devolver solo los campos necesarios (sin datos sensibles de otros usuarios)
  return NextResponse.json({
    id:                   reserva.id,
    cancha_nombre:        reserva.cancha_nombre,
    fecha:                reserva.fecha,
    hora:                 reserva.hora,
    precio:               reserva.precio,
    metodo_pago:          reserva.metodo_pago,
    estado:               reserva.estado,
    usuario_nombre:       reserva.usuario_nombre,
    usuario_email:        reserva.usuario_email,
    usuario_telefono:     reserva.usuario_telefono,
    devolucion_calculada: reserva.devolucion_calculada ?? null,
    penalidad_aplicada:   reserva.penalidad_aplicada ?? null,
    cancelado_en:         reserva.cancelado_en ?? null,
  });
}
