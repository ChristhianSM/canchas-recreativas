import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString, addDaysToDateString } from '@/lib/date-utils';

// GET — listar todas las canchas activas con horarios ocupados
export async function GET(req: NextRequest) {
  const sb = createServiceClient();
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  let query = sb.from('canchas').select('*').eq('activa', true).order('destacada', { ascending: false });
  if (tipo) query = query.eq('tipo', tipo);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Obtener horarios ocupados para los próximos 14 días
  const hoy = getLocalDateString();
  const en14 = addDaysToDateString(hoy, 14);

  const { data: reservas } = await sb
    .from('reservas')
    .select('cancha_id, fecha, hora, estado')
    .in('estado', ['pendiente', 'confirmada'])
    .gte('fecha', hoy)
    .lte('fecha', en14);

  // Bloqueos temporales activos (no expirados)
  await sb.from('bloqueos_temporales').delete().lt('expira_en', new Date().toISOString());
  const { data: bloqueos } = await sb
    .from('bloqueos_temporales')
    .select('cancha_id, fecha, hora');

  // Horarios bloqueados por dueño
  const { data: horariosBloqueados } = await sb
    .from('horarios_bloqueados')
    .select('cancha_id, hora');

  // Construir mapa de horarios ocupados por cancha
  const horariosOcupadosPorCancha: Record<string, Record<string, 'reservado' | 'en_proceso'>> = {};

  // Procesar reservas
  for (const r of reservas ?? []) {
    const key = `${r.fecha}|${r.hora}`;
    if (!horariosOcupadosPorCancha[r.cancha_id]) {
      horariosOcupadosPorCancha[r.cancha_id] = {};
    }
    horariosOcupadosPorCancha[r.cancha_id][key] = r.estado === 'confirmada' ? 'reservado' : 'en_proceso';
  }

  // Procesar bloqueos temporales
  for (const b of bloqueos ?? []) {
    const key = `${b.fecha}|${b.hora}`;
    if (!horariosOcupadosPorCancha[b.cancha_id]) {
      horariosOcupadosPorCancha[b.cancha_id] = {};
    }
    if (!horariosOcupadosPorCancha[b.cancha_id][key]) {
      horariosOcupadosPorCancha[b.cancha_id][key] = 'en_proceso';
    }
  }

  // Construir mapa de horarios bloqueados por cancha
  const horariosRestringidosPorCancha: Record<string, string[]> = {};
  for (const h of horariosBloqueados ?? []) {
    if (!horariosRestringidosPorCancha[h.cancha_id]) {
      horariosRestringidosPorCancha[h.cancha_id] = [];
    }
    horariosRestringidosPorCancha[h.cancha_id].push(h.hora);
  }

  // Agregar horarios a cada cancha
  const canchasConHorarios = (data ?? []).map(cancha => ({
    ...cancha,
    horariosOcupados: horariosOcupadosPorCancha[cancha.id] || {},
    horariosRestringidos: horariosRestringidosPorCancha[cancha.id] || [],
  }));

  return NextResponse.json(canchasConHorarios);
}
