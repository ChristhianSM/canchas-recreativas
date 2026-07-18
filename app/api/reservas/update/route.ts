import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';
import { sendReservaEmail } from '@/lib/email';
import { notificarEstadoReserva, notificarEstadoReservaAdmin } from '@/lib/whatsapp';
import { agregarSelloCancha } from '@/lib/loyalty';

// PATCH /api/reservas/update?id=xxx — actualizar estado de reserva
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const reservaId = req.nextUrl.searchParams.get('id');
  if (!reservaId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const sb = createServiceClient();

  // Query 1: obtener canchas del dueño (verifica ownership en todas las operaciones)
  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const canchaIds = (relaciones ?? []).map((r: any) => r.cancha_id).filter(Boolean);
  if (!canchaIds.length) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const body = await req.json();
  const { estado, devolucion_procesada, saldo_cobrado } = body;

  // Si solo se está marcando la devolución como procesada
  if (devolucion_procesada !== undefined && estado === undefined && saldo_cobrado === undefined) {
    const { data: reserva, error } = await sb
      .from('reservas')
      .update({ devolucion_procesada })
      .eq('id', reservaId)
      .in('cancha_id', canchaIds)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!reserva) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    return NextResponse.json(reserva);
  }

  // Si se está marcando el saldo como cobrado
  if (saldo_cobrado !== undefined) {
    const { data: reservaActual, error: fetchError } = await sb
      .from('reservas')
      .select('modo_pago, saldo_cobrado')
      .eq('id', reservaId)
      .in('cancha_id', canchaIds)
      .single();

    if (fetchError || !reservaActual) {
      return NextResponse.json({ error: 'Reserva no encontrada o no autorizada' }, { status: 404 });
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

  if (!['confirmada', 'rechazada'].includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const { data: reserva, error } = await sb
    .from('reservas')
    .update({ estado })
    .eq('id', reservaId)
    .in('cancha_id', canchaIds)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!reserva) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  // Cascada: si pertenece a un grupo multi-hora, actualizar todos los slots hermanos
  if (reserva.grupo_reserva_id && (estado === 'confirmada' || estado === 'rechazada')) {
    await sb.from('reservas')
      .update({ estado })
      .eq('grupo_reserva_id', reserva.grupo_reserva_id)
      .neq('id', reservaId);
  }

  if (estado === 'confirmada' && reserva.usuario_id && !reserva.cupon_aplicado) {
    try {
      await agregarSelloCancha(sb, reserva.usuario_id, reserva.cancha_id);
    } catch (e) {
      console.error('[reservas/update] Error agregando sello de fidelidad:', e);
    }
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
      try {
        await sb.from('notificaciones').insert({
          usuario_id: reserva.usuario_id,
          reserva_id: reserva.id,
          mensaje: msg,
          tipo: estado,
        });
      } catch (e) {
        console.error('[reservas/update] Error creando notificación in-app:', e);
      }
    }

    // Email solo para invitados (usuarios con cuenta ven la notificación en la app)
    if (!reserva.usuario_id && reserva.usuario_email) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      try {
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
      } catch (e) {
        console.error('[reservas/update] Error enviando email al invitado:', e);
      }
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
    if (clientePhone) {
      try {
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
      } catch (e) {
        console.error('[reservas/update] Error enviando WhatsApp al cliente:', e);
      }
    }

    // WhatsApp al admin (dueño de la cancha) confirmando que su acción fue procesada
    const { data: adminData } = await sb
      .from('usuarios')
      .select('telefono')
      .eq('id', user.id)
      .maybeSingle();
    if (adminData?.telefono) {
      try {
        await notificarEstadoReservaAdmin({ adminPhone: adminData.telefono, reservaId: reserva.id, estado });
      } catch (e) {
        console.error('[reservas/update] Error enviando WhatsApp al admin:', e);
      }
    }

  }

  return NextResponse.json(reserva);
}
