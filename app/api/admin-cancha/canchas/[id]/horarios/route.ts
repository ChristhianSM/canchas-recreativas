import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';

// GET — obtener horarios bloqueados de una cancha
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data } = await sb
    .from('horarios_bloqueados')
    .select('hora')
    .eq('cancha_id', params.id);

  return NextResponse.json(data ?? []);
}
