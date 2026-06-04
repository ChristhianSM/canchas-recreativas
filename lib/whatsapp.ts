import twilio from 'twilio';
import { createServiceClient } from '@/lib/supabase';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';

function getClient() {
  if (!accountSid || !authToken) return null;
  return twilio(accountSid, authToken);
}

export function toWaNumber(phone: string): string | null {
  const match = phone.match(/9\d{8}/);
  if (!match) return null;
  return `whatsapp:+51${match[0]}`;
}

async function uploadBase64Comprobante(base64: string, reservaId: string): Promise<string | null> {
  try {
    const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return null;
    const mimeType = matches[1];
    const data     = Buffer.from(matches[2], 'base64');
    const ext      = mimeType.includes('png') ? 'png' : 'jpg';
    const fileName = `${reservaId}.${ext}`;

    const sb = createServiceClient();
    const { error } = await sb.storage
      .from('imagenes')
      .upload(`comprobantes/${fileName}`, data, { contentType: mimeType, upsert: true });

    if (error) {
      console.error('[whatsapp] Error subiendo comprobante:', error.message);
      return null;
    }

    const { data: urlData } = sb.storage.from('imagenes').getPublicUrl(`comprobantes/${fileName}`);
    return urlData.publicUrl;
  } catch (err: any) {
    console.error('[whatsapp] Error upload comprobante:', err?.message);
    return null;
  }
}

export async function notificarReservaRecibida(data: {
  clientePhone: string;
  canchaNombre: string;
  fecha:        string;
  hora:         string;
  precio:       number;
  metodoPago:   string;
  reservaId:    string;
}) {
  const client = getClient();
  if (!client) return;

  const to = toWaNumber(data.clientePhone);
  if (!to) return;

  const codigo = data.reservaId.slice(-6).toUpperCase();
  const body = [
    `⏳ *Reserva recibida* — #${codigo}`,
    `🏟️ ${data.canchaNombre}`,
    `📅 ${data.fecha}   🕐 ${data.hora}`,
    `💰 S/ ${data.precio}   💳 ${data.metodoPago}`,
    ``,
    `Pendiente de confirmación. Te avisaremos pronto.`,
  ].join('\n');

  try {
    await client.messages.create({ from: fromNumber, to, body });
    console.log('[whatsapp] ✅ Cliente notificado (recibida):', data.clientePhone);
  } catch (err: any) {
    console.error('[whatsapp] ❌ Error al notificar cliente (recibida):', err?.message ?? err);
  }
}

export async function notificarNuevaReserva(data: {
  adminPhone:      string;
  canchaNombre:    string;
  fecha:           string;
  hora:            string;
  precio:          number;
  metodoPago:      string;
  clienteNombre:   string;
  clienteTelefono: string;
  reservaId:       string;
  comprobanteUrl?: string | null;
}) {
  const client = getClient();
  if (!client) return;

  const to = toWaNumber(data.adminPhone);
  if (!to) return;

  const codigo = data.reservaId.slice(-6).toUpperCase();
  const metodoLabel = data.metodoPago === 'yape' ? 'Yape'
    : data.metodoPago === 'plin' ? 'Plin'
    : data.metodoPago;

  // Subir comprobante a Storage si es base64
  let mediaUrl: string | null = null;
  if (data.comprobanteUrl) {
    if (data.comprobanteUrl.startsWith('data:')) {
      mediaUrl = await uploadBase64Comprobante(data.comprobanteUrl, data.reservaId);
    } else if (data.comprobanteUrl.startsWith('http')) {
      mediaUrl = data.comprobanteUrl;
    }
  }

  const body = [
    `📋 *Nueva reserva* — #${codigo}`,
    `🏟️ ${data.canchaNombre}`,
    `📅 ${data.fecha}   🕐 ${data.hora}`,
    `💰 S/ ${data.precio}   💳 ${metodoLabel}`,
    `👤 ${data.clienteNombre}`,
    data.clienteTelefono ? `📱 ${data.clienteTelefono}` : null,
    ``,
    mediaUrl
      ? `✅ Envió comprobante (ver foto)`
      : `⚠️ No envió comprobante — revisa tu ${metodoLabel} para verificar si llegó el pago.`,
    ``,
    `Responde *SI* para confirmar o *NO* para rechazar.`,
    `(Si tienes varias pendientes, responde *SI ${codigo}* o *NO ${codigo}*)`,
  ].filter(Boolean).join('\n');

  try {
    const msgParams: Parameters<typeof client.messages.create>[0] = {
      from: fromNumber,
      to,
      body,
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
    };
    await client.messages.create(msgParams);
    console.log('[whatsapp] ✅ Admin notificado:', data.adminPhone);
  } catch (err: any) {
    console.error('[whatsapp] ❌ Error al notificar admin:', err?.message ?? err);
  }
}

