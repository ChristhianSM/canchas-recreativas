import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { horasBloqueadasEnFecha, type BloqueoAdmin } from '@/lib/bloqueos-utils';

// GET /api/reservas/horarios-ocupados?cancha_id=X&fecha=YYYY-MM-DD
// Devuelve las horas ya ocupadas: reservas activas + bloqueos del dueño + bloqueos admin
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cancha_id = searchParams.get('cancha_id');
  const fecha     = searchParams.get('fecha');

  if (!cancha_id || !fecha) return NextResponse.json({ ocupadas: [] });

  const sb = createServiceClient();

  const [
    { data: reservas },
    { data: horariosBloqueados },
    { data: bloqueosAdmin },
  ] = await Promise.all([
    // Reservas pendientes o confirmadas en esa fecha
    sb.from('reservas')
      .select('hora')
      .eq('cancha_id', cancha_id)
      .eq('fecha', fecha)
      .in('estado', ['pendiente', 'confirmada']),

    // Bloqueos permanentes del dueño (siempre ocupados, sin importar la fecha)
    sb.from('horarios_bloqueados')
      .select('hora')
      .eq('cancha_id', cancha_id),

    // Bloqueos admin (fecha específica, recurrente o permanente)
    sb.from('bloqueos_admin')
      .select('*')
      .eq('cancha_id', cancha_id),
  ]);

  const ocupadas = new Set<string>();

  // Reservas activas
  for (const r of reservas ?? []) ocupadas.add(r.hora);

  // Bloqueos permanentes del dueño
  for (const b of horariosBloqueados ?? []) ocupadas.add(b.hora);

  // Bloqueos admin (la lógica ya está en el helper)
  const horasBloqueoAdmin = horasBloqueadasEnFecha(
    (bloqueosAdmin ?? []) as BloqueoAdmin[],
    fecha,
  );
  for (const h of horasBloqueoAdmin) ocupadas.add(h);

  return NextResponse.json({ ocupadas: Array.from(ocupadas) });
}
