import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';
import { HORAS_APP } from '@/lib/bloqueos-utils';

function getHorasAfectadas(horaInicio: string, horaFin?: string | null): string[] {
  const inicio = horaInicio.substring(0, 5);
  if (!horaFin) return [inicio];
  const fin = horaFin.substring(0, 5);
  return HORAS_APP.filter(h => h >= inicio && h < fin);
}

function getFechasAChequear(
  tipo: string,
  fecha?: string | null,
  diaSemana?: number | null,
  fechaDesde?: string | null,
  fechaHasta?: string | null,
): string[] {
  if (tipo === 'fecha_especifica') return fecha ? [fecha] : [];
  const fechas: string[] = [];
  const hoy = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const fechaStr = d.toISOString().split('T')[0];
    if (tipo === 'permanente') {
      fechas.push(fechaStr);
    } else if (tipo === 'recurrente_semanal' && diaSemana !== null && diaSemana !== undefined) {
      if (d.getDay() !== diaSemana) continue;
      if (fechaDesde && fechaStr < fechaDesde) continue;
      if (fechaHasta && fechaStr > fechaHasta) continue;
      fechas.push(fechaStr);
    }
  }
  return fechas;
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyAdmin(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const canchaId = req.nextUrl.searchParams.get('canchaId');
  if (!canchaId) return NextResponse.json({ error: 'canchaId requerido' }, { status: 400 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('bloqueos_admin')
    .select('*')
    .eq('cancha_id', canchaId)
    .order('creado_en', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyAdmin(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { canchaId, tipo, fecha, dia_semana, fecha_desde, fecha_hasta, hora_inicio, hora_fin, motivo } = body;

  if (!canchaId || !tipo || !hora_inicio)
    return NextResponse.json({ error: 'Faltan campos requeridos: canchaId, tipo, hora_inicio' }, { status: 400 });

  if (!['permanente', 'fecha_especifica', 'recurrente_semanal'].includes(tipo))
    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });

  const sb = createServiceClient();

  const horasAfectadas  = getHorasAfectadas(hora_inicio, hora_fin);
  const fechasAChequear = getFechasAChequear(tipo, fecha, dia_semana, fecha_desde, fecha_hasta);

  if (fechasAChequear.length > 0 && horasAfectadas.length > 0) {
    const { data: conflictos } = await sb
      .from('reservas')
      .select('id, fecha, hora, usuario_nombre')
      .eq('cancha_id', canchaId)
      .in('fecha', fechasAChequear)
      .in('hora', horasAfectadas)
      .in('estado', ['pendiente', 'confirmada'])
      .order('fecha', { ascending: true })
      .order('hora',  { ascending: true });

    const ahoraISO = new Date().toISOString();
    const hoyStr   = ahoraISO.split('T')[0];
    const ahoraH   = ahoraISO.substring(11, 16);
    const conflictosFuturos = (conflictos ?? []).filter(r =>
      r.fecha > hoyStr || (r.fecha === hoyStr && r.hora.substring(0, 5) > ahoraH)
    );

    if (conflictosFuturos.length > 0) {
      const lista = conflictosFuturos.map(r => {
        const fechaLabel = new Date(r.fecha + 'T00:00:00')
          .toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
        const cliente = r.usuario_nombre ? ` (${r.usuario_nombre.split(' ')[0]})` : '';
        return `${fechaLabel} ${r.hora}${cliente}`;
      }).join(', ');
      const n      = conflictosFuturos.length;
      const plural = n > 1 ? 'reservas activas' : 'reserva activa';
      return NextResponse.json({
        error: `Hay ${n} ${plural} en ese horario: ${lista}. Cancélalas antes de crear el bloqueo.`,
        conflictos: conflictosFuturos,
      }, { status: 409 });
    }
  }

  const { data, error } = await sb
    .from('bloqueos_admin')
    .insert({
      cancha_id:   canchaId,
      tipo,
      fecha:       tipo === 'fecha_especifica' ? fecha : null,
      dia_semana:  tipo === 'recurrente_semanal' ? dia_semana : null,
      fecha_desde: tipo === 'recurrente_semanal' ? (fecha_desde ?? null) : null,
      fecha_hasta: tipo === 'recurrente_semanal' ? (fecha_hasta ?? null) : null,
      hora_inicio,
      hora_fin:    hora_fin ?? null,
      motivo:      motivo ?? null,
      creado_por:  user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyAdmin(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const id       = req.nextUrl.searchParams.get('id');
  const canchaId = req.nextUrl.searchParams.get('canchaId');
  if (!id || !canchaId) return NextResponse.json({ error: 'id y canchaId requeridos' }, { status: 400 });

  const sb = createServiceClient();
  const { error } = await sb
    .from('bloqueos_admin')
    .delete()
    .eq('id', id)
    .eq('cancha_id', canchaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
