import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';
import { sendReservaEmail } from '@/lib/email';
import { notificarEstadoReserva, notificarEstadoReservaAdmin } from '@/lib/whatsapp';
import { agregarSelloCancha } from '@/lib/loyalty';

// PATCH — actualizar estado (confirmar, rechazar) — solo dueño de la cancha
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { estado } = await req.json();

  if (!['confirmada', 'rechazada'].includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const sb = createServiceClient();

  // Query 1: obtener canchas del dueño
  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const canchaIds = (relaciones ?? []).map((r: any) => r.cancha_id).filter(Boolean);
  if (!canchaIds.length) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  // Query 2: actualizar solo si la reserva pertenece a una de sus canchas
  const { data: reserva, error } = await sb
    .from('reservas')
    .update({ estado })
    .eq('id', id)
    .in('cancha_id', canchaIds)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!reserva) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  // Cascada: actualizar todos los slots del mismo grupo multi-hora
  if (reserva.grupo_reserva_id) {
    await sb.from('reservas')
      .update({ estado })
      .eq('grupo_reserva_id', reserva.grupo_reserva_id)
      .neq('id', id);
  }

  if (estado === 'confirmada' && reserva.usuario_id && !reserva.cupon_aplicado) {
    try {
      await agregarSelloCancha(sb, reserva.usuario_id, reserva.cancha_id);
    } catch (e) {
      console.error('[reservas/id] Error agregando sello de fidelidad:', e);
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

  // Partido vinculado
  let partido: any = null;
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

  // Notificación in-app + email
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
        mensaje:    msg,
        tipo:       estado,
      });
    } catch (e) {
      console.error('[reservas/id] Error creando notificación in-app:', e);
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
      console.error('[reservas/id] Error enviando email al invitado:', e);
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
      console.error('[reservas/id] Error enviando WhatsApp al cliente:', e);
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
      console.error('[reservas/id] Error enviando WhatsApp al admin:', e);
    }
  }

  return NextResponse.json(reserva);
}
