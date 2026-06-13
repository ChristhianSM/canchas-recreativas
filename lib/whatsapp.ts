const TOKEN          = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Nombres de plantillas — configurables desde Vercel sin tocar el código
const TPL = {
  reservaIniciadaUsuario:   process.env.WHATSAPP_TPL_RESERVA_INICIADA_USUARIO   ?? 'reservation_initiated_user',
  nuevaReservaAdmin:        process.env.WHATSAPP_TPL_NUEVA_RESERVA_ADMIN        ?? 'nueva_reservacion_notificacion_para_admin',
  nuevaReservaConComp:      process.env.WHATSAPP_TPL_NUEVA_RESERVA_CON_COMP     ?? 'new_reserve_with_comprobante_admin',
  nuevaReservaSinComp:      process.env.WHATSAPP_TPL_NUEVA_RESERVA_SIN_COMP     ?? 'new_reserve_cash_payment_admin',
  reservaConfirmadaUsuario: process.env.WHATSAPP_TPL_CONFIRMADA_USUARIO         ?? 'reservation_confirmed_user',
  reservaRechazadaUsuario:  process.env.WHATSAPP_TPL_RECHAZADA_USUARIO          ?? 'reservation_rejected_user',
  reservaConfirmadaAdmin:   process.env.WHATSAPP_TPL_CONFIRMADA_ADMIN           ?? 'reservation_confirmed_admin',
  reservaRechazadaAdmin:    process.env.WHATSAPP_TPL_RECHAZADA_ADMIN            ?? 'reservation_rejected_admin',
  reservaCanceladaAdmin:    process.env.WHATSAPP_TPL_CANCELADA_ADMIN            ?? 'reservation_cancelled_admin',
  partidoCanceladoJugador:  process.env.WHATSAPP_TPL_PARTIDO_CANCELADO_JUGADOR  ?? 'partido_cancelado_jugador',
};

export function toWaNumber(phone: string): string | null {
  const match = phone.match(/9\d{8}/);
  if (!match) return null;
  return `51${match[0]}`;
}

async function callMetaApi(to: string, templateName: string, components: object[]) {
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
      components,
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

async function sendTemplate(to: string, templateName: string, params: string[]) {
  await callMetaApi(to, templateName, [{
    type: 'body',
    parameters: params.map(text => ({ type: 'text', text: String(text) })),
  }]);
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
// Usa plantilla con texto (SI/NO) mientras nueva_reservacion_notificacion_para_admin está en revisión.
// Cuando se apruebe con botones, pasar WHATSAPP_TPL_USA_BOTONES=true en Vercel y
// el código cambia automáticamente al flujo de componentes interactivos.
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

  const usarBotones = process.env.WHATSAPP_TPL_USA_BOTONES === 'true';

  if (usarBotones) {
    const components: object[] = [];
    if (data.comprobanteUrl) {
      components.push({
        type: 'header',
        parameters: [{ type: 'image', image: { link: data.comprobanteUrl } }],
      });
    }
    components.push({
      type: 'body',
      parameters: [
        codigo, data.canchaNombre, data.fecha, data.hora,
        String(data.precio), metodoLabel, data.clienteNombre, data.clienteTelefono,
      ].map(text => ({ type: 'text', text: String(text) })),
    });
    components.push(
      { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: `CONFIRMAR_${codigo}` }] },
      { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: `RECHAZAR_${codigo}` }] },
    );
    await callMetaApi(data.adminPhone, TPL.nuevaReservaAdmin, components);
    return;
  }

  // Plantilla de texto aprobada (SI/NO manual)
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
      data.comprobanteUrl,
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

// Mensaje 4b: admin recibe feedback de que su acción fue procesada
export async function notificarEstadoReservaAdmin(data: {
  adminPhone: string;
  reservaId:  string;
  estado:     'confirmada' | 'rechazada';
}) {
  const codigo = data.reservaId.slice(-6).toUpperCase();
  const tpl    = data.estado === 'confirmada' ? TPL.reservaConfirmadaAdmin : TPL.reservaRechazadaAdmin;
  await sendTemplate(data.adminPhone, tpl, [codigo]);
}

// Mensaje 4a: usuario recibe confirmación o rechazo
export async function notificarEstadoReserva(data: {
  clientePhone: string;
  canchaNombre: string;
  fecha:        string;
  hora:         string;
  precio:       number;
  estado:       'confirmada' | 'rechazada' | 'cancelada';
  reservaId:    string;
  lat?:         number | null;
  lng?:         number | null;
}) {
  const codigo = data.reservaId.slice(-6).toUpperCase();

  if (data.estado === 'confirmada') {
    const mapsLink = data.lat && data.lng
      ? `https://maps.google.com/?q=${data.lat},${data.lng}`
      : '';
    await sendTemplate(data.clientePhone, TPL.reservaConfirmadaUsuario, [
      codigo,
      data.canchaNombre,
      data.fecha,
      data.hora,
      String(data.precio),
      mapsLink,
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

// Notificación al admin cuando un usuario cancela una reserva
export async function notificarCancelacionAdmin(data: {
  adminPhone:     string;
  reservaId:      string;
  canchaNombre:   string;
  fecha:          string;
  hora:           string;
  clienteNombre:  string;
  clientePhone:   string;
  devolucion:     number;
  metodoPago:     string;
  motivo:         string;
}) {
  const codigo      = data.reservaId.slice(-6).toUpperCase();
  const metodoLabel = data.metodoPago === 'yape' ? 'Yape'
    : data.metodoPago === 'plin' ? 'Plin'
    : data.metodoPago === 'efectivo' ? 'Efectivo'
    : data.metodoPago;

  await sendTemplate(data.adminPhone, TPL.reservaCanceladaAdmin, [
    codigo,
    data.canchaNombre,
    data.fecha,
    data.hora,
    data.clienteNombre,
    data.clientePhone,
    String(data.devolucion),
    metodoLabel,
    data.motivo,
  ]);
}

// Notificación a jugadores cuando el organizador cancela el partido
export async function notificarPartidoCanceladoJugador(data: {
  jugadorPhone:      string;
  reservaId:         string;
  canchaNombre:      string;
  fecha:             string;
  hora:              string;
  organizadorNombre: string;
}) {
  const codigo = data.reservaId.slice(-6).toUpperCase();
  await sendTemplate(data.jugadorPhone, TPL.partidoCanceladoJugador, [
    codigo,
    data.canchaNombre,
    data.fecha,
    data.hora,
    data.organizadorNombre,
  ]);
}
