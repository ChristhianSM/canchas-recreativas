import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString, addDaysToDateString } from '@/lib/date-utils';
import { horasBloqueadasEnFecha, BloqueoAdmin, getHorasOperacion } from '@/lib/bloqueos-utils';

// GET — listar todas las canchas activas con horarios ocupados
export async function GET(req: NextRequest) {
  const sb = createServiceClient();
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  let query = sb.from('canchas').select('*').eq('activa', true).order('destacada', { ascending: false });
  if (tipo) query = query.eq('tipo', tipo);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Obtener horarios ocupados para los próximos 30 días
  const hoy = getLocalDateString();
  const en14 = addDaysToDateString(hoy, 30);

  const { data: reservas } = await sb
    .from('reservas')
    .select('cancha_id, fecha, hora, estado, seccion_id')
    .in('estado', ['pendiente', 'confirmada'])
    .gte('fecha', hoy)
    .lte('fecha', en14);

  // Bloqueos temporales activos (no expirados) — sin DELETE para no hacer writes en cada lectura
  const { data: bloqueos } = await sb
    .from('bloqueos_temporales')
    .select('cancha_id, fecha, hora, seccion_id')
    .gt('expira_en', new Date().toISOString());

  // Horarios bloqueados por dueño (legacy)
  const { data: horariosBloqueados } = await sb
    .from('horarios_bloqueados')
    .select('cancha_id, hora');

  // Bloqueos admin (fecha específica + recurrente + permanente)
  const { data: bloqueosAdmin } = await sb
    .from('bloqueos_admin')
    .select('*');

  // Secciones por cancha — datos completos (precio incluido) para poder calcular
  // en el frontend el precio más bajo disponible entre secciones
  const { data: seccionesData } = await sb
    .from('cancha_secciones')
    .select('id, cancha_id, nombre, precio_por_hora, precios_por_hora, precios_por_dia, orden')
    .eq('activa', true)
    .order('orden', { ascending: true });

  // canchaId → Set de IDs de secciones activas
  const seccionIdsPorCancha: Record<string, Set<string>> = {};
  const seccionesPorCancha: Record<string, number> = {};
  const seccionesFullPorCancha: Record<string, typeof seccionesData> = {};
  for (const s of seccionesData ?? []) {
    if (!seccionIdsPorCancha[s.cancha_id]) seccionIdsPorCancha[s.cancha_id] = new Set();
    seccionIdsPorCancha[s.cancha_id].add(s.id);
    seccionesPorCancha[s.cancha_id] = (seccionesPorCancha[s.cancha_id] ?? 0) + 1;
    if (!seccionesFullPorCancha[s.cancha_id]) seccionesFullPorCancha[s.cancha_id] = [];
    seccionesFullPorCancha[s.cancha_id]!.push(s);
  }

  // Construir mapa de horarios ocupados por cancha
  const horariosOcupadosPorCancha: Record<string, Record<string, 'reservado' | 'en_proceso'>> = {};

  // Para canchas con secciones: rastrear qué secciones están reservadas por slot
  // canchaId → slotKey → Set<seccionId>
  const seccionesReservadasEnSlot: Record<string, Record<string, Set<string>>> = {};

  const marcarOcupado = (canchaId: string, key: string, estado: 'reservado' | 'en_proceso') => {
    if (!horariosOcupadosPorCancha[canchaId]) horariosOcupadosPorCancha[canchaId] = {};
    // No sobreescribir 'reservado' con 'en_proceso'
    if (!horariosOcupadosPorCancha[canchaId][key] || estado === 'reservado') {
      horariosOcupadosPorCancha[canchaId][key] = estado;
    }
  };

  // Procesar reservas
  for (const r of reservas ?? []) {
    const key = `${r.fecha}|${r.hora}`;
    const tieneSecciones = (seccionIdsPorCancha[r.cancha_id]?.size ?? 0) > 0;

    if (tieneSecciones && r.seccion_id) {
      // Reserva de sección específica: acumular pero no bloquear el slot todavía
      if (!seccionesReservadasEnSlot[r.cancha_id]) seccionesReservadasEnSlot[r.cancha_id] = {};
      if (!seccionesReservadasEnSlot[r.cancha_id][key]) seccionesReservadasEnSlot[r.cancha_id][key] = new Set();
      seccionesReservadasEnSlot[r.cancha_id][key].add(r.seccion_id);
    } else {
      // Reserva de cancha completa (o cancha sin secciones): bloquear directamente
      marcarOcupado(r.cancha_id, key, r.estado === 'confirmada' ? 'reservado' : 'en_proceso');
    }
  }

  // Evaluar si todas las secciones están reservadas en algún slot
  for (const [canchaId, slots] of Object.entries(seccionesReservadasEnSlot)) {
    const todasLasSecciones = seccionIdsPorCancha[canchaId];
    if (!todasLasSecciones || todasLasSecciones.size === 0) continue;
    for (const [slotKey, reservadas] of Object.entries(slots)) {
      const todasReservadas = [...todasLasSecciones].every(id => reservadas.has(id));
      if (todasReservadas) marcarOcupado(canchaId, slotKey, 'reservado');
    }
  }

  // Procesar bloqueos temporales (misma lógica de secciones)
  const seccionesBloqueoEnSlot: Record<string, Record<string, Set<string>>> = {};
  for (const b of bloqueos ?? []) {
    const key = `${b.fecha}|${b.hora}`;
    const tieneSecciones = (seccionIdsPorCancha[b.cancha_id]?.size ?? 0) > 0;

    if (tieneSecciones && b.seccion_id) {
      if (!seccionesBloqueoEnSlot[b.cancha_id]) seccionesBloqueoEnSlot[b.cancha_id] = {};
      if (!seccionesBloqueoEnSlot[b.cancha_id][key]) seccionesBloqueoEnSlot[b.cancha_id][key] = new Set();
      seccionesBloqueoEnSlot[b.cancha_id][key].add(b.seccion_id);
    } else {
      marcarOcupado(b.cancha_id, key, 'en_proceso');
    }
  }

  for (const [canchaId, slots] of Object.entries(seccionesBloqueoEnSlot)) {
    const todasLasSecciones = seccionIdsPorCancha[canchaId];
    if (!todasLasSecciones || todasLasSecciones.size === 0) continue;
    for (const [slotKey, bloqueadas] of Object.entries(slots)) {
      const todasBloqueadas = [...todasLasSecciones].every(id => bloqueadas.has(id));
      if (todasBloqueadas) marcarOcupado(canchaId, slotKey, 'en_proceso');
    }
  }

  // Mapa combinado (reservas + bloqueos temporales) de qué secciones están
  // ocupadas en cada slot, por cancha — para que el frontend pueda calcular
  // el precio más bajo entre las secciones que sigan libres.
  const seccionesOcupadasPorCancha: Record<string, Record<string, string[]>> = {};
  for (const fuente of [seccionesReservadasEnSlot, seccionesBloqueoEnSlot]) {
    for (const [canchaId, slots] of Object.entries(fuente)) {
      if (!seccionesOcupadasPorCancha[canchaId]) seccionesOcupadasPorCancha[canchaId] = {};
      for (const [slotKey, ids] of Object.entries(slots)) {
        const acumulado = new Set(seccionesOcupadasPorCancha[canchaId][slotKey] ?? []);
        for (const id of ids) acumulado.add(id);
        seccionesOcupadasPorCancha[canchaId][slotKey] = [...acumulado];
      }
    }
  }

  // Procesar bloqueos admin por cancha para los próximos 14 días
  if ((bloqueosAdmin ?? []).length > 0) {
    // Agrupar bloqueos por cancha
    const bloqueosPorCancha: Record<string, BloqueoAdmin[]> = {};
    for (const b of bloqueosAdmin ?? []) {
      if (!bloqueosPorCancha[b.cancha_id]) bloqueosPorCancha[b.cancha_id] = [];
      bloqueosPorCancha[b.cancha_id].push(b as BloqueoAdmin);
    }

    // Para cada cancha con bloqueos admin, marcar los slots bloqueados
    for (const [canchaId, bloqueos] of Object.entries(bloqueosPorCancha)) {
      if (!horariosOcupadosPorCancha[canchaId]) {
        horariosOcupadosPorCancha[canchaId] = {};
      }
      for (let i = 0; i < 14; i++) {
        const fecha = addDaysToDateString(hoy, i);
        const horasBloq = horasBloqueadasEnFecha(bloqueos, fecha);
        for (const hora of horasBloq) {
          const key = `${fecha}|${hora}`;
          if (!horariosOcupadosPorCancha[canchaId][key]) {
            horariosOcupadosPorCancha[canchaId][key] = 'reservado';
          }
        }
      }
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
    horasOperacion: getHorasOperacion(cancha.hora_apertura ?? '06:00', cancha.hora_cierre ?? '23:00'),
    total_secciones: seccionesPorCancha[cancha.id] ?? 0,
    secciones: seccionesFullPorCancha[cancha.id] ?? [],
    seccionesOcupadas: seccionesOcupadasPorCancha[cancha.id] ?? {},
  }));

  return NextResponse.json(canchasConHorarios, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
    },
  });
}
