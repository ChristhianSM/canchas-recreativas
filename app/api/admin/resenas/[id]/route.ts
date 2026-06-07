import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const sb = createServiceClient();

  // Obtener cancha_id antes de eliminar para recalcular rating
  const { data: resena } = await sb
    .from('resenas')
    .select('cancha_id')
    .eq('id', id)
    .single();

  if (!resena) return NextResponse.json({ error: 'Reseña no encontrada' }, { status: 404 });

  const { error } = await sb.from('resenas').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalcular rating de la cancha
  const { data: restantes } = await sb
    .from('resenas')
    .select('estrellas')
    .eq('cancha_id', resena.cancha_id);

  const total = restantes?.length ?? 0;
  const rating = total > 0
    ? Math.round((restantes!.reduce((s, r) => s + r.estrellas, 0) / total) * 10) / 10
    : 0;

  await sb.from('canchas').update({ rating, total_resenas: total }).eq('id', resena.cancha_id);

  return NextResponse.json({ ok: true });
}
