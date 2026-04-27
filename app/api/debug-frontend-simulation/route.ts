import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString, addDaysToDateString } from '@/lib/date-utils';

// Simular exactamente lo que hace el frontend
const HORAS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

function adaptCancha(c: any) {
  // Construir schedule a partir de horariosOcupados
  const schedule: Record<string, Array<{ id: string; time: string; available: boolean; price: number; status: 'disponible' | 'reservado' | 'en_proceso' }>> = {};

  // Generar próximos 14 días usando fecha local
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = getLocalDateString(date); // ✅ Usar función local en lugar de toISOString

    schedule[dateStr] = HORAS.map(hora => {
      const key = `${dateStr}|${hora}`;
      const horariosOcupados = c.horariosOcupados || {};
      const horariosRestringidos = c.horariosRestringidos || [];
      
      let status: 'disponible' | 'reservado' | 'en_proceso' = 'disponible';
      let available = true;

      if (horariosOcupados[key]) {
        status = horariosOcupados[key];
        available = false;
      } else if (horariosRestringidos.includes(hora)) {
        status = 'en_proceso';
        available = false;
      }

      return {
        id: `${dateStr}-${hora}`, // Agregar ID único para el slot
        time: hora,
        available,
        price: c.precio_por_hora,
        status,
      };
    });
  }

  return {
    id: c.id, name: c.nombre, type: c.tipo, address: c.direccion,
    district: c.distrito, description: c.descripcion, images: c.imagenes ?? [],
    rating: c.rating, reviewCount: c.total_resenas, pricePerHour: c.precio_por_hora,
    amenities: c.amenidades ?? [], coordinates: { lat: c.lat, lng: c.lng },
    phone: c.telefono, featured: c.destacada, schedule,
  };
}

// GET — debug: simular el procesamiento del frontend
export async function GET(req: NextRequest) {
  const sb = createServiceClient();
  const { searchParams } = new URL(req.url);
  const canchaId = searchParams.get('cancha_id') || 'a1b2c3d4-0004-0004-0004-000000000004'; // Piura Basketball Club

  try {
    // Obtener la cancha como lo hace el endpoint /api/canchas/list
    let query = sb.from('canchas').select('*').eq('activa', true).eq('id', canchaId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });
    }

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

    // Agregar horarios a la cancha
    const cancha = data[0];
    const canchaConHorarios = {
      ...cancha,
      horariosOcupados: horariosOcupadosPorCancha[cancha.id] || {},
      horariosRestringidos: horariosRestringidosPorCancha[cancha.id] || [],
    };

    // Adaptar la cancha como lo hace el frontend
    const adaptedCancha = adaptCancha(canchaConHorarios);

    // Verificar específicamente el día de hoy a las 22:00
    const hoySchedule = adaptedCancha.schedule[hoy];
    const slot22 = hoySchedule?.find(s => s.time === '22:00');

    return NextResponse.json({
      fecha_hoy: hoy,
      cancha_original: canchaConHorarios,
      cancha_adaptada: {
        id: adaptedCancha.id,
        name: adaptedCancha.name,
        schedule_hoy: hoySchedule,
      },
      slot_22_00: slot22,
      horarios_ocupados_raw: horariosOcupadosPorCancha[cancha.id] || {},
      key_22_00: `${hoy}|22:00`,
      status_en_raw: horariosOcupadosPorCancha[cancha.id]?.[`${hoy}|22:00`],
    });

  } catch (error) {
    console.error('Error en debug-frontend-simulation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}