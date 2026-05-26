import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReservaRecibidaEmail } from '@/lib/email';
import { notificarNuevaReserva, notificarReservaRecibida } from '@/lib/whatsapp';
import { rateLimit } from '@/lib/rate-limit';

// GET — obtener reservas del usuario autenticado
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json([]);

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json([]);

  const { data, error } = await sb
    .from('reservas')
    .select('*')
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false });

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? []);
}

// POST — crear nueva reserva
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 60 * 1000 });
  if (limited) return limited;

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const sb = createServiceClient();

  const body = await req.json();
  const { canchaId, canchaNombre, fecha, hora, horas = 1, precio, precioOriginal, cuponId, metodoPago, comprobanteUrl, emailInvitado, telefonoInvitado, whatsappInvitado, metodoDevolucion, telefonoDevolucion, actualizarTelefono, nuevoTelefono, balonIncluido, chalecosIncluido, modo_pago, monto_adelanto, saldo_pendiente } = body;

  // Precio por hora individual (para multi-hora)
  const precioPorHora = horas > 1 ? Math.round(precio / horas) : precio;

  let usuarioId: string | null = null;
  let usuarioNombre = 'Invitado';
  let usuarioEmail  = '';
  let usuarioTelefono = '';

  if (token) {
    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (user && !authError) {
      usuarioId = user.id;
      usuarioNombre = user.user_metadata?.nombre ?? user.email ?? 'Invitado';
      usuarioEmail = user.email ?? '';
      // Usar teléfono de devolución si se proporcionó, sino el del perfil
      usuarioTelefono = telefonoDevolucion || user.user_metadata?.telefono || '';

      // Si el usuario quiere actualizar su teléfono en el perfil
      if (actualizarTelefono && nuevoTelefono) {
        await sb.from('usuarios').update({ telefono: nuevoTelefono }).eq('id', user.id);
      }
    }
  } else if (emailInvitado) {
    usuarioEmail = emailInvitado;
    if (whatsappInvitado && /^9\d{8}$/.test(whatsappInvitado)) {
      usuarioTelefono = whatsappInvitado;
    } else if (telefonoInvitado === 'MISMO_NUMERO_PAGO') {
      usuarioTelefono = `Mismo número de ${metodoPago}`;
    } else if (telefonoInvitado) {
      const metodo = metodoDevolucion ?? 'yape';
      usuarioTelefono = `${telefonoInvitado} (${metodo})`;
    }
  }

  // Validar datos requeridos
  if (!canchaId || !canchaNombre || !fecha || !hora || !precio || !metodoPago) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }

  // Validar modo_pago
  if (modo_pago !== undefined && modo_pago !== 'completo' && modo_pago !== 'parcial') {
    return NextResponse.json({ error: "modo_pago debe ser 'completo' o 'parcial'" }, { status: 400 });
  }

  if (modo_pago === 'parcial') {
    if (monto_adelanto === undefined || monto_adelanto === null) {
      return NextResponse.json({ error: 'Faltan campos requeridos: monto_adelanto' }, { status: 400 });
    }
    if (saldo_pendiente === undefined || saldo_pendiente === null) {
      return NextResponse.json({ error: 'Faltan campos requeridos: saldo_pendiente' }, { status: 400 });
    }
    if (monto_adelanto + saldo_pendiente !== precio) {
      return NextResponse.json({ error: 'Los montos no cuadran con el precio total' }, { status: 400 });
    }
  }

  // Calcular valores finales de pago
  const modoPagoFinal: 'completo' | 'parcial' = modo_pago === 'parcial' ? 'parcial' : 'completo';
  const montoAdelantoFinal: number = modoPagoFinal === 'parcial' ? monto_adelanto : precio;
  const saldoPendienteFinal: number = modoPagoFinal === 'parcial' ? saldo_pendiente : 0;

  // Generar lista de horas a reservar
  const horaBase = parseInt(hora.split(':')[0]);
  const slotsAReservar = Array.from({ length: horas }, (_, i) =>
    `${String((horaBase + i) % 24).padStart(2, '0')}:00`
  );

  // Verificar que ningún slot esté ya reservado
  for (const slotHora of slotsAReservar) {
    const { data: slotOcupado } = await sb
      .from('reservas')
      .select('id')
      .eq('cancha_id', canchaId)
      .eq('fecha', fecha)
      .eq('hora', slotHora)
      .in('estado', ['pendiente', 'confirmada'])
      .maybeSingle();

    if (slotOcupado) {
      return NextResponse.json({ error: `El horario ${slotHora} ya fue reservado por otro usuario` }, { status: 409 });
    }
  }

  // Insertar una reserva por cada hora seleccionada
  let reservaPrincipal: any = null;

  for (let i = 0; i < slotsAReservar.length; i++) {
    const slotHora    = slotsAReservar[i];
    const esPrincipal = i === 0;
    // La reserva principal lleva el precio total y los extras; las adicionales solo el precio por hora
    const precioSlot  = esPrincipal ? precio : precioPorHora;
    const adelantoSlot   = esPrincipal ? montoAdelantoFinal   : (modoPagoFinal === 'parcial' ? 0 : precioPorHora);
    const saldoSlot      = esPrincipal ? saldoPendienteFinal  : 0;

    const { data: reserva, error } = await sb.from('reservas').insert({
      cancha_id:        canchaId,
      usuario_id:       usuarioId,
      usuario_nombre:   usuarioNombre,
      usuario_email:    usuarioEmail,
      usuario_telefono: usuarioTelefono,
      cancha_nombre:    canchaNombre,
      fecha,
      hora:             slotHora,
      precio:           precioSlot,
      precio_original:  esPrincipal ? (precioOriginal ?? precio) : precioPorHora,
      cupon_aplicado:   esPrincipal ? !!cuponId : false,
      metodo_pago:      metodoPago,
      comprobante_url:  esPrincipal ? comprobanteUrl : null,
      estado:           'pendiente',
      balon_incluido:   esPrincipal ? (balonIncluido ?? false) : false,
      chalecos_incluido: esPrincipal ? (chalecosIncluido ?? false) : false,
      modo_pago:        modoPagoFinal,
      monto_adelanto:   adelantoSlot,
      saldo_pendiente:  saldoSlot,
      saldo_cobrado:    false,
    }).select().single();

    if (error) {
      console.error('Error al crear reserva:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (esPrincipal) reservaPrincipal = reserva;
  }

  const reserva = reservaPrincipal;

  // Marcar cupón como usado
  if (cuponId && usuarioId) {
    await sb.from('cupones')
      .update({ usado: true, usado_en: new Date().toISOString() })
      .eq('id', cuponId)
      .eq('usuario_id', usuarioId);
  }

  // Hora de fin para notificaciones
  const horaFin = `${String((horaBase + horas) % 24).padStart(2, '0')}:00`;
  const horaDisplay = horas > 1 ? `${hora} - ${horaFin}` : hora;

  // Enviar email al invitado (sin cuenta)
  if (!usuarioId && usuarioEmail) {
    const baseUrl = req.headers.get('origin') ?? 'http://localhost:3000';
    await sendReservaRecibidaEmail({
      toEmail:      usuarioEmail,
      toName:       usuarioNombre !== 'Invitado' ? usuarioNombre : 'Cliente',
      canchaNombre,
      fecha,
      hora:         horaDisplay,
      precio,
      metodoPago,
      reservaId:    reserva.id,
      baseUrl,
    });
  }

  // Notificar al cliente por WhatsApp
  if (usuarioTelefono) {
    await notificarReservaRecibida({
      clientePhone: usuarioTelefono,
      canchaNombre,
      fecha,
      hora:      horaDisplay,
      precio,
      metodoPago,
      reservaId: reserva.id,
    });
  }

  // Notificar al dueño de la cancha
  const { data: dueno } = await sb
    .from('duenos_canchas')
    .select('usuarios(telefono)')
    .eq('cancha_id', canchaId)
    .maybeSingle();

  const duenoPhone = (dueno?.usuarios as any)?.telefono ?? process.env.ADMIN_WHATSAPP_NUMBER;
  if (duenoPhone) {
    await notificarNuevaReserva({
      adminPhone:      duenoPhone,
      canchaNombre,
      fecha,
      hora:            horaDisplay,
      precio,
      metodoPago,
      clienteNombre:   usuarioNombre,
      clienteTelefono: usuarioTelefono,
      reservaId:       reserva.id,
      comprobanteUrl:  comprobanteUrl ?? null,
    });
  }

  return NextResponse.json(reserva);
}
