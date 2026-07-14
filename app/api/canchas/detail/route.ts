import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString, addDaysToDateString } from '@/lib/date-utils';
import { horasBloqueadasEnFecha, BloqueoAdmin, getHorasOperacion } from '@/lib/bloqueos-utils';

// GET /api/canchas/detail?id=xxx
// GET /api/canchas/detail?id=xxx&seccionId=yyy  → horarios filtrados para esa sección
export async function GET(req: NextRequest) {
  const id        = req.nextUrl.searchParams.get('id');
  const seccionId = req.nextUrl.searchParams.get('seccionId'); // null = cancha completa
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
    { data: todasReservas },
    { data: todosBloqueosTmp },
    { data: loyaltyConfig },
    { data: secciones },
  ] = await Promise.all([
    sb.from('horarios_bloqueados').select('hora').eq('cancha_id', id),
    sb.from('bloqueos_admin').select('*').eq('cancha_id', id),
    sb.from('reservas')
      .select('fecha, hora, estado, seccion_id')
      .eq('cancha_id', id)
      .in('estado', ['pendiente', 'confirmada'])
      .gte('fecha', hoy)
      .lte('fecha', en30),
    sb.from('bloqueos_temporales')
      .select('fecha, hora, seccion_id')
      .eq('cancha_id', id)
      .gt('expira_en', new Date().toISOString()),
    sb.from('cancha_loyalty_config')
      .select('umbral, premio_tipo, premio_valor, premio_descripcion')
      .eq('cancha_id', id)
      .eq('activo', true)
      .maybeSingle(),
    sb.from('cancha_secciones')
      .select('*')
      .eq('cancha_id', id)
      .eq('activa', true)
      .order('orden', { ascending: true }),
  ]);

  const permanentesLegacy = (horariosBloqueados ?? []).map((h: any) => h.hora as string);
  const tieneSecciones = (secciones ?? []).length > 0;

  // Construir mapa de ocupación según el contexto:
  // - Si hay secciones y se pide una sección específica → bloqueado si: reserva completa O reserva de esa sección
  // - Si hay secciones y se pide la cancha completa (seccionId=null) → bloqueado si: cualquier reserva
  // - Si no hay secciones → comportamiento original
  const horariosOcupados: Record<string, 'reservado' | 'en_proceso'> = {};

  for (const r of todasReservas ?? []) {
    const key = `${r.fecha}|${r.hora}`;
    const estado = r.estado === 'confirmada' ? 'reservado' : 'en_proceso';

    if (!tieneSecciones) {
      // Sin secciones: cualquier reserva bloquea el slot (comportamiento original)
      horariosOcupados[key] = estado;
    } else if (seccionId) {
      // Con secciones, vista de una sección: bloquea si reserva completa (sin seccion_id) O de esta sección
      if (r.seccion_id === null || r.seccion_id === seccionId) {
        horariosOcupados[key] = estado;
      }
    } else {
      // Con secciones, vista de cancha completa: bloquea si cualquier reserva existe
      horariosOcupados[key] = estado;
    }
  }

  for (const b of todosBloqueosTmp ?? []) {
    const key = `${b.fecha}|${b.hora}`;
    if (horariosOcupados[key]) continue;

    if (!tieneSecciones) {
      horariosOcupados[key] = 'en_proceso';
    } else if (seccionId) {
      if (b.seccion_id === null || b.seccion_id === seccionId) {
        horariosOcupados[key] = 'en_proceso';
      }
    } else {
      horariosOcupados[key] = 'en_proceso';
    }
  }

  // Slots bloqueados por el admin (aplican a la cancha completa y a todas sus secciones)
  const horariosBloqueadosAdmin = new Set<string>();
  if ((bloqueosAdmin ?? []).length > 0) {
    for (let i = 0; i < 30; i++) {
      const fecha = addDaysToDateString(hoy, i);
      const horasBloq = horasBloqueadasEnFecha(bloqueosAdmin as BloqueoAdmin[], fecha);
      for (const hora of horasBloq) {
        const key = `${fecha}|${hora}`;
        if (!horariosOcupados[key]) horariosOcupados[key] = 'reservado';
        horariosBloqueadosAdmin.add(key);
      }
    }
  }

  // Mapa de qué secciones específicas están ocupadas en cada slot — permite elegir
  // automáticamente una sección disponible (ej. desde el listado) sin pedir por cada una.
  const seccionesOcupadas: Record<string, string[]> = {};
  if (tieneSecciones) {
    const todosLosIds = (secciones ?? []).map((s) => s.id);
    const marcarSeccion = (key: string, ids: string[]) => {
      const acumulado = new Set(seccionesOcupadas[key] ?? []);
      for (const sid of ids) acumulado.add(sid);
      seccionesOcupadas[key] = [...acumulado];
    };
    for (const r of todasReservas ?? []) {
      const key = `${r.fecha}|${r.hora}`;
      marcarSeccion(key, r.seccion_id ? [r.seccion_id] : todosLosIds);
    }
    for (const b of todosBloqueosTmp ?? []) {
      const key = `${b.fecha}|${b.hora}`;
      marcarSeccion(key, b.seccion_id ? [b.seccion_id] : todosLosIds);
    }
  }

  const horasOperacion = getHorasOperacion(data.hora_apertura ?? '06:00', data.hora_cierre ?? '23:00');

  return NextResponse.json({
    ...data,
    horariosRestringidos: permanentesLegacy,
    horariosOcupados,
    horasOperacion,
    loyalty:   loyaltyConfig ?? null,
    secciones: secciones ?? [],
    seccionesOcupadas,
    horariosBloqueadosAdmin: [...horariosBloqueadosAdmin],
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
