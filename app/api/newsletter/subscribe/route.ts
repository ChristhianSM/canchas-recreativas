import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendNewsletterWelcomeEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 5, windowMs: 60 * 1000 });
  if (limited) return limited;

  let email: string | undefined;
  try {
    const body = await req.json();
    email = body.email;
  } catch {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const sb = createServiceClient();

  const { data: existing } = await sb
    .from('suscriptores')
    .select('id, activo')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existing) {
    if (existing.activo) {
      return NextResponse.json({ status: 'ya_suscrito' });
    }
    // Estaba desuscrito → reactivar
    await sb
      .from('suscriptores')
      .update({ activo: true })
      .eq('id', existing.id);

    const baseUrl = req.headers.get('origin') ?? 'https://canchago.pe';
    await sendNewsletterWelcomeEmail(
      email.toLowerCase(),
      `${baseUrl}/newsletter/desuscribir?token=${existing.id}`,
    );
    return NextResponse.json({ status: 'reactivado' });
  }

  const { data: nuevo, error } = await sb
    .from('suscriptores')
    .insert({ email: email.toLowerCase() })
    .select('id')
    .single();

  if (error || !nuevo) {
    console.error('[newsletter] Error al insertar suscriptor:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  const baseUrl = req.headers.get('origin') ?? 'https://canchago.pe';
  await sendNewsletterWelcomeEmail(
    email.toLowerCase(),
    `${baseUrl}/newsletter/desuscribir?token=${nuevo.id}`,
  );

  return NextResponse.json({ status: 'suscrito' });
}
