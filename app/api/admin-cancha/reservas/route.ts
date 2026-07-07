import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';

// GET — reservas de las canchas del dueño autenticado
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();

  // Obtener todas las canchas del dueño (sin filtro doble)
  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const canchaIds = (relaciones ?? [])
    .map((r: any) => r.cancha_id)
    .filter((id: any) => id != null);
  if (!canchaIds.length) return NextResponse.json([]);

  const { data, error } = await sb
    .from('reservas')
    .select('*, seccion:cancha_secciones!seccion_id(nombre)')
    .in('cancha_id', canchaIds)
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('[admin-cancha/reservas] Error:', error.message, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
