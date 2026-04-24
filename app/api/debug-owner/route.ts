import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Sin token' });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  
  if (authError || !user) return NextResponse.json({ error: 'Token inválido', authError });

  const { data: perfil } = await sb.from('usuarios').select('*').eq('id', user.id).single();
  const { data: relaciones } = await sb.from('duenos_canchas').select('*').eq('usuario_id', user.id);

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    perfil,
    relaciones,
  });
}