export async function notificarNuevoPartido(data: {
  adminPhone:          string;
  canchaNombre:        string;
  fecha:               string;
  hora:                string;
  precio:              number;
  metodoPago:          string;
  organizadorNombre:   string;
  organizadorTelefono: string;
  reservaId:           string;
  deporte:             string;
  nivel:               string;
  jugadoresMax:        number;
  comprobanteUrl?:     string | null;
}) {
  const client = getClient();
  if (!client) return;

  const to = toWaNumber(data.adminPhone);
  if (!to) return;

  const codigo = data.reservaId.slice(-6).toUpperCase();
  const metodoLabel = data.metodoPago === 'yape' ? 'Yape'
    : data.metodoPago === 'plin' ? 'Plin'
    : data.metodoPago;

  const deporteLabel = data.deporte.charAt(0).toUpperCase() + data.deporte.slice(1);
  const nivelLabel   = data.nivel.charAt(0).toUpperCase() + data.nivel.slice(1);

  let mediaUrl: string | null = null;
  if (data.comprobanteUrl) {
    if (data.comprobanteUrl.startsWith('data:')) {
      mediaUrl = await uploadBase64Comprobante(data.comprobanteUrl, data.reservaId);
    } else if (data.comprobanteUrl.startsWith('http')) {
      mediaUrl = data.comprobanteUrl;
    }
  }

  const body = [
    `⚽ *Nuevo partido abierto* — #${codigo}`,
    `🏟️ ${data.canchaNombre}`,
    `📅 ${data.fecha}   🕐 ${data.hora}`,
    `🎮 ${deporteLabel} · ${nivelLabel} · ${data.jugadoresMax} cupos disponibles`,
    `💰 S/ ${data.precio}   💳 ${metodoLabel}`,
    `👤 ${data.organizadorNombre}`,
    data.organizadorTelefono ? `📱 ${data.organizadorTelefono}` : null,
    ``,
    mediaUrl
      ? `✅ Envió comprobante (ver foto)`
      : `⚠️ No envió comprobante — revisa tu ${metodoLabel} para verificar si llegó el pago.`,
    ``,
    `Responde *SI* para confirmar o *NO* para rechazar.`,
    `(Si tienes varias pendientes, responde *SI ${codigo}* o *NO ${codigo}*)`,
  ].filter(Boolean).join('\n');

  try {
    const msgParams: Parameters<typeof client.messages.create>[0] = {
      from: fromNumber,
      to,
      body,
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
    };
    await client.messages.create(msgParams);
    console.log('[whatsapp] ✅ Admin notificado (partido):', data.adminPhone);
  } catch (err: any) {
    console.error('[whatsapp] ❌ Error al notificar admin (partido):', err?.message ?? err);
  }
}

export async function notificarEstadoReserva(data: {
  clientePhone: string;
  canchaNombre: string;
  fecha:        string;
  hora:         string;
  precio:       number;
  estado:       'confirmada' | 'rechazada';
  reservaId:    string;
}) {
  const client = getClient();
  if (!client) return;

  const to = toWaNumber(data.clientePhone);
  if (!to) return;

  const codigo = data.reservaId.slice(-6).toUpperCase();

  const body = data.estado === 'confirmada'
    ? [
        `✅ *¡Tu reserva fue confirmada!* — #${codigo}`,
        `🏟️ ${data.canchaNombre}`,
        `📅 ${data.fecha}   🕐 ${data.hora}`,
        `💰 S/ ${data.precio}`,
        ``,
        `Preséntate puntualmente. ¡Que disfrutes el partido! ⚽`,
      ].join('\n')
    : [
        `❌ *Tu reserva fue rechazada* — #${codigo}`,
        `🏟️ ${data.canchaNombre}`,
        `📅 ${data.fecha}   🕐 ${data.hora}`,
        ``,
        `Puedes reservar otro horario disponible en CanchaGo.`,
      ].join('\n');

  try {
    await client.messages.create({ from: fromNumber, to, body });
    console.log('[whatsapp] ✅ Cliente notificado:', data.clientePhone);
  } catch (err: any) {
    console.error('[whatsapp] ❌ Error al notificar cliente:', err?.message ?? err);
  }
}
