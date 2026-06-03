import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReservaEmail } from '@/lib/email';
import { notificarEstadoReserva } from '@/lib/whatsapp';
import { verifyAdmin } from '@/lib/admin-auth';
import { agregarSellosReserva } from '@/lib/loyalty';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();

  const body = await req.json();

  // Marcar devolución procesada
  if (body.devolucion_procesada === true) {
    const { data: reserva, error } = await sb
      .from('reservas')
      .update({ devolucion_procesada: true })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(reserva);
  }

  const { estado } = body;

  if (!['confirmada', 'rechazada'].includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const { data: reserva, error } = await sb
    .from('reservas')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sellos de loyalty al confirmar
  if (estado === 'confirmada') {
    await agregarSellosReserva(sb, reserva);
  }

  // Notificación in-app + email
  const fechaLabel = new Date(reserva.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
  const msg = estado === 'confirmada'
    ? `✅ Tu reserva en ${reserva.cancha_nombre} el ${fechaLabel} a las ${reserva.hora} fue confirmada.`
    : `❌ Tu reserva en ${reserva.cancha_nombre} el ${fechaLabel} a las ${reserva.hora} fue rechazada.`;

  if (reserva.usuario_id) {
    await sb.from('notificaciones').insert({
      usuario_id: reserva.usuario_id,
      reserva_id: reserva.id,
      mensaje:    msg,
      tipo:       estado,
    });
  }

  if (!reserva.usuario_id && reserva.usuario_email) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    await sendReservaEmail({
      toEmail:      reserva.usuario_email,
      toName:       reserva.usuario_nombre ?? 'Cliente',
      canchaNombre: reserva.cancha_nombre,
      fecha:        reserva.fecha,
      hora:         reserva.hora,
      precio:       reserva.precio,
      estado,
      reservaId:    reserva.id,
      baseUrl,
    });
  }

  // Notificar al cliente por WhatsApp si tiene teléfono
  console.log('[admin] usuario_telefono en reserva:', reserva.usuario_telefono);
  if (reserva.usuario_telefono) {
    await notificarEstadoReserva({
      clientePhone: reserva.usuario_telefono,
      canchaNombre: reserva.cancha_nombre,
      fecha:        reserva.fecha,
      hora:         reserva.hora,
      precio:       reserva.precio,
      estado,
      reservaId:    reserva.id,
    });
  }

  return NextResponse.json(reserva);
}
