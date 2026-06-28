import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReservaEmail } from '@/lib/email';
import { notificarEstadoReserva, notificarEstadoReservaAdmin } from '@/lib/whatsapp';
import { verifyAdmin } from '@/lib/admin-auth';
import { agregarSelloCancha } from '@/lib/loyalty';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const adminUser = await verifyAdmin(token);
  if (!adminUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

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

  // Cascada: si pertenece a un grupo multi-hora, actualizar todos los slots hermanos
  if (reserva.grupo_reserva_id) {
    await sb.from('reservas')
      .update({ estado })
      .eq('grupo_reserva_id', reserva.grupo_reserva_id)
      .neq('id', id);
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
  const { data: partido } = await sb
    .from('partidos')
    .select('id, organizador_id')
    .eq('reserva_id', reserva.id)
    .maybeSingle();

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
  console.log('[admin/reservas] clientePhone:', clientePhone, '| estado:', estado, '| reservaId:', reserva.id);
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
    console.log('[admin/reservas] notificarEstadoReserva completado');
  } else {
    console.warn('[admin/reservas] clientePhone vacío, no se notificó al usuario');
  }

  // WhatsApp al admin confirmando que su acción fue procesada
  const { data: adminData } = await sb
    .from('usuarios')
    .select('telefono')
    .eq('id', adminUser.id)
    .maybeSingle();
  if (adminData?.telefono) {
    await notificarEstadoReservaAdmin({ adminPhone: adminData.telefono, reservaId: reserva.id, estado });
  }

  return NextResponse.json(reserva);
}
