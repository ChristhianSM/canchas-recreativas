import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json([]);

  const { id } = await params;
  const sb = createServiceClient();
  const { data } = await sb
    .from('horarios_bloqueados')
    .select('hora')
    .eq('cancha_id', id);

  return NextResponse.json(data ?? []);
}
