import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { notificarEstadoReserva, notificarEstadoReservaAdmin } from '@/lib/whatsapp';
import { agregarSelloCancha } from '@/lib/loyalty';

// GET: Meta verifica el webhook al guardarlo en el portal
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Meta envía los mensajes entrantes (respuestas del admin)
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    await processWebhook(payload);
  } catch (err) {
    console.error('[webhook] Error procesando mensaje:', err);
  }
  // Meta requiere siempre 200 OK
  return new NextResponse('OK', { status: 200 });
}

function parsearRespuesta(body: string): { accion: 'confirmar' | 'rechazar' | null; codigo: string | null } {
  const texto = body.trim().toUpperCase();

  const conCodigo = texto.match(/^(SI|S|CONFIRMAR|NO|N|RECHAZAR)\s+([A-Z0-9]{4,8})$/);
  if (conCodigo) {
    const accion = ['SI', 'S', 'CONFIRMAR'].includes(conCodigo[1]) ? 'confirmar' : 'rechazar';
    return { accion, codigo: conCodigo[2] };
  }

  if (['SI', 'S', 'CONFIRMAR'].includes(texto)) return { accion: 'confirmar', codigo: null };
  if (['NO', 'N', 'RECHAZAR'].includes(texto))  return { accion: 'rechazar',  codigo: null };

  return { accion: null, codigo: null };
}

// Extrae solo los dígitos significativos del teléfono peruano (9 dígitos, empieza con 9)
function normalizarTelefono(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  // Puede venir como 51987654321, 987654321, +51987654321
  const match = digits.match(/(9\d{8})$/);
  return match ? match[1] : null;
}

async function processWebhook(payload: any) {
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return;

  const from = message.from as string;
  const adminPhone = normalizarTelefono(from);
  if (!adminPhone) return;

  let accion: 'confirmar' | 'rechazar' | null = null;
  let codigo: string | null = null;

  if (message.type === 'text') {
    const parsed = parsearRespuesta(message.text?.body ?? '');
    accion = parsed.accion;
    codigo = parsed.codigo;
  } else if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
    const buttonId: string = message.interactive.button_reply?.id ?? '';
    const match = buttonId.match(/^(CONFIRMAR|RECHAZAR)_([A-Z0-9]{4,8})$/);
    if (match) {
      accion  = match[1] === 'CONFIRMAR' ? 'confirmar' : 'rechazar';
      codigo  = match[2];
    }
  } else if (message.type === 'button') {
    const buttonPayload: string = message.button?.payload ?? '';
    const match = buttonPayload.match(/^(CONFIRMAR|RECHAZAR)_([A-Z0-9]{4,8})$/);
    if (match) {
      accion  = match[1] === 'CONFIRMAR' ? 'confirmar' : 'rechazar';
      codigo  = match[2];
    }
  }

  if (!accion) return;

  const sb = createServiceClient();

  // Buscar canchas del admin: filtrar por sufijo de teléfono para cubrir formatos distintos
  // (51987654321, +51987654321, 987654321 → todos terminan en los 9 dígitos)
  let canchaIds: string[] = [];

  const { data: usuarios } = await sb
    .from('usuarios')
    .select('id, telefono')
    .like('telefono', `%${adminPhone}`);

  const usuarioEncontrado = usuarios?.[0] ?? null;

  if (usuarioEncontrado) {
    const { data: relaciones } = await sb
      .from('duenos_canchas')
      .select('cancha_id')
      .eq('usuario_id', usuarioEncontrado.id);

    canchaIds = (relaciones ?? []).map((r: any) => r.cancha_id).filter(Boolean);
  }

  // Fallback: si el número es el del admin configurado en env, tomar todas las canchas pendientes
  if (!canchaIds.length) {
    const adminEnv = normalizarTelefono(process.env.ADMIN_WHATSAPP_NUMBER ?? '');
    if (adminEnv && adminEnv === adminPhone) {
      const { data: todasCanchas } = await sb.from('canchas').select('id');
      canchaIds = (todasCanchas ?? []).map((c: any) => c.id);
    }
  }

  if (!canchaIds.length) return;

  let reserva: any = null;

  if (codigo) {
    const { data: todas } = await sb
      .from('reservas')
      .select('*')
      .in('cancha_id', canchaIds)
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: false });

    reserva = (todas ?? []).find((r: any) => r.id.slice(-6).toUpperCase() === codigo);
    if (!reserva) return;
  } else {
    const { data: reciente } = await sb
      .from('reservas')
      .select('*')
      .in('cancha_id', canchaIds)
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!reciente) return;
    reserva = reciente;
  }

  await procesarReserva(sb, reserva, accion, adminPhone);
}

