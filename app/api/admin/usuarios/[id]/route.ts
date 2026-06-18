import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const sb = createServiceClient();

  // 1. Eliminar asignaciones de canchas
  await sb.from('duenos_canchas').delete().eq('usuario_id', id);

  // 2. Eliminar loyalty
  await sb.from('loyalty').delete().eq('usuario_id', id);

  // 3. Eliminar notificaciones
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
