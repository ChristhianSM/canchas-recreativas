import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReservaRecibidaEmail } from '@/lib/email';
import { notificarNuevaReserva, notificarReservaRecibida } from '@/lib/whatsapp';
import { rateLimit } from '@/lib/rate-limit';

// GET — obtener reservas del usuario autenticado
// ?tipo=historial&page=0&limit=10 → devuelve historial paginado con total
// sin params → devuelve reservas próximas/pendientes
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json([]);

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json([]);

  const tipo  = req.nextUrl.searchParams.get('tipo');
  const page  = Math.max(0, parseInt(req.nextUrl.searchParams.get('page')  ?? '0'));
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') ?? '10'));
  // Usar zona horaria de Perú (UTC-5) para que el corte de día sea correcto
  const ahora = new Date();
  const ahoraEnPeru = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
  const hoy         = ahoraEnPeru.toISOString().split('T')[0];
  const horaActual  = `${String(ahoraEnPeru.getUTCHours()).padStart(2, '0')}:00`;

  if (tipo === 'historial') {
    const from = page * limit;
    const to   = from + limit - 1;

    // Incluye: rechazada/cancelada siempre · confirmada de días pasados ·
    // confirmada de hoy con hora ya pasada · pendiente de días pasados ·
    // pendiente de hoy con hora ya pasada
    const { data, error, count } = await sb
      .from('reservas')
      .select('*', { count: 'exact' })
      .eq('usuario_id', user.id)
      .or(
        `estado.in.(rechazada,cancelada),` +
        `and(estado.in.(confirmada,pendiente),fecha.lt.${hoy}),` +
        `and(estado.in.(confirmada,pendiente),fecha.eq.${hoy},hora.lte.${horaActual})`
      )
      .order('creado_en', { ascending: false })
      .order('id',        { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ items: [], total: 0, page, limit });
    return NextResponse.json({ items: data ?? [], total: count ?? 0, page, limit });
  }

  // Próximas: pendientes o confirmadas con hora aún futura
  // - pendiente de hoy con hora futura, o cualquier pendiente de fecha futura
  // - confirmada de hoy con hora futura, o cualquier confirmada de fecha futura
  const { data, error } = await sb
    .from('reservas')
    .select('*')
    .eq('usuario_id', user.id)
    .or(
      `and(estado.in.(pendiente,confirmada),fecha.gt.${hoy}),` +
      `and(estado.in.(pendiente,confirmada),fecha.eq.${hoy},hora.gt.${horaActual})`
    )
    .order('creado_en', { ascending: false });

  if (error) return NextResponse.json([]);
  return NextResponse.json(data ?? []);
}

