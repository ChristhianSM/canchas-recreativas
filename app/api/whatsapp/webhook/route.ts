import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { notificarEstadoReserva } from '@/lib/whatsapp';

// Parsear la respuesta del admin
function parsearRespuesta(body: string): { accion: 'confirmar' | 'rechazar' | null; codigo: string | null } {
  const texto = body.trim().toUpperCase();

  // Formato "SI ABC123" o "NO ABC123"
  const conCodigo = texto.match(/^(SI|S|CONFIRMAR|NO|N|RECHAZAR)\s+([A-Z0-9]{4,8})$/);
  if (conCodigo) {
    const accion = ['SI', 'S', 'CONFIRMAR'].includes(conCodigo[1]) ? 'confirmar' : 'rechazar';
    return { accion, codigo: conCodigo[2] };
  }

  if (['SI', 'S', 'CONFIRMAR'].includes(texto)) return { accion: 'confirmar', codigo: null };
  if (['NO', 'N', 'RECHAZAR'].includes(texto))  return { accion: 'rechazar',  codigo: null };

  return { accion: null, codigo: null };
}

function twimlResponse(message: string) {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

export async function POST(req: NextRequest) {
  // Twilio envía form-urlencoded
  const text   = await req.text();
  const params = new URLSearchParams(text);

  const msgBody = params.get('Body') ?? '';
  const from    = params.get('From') ?? ''; // 'whatsapp:+51959686193'

  // Extraer número peruano (9 dígitos empezando en 9)
  const phoneMatch = from.match(/51(9\d{8})/);
  if (!phoneMatch) return twimlResponse('No pude identificar tu número.');

  const adminPhone = phoneMatch[1];
  const { accion, codigo } = parsearRespuesta(msgBody);

  if (!accion) {
    return twimlResponse(
      'No entendí tu respuesta. Responde SI para confirmar o NO para rechazar.'
    );
  }

  const sb = createServiceClient();

  // Buscar el usuario por teléfono
  const { data: usuario } = await sb
    .from('usuarios')
    .select('id')
    .eq('telefono', adminPhone)
    .maybeSingle();

  if (!usuario) {
    return twimlResponse('No encontré tu cuenta. Verifica que tu teléfono esté guardado en el perfil de CanchaGo.');
  }

  // Obtener las canchas que administra
  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', usuario.id);

  const canchaIds = (relaciones ?? []).map((r: any) => r.cancha_id).filter(Boolean);
  if (!canchaIds.length) return twimlResponse('No tienes canchas asignadas a tu cuenta.');

  // Buscar reserva pendiente
  let reserva: any = null;

  if (codigo) {
    // Buscar por código específico (últimos 6 chars del ID en mayúsculas)
    const { data: todas } = await sb
      .from('reservas')
      .select('*')
      .in('cancha_id', canchaIds)
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: false });

    reserva = (todas ?? []).find((r: any) => r.id.slice(-6).toUpperCase() === codigo);
    if (!reserva) return twimlResponse(`No encontré una reserva pendiente con código ${codigo}.`);
  } else {
    // La más reciente pendiente
    const { data: reciente } = await sb
      .from('reservas')
      .select('*')
      .in('cancha_id', canchaIds)
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!reciente) return twimlResponse('No tienes reservas pendientes en este momento.');
    reserva = reciente;
  }

  return await procesarReserva(sb, reserva, accion);
}

async function procesarReserva(sb: any, reserva: any, accion: 'confirmar' | 'rechazar') {
  const estado = accion === 'confirmar' ? 'confirmada' : 'rechazada';
  const codigo = reserva.id.slice(-6).toUpperCase();

  const { error } = await sb
    .from('reservas')
    .update({ estado })
    .eq('id', reserva.id);

  if (error) return twimlResponse('Error al actualizar la reserva. Intenta desde el panel de administración.');

  // Notificación in-app para usuarios registrados
  if (reserva.usuario_id) {
    const fechaLabel = new Date(reserva.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
    const msg = estado === 'confirmada'
      ? `✅ Tu reserva en ${reserva.cancha_nombre} el ${fechaLabel} a las ${reserva.hora} fue confirmada.`
      : `❌ Tu reserva en ${reserva.cancha_nombre} el ${fechaLabel} a las ${reserva.hora} fue rechazada.`;

    await sb.from('notificaciones').insert({
      usuario_id: reserva.usuario_id,
      reserva_id: reserva.id,
      mensaje:    msg,
      tipo:       estado,
    });

    // Sello de loyalty si fue confirmada
    if (estado === 'confirmada') {
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
  }

  // WhatsApp al cliente si tiene teléfono
  if (reserva.usuario_telefono) {
    await notificarEstadoReserva({
      clientePhone: reserva.usuario_telefono,
      canchaNombre: reserva.cancha_nombre,
      fecha:        reserva.fecha,
      hora:         reserva.hora,
      precio:       reserva.precio,
      estado,
      reservaId:    reserva.id,
    });
  }

  const emoji      = estado === 'confirmada' ? '✅' : '❌';
  const textoEstado = estado === 'confirmada' ? 'confirmada' : 'rechazada';
  const avisoCliente = reserva.usuario_telefono ? ' El cliente fue notificado por WhatsApp.' : '';
  return twimlResponse(`${emoji} Reserva #${codigo} ${textoEstado}.${avisoCliente}`);
}
