import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';
import { notificarEstadoReserva } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { reservaId, motivo } = await req.json();
  if (!reservaId) return NextResponse.json({ error: 'reservaId requerido' }, { status: 400 });

  const sb = createServiceClient();

  // Verificar que la reserva pertenece a una cancha del dueño
  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const canchaIds = (relaciones ?? []).map((r: any) => r.cancha_id);

  const { data: reserva, error: reservaError } = await sb
    .from('reservas')
    .select('*')
    .eq('id', reservaId)
    .single();

  if (reservaError || !reserva) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }

  if (!canchaIds.includes(reserva.cancha_id)) {
    return NextResponse.json({ error: 'No autorizado para cancelar esta reserva' }, { status: 403 });
  }

  if (reserva.estado === 'cancelada' || reserva.estado === 'rechazada') {
    return NextResponse.json({ error: 'La reserva ya fue cancelada o rechazada' }, { status: 400 });
  }

  // No se puede cancelar si el horario ya pasó
  const fechaHora = new Date(`${reserva.fecha}T${reserva.hora}`);
  if (reserva.estado === 'confirmada' && fechaHora < new Date()) {
    return NextResponse.json({ error: 'No se puede cancelar una reserva cuyo horario ya pasó' }, { status: 400 });
  }

  // Cancelar la reserva
  const { error: updateError } = await sb
    .from('reservas')
    .update({ estado: 'cancelada', cancelado_en: new Date().toISOString() })
    .eq('id', reservaId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const fechaLabel = new Date(reserva.fecha + 'T00:00:00')
    .toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });

  const motivoTexto = motivo ? ` Motivo: ${motivo}.` : '';

  // Notificación in-app al usuario
  if (reserva.usuario_id) {
    await sb.from('notificaciones').insert({
      usuario_id: reserva.usuario_id,
      reserva_id: reservaId,
      mensaje: `Tu reserva en ${reserva.cancha_nombre} del ${fechaLabel} a las ${reserva.hora} fue cancelada por el administrador.${motivoTexto}`,
      tipo: 'cancelada',
    });
  }

  // WhatsApp al usuario
  if (reserva.usuario_telefono) {
    await notificarEstadoReserva({
      clientePhone: reserva.usuario_telefono,
      canchaNombre: reserva.cancha_nombre,
      fecha: reserva.fecha,
      hora: reserva.hora,
      precio: reserva.precio,
      estado: 'cancelada',
      reservaId,
    });
  }

  // Restar sello de loyalty si estaba confirmada
  if (reserva.estado === 'confirmada' && reserva.usuario_id) {
    const { data: loyalty } = await sb
      .from('loyalty')
      .select('sellos, total_reservas')
      .eq('usuario_id', reserva.usuario_id)
      .single();

    if (loyalty && loyalty.sellos > 0) {
      await sb.from('loyalty').update({
        sellos: loyalty.sellos - 1,
        total_reservas: Math.max(0, loyalty.total_reservas - 1),
      }).eq('usuario_id', reserva.usuario_id);
    }
  }

  return NextResponse.json({ ok: true });
}
