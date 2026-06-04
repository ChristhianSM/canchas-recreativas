import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ sellos: 0, total_reservas: 0, cupones: [], historial: [] });

  const sb = createServiceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json({ sellos: 0, total_reservas: 0, cupones: [], historial: [] });

  const [{ data: loyaltyRows }, { data: cupones }, { data: historial }] = await Promise.all([
    sb.from('loyalty').select('*').eq('usuario_id', user.id).order('sellos', { ascending: false }).limit(1),
    sb.from('cupones').select('*').eq('usuario_id', user.id).order('generado_en', { ascending: false }),
    sb.from('loyalty_historial').select('*').eq('usuario_id', user.id).order('creado_en', { ascending: false }).limit(20),
  ]);
  const loyalty = loyaltyRows?.[0] ?? null;

  return NextResponse.json({
    sellos:         loyalty?.sellos ?? 0,
    total_reservas: loyalty?.total_reservas ?? 0,
    cupones:        cupones ?? [],
    historial:      historial ?? [],
  });
}
