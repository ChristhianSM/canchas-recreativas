import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ sellos: 0, total_reservas: 0, cupones: [] });

  const sb = createServiceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json({ sellos: 0, total_reservas: 0, cupones: [] });

  const { data: loyalty } = await sb
    .from('loyalty')
    .select('*')
    .eq('usuario_id', user.id)
    .single();

  const { data: cupones } = await sb
    .from('cupones')
    .select('*')
    .eq('usuario_id', user.id)
    .order('generado_en', { ascending: false });

  return NextResponse.json({
    sellos:         loyalty?.sellos ?? 0,
    total_reservas: loyalty?.total_reservas ?? 0,
    cupones:        cupones ?? [],
  });
}