// POST — crear nueva reserva
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 60 * 1000 });
  if (limited) return limited;

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const sb = createServiceClient();

  const body = await req.json();
  const { canchaId, canchaNombre, fecha, hora, horas = 1, precio, precioOriginal, canchaCuponId, metodoPago, comprobanteUrl, emailInvitado, telefonoInvitado, whatsappInvitado, metodoDevolucion, telefonoDevolucion, actualizarTelefono, nuevoTelefono, accesoriosIncluidos, modo_pago, monto_adelanto, saldo_pendiente, seccionId = null } = body;

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

  // Si el comprobante es base64, subirlo a Supabase Storage y obtener URL pública
  let comprobantePublicUrl: string | null = comprobanteUrl ?? null;
  if (comprobanteUrl?.startsWith('data:')) {
    try {
      const base64Data = comprobanteUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const mimeMatch = comprobanteUrl.match(/data:([^;]+);/);
      const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
      const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1] ?? 'jpg';
      const fileName = `comprobantes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await sb.storage
        .from('imagenes')
        .upload(fileName, buffer, { contentType: mimeType });

      if (!uploadError) {
        const { data: { publicUrl } } = sb.storage.from('imagenes').getPublicUrl(fileName);
        comprobantePublicUrl = publicUrl;
      } else {
        console.error('[reservas] Error subiendo comprobante:', uploadError.message);
        comprobantePublicUrl = null;
      }
    } catch (e) {
      console.error('[reservas] Error procesando comprobante base64:', e);
      comprobantePublicUrl = null;
    }
  }

  // Validar datos requeridos (precio puede ser 0 en caso de hora gratis)
  if (!canchaId || !canchaNombre || !fecha || !hora || precio == null || !metodoPago) {
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

  // Validar cupón por cancha antes de crear la reserva
  let cuponDetalles: { premio_tipo?: string; premio_valor?: number } | null = null;
  if (canchaCuponId && usuarioId) {
    const { data: cuponValido } = await sb
      .from('cancha_cupones')
      .select('id, premio_tipo, premio_valor')
      .eq('id', canchaCuponId)
      .eq('usuario_id', usuarioId)
      .eq('cancha_id', canchaId)
      .eq('usado', false)
      .maybeSingle();

    if (!cuponValido) {
      return NextResponse.json({ error: 'El cupón ya fue utilizado o no es válido' }, { status: 400 });
    }
    cuponDetalles = cuponValido;
  }

  // Generar lista de horas a reservar
  const horaBase = parseInt(hora.split(':')[0]);
  const slotsAReservar = Array.from({ length: horas }, (_, i) =>
    `${String((horaBase + i) % 24).padStart(2, '0')}:00`
  );

  // Verificar disponibilidad de todos los slots en una sola query
  if (seccionId) {
    const { data: conflictos } = await sb
      .from('reservas')
      .select('hora')
      .eq('cancha_id', canchaId)
      .eq('fecha', fecha)
      .in('hora', slotsAReservar)
      .in('estado', ['pendiente', 'confirmada'])
      .or(`seccion_id.is.null,seccion_id.eq.${seccionId}`);

    if (conflictos && conflictos.length > 0) {
      return NextResponse.json({ error: `El horario ${conflictos[0].hora} ya fue reservado por otro usuario` }, { status: 409 });
    }
  } else {
    const { data: conflictos } = await sb
      .from('reservas')
      .select('hora')
      .eq('cancha_id', canchaId)
      .eq('fecha', fecha)
      .in('hora', slotsAReservar)
      .in('estado', ['pendiente', 'confirmada']);

    if (conflictos && conflictos.length > 0) {
      return NextResponse.json({ error: `El horario ${conflictos[0].hora} ya fue reservado por otro usuario` }, { status: 409 });
    }
  }

  // Insertar todos los slots en una sola query
  // grupo_reserva_id se pre-genera para evitar el update posterior
  const grupoId = horas > 1 ? crypto.randomUUID() : null;

  const rows = slotsAReservar.map((slotHora, i) => {
    const esPrincipal    = i === 0;
    const precioSlot     = esPrincipal ? precio : precioPorHora;
    const adelantoSlot   = esPrincipal ? montoAdelantoFinal  : (modoPagoFinal === 'parcial' ? 0 : precioPorHora);
    const saldoSlot      = esPrincipal ? saldoPendienteFinal : 0;

    return {
      cancha_id:            canchaId,
      usuario_id:           usuarioId,
      usuario_nombre:       usuarioNombre,
      usuario_email:        usuarioEmail,
      usuario_telefono:     usuarioTelefono,
      cancha_nombre:        canchaNombre,
      fecha,
      hora:                 slotHora,
      precio:               precioSlot,
      precio_original:      esPrincipal ? (precioOriginal ?? precio) : precioPorHora,
      cupon_aplicado:       esPrincipal ? !!canchaCuponId : false,
      cupon_id:             esPrincipal ? (canchaCuponId ?? null) : null,
      metodo_pago:          metodoPago,
      comprobante_url:      esPrincipal ? comprobantePublicUrl : null,
      estado:               'pendiente',
      accesorios_incluidos: esPrincipal ? (accesoriosIncluidos ?? []) : [],
      modo_pago:            modoPagoFinal,
      monto_adelanto:       adelantoSlot,
      saldo_pendiente:      saldoSlot,
      saldo_cobrado:        false,
      grupo_reserva_id:     grupoId,
      ...(seccionId ? { seccion_id: seccionId } : {}),
    };
  });

  // Marcar cupón como usado ANTES del insert para evitar doble uso en caso de retry
  if (canchaCuponId && usuarioId) {
    const { error: cuponErr } = await sb.from('cancha_cupones')
      .update({ usado: true, usado_en: new Date().toISOString() })
      .eq('id', canchaCuponId)
      .eq('usuario_id', usuarioId)
      .eq('usado', false);

    if (cuponErr) {
      return NextResponse.json({ error: 'Error al procesar el cupón' }, { status: 500 });
    }
  }

  const { data: reservasInsertadas, error: insertError } = await sb
    .from('reservas')
    .insert(rows)
    .select();

  if (insertError) {
    // Rollback: restaurar cupón si el insert falló
    if (canchaCuponId && usuarioId) {
      await sb.from('cancha_cupones')
        .update({ usado: false, usado_en: null })
        .eq('id', canchaCuponId);
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const reservaPrincipal = reservasInsertadas[0];
  const reserva = reservaPrincipal;

  // Hora de fin para notificaciones
  const horaFin = `${String((horaBase + horas) % 24).padStart(2, '0')}:00`;
  const horaDisplay = horas > 1 ? `${hora} - ${horaFin}` : hora;

  // Enviar email al invitado (sin cuenta)
  if (!usuarioId && usuarioEmail) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get('origin') || 'http://localhost:3000';
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

  // Notificar al dueño de la cancha (WhatsApp + in-app)
  const { data: dueno } = await sb
    .from('duenos_canchas')
    .select('usuario_id, usuarios(telefono)')
    .eq('cancha_id', canchaId)
    .maybeSingle();

  const cuponInfo = cuponDetalles
    ? cuponDetalles.premio_tipo === 'hora_gratis'          ? 'Hora gratis'
    : cuponDetalles.premio_tipo === 'descuento_fijo'       ? `S/${cuponDetalles.premio_valor} de descuento`
    : cuponDetalles.premio_tipo === 'descuento_porcentaje' ? `${cuponDetalles.premio_valor}% de descuento`
    : 'Cupón aplicado'
    : null;

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
      comprobanteUrl:  comprobantePublicUrl,
      cuponInfo,
    });
  }

  // Notificación in-app al dueño
  if (dueno?.usuario_id) {
    const fechaLabel = new Date(fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
    await sb.from('notificaciones').insert({
      usuario_id: dueno.usuario_id,
      reserva_id: reserva.id,
      mensaje:    `Nueva reserva: ${usuarioNombre} reservó ${canchaNombre} el ${fechaLabel} a las ${horaDisplay}. S/ ${precio} vía ${metodoPago}.`,
      tipo:       'nueva_reserva',
    });
  }

  return NextResponse.json(reserva);
}
