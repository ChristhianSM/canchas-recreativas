import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReservaRecibidaEmail } from '@/lib/email';

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
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const sb = createServiceClient();

  const body = await req.json();
  const { canchaId, canchaNombre, fecha, hora, precio, precioOriginal, cuponId, metodoPago, comprobanteUrl, emailInvitado, telefonoInvitado, metodoDevolucion, telefonoDevolucion, actualizarTelefono, nuevoTelefono, balonIncluido, chalecosIncluido } = body;

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
    usuarioEmail    = emailInvitado;
    // Construir el texto del teléfono con método de devolución
    if (telefonoInvitado === 'MISMO_NUMERO_PAGO') {
      usuarioTelefono = `Mismo número de ${metodoPago}`;
    } else {
      const metodo = metodoDevolucion ?? 'yape';
      usuarioTelefono = `${telefonoInvitado} (${metodo})`;
    }
  }

  // Validar datos requeridos
  if (!canchaId || !canchaNombre || !fecha || !hora || !precio || !metodoPago) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }

  // Verificar que el slot no esté ya reservado (protección contra doble reserva)
  const { data: slotOcupado } = await sb
    .from('reservas')
    .select('id')
    .eq('cancha_id', canchaId)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .in('estado', ['pendiente', 'confirmada'])
    .maybeSingle();

  if (slotOcupado) {
    return NextResponse.json({ error: 'Este horario ya fue reservado por otro usuario' }, { status: 409 });
  }

  // Insertar reserva
  const { data: reserva, error } = await sb.from('reservas').insert({
    cancha_id:        canchaId,
    usuario_id:       usuarioId,
    usuario_nombre:   usuarioNombre,
    usuario_email:    usuarioEmail,
    usuario_telefono: usuarioTelefono,
    cancha_nombre:    canchaNombre,
    fecha,
    hora,
    precio,
    precio_original:  precioOriginal ?? precio,
    cupon_aplicado:   !!cuponId,
    metodo_pago:      metodoPago,
    comprobante_url:  comprobanteUrl,
    estado:           'pendiente',
    balon_incluido:    balonIncluido    ?? false,
    chalecos_incluido: chalecosIncluido ?? false,
  }).select().single();

  if (error) {
    console.error('Error al crear reserva:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Marcar cupón como usado
  if (cuponId && usuarioId) {
    await sb.from('cupones')
      .update({ usado: true, usado_en: new Date().toISOString() })
      .eq('id', cuponId)
      .eq('usuario_id', usuarioId);
  }

  // Enviar email al invitado (sin cuenta) con el link para ver/cancelar su reserva
  if (!usuarioId && usuarioEmail) {
    const baseUrl = req.headers.get('origin') ?? 'http://localhost:3000';
    await sendReservaRecibidaEmail({
      toEmail:      usuarioEmail,
      toName:       usuarioNombre !== 'Invitado' ? usuarioNombre : 'Cliente',
      canchaNombre: canchaNombre,
      fecha,
      hora,
      precio,
      metodoPago,
      reservaId:    reserva.id,
      baseUrl,
    });
  }

  return NextResponse.json(reserva);
}
