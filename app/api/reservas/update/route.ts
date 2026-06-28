import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReservaEmail } from '@/lib/email';
import { notificarEstadoReserva, notificarEstadoReservaAdmin } from '@/lib/whatsapp';
import { agregarSelloCancha } from '@/lib/loyalty';

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
  const { estado, devolucion_procesada, saldo_cobrado } = body;

  // Si solo se está marcando la devolución como procesada
  if (devolucion_procesada !== undefined && estado === undefined && saldo_cobrado === undefined) {
    const { data: reserva, error } = await sb
      .from('reservas')
      .update({ devolucion_procesada })
      .eq('id', reservaId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(reserva);
  }

  // Si se está marcando el saldo como cobrado
  if (saldo_cobrado !== undefined) {
    const { data: reservaActual, error: fetchError } = await sb
      .from('reservas')
      .select('modo_pago, saldo_cobrado')
      .eq('id', reservaId)
      .single();

    if (fetchError || !reservaActual) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    if (reservaActual.modo_pago !== 'parcial') {
      return NextResponse.json({ error: 'La reserva ya está completamente pagada' }, { status: 400 });
    }

    if (reservaActual.saldo_cobrado === true) {
      return NextResponse.json({ error: 'El saldo ya fue marcado como cobrado' }, { status: 400 });
    }

    const { data: reservaActualizada, error: updateError } = await sb
      .from('reservas')
      .update({
        saldo_cobrado: true,
        saldo_cobrado_en: new Date().toISOString(),
      })
      .eq('id', reservaId)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json(reservaActualizada);
  }

  const { data: reserva, error } = await sb
    .from('reservas')
    .update({ estado })
    .eq('id', reservaId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cascada: si pertenece a un grupo multi-hora, actualizar todos los slots hermanos
  if (reserva.grupo_reserva_id && (estado === 'confirmada' || estado === 'rechazada')) {
    await sb.from('reservas')
      .update({ estado })
      .eq('grupo_reserva_id', reserva.grupo_reserva_id)
      .neq('id', reservaId);
  }

  if (estado === 'confirmada' && reserva.usuario_id && !reserva.cupon_aplicado) {
    await agregarSelloCancha(sb, reserva.usuario_id, reserva.cancha_id);
  }

  // Restaurar cupón si la reserva fue rechazada
  if (estado === 'rechazada') {
    let cuponId = (reserva as any).cupon_id ?? null;
    if (!cuponId && reserva.grupo_reserva_id) {
      const { data: principal } = await sb
        .from('reservas')
        .select('cupon_id')
        .eq('grupo_reserva_id', reserva.grupo_reserva_id)
        .not('cupon_id', 'is', null)
        .maybeSingle();
      cuponId = (principal as any)?.cupon_id ?? null;
    }
    if (cuponId) {
      await sb.from('cancha_cupones')
        .update({ usado: false, usado_en: null })
        .eq('id', cuponId);
    }
  }

  // Si hay un partido vinculado a esta reserva, actualizar su estado también
  let partido: any = null;
  if (estado === 'confirmada' || estado === 'rechazada') {
    const { data: p } = await sb
      .from('partidos')
      .select('id, organizador_id')
      .eq('reserva_id', reserva.id)
      .maybeSingle();
    partido = p;

    if (partido) {
      const estadoPartido = estado === 'confirmada' ? 'abierto' : 'cancelado';
      await sb.from('partidos').update({ estado: estadoPartido }).eq('id', partido.id);
    }
  }

  // Crear notificación + enviar email
  if (estado === 'confirmada' || estado === 'rechazada') {
    const fechaLabel = new Date(reserva.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
    const msg = partido
      ? estado === 'confirmada'
        ? `✅ Tu partido en ${reserva.cancha_nombre} el ${fechaLabel} a las ${reserva.hora} fue confirmado y ya está visible para otros jugadores.`
        : `❌ Tu partido en ${reserva.cancha_nombre} el ${fechaLabel} a las ${reserva.hora} fue rechazado.`
      : estado === 'confirmada'
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

    // Rango de hora para reservas multi-hora
    let horaNotificacion = reserva.hora;
    if (reserva.grupo_reserva_id) {
      const { data: slots } = await sb
        .from('reservas')
        .select('hora')
        .eq('grupo_reserva_id', reserva.grupo_reserva_id)
        .order('hora', { ascending: true });
      if (slots && slots.length > 1) {
        const horaFin = `${String(parseInt(slots[slots.length - 1].hora.split(':')[0]) + 1).padStart(2, '0')}:00`;
        horaNotificacion = `${slots[0].hora} - ${horaFin}`;
      }
    }

    // Teléfono del cliente: directo de la reserva o fallback desde usuarios
    let clientePhone = reserva.usuario_telefono ?? null;
    if (!clientePhone && reserva.usuario_id) {
      const { data: usuarioData } = await sb
        .from('usuarios')
        .select('telefono')
        .eq('id', reserva.usuario_id)
        .maybeSingle();
      clientePhone = usuarioData?.telefono ?? null;
    }

    // Coordenadas para link de Maps
    const { data: cancha } = await sb
      .from('canchas')
      .select('lat, lng')
      .eq('id', reserva.cancha_id)
      .maybeSingle();

    // WhatsApp al cliente
    console.log('[reservas/update] clientePhone:', clientePhone, '| estado:', estado, '| reservaId:', reserva.id);
    if (clientePhone) {
      await notificarEstadoReserva({
        clientePhone,
        canchaNombre: reserva.cancha_nombre,
        fecha:        reserva.fecha,
        hora:         horaNotificacion,
        precio:       reserva.precio,
        estado,
        reservaId:    reserva.id,
        lat:          cancha?.lat ?? null,
        lng:          cancha?.lng ?? null,
      });
      console.log('[reservas/update] notificarEstadoReserva completado');
    } else {
      console.warn('[reservas/update] clientePhone vacío, no se notificó al usuario');
    }

    // WhatsApp al admin (dueño de la cancha) confirmando que su acción fue procesada
    const { data: adminData } = await sb
      .from('usuarios')
      .select('telefono')
      .eq('id', user.id)
      .maybeSingle();
    if (adminData?.telefono) {
      await notificarEstadoReservaAdmin({ adminPhone: adminData.telefono, reservaId: reserva.id, estado });
    }

  }

  return NextResponse.json(reserva);
}
