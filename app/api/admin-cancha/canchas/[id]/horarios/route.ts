import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — obtener horarios bloqueados de una cancha
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data } = await sb
    .from('horarios_bloqueados')
    .select('hora')
    .eq('cancha_id', params.id);

  return NextResponse.json(data ?? []);
}
