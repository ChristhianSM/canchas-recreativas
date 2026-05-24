import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReservaEmail } from '@/lib/email';
import { verifyAdmin } from '@/lib/admin-auth';

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

  if (estado === 'confirmada' && reserva.usuario_id) {
    const { data: loyalty } = await sb
      .from('loyalty')
      .select('*')
      .eq('usuario_id', reserva.usuario_id)
      .single();

    if (loyalty) {
      const nuevosSellos = loyalty.sellos + 1;
      const generaCupon  = nuevosSellos >= 6;
      await sb.from('loyalty').update({
        sellos:         generaCupon ? 0 : nuevosSellos,
        total_reservas: loyalty.total_reservas + 1,
      }).eq('usuario_id', reserva.usuario_id);

      if (generaCupon) {
        await sb.from('cupones').insert({ usuario_id: reserva.usuario_id, descuento: 5 });
      }
    }
  }

  return NextResponse.json(reserva);
}
