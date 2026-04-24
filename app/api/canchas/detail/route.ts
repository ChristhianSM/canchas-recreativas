import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/canchas/detail?id=xxx
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const sb = createServiceClient();

  const { data, error } = await sb
    .from('canchas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });

  // Horarios bloqueados por el dueño
  const { data: horariosBloqueados } = await sb
    .from('horarios_bloqueados')
    .select('hora')
    .eq('cancha_id', id);

  // Reservas activas para los próximos 14 días
  const hoy = new Date().toISOString().split('T')[0];
  const en14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: reservas } = await sb
    .from('reservas')
    .select('fecha, hora, estado')
    .eq('cancha_id', id)
    .in('estado', ['pendiente', 'confirmada'])
    .gte('fecha', hoy)
    .lte('fecha', en14);

  // Bloqueos temporales activos (no expirados)
  await sb.from('bloqueos_temporales').delete().lt('expira_en', new Date().toISOString());
  const { data: bloqueos } = await sb
    .from('bloqueos_temporales')
    .select('fecha, hora')
    .eq('cancha_id', id);

  // Mapa "fecha|hora" → estado
  const horariosOcupados: Record<string, 'reservado' | 'en_proceso'> = {};
  for (const r of reservas ?? []) {
    const key = `${r.fecha}|${r.hora}`;
    horariosOcupados[key] = r.estado === 'confirmada' ? 'reservado' : 'en_proceso';
  }
  // Bloqueos temporales aparecen como "en_proceso"
  for (const b of bloqueos ?? []) {
    const key = `${b.fecha}|${b.hora}`;
    if (!horariosOcupados[key]) horariosOcupados[key] = 'en_proceso';
  }

  return NextResponse.json({
    ...data,
    horariosRestringidos: (horariosBloqueados ?? []).map((h: any) => h.hora),
    horariosOcupados,
  });
}
