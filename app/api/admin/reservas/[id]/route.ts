import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReservaEmail } from '@/lib/email';

// PATCH — admin general confirma o rechaza una reserva
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();

  // Verificar que el usuario es admin
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: usuario } = await sb
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (!usuario || usuario.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { estado } = await req.json();

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
