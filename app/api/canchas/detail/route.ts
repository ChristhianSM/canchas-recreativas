import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString, addDaysToDateString } from '@/lib/date-utils';
import { horasBloqueadasEnFecha, BloqueoAdmin, getHorasOperacion } from '@/lib/bloqueos-utils';

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

  const hoy  = getLocalDateString();
  const en30 = addDaysToDateString(hoy, 30);

  // Todas las queries secundarias en paralelo
  const [
    { data: horariosBloqueados },
    { data: bloqueosAdmin },
    { data: reservas },
    { data: bloqueosTmp },
    { data: loyaltyConfig },
  ] = await Promise.all([
    sb.from('horarios_bloqueados').select('hora').eq('cancha_id', id),
    sb.from('bloqueos_admin').select('*').eq('cancha_id', id),
    sb.from('reservas')
      .select('fecha, hora, estado')
      .eq('cancha_id', id)
      .in('estado', ['pendiente', 'confirmada'])
      .gte('fecha', hoy)
      .lte('fecha', en30),
    sb.from('bloqueos_temporales')
      .select('fecha, hora')
      .eq('cancha_id', id)
      .gt('expira_en', new Date().toISOString()),
    sb.from('cancha_loyalty_config')
      .select('umbral, premio_tipo, premio_valor, premio_descripcion')
      .eq('cancha_id', id)
      .eq('activo', true)
      .maybeSingle(),
  ]);

  // Horarios permanentes (legacy)
  const permanentesLegacy = (horariosBloqueados ?? []).map((h: any) => h.hora as string);

  // Mapa "fecha|hora" → estado
  const horariosOcupados: Record<string, 'reservado' | 'en_proceso'> = {};

  for (const r of reservas ?? []) {
    const key = `${r.fecha}|${r.hora}`;
    horariosOcupados[key] = r.estado === 'confirmada' ? 'reservado' : 'en_proceso';
  }

  for (const b of bloqueosTmp ?? []) {
    const key = `${b.fecha}|${b.hora}`;
    if (!horariosOcupados[key]) horariosOcupados[key] = 'en_proceso';
  }

  if ((bloqueosAdmin ?? []).length > 0) {
    for (let i = 0; i < 30; i++) {
      const fecha = addDaysToDateString(hoy, i);
      const horasBloq = horasBloqueadasEnFecha(bloqueosAdmin as BloqueoAdmin[], fecha);
      for (const hora of horasBloq) {
        const key = `${fecha}|${hora}`;
        if (!horariosOcupados[key]) horariosOcupados[key] = 'reservado';
      }
    }
  }

  const horasOperacion = getHorasOperacion(data.hora_apertura ?? '06:00', data.hora_cierre ?? '23:00');

  return NextResponse.json({
    ...data,
    horariosRestringidos: permanentesLegacy,
    horariosOcupados,
    horasOperacion,
    loyalty: loyaltyConfig ?? null,
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
