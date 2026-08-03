import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { horasBloqueadasEnFecha, type BloqueoAdmin } from '@/lib/bloqueos-utils';

// GET /api/reservas/horarios-ocupados?cancha_id=X&fecha=YYYY-MM-DD&seccion_id=Y
// Devuelve las horas no disponibles, separadas por motivo:
// - reservadas: hay una reserva real de un cliente
// - bloqueadas: bloqueo del dueño o del admin (no es una reserva)
// seccion_id opcional: si se indica, solo cuenta lo que afecta esa sección
// (reservas/bloqueos de esa misma sección o de la cancha completa). Sin seccion_id
// se asume "cancha completa" — cualquier reserva o bloqueo de cualquier sección aplica.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cancha_id = searchParams.get('cancha_id');
  const fecha     = searchParams.get('fecha');
  const seccion_id = searchParams.get('seccion_id') || null;

  if (!cancha_id || !fecha) return NextResponse.json({ reservadas: [], bloqueadas: [] });

  const sb = createServiceClient();

  const [
    { data: reservas },
    { data: horariosBloqueados },
    { data: bloqueosAdmin },
  ] = await Promise.all([
    // Reservas pendientes o confirmadas en esa fecha
    sb.from('reservas')
      .select('hora, seccion_id')
      .eq('cancha_id', cancha_id)
      .eq('fecha', fecha)
      .in('estado', ['pendiente', 'confirmada']),

    // Bloqueos permanentes del dueño (siempre ocupados, sin importar la fecha; no distinguen sección)
    sb.from('horarios_bloqueados')
      .select('hora')
      .eq('cancha_id', cancha_id),

    // Bloqueos admin (fecha específica, recurrente o permanente)
    sb.from('bloqueos_admin')
      .select('*')
      .eq('cancha_id', cancha_id),
  ]);

  const reservadas = new Set<string>();
  const bloqueadas = new Set<string>();

  // Reservas activas — si se pide una sección, solo cuentan las de esa sección o de cancha completa
  for (const r of reservas ?? []) {
    if (!seccion_id || r.seccion_id === null || r.seccion_id === seccion_id) {
      reservadas.add(r.hora);
    }
  }

  // Bloqueos permanentes del dueño
  for (const b of horariosBloqueados ?? []) bloqueadas.add(b.hora);

  // Bloqueos admin (la lógica ya está en el helper)
  const horasBloqueoAdmin = horasBloqueadasEnFecha(
    (bloqueosAdmin ?? []) as BloqueoAdmin[],
    fecha,
    seccion_id,
  );
  for (const h of horasBloqueoAdmin) bloqueadas.add(h);

  return NextResponse.json({
    reservadas: Array.from(reservadas),
    bloqueadas: Array.from(bloqueadas),
  });
}