async function procesarReserva(sb: any, reserva: any, accion: 'confirmar' | 'rechazar', adminPhone: string) {
  const estado = accion === 'confirmar' ? 'confirmada' : 'rechazada';
  const codigo = reserva.id.slice(-6).toUpperCase();

  const { error } = await sb
    .from('reservas')
    .update({ estado })
    .eq('id', reserva.id);

  if (error) {
    console.error('[webhook] Error actualizando reserva:', error.message);
    return;
  }

  if (accion === 'confirmar' && reserva.usuario_id && !reserva.cupon_aplicado) {
    await agregarSelloCancha(sb, reserva.usuario_id, reserva.cancha_id);
  }

  // Cascada: actualizar todos los slots del mismo grupo multi-hora
  if (reserva.grupo_reserva_id) {
    await sb.from('reservas')
      .update({ estado })
      .eq('grupo_reserva_id', reserva.grupo_reserva_id)
      .neq('id', reserva.id);
  }

  // Restaurar cupón si la reserva fue rechazada
  if (accion === 'rechazar') {
    let cuponId = reserva.cupon_id ?? null;
    if (!cuponId && reserva.grupo_reserva_id) {
      const { data: principal } = await sb
        .from('reservas')
        .select('cupon_id')
        .eq('grupo_reserva_id', reserva.grupo_reserva_id)
        .not('cupon_id', 'is', null)
        .maybeSingle();
      cuponId = principal?.cupon_id ?? null;
    }
    if (cuponId) {
      await sb.from('cancha_cupones')
        .update({ usado: false, usado_en: null })
        .eq('id', cuponId);
    }
  }

  // Coordenadas de la cancha para link de Google Maps
  const { data: cancha } = await sb
    .from('canchas')
    .select('lat, lng')
    .eq('id', reserva.cancha_id)
    .maybeSingle();

  // Partido vinculado
  const { data: partido } = await sb
    .from('partidos')
    .select('id, organizador_id')
    .eq('reserva_id', reserva.id)
    .maybeSingle();

  if (partido) {
    const estadoPartido = accion === 'confirmar' ? 'abierto' : 'cancelado';
    await sb.from('partidos').update({ estado: estadoPartido }).eq('id', partido.id);

    if (partido.organizador_id) {
      const fechaLabel = new Date(reserva.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
      const msgPartido = accion === 'confirmar'
        ? `✅ Tu partido en ${reserva.cancha_nombre} el ${fechaLabel} a las ${reserva.hora} fue confirmado y ya está visible para otros jugadores.`
        : `❌ Tu partido en ${reserva.cancha_nombre} el ${fechaLabel} a las ${reserva.hora} fue rechazado.`;

      await sb.from('notificaciones').insert({
        usuario_id: partido.organizador_id,
        reserva_id: reserva.id,
        mensaje:    msgPartido,
        tipo:       estado,
      });
    }
  }

  if (reserva.usuario_id && !partido) {
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
  }

  if (reserva.usuario_telefono) {
    await notificarEstadoReserva({
      clientePhone: reserva.usuario_telefono,
      canchaNombre: reserva.cancha_nombre,
      fecha:        reserva.fecha,
      hora:         reserva.hora,
      precio:       reserva.precio,
      estado,
      reservaId:    reserva.id,
      lat:          cancha?.lat ?? null,
      lng:          cancha?.lng ?? null,
    });
  }

  await notificarEstadoReservaAdmin({
    adminPhone,
    reservaId: reserva.id,
    estado,
  });

}
