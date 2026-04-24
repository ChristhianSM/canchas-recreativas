import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { nombre, email, password, telefono } = await req.json();
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
