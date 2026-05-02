import { NextRequest, NextResponse } from 'next/server';

// GET /api/debug-email?to=tu@correo.com
// Solo para pruebas — eliminar en producción
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to');
  if (!to) {
    return NextResponse.json({ error: 'Falta el parámetro ?to=email' }, { status: 400 });
  }

  const apiKey = process.env.API_KEY_BREVO;
  const fromEmail = process.env.BREVO_FROM_EMAIL;

  console.log('[debug-email] API_KEY_BREVO presente:', !!apiKey);
  console.log('[debug-email] BREVO_FROM_EMAIL:', fromEmail);

  if (!apiKey) {
    return NextResponse.json({ error: 'API_KEY_BREVO no está definida' }, { status: 500 });
  }
  if (!fromEmail) {
    return NextResponse.json({ error: 'BREVO_FROM_EMAIL no está definida' }, { status: 500 });
  }

  // Llamada directa a la API REST de Brevo (sin SDK)
  const body = {
    sender:      { name: 'CanchaGo', email: fromEmail },
    to:          [{ email: to, name: 'Usuario Test' }],
    subject:     '✅ Test de email — CanchaGo',
    htmlContent: '<h1>Test funcionando</h1><p>Si ves esto, el email llegó correctamente.</p>',
  };

  console.log('[debug-email] Enviando a Brevo REST API...');
  console.log('[debug-email] Body:', JSON.stringify(body));

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: {
      'accept':       'application/json',
      'content-type': 'application/json',
      'api-key':      apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log('[debug-email] Respuesta Brevo status:', res.status);
  console.log('[debug-email] Respuesta Brevo body:', JSON.stringify(data));

  if (!res.ok) {
    return NextResponse.json({ ok: false, status: res.status, brevo: data }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: res.status, brevo: data });
}
