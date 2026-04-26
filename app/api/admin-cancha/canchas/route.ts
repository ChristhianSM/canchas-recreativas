import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);

  console.log('[admin-cancha/canchas] token:', token?.slice(0, 20), '| user:', user?.id ?? 'NULL', '| error:', authError?.message ?? 'none');

  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  // Obtener IDs de canchas del dueño
  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const canchaIds = (relaciones ?? [])
    .map((r: any) => r.cancha_id)
    .filter((id: any) => id != null);
  if (!canchaIds.length) return NextResponse.json([]);

  const { data, error } = await sb
    .from('canchas')
    .select('*')
    .in('id', canchaIds);

  if (error) {
    console.error('[admin-cancha/canchas] Error:', error.message, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
