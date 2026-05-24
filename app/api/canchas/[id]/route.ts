import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString, addDaysToDateString } from '@/lib/date-utils';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  // Reservas activas (pendiente o confirmada) para los próximos 14 días
  const hoy = getLocalDateString();
  const en14 = addDaysToDateString(hoy, 14);

  const { data: reservas } = await sb
    .from('reservas')
    .select('fecha, hora, estado')
    .eq('cancha_id', id)
    .in('estado', ['pendiente', 'confirmada'])
    .gte('fecha', hoy)
    .lte('fecha', en14);

  // Construir mapa: "fecha|hora" → estado
  const ocupados: Record<string, 'reservado' | 'en_proceso'> = {};
  for (const r of reservas ?? []) {
    const key = `${r.fecha}|${r.hora}`;
    ocupados[key] = r.estado === 'confirmada' ? 'reservado' : 'en_proceso';
  }

  return NextResponse.json({
    ...data,
    horariosRestringidos: (horariosBloqueados ?? []).map(h => h.hora),
    horariosOcupados: ocupados,
  });
}
