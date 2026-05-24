import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { dueno_id, cancha_ids } = await req.json();

  if (!dueno_id || !Array.isArray(cancha_ids) || cancha_ids.length === 0) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const sb = createServiceClient();

  // Insertar cada asignación
  const inserts = cancha_ids.map((cancha_id: string) => ({
    cancha_id,
    usuario_id: dueno_id,
  }));

  // Primero eliminar asignaciones previas de esas canchas
  await sb.from('duenos_canchas')
    .delete()
    .in('cancha_id', cancha_ids);

  const { error } = await sb.from('duenos_canchas').insert(inserts);

  if (error) {
    console.error('[asignar-cancha] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
