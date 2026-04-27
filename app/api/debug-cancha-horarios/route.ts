import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString, addDaysToDateString } from '@/lib/date-utils';

// GET — debug: obtener horarios ocupados de una cancha específica
export async function GET(req: NextRequest) {
  const sb = createServiceClient();
  const { searchParams } = new URL(req.url);
  const canchaId = searchParams.get('cancha_id') || 'a1b2c3d4-0004-0004-0004-000000000004'; // Piura Basketball Club

  try {
    // Obtener información de la cancha
    const { data: cancha, error: canchaError } = await sb
      .from('canchas')
      .select('*')
      .eq('id', canchaId)
      .single();

    if (canchaError) {
      return NextResponse.json({ error: canchaError.message }, { status: 500 });
    }

    // Obtener horarios ocupados para los próximos 14 días
    const hoy = getLocalDateString();
    const en14 = addDaysToDateString(hoy, 14);

    const { data: reservas } = await sb
      .from('reservas')
      .select('cancha_id, fecha, hora, estado')
      .eq('cancha_id', canchaId)
      .in('estado', ['pendiente', 'confirmada'])
      .gte('fecha', hoy)
      .lte('fecha', en14);

    // Bloqueos temporales activos (no expirados)
    await sb.from('bloqueos_temporales').delete().lt('expira_en', new Date().toISOString());
    const { data: bloqueos } = await sb
      .from('bloqueos_temporales')
      .select('cancha_id, fecha, hora')
      .eq('cancha_id', canchaId);

    // Horarios bloqueados por dueño
    const { data: horariosBloqueados } = await sb
      .from('horarios_bloqueados')
      .select('cancha_id, hora')
      .eq('cancha_id', canchaId);

    // Construir mapa de horarios ocupados
    const horariosOcupados: Record<string, 'reservado' | 'en_proceso'> = {};

    // Procesar reservas
    for (const r of reservas ?? []) {
      const key = `${r.fecha}|${r.hora}`;
      horariosOcupados[key] = r.estado === 'confirmada' ? 'reservado' : 'en_proceso';
    }

    // Procesar bloqueos temporales
    for (const b of bloqueos ?? []) {
      const key = `${b.fecha}|${b.hora}`;
      if (!horariosOcupados[key]) {
        horariosOcupados[key] = 'en_proceso';
      }
    }

    // Construir horarios restringidos
    const horariosRestringidos = (horariosBloqueados ?? []).map(h => h.hora);

    // Verificar específicamente el día de hoy a las 22:00
    const keyHoy22 = `${hoy}|22:00`;
    const statusHoy22 = horariosOcupados[keyHoy22];

    return NextResponse.json({
      cancha: {
        id: cancha.id,
        nombre: cancha.nombre,
      },
      fecha_hoy: hoy,
      key_22_00: keyHoy22,
      status_22_00: statusHoy22,
      total_reservas: reservas?.length || 0,
      total_bloqueos: bloqueos?.length || 0,
      total_horarios_bloqueados: horariosBloqueados?.length || 0,
      reservas: reservas || [],
      bloqueos: bloqueos || [],
      horarios_bloqueados: horariosBloqueados || [],
      horarios_ocupados: horariosOcupados,
      horarios_restringidos: horariosRestringidos,
    });

  } catch (error) {
    console.error('Error en debug-cancha-horarios:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}