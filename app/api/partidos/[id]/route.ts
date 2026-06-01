import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// PATCH — cancelar partido (solo el organizador)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: partido } = await sb
    .from('partidos')
    .select('organizador_id, estado')
    .eq('id', id)
    .single();

  if (!partido) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
  if (partido.organizador_id !== user.id) {
    return NextResponse.json({ error: 'Solo el organizador puede cancelar el partido' }, { status: 403 });
  }
  if (partido.estado === 'cancelado' || partido.estado === 'finalizado') {
    return NextResponse.json({ error: 'El partido ya está cancelado o finalizado' }, { status: 409 });
  }

  const { error } = await sb
    .from('partidos')
    .update({ estado: 'cancelado' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
