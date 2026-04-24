import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json([]);

  const sb = createServiceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json([]);

  const { data } = await sb
    .from('horarios_bloqueados')
    .select('hora')
    .eq('cancha_id', params.id);

  return NextResponse.json(data ?? []);
}
