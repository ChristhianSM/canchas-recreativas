import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReservaEmail } from '@/lib/email';

// PATCH /api/reservas/update?id=xxx — actualizar estado de reserva
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const reservaId = req.nextUrl.searchParams.get('id');
  if (!reservaId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const body = await req.json();
  const { estado, devolucion_procesada } = body;

  // Si solo se está marcando la devolución como procesada
  if (devolucion_procesada !== undefined && estado === undefined) {
    const { data: reserva, error } = await sb
      .from('reservas')
      .update({ devolucion_procesada })
      .eq('id', reservaId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(reserva);
  }

  const { data: reserva, error } = await sb
    .from('reservas')
    .update({ estado })
    .eq('id', reservaId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Crear notificación + enviar email
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
        mensaje: msg,
        tipo: estado,
      });
    }

    // Email solo para invitados (usuarios con cuenta ven la notificación en la app)
    if (!reserva.usuario_id && reserva.usuario_email) {
      await sendReservaEmail({
        toEmail:      reserva.usuario_email,
        toName:       reserva.usuario_nombre ?? 'Cliente',
        canchaNombre: reserva.cancha_nombre,
        fecha:        reserva.fecha,
        hora:         reserva.hora,
        precio:       reserva.precio,
        estado,
      });
    }

    // Sumar sello de loyalty si fue confirmada
    if (estado === 'confirmada') {
      const { data: loyalty } = await sb
        .from('loyalty')
        .select('*')
        .eq('usuario_id', reserva.usuario_id)
        .single();

      if (loyalty) {
        const nuevosSellos = loyalty.sellos + 1;
        const generaCupon = nuevosSellos >= 6;
        await sb.from('loyalty').update({
          sellos: generaCupon ? 0 : nuevosSellos,
          total_reservas: loyalty.total_reservas + 1,
        }).eq('usuario_id', reserva.usuario_id);

        if (generaCupon) {
          await sb.from('cupones').insert({ usuario_id: reserva.usuario_id, descuento: 5 });
        }
      }
    }
  }

  return NextResponse.json(reserva);
}
