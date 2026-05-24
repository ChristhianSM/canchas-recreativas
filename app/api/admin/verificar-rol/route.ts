import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyAdmin(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: usuario } = await sb
    .from('usuarios')
    .select('nombre')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ esAdmin: true, nombre: usuario?.nombre ?? '' });
}
