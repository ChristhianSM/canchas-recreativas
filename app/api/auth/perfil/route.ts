import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// PATCH — actualizar nombre y teléfono del usuario
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { nombre, telefono } = await req.json();

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  }

  // Actualizar en la tabla usuarios
  const { error: updateError } = await sb
    .from('usuarios')
    .update({
      nombre: nombre.trim(),
      telefono: telefono?.trim() || null,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error al actualizar perfil:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // También actualizar en user_metadata de Supabase Auth
  await sb.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      nombre: nombre.trim(),
      telefono: telefono?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true, nombre: nombre.trim(), telefono: telefono?.trim() || '' });
}
