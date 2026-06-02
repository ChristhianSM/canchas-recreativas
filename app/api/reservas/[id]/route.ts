import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReservaEmail } from '@/lib/email';
import { notificarEstadoReserva } from '@/lib/whatsapp';

// PATCH — actualizar estado (confirmar, rechazar, cancelar)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { estado } = await req.json();

  const { data: reserva, error } = await sb
    .from('reservas')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notificación in-app + email
  if (estado === 'confirmada' || estado === 'rechazada') {
    const fechaLabel = new Date(reserva.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
    const msg = estado === 'confirmada'
      ? `✅ Tu reserva en ${reserva.cancha_nombre} el ${fechaLabel} a las ${reserva.hora} fue confirmada.`
      : `❌ Tu reserva en ${reserva.cancha_nombre} el ${fechaLabel} a las ${reserva.hora} fue rechazada.`;

    // Notificación in-app (solo usuarios registrados)
    if (reserva.usuario_id) {
      await sb.from('notificaciones').insert({
        usuario_id: reserva.usuario_id,
        reserva_id: reserva.id,
        mensaje:    msg,
        tipo:       estado,
      });
    }

    // Email solo para invitados (usuarios con cuenta ven la notificación en la app)
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

    // WhatsApp al cliente si tiene teléfono
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

  }

  return NextResponse.json(reserva);
}
