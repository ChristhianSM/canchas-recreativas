import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

function calcularDevolucion(reserva: any) {
  if (reserva.modo_pago === 'parcial') {
    return { devolucion: 0, penalidad: reserva.monto_adelanto, porcentaje: 0, motivo: 'Reserva con adelanto — el monto abonado no se devuelve' };
  }

  const precio = reserva.precio;
  const estado = reserva.estado;
  const fechaReserva = new Date(`${reserva.fecha}T${reserva.hora}`);
  const horasRestantes = (fechaReserva.getTime() - Date.now()) / (1000 * 60 * 60);

  if (estado === 'pendiente') {
    return { devolucion: precio, penalidad: 0, porcentaje: 100, motivo: 'Reserva no confirmada — devolución completa' };
  }

  if (estado === 'confirmada') {
    let porcentaje = 0;
    let motivo = '';
    if (horasRestantes >= 4)      { porcentaje = 85; motivo = 'Cancelación con más de 4 horas de anticipación'; }
    else if (horasRestantes >= 2) { porcentaje = 60; motivo = 'Cancelación entre 2-4 horas de anticipación'; }
    else if (horasRestantes >= 1) { porcentaje = 30; motivo = 'Cancelación entre 1-2 horas de anticipación'; }
    else                          { porcentaje = 0;  motivo = 'Cancelación con menos de 1 hora de anticipación'; }

    const devolucion = Math.round(precio * (porcentaje / 100));
    return { devolucion, penalidad: precio - devolucion, porcentaje, motivo };
  }

  return { devolucion: 0, penalidad: 0, porcentaje: 0, motivo: 'No se puede calcular devolución' };
}

// PATCH — cancelar partido (solo el organizador)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: partido } = await sb
    .from('partidos')
    .select('organizador_id, estado, reserva_id')
    .eq('id', id)
    .single();

  if (!partido) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
  if (partido.organizador_id !== user.id) {
    return NextResponse.json({ error: 'Solo el organizador puede cancelar el partido' }, { status: 403 });
  }
  if (partido.estado === 'cancelado' || partido.estado === 'finalizado') {
    return NextResponse.json({ error: 'El partido ya está cancelado o finalizado' }, { status: 409 });
  }

  // Cancelar el partido
  const { error } = await sb
    .from('partidos')
    .update({ estado: 'cancelado' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cancelar la reserva vinculada con la lógica de reembolso
  if (partido.reserva_id) {
    const { data: reserva } = await sb
      .from('reservas')
      .select('*')
      .eq('id', partido.reserva_id)
      .single();

    if (reserva && reserva.estado !== 'cancelada' && reserva.estado !== 'rechazada') {
      const { devolucion, penalidad, porcentaje, motivo } = calcularDevolucion(reserva);

      await sb.from('reservas').update({
        estado:                'cancelada',
        cancelado_en:          new Date().toISOString(),
        devolucion_calculada:  devolucion,
        penalidad_aplicada:    penalidad,
        porcentaje_devolucion: porcentaje,
      }).eq('id', partido.reserva_id);

      // Notificación in-app al organizador
      const fechaLabel = new Date(reserva.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
      let mensajeOrg: string;
      if (reserva.modo_pago === 'parcial') {
        mensajeOrg = `Tu partido en ${reserva.cancha_nombre} del ${fechaLabel} fue cancelado. El adelanto de S/ ${reserva.monto_adelanto} fue retenido.`;
      } else if (devolucion > 0) {
        mensajeOrg = `Tu partido en ${reserva.cancha_nombre} del ${fechaLabel} fue cancelado. Devolución: S/ ${devolucion} (${porcentaje}%). ${motivo}.`;
      } else {
        mensajeOrg = `Tu partido en ${reserva.cancha_nombre} del ${fechaLabel} fue cancelado. Sin devolución por cancelación tardía.`;
      }

      await sb.from('notificaciones').insert({
        usuario_id: user.id,
        reserva_id: partido.reserva_id,
        mensaje:    mensajeOrg,
        tipo:       'cancelada',
      });

      // Notificar a superadmins si hay devolución pendiente
      if (devolucion > 0) {
        const { data: admins } = await sb.from('usuarios').select('id').eq('rol', 'superadmin');
        if (admins && admins.length > 0) {
          await sb.from('notificaciones').insert(
            admins.map((admin: any) => ({
              usuario_id: admin.id,
              reserva_id: partido.reserva_id,
              mensaje:    `💰 Procesar devolución: S/ ${devolucion} a ${reserva.usuario_nombre} por ${reserva.metodo_pago}. Partido cancelado: ${reserva.cancha_nombre} — ${fechaLabel}`,
              tipo:       'cancelada',
            }))
          );
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
