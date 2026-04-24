import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
  }

  // Intentar obtener nombre de user_metadata primero
  let nombre = data.user.user_metadata?.nombre ?? '';
  let telefono = data.user.user_metadata?.telefono ?? '';

  // Si no está en user_metadata, obtener de la tabla usuarios
  if (!nombre) {
    const sb = createServiceClient();
    const { data: perfil } = await sb
      .from('usuarios')
      .select('nombre, telefono')
      .eq('id', data.user.id)
      .single();
    
    if (perfil) {
      nombre = perfil.nombre;
      telefono = perfil.telefono ?? '';
    }
  }

  return NextResponse.json({
    token: data.session.access_token,
    user: {
      id:       data.user.id,
      email:    data.user.email,
      name:     nombre,
      phone:    telefono,
    },
  });
}
