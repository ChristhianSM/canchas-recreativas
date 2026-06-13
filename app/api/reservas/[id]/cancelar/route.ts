import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { notificarCancelacionAdmin } from '@/lib/whatsapp';

interface CancelacionResult {
  success: boolean;
  devolucion: number;
  penalidad: number;
  porcentaje_devolucion: number;
  motivo: string;
}

function calcularDevolucion(reserva: any): CancelacionResult {
  // Pago parcial → sin devolución siempre
  if (reserva.modo_pago === 'parcial') {
    return {
      success: true,
      devolucion: 0,
      penalidad: reserva.monto_adelanto,
      porcentaje_devolucion: 0,
      motivo: 'Reserva con adelanto — el monto abonado no se devuelve',
    };
  }

  const precio = reserva.precio;
  const estado = reserva.estado;
  const fechaReserva = new Date(`${reserva.fecha}T${reserva.hora}`);
  const ahora = new Date();
  const horasRestantes = (fechaReserva.getTime() - ahora.getTime()) / (1000 * 60 * 60);

  // Reserva pendiente - devolución completa
  if (estado === 'pendiente') {
    return {
      success: true,
      devolucion: precio,
      penalidad: 0,
      porcentaje_devolucion: 100,
      motivo: 'Reserva no confirmada - devolución completa'
    };
  }

  // Reserva confirmada - aplicar políticas por tiempo
  if (estado === 'confirmada') {
    let porcentaje = 0;
    let motivo = '';

    if (horasRestantes >= 4) {
      porcentaje = 85;
      motivo = 'Cancelación con más de 4 horas de anticipación';
    } else if (horasRestantes >= 2) {
      porcentaje = 60;
      motivo = 'Cancelación entre 2-4 horas de anticipación';
    } else if (horasRestantes >= 1) {
      porcentaje = 30;
      motivo = 'Cancelación entre 1-2 horas de anticipación';
    } else {
      porcentaje = 0;
      motivo = 'Cancelación con menos de 1 hora de anticipación';
    }

    const devolucion = Math.round(precio * (porcentaje / 100));
    const penalidad = precio - devolucion;

    return {
      success: true,
      devolucion,
      penalidad,
      porcentaje_devolucion: porcentaje,
      motivo
    };
  }

  // Estado no válido para cancelación
  return {
    success: false,
    devolucion: 0,
    penalidad: 0,
    porcentaje_devolucion: 0,
    motivo: 'No se puede cancelar esta reserva'
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const sb = createServiceClient();

  // Si hay token, verificar usuario. Si no, es un invitado accediendo por link.
  let userId: string | null = null;
  if (token) {
    const { data: { user } } = await sb.auth.getUser(token);
    if (user) userId = user.id;
  }

  // Obtener la reserva
  const { data: reserva, error: reservaError } = await sb
    .from('reservas')
    .select('*')
    .eq('id', id)
    .single();

  if (reservaError || !reserva) {
    return NextResponse.json({ error: 'Reserva no encontrada en la base de datos' }, { status: 404 });
  }

  // Verificar autorización:
  // - Usuario logueado: debe ser su reserva
  // - Sin token (invitado): puede cancelar si la reserva no tiene usuario_id (es de invitado)
  if (userId && reserva.usuario_id && reserva.usuario_id !== userId) {
    return NextResponse.json({ error: 'No autorizado para cancelar esta reserva' }, { status: 403 });
  }

  if (!userId && reserva.usuario_id) {
    return NextResponse.json({ error: 'No autorizado para cancelar esta reserva' }, { status: 403 });
  }

  if (reserva.estado === 'cancelada' || reserva.estado === 'rechazada') {
    return NextResponse.json({ error: 'Esta reserva ya fue cancelada o rechazada' }, { status: 400 });
  }

  // Calcular devolución
  const resultado = calcularDevolucion(reserva);

  if (!resultado.success) {
    return NextResponse.json({ error: resultado.motivo }, { status: 400 });
  }

  try {
    // Actualizar reserva a cancelada con todos los datos de una sola vez
    const { error: updateError } = await sb
      .from('reservas')
      .update({
        estado: 'cancelada',
        cancelado_en: new Date().toISOString(),
        devolucion_calculada: resultado.devolucion,
        penalidad_aplicada: resultado.penalidad,
        porcentaje_devolucion: resultado.porcentaje_devolucion
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Crear notificación para el usuario
    const fechaLabel = new Date(reserva.fecha).toLocaleDateString('es-PE', { 
      day: 'numeric', 
      month: 'long' 
    });

    let mensajeUsuario: string;
    if (reserva.modo_pago === 'parcial') {
      mensajeUsuario = `Tu reserva en ${reserva.cancha_nombre} del ${fechaLabel} fue cancelada. El adelanto de S/ ${reserva.monto_adelanto} fue retenido. No hay devolución.`;
    } else if (resultado.devolucion > 0) {
      mensajeUsuario = `Tu reserva en ${reserva.cancha_nombre} del ${fechaLabel} fue cancelada. Devolución: S/ ${resultado.devolucion} (${resultado.porcentaje_devolucion}%)`;
    } else {
      mensajeUsuario = `Tu reserva en ${reserva.cancha_nombre} del ${fechaLabel} fue cancelada. Sin devolución por cancelación tardía.`;
    }

    // Notificación in-app solo si hay usuario registrado
    if (userId) {
      await sb.from('notificaciones').insert({
        usuario_id: userId,
        reserva_id: id,
        mensaje: mensajeUsuario,
        tipo: 'cancelada'
      });
    }

    // Notificar al dueño de la cancha
    const { data: duenoCuenta } = await sb
      .from('duenos_canchas')
      .select('usuario_id, usuarios(telefono)')
      .eq('cancha_id', reserva.cancha_id)
      .maybeSingle();

    if (duenoCuenta?.usuario_id) {
      await sb.from('notificaciones').insert({
        usuario_id: duenoCuenta.usuario_id,
        reserva_id: id,
        mensaje:    `Cancelación: ${reserva.usuario_nombre} canceló su reserva en ${reserva.cancha_nombre} del ${fechaLabel} a las ${reserva.hora}.`,
        tipo:       'cancelada',
      });

      const adminPhone = (duenoCuenta.usuarios as any)?.telefono ?? process.env.ADMIN_WHATSAPP_NUMBER;
      if (adminPhone) {
        await notificarCancelacionAdmin({
          adminPhone,
          reservaId:     id,
          canchaNombre:  reserva.cancha_nombre,
          fecha:         reserva.fecha,
          hora:          reserva.hora,
          clienteNombre: reserva.usuario_nombre ?? 'Cliente',
          clientePhone:  reserva.usuario_telefono ?? '',
          devolucion:    resultado.devolucion,
          metodoPago:    reserva.metodo_pago ?? reserva.metodoPago ?? '',
          motivo:        resultado.motivo,
        });
      }
    }

    // Notificar a admins si hay devolución
    if (resultado.devolucion > 0) {
      const { data: admins } = await sb
        .from('usuarios')
        .select('id')
        .eq('rol', 'superadmin');

      if (admins && admins.length > 0) {
        await sb.from('notificaciones').insert(
          admins.map(admin => ({
            usuario_id: admin.id,
            reserva_id: id,
            mensaje: `💰 Procesar devolución: S/ ${resultado.devolucion} a ${reserva.usuario_nombre} por ${reserva.metodo_pago}. Reserva: ${reserva.cancha_nombre} - ${fechaLabel}`,
            tipo: 'cancelada'
          }))
        );
      }
    }

    // Restar sello de loyalty si la reserva estaba confirmada
    if (reserva.estado === 'confirmada' && userId) {
      const { data: loyalty } = await sb
        .from('loyalty')
        .select('*')
        .eq('usuario_id', userId)
        .single();

      if (loyalty && loyalty.sellos > 0) {
        // Verificar si al confirmar esta reserva se generó un cupón
        // (eso ocurre cuando los sellos llegaron a 6 y se resetearon a 0)
        // Si sellos actuales son 0, significa que se generó un cupón recientemente
        const seGeneroCupon = loyalty.sellos === 0;

        if (seGeneroCupon) {
          // Buscar el cupón más reciente no usado de este usuario
          const { data: cuponReciente } = await sb
            .from('cupones')
            .select('id, usado')
            .eq('usuario_id', userId)
            .eq('usado', false)
            .order('generado_en', { ascending: false })
            .limit(1)
            .single();

          if (cuponReciente && !cuponReciente.usado) {
            // Eliminar el cupón que se generó por esta reserva
            await sb.from('cupones').delete().eq('id', cuponReciente.id);
            // Volver a 5 sellos (justo antes de completar los 6)
            await sb.from('loyalty').update({
              sellos: 5,
              total_reservas: Math.max(0, loyalty.total_reservas - 1),
            }).eq('usuario_id', userId);
          } else {
            // El cupón ya fue usado — solo restar el sello y total
            await sb.from('loyalty').update({
              sellos: 5,
              total_reservas: Math.max(0, loyalty.total_reservas - 1),
            }).eq('usuario_id', userId);
          }
        } else {
          // No se generó cupón — simplemente restar 1 sello
          await sb.from('loyalty').update({
            sellos: loyalty.sellos - 1,
            total_reservas: Math.max(0, loyalty.total_reservas - 1),
          }).eq('usuario_id', userId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      devolucion: resultado.devolucion,
      penalidad: resultado.penalidad,
      porcentaje_devolucion: resultado.porcentaje_devolucion,
      motivo: resultado.motivo,
      mensaje: reserva.modo_pago === 'parcial'
        ? `El adelanto de S/ ${reserva.monto_adelanto} fue retenido. No hay devolución.`
        : resultado.devolucion > 0
          ? `Cancelación exitosa. Recibirás S/ ${resultado.devolucion} (${resultado.porcentaje_devolucion}%) en 24-48 horas.`
          : 'Cancelación exitosa. Sin devolución por cancelación tardía.'
    });

  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}