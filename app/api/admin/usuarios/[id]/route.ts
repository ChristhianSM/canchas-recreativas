import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// DELETE — eliminar usuario dueño
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createServiceClient();

  // 1. Eliminar asignaciones de canchas
  await sb.from('duenos_canchas').delete().eq('usuario_id', id);

  // 2. Eliminar loyalty
  await sb.from('loyalty').delete().eq('usuario_id', id);

  // 3. Eliminar cupones
  await sb.from('cupones').delete().eq('usuario_id', id);

  // 4. Eliminar notificaciones
  await sb.from('notificaciones').delete().eq('usuario_id', id);

  // 5. Eliminar de tabla usuarios
  await sb.from('usuarios').delete().eq('id', id);

  // 6. Eliminar de auth.users (requiere service role)
  const { error } = await sb.auth.admin.deleteUser(id);
  if (error) {
    console.error('[delete-usuario] Error auth:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
