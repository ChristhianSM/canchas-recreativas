import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST — asignar o reasignar dueño a una cancha
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { dueno_id } = await req.json();
  const sb = createServiceClient();

  // Eliminar asignación anterior
  await sb.from('duenos_canchas').delete().eq('cancha_id', params.id);

  // Asignar nuevo dueño si se especificó
  if (dueno_id) {
    const { error } = await sb.from('duenos_canchas').insert({
      cancha_id:  params.id,
      usuario_id: dueno_id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
