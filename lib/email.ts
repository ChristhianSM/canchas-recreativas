interface ReservaEmailData {
  toEmail:      string;
  toName:       string;
  canchaNombre: string;
  fecha:        string;
  hora:         string;
  precio:       number;
  estado:       'confirmada' | 'rechazada';
  reservaId:    string;
  baseUrl:      string;
}

interface ReservaRecibidaEmailData {
  toEmail:      string;
  toName:       string;
  canchaNombre: string;
  fecha:        string;
  hora:         string;
  precio:       number;
  metodoPago:   string;
  reservaId:    string;
  baseUrl:      string;
}

export async function sendReservaRecibidaEmail(data: ReservaRecibidaEmailData) {
  const { toEmail, toName, canchaNombre, fecha, hora, precio, metodoPago, reservaId, baseUrl } = data;

  const apiKey    = process.env.API_KEY_BREVO;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName  = process.env.BREVO_FROM_NAME ?? 'CanchaGo';

  if (!apiKey || !fromEmail) return;

  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const linkReserva = `${baseUrl}/mi-reserva?id=${reservaId}`;
  const codigoCorto = reservaId.slice(-6).toUpperCase();

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#111827;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">⚽ CanchaGo</p>
            <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;">Sistema de reservas</p>
          </td>
        </tr>

        <!-- Estado -->
        <tr>
          <td style="padding:32px 32px 0;text-align:center;">
            <div style="display:inline-block;background:#fefce8;border:1px solid #ca8a0433;border-radius:12px;padding:16px 24px;">
              <p style="margin:0;font-size:32px;">⏳</p>
              <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#ca8a04;">Reserva recibida</p>
              <p style="margin:4px 0 0;font-size:13px;color:#92400e;">Pendiente de confirmación</p>
            </div>
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0;font-size:15px;color:#374151;">
              Hola <strong>${toName}</strong>, recibimos tu solicitud de reserva. 
              El administrador la revisará pronto y recibirás una actualización.
            </p>
          </td>
        </tr>

        <!-- Detalle reserva -->
        <tr>
          <td style="padding:20px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Cancha</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${canchaNombre}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Fecha</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;text-transform:capitalize;">${fechaLabel}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Hora</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${hora}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total pagado</p>
                  <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#111827;">S/ ${precio}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Método de pago</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;text-transform:capitalize;">${metodoPago}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Código de reserva -->
        <tr>
          <td style="padding:20px 32px 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#6b7280;">Código de tu reserva</p>
            <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#111827;letter-spacing:4px;">${codigoCorto}</p>
          </td>
        </tr>

        <!-- Botón ver reserva -->
        <tr>
          <td style="padding:24px 32px 0;text-align:center;">
            <a href="${linkReserva}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">
              Ver mi reserva
            </a>
            <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
              Desde este link puedes ver el estado y cancelar si lo necesitas
            </p>
          </td>
        </tr>

        <!-- Aviso cancelación -->
        <tr>
          <td style="padding:20px 32px 0;">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;">
              <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">⚠️ Política de cancelación</p>
              <p style="margin:6px 0 0;font-size:12px;color:#7f1d1d;line-height:1.6;">
                • Reserva pendiente: devolución completa<br/>
                • +4 horas antes: 85% devolución<br/>
                • 2-4 horas antes: 60% devolución<br/>
                • 1-2 horas antes: 30% devolución<br/>
                • Menos de 1 hora: sin devolución
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Este correo fue enviado automáticamente por CanchaGo.<br/>
              Por favor no respondas a este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'accept':       'application/json',
        'content-type': 'application/json',
        'api-key':      apiKey,
      },
      body: JSON.stringify({
        sender:      { name: fromName, email: fromEmail },
        to:          [{ email: toEmail, name: toName }],
        subject:     `⏳ Reserva recibida — ${canchaNombre}`,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[email] ❌ Error Brevo (recibida):', err);
    } else {
      console.log(`[email] ✅ Email recibida enviado a ${toEmail}`);
    }
  } catch (err: any) {
    console.error('[email] ❌ Error de red:', err?.message ?? err);
  }
}

