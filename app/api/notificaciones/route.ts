import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json([]);

  const sb = createServiceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json([]);

  const { data } = await sb
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await req.json();
  const sb = createServiceClient();

  await sb.from('notificaciones').update({ leida: true }).eq('id', id);
  return NextResponse.json({ ok: true });
}
