import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString, addDaysToDateString } from '@/lib/date-utils';

// Copiar las funciones de filter-utils para debug
function hasHourPassed(hour: string, date?: string): boolean {
  // Si no se especifica fecha, usar hoy
  if (!date) {
    date = getLocalDateString();
  }

  const today = getLocalDateString();
  
  // Si la fecha es anterior a hoy, la hora ya pasó
  if (date < today) {
    return true;
  }

  // Si es hoy, comparar con la hora actual
  if (date === today) {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    // Si la hora seleccionada es ESTRICTAMENTE menor a la hora actual, ya pasó
    // Usamos < en lugar de <= para permitir la hora actual si aún no ha pasado completamente
    return hour < currentTime;
  }

  // Si la fecha es futura, la hora no ha pasado
  return false;
}

function hasAvailabilityAtHour(cancha: any, hour: string, date?: string): boolean {
  // Si no se especifica fecha, usar hoy
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }

  // 1. Verificar si la hora ya pasó
  if (hasHourPassed(hour, date)) {
    return false;
  }

  // Si no hay schedule, asumir que está disponible
  if (!cancha.schedule || Object.keys(cancha.schedule).length === 0) {
    return true;
  }

  const daySchedule = cancha.schedule[date];
  if (!daySchedule) return true; // Si no hay datos para ese día, asumir disponible

  const slot = daySchedule.find((s: any) => s.time === hour);
  
  // 2. Verificar si el slot existe y está disponible
  if (!slot) {
    return true; // Si no hay slot, asumir disponible
  }

  // 3. Retornar la disponibilidad del slot (considera reservas y horarios bloqueados)
  return slot.available;
}

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

// GET — debug: simular el filtro exacto
export async function GET(req: NextRequest) {
  const sb = createServiceClient();
  const { searchParams } = new URL(req.url);
  const canchaId = searchParams.get('cancha_id') || 'a1b2c3d4-0004-0004-0004-000000000004'; // Piura Basketball Club
  const selectedDate = searchParams.get('date') || getLocalDateString();
  const selectedHour = searchParams.get('hour') || '22:00';

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

    // Simular el filtro exacto
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    const hourPassed = hasHourPassed(selectedHour, selectedDate);
    const hasAvailability = hasAvailabilityAtHour(adaptedCancha, selectedHour, selectedDate);

    // Verificar el slot específico
    const daySchedule = adaptedCancha.schedule[selectedDate];
    const slot = daySchedule?.find(s => s.time === selectedHour);

    return NextResponse.json({
      fecha_hoy: hoy,
      fecha_seleccionada: selectedDate,
      hora_seleccionada: selectedHour,
      hora_actual: currentTime,
      hora_paso: hourPassed,
      tiene_disponibilidad: hasAvailability,
      slot_encontrado: slot,
      schedule_del_dia: daySchedule,
      cancha_adaptada_id: adaptedCancha.id,
      cancha_adaptada_name: adaptedCancha.name,
      debug: {
        date_comparison: {
          selectedDate,
          today: hoy,
          is_today: selectedDate === hoy,
          is_past: selectedDate < hoy,
          is_future: selectedDate > hoy,
        },
        hour_comparison: {
          selectedHour,
          currentTime,
          is_past: selectedHour < currentTime,
          is_equal: selectedHour === currentTime,
          is_future: selectedHour > currentTime,
        }
      }
    });

  } catch (error) {
    console.error('Error en debug-filter-simulation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}