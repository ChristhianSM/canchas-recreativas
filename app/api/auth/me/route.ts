import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error } = await sb.auth.getUser(token);

  if (error || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: perfil } = await sb
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  return NextResponse.json(perfil);
}
