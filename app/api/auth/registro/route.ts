import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const { nombre, email, password, telefono } = await req.json();

  if (!nombre || nombre.trim().length < 6)
    return NextResponse.json({ error: 'El nombre debe tener al menos 6 caracteres' }, { status: 400 });

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: 'Ingresa un correo válido' }, { status: 400 });

  if (!telefono || !/^9\d{8}$/.test(telefono))
    return NextResponse.json({ error: 'El teléfono debe comenzar con 9 y tener 9 dígitos' }, { status: 400 });

  if (!password || password.length < 6)
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

  if (!/[A-Z]/.test(password))
    return NextResponse.json({ error: 'La contraseña debe contener al menos una mayúscula' }, { status: 400 });

  const sb = createServiceClient();

  // Crear usuario en Supabase Auth con metadata
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, telefono },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Guardar perfil en tabla usuarios
  const { error: profileError } = await sb
    .from('usuarios')
    .insert({ id: authData.user.id, nombre, email, telefono, rol: 'usuario' });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Crear registro de loyalty vacío
  await sb.from('loyalty').insert({ usuario_id: authData.user.id, sellos: 0, total_reservas: 0 });

  return NextResponse.json({ ok: true });
}
