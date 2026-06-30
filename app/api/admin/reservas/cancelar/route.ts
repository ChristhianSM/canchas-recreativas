import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';
import { notificarEstadoReserva } from '@/lib/whatsapp';
import { revertirSelloCancha } from '@/lib/loyalty';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyAdmin(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { reservaId, motivo } = await req.json();
  if (!reservaId) return NextResponse.json({ error: 'reservaId requerido' }, { status: 400 });

  const sb = createServiceClient();

  const { data: reserva, error: reservaError } = await sb
    .from('reservas')
    .select('*')
    .eq('id', reservaId)
    .single();

  if (reservaError || !reserva) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }

  if (reserva.estado === 'cancelada' || reserva.estado === 'rechazada') {
    return NextResponse.json({ error: 'La reserva ya fue cancelada o rechazada' }, { status: 400 });
  }

  // No se puede cancelar si el horario ya pasó
  const fechaHora = new Date(`${reserva.fecha}T${reserva.hora}`);
  if (reserva.estado === 'confirmada' && fechaHora < new Date()) {
    return NextResponse.json({ error: 'No se puede cancelar una reserva cuyo horario ya pasó' }, { status: 400 });
  }

  // Cancelar la reserva y cascada al grupo multi-hora
  const canceladoEn = new Date().toISOString();
  const { error: updateError } = await sb
    .from('reservas')
    .update({ estado: 'cancelada', cancelado_en: canceladoEn })
    .eq('id', reservaId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  if (reserva.grupo_reserva_id) {
    await sb.from('reservas')
      .update({ estado: 'cancelada', cancelado_en: canceladoEn })
      .eq('grupo_reserva_id', reserva.grupo_reserva_id)
      .neq('id', reservaId);
  }

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

  // Revertir sello por cancha si la reserva estaba confirmada
  if (reserva.estado === 'confirmada' && reserva.usuario_id) {
    await revertirSelloCancha(sb, reserva.usuario_id, reserva.cancha_id);
  }

  // Cancelar el partido vinculado (si existe)
  const { data: partido } = await sb
    .from('partidos')
    .select('id, organizador_id')
    .eq('reserva_id', reservaId)
    .maybeSingle();

  if (partido) {
    await sb.from('partidos').update({ estado: 'cancelado' }).eq('id', partido.id);

    if (partido.organizador_id) {
      const motivoTexto = motivo ? ` Motivo: ${motivo}.` : '';
      await sb.from('notificaciones').insert({
        usuario_id: partido.organizador_id,
        reserva_id: reservaId,
        mensaje: `Tu partido en ${reserva.cancha_nombre} del ${fechaLabel} a las ${reserva.hora} fue cancelado por el administrador.${motivoTexto}`,
        tipo: 'cancelada',
      });
    }
  }

  return NextResponse.json({ ok: true });
}
