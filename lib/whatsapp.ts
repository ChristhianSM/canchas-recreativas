const TOKEN          = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Nombres de plantillas — configurables desde Vercel sin tocar el código
const TPL = {
  reservaIniciadaUsuario:   process.env.WHATSAPP_TPL_RESERVA_INICIADA_USUARIO   ?? 'reservation_initiated_user',
  nuevaReservaConComp:      process.env.WHATSAPP_TPL_NUEVA_RESERVA_CON_COMP     ?? 'new_reserve_with_comprobante_admin',
  nuevaReservaSinComp:      process.env.WHATSAPP_TPL_NUEVA_RESERVA_SIN_COMP     ?? 'new_reserve_cash_payment_admin',
  reservaConfirmadaUsuario: process.env.WHATSAPP_TPL_CONFIRMADA_USUARIO         ?? 'reservation_confirmed_user',
  reservaRechazadaUsuario:  process.env.WHATSAPP_TPL_RECHAZADA_USUARIO          ?? 'reservation_rejected_user',
};

export function toWaNumber(phone: string): string | null {
  const match = phone.match(/9\d{8}/);
  if (!match) return null;
  return `51${match[0]}`;
}

async function sendTemplate(to: string, templateName: string, params: string[]) {
  if (!TOKEN || !PHONE_NUMBER_ID) {
    console.warn('[whatsapp] Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID');
    return;
  }
  const waNumber = toWaNumber(to);
  if (!waNumber) {
    console.warn('[whatsapp] Número inválido:', to);
    return;
  }

  const body = {
    messaging_product: 'whatsapp',
    to: waNumber,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es' },
      components: [{
        type: 'body',
        parameters: params.map(text => ({ type: 'text', text: String(text) })),
      }],
    },
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[whatsapp] ❌ Error Meta API:', JSON.stringify(err));
    } else {
      console.log(`[whatsapp] ✅ Enviado a ${to} — plantilla: ${templateName}`);
    }
  } catch (err: any) {
    console.error('[whatsapp] ❌ Error fetch:', err?.message);
  }
}

// Mensaje 2: usuario recibe "reserva pendiente"
export async function notificarReservaRecibida(data: {
  clientePhone: string;
  canchaNombre: string;
  fecha:        string;
  hora:         string;
  precio:       number;
  metodoPago:   string;
  reservaId:    string;
}) {
  const codigo = data.reservaId.slice(-6).toUpperCase();
  await sendTemplate(data.clientePhone, TPL.reservaIniciadaUsuario, [
    codigo,
    data.canchaNombre,
    data.fecha,
    data.hora,
    String(data.precio),
    data.metodoPago,
  ]);
}

// Mensaje 1: admin recibe "nueva reserva"
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
  const codigo      = data.reservaId.slice(-6).toUpperCase();
  const metodoLabel = data.metodoPago === 'yape' ? 'Yape'
    : data.metodoPago === 'plin' ? 'Plin'
    : data.metodoPago;

  if (data.comprobanteUrl) {
    await sendTemplate(data.adminPhone, TPL.nuevaReservaConComp, [
      codigo,
      data.canchaNombre,
      data.fecha,
      data.hora,
      String(data.precio),
      metodoLabel,
      data.clienteNombre,
      data.clienteTelefono,
      'Sí',
    ]);
  } else {
    await sendTemplate(data.adminPhone, TPL.nuevaReservaSinComp, [
      codigo,
      data.canchaNombre,
      data.fecha,
      data.hora,
      String(data.precio),
      metodoLabel,
      data.clienteNombre,
      data.clienteTelefono,
    ]);
  }
}

// Reutiliza la misma plantilla de nueva reserva para partidos
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
  await notificarNuevaReserva({
    adminPhone:      data.adminPhone,
    canchaNombre:    data.canchaNombre,
    fecha:           data.fecha,
    hora:            data.hora,
    precio:          data.precio,
    metodoPago:      data.metodoPago,
    clienteNombre:   data.organizadorNombre,
    clienteTelefono: data.organizadorTelefono,
    reservaId:       data.reservaId,
    comprobanteUrl:  data.comprobanteUrl,
  });
}

// Mensaje 4: usuario recibe confirmación o rechazo
export async function notificarEstadoReserva(data: {
  clientePhone: string;
  canchaNombre: string;
  fecha:        string;
  hora:         string;
  precio:       number;
  estado:       'confirmada' | 'rechazada' | 'cancelada';
  reservaId:    string;
}) {
  const codigo = data.reservaId.slice(-6).toUpperCase();

  if (data.estado === 'confirmada') {
    await sendTemplate(data.clientePhone, TPL.reservaConfirmadaUsuario, [
      codigo,
      data.canchaNombre,
      data.fecha,
      data.hora,
      String(data.precio),
    ]);
  } else {
    await sendTemplate(data.clientePhone, TPL.reservaRechazadaUsuario, [
      codigo,
      data.canchaNombre,
      data.fecha,
      data.hora,
    ]);
  }
}