export async function sendReservaEmail(data: ReservaEmailData) {
  const { toEmail, toName, canchaNombre, fecha, hora, precio, estado, reservaId, baseUrl } = data;

  const apiKey   = process.env.API_KEY_BREVO;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName  = process.env.BREVO_FROM_NAME ?? 'CanchaGo';

  if (!apiKey || !fromEmail) {
    console.error('[email] Faltan variables de entorno: API_KEY_BREVO o BREVO_FROM_EMAIL');
    return;
  }

  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const esConfirmada = estado === 'confirmada';
  const subject      = esConfirmada
    ? `✅ Reserva confirmada — ${canchaNombre}`
    : `❌ Reserva rechazada — ${canchaNombre}`;

  const colorEstado  = esConfirmada ? '#16a34a' : '#dc2626';
  const bgEstado     = esConfirmada ? '#f0fdf4' : '#fef2f2';
  const iconoEstado  = esConfirmada ? '✅' : '❌';
  const tituloEstado = esConfirmada ? '¡Tu reserva fue confirmada!' : 'Tu reserva fue rechazada';
  const mensajeExtra = esConfirmada
    ? 'Preséntate puntualmente en la cancha. ¡Que disfrutes el partido!'
    : 'Puedes intentar reservar otro horario disponible en nuestra plataforma.';

  const linkReserva = `${baseUrl}/mi-reserva?id=${reservaId}`;
  const codigoCorto = reservaId.slice(-6).toUpperCase();

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">⚽ CanchaGo</p>
              <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;">Sistema de reservas</p>
            </td>
          </tr>

          <!-- Estado -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <div style="display:inline-block;background:${bgEstado};border:1px solid ${colorEstado}33;border-radius:12px;padding:16px 24px;">
                <p style="margin:0;font-size:32px;">${iconoEstado}</p>
                <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:${colorEstado};">${tituloEstado}</p>
              </div>
            </td>
          </tr>

          <!-- Saludo -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0;font-size:15px;color:#374151;">
                Hola <strong>${toName}</strong>, te informamos que el estado de tu reserva ha sido actualizado.
              </p>
            </td>
          </tr>

          <!-- Detalle reserva -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Cancha</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${canchaNombre}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Fecha</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;text-transform:capitalize;">${fechaLabel}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Hora</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${hora}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total pagado</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#111827;">S/ ${precio}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Mensaje extra -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">${mensajeExtra}</p>
            </td>
          </tr>

          <!-- Código de reserva (solo si está confirmada) -->
          ${esConfirmada ? `
          <tr>
            <td style="padding:20px 32px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6b7280;">Código de tu reserva</p>
              <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#111827;letter-spacing:4px;">${codigoCorto}</p>
            </td>
          </tr>

          <!-- Botón ver reserva -->
          <tr>
            <td style="padding:24px 32px 0;text-align:center;">
              <a href="${linkReserva}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Ver mi reserva
              </a>
              <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
                Desde este link puedes ver el estado y cancelar si lo necesitas
              </p>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding:28px 32px;text-align:center;border-top:1px solid #f3f4f6;margin-top:24px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Este correo fue enviado automáticamente por CanchaGo.<br/>
                Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'accept':       'application/json',
        'content-type': 'application/json',
        'api-key':      apiKey,
      },
      body: JSON.stringify({
        sender:      { name: fromName, email: fromEmail },
        to:          [{ email: toEmail, name: toName }],
        subject,
        htmlContent,
      }),
    });

    const responseData = await res.json();

    if (!res.ok) {
      console.error('[email] ❌ Error Brevo:', res.status, JSON.stringify(responseData));
    } else {
      console.log(`[email] ✅ Enviado a ${toEmail} — estado: ${estado}`);
    }
  } catch (err: any) {
    console.error('[email] ❌ Error de red:', err?.message ?? err);
  }
}
