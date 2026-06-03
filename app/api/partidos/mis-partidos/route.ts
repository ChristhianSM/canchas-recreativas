import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — partidos creados por el usuario autenticado (organizador)
// ?tipo=historial&page=N&limit=10 → historial paginado con total
// sin params → próximos (abierto/completo y fecha >= hoy)
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const tipo  = req.nextUrl.searchParams.get('tipo');
  const page  = Math.max(0, parseInt(req.nextUrl.searchParams.get('page')  ?? '0'));
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') ?? '10'));
  const hoy   = new Date().toISOString().split('T')[0];

  if (tipo === 'historial') {
    const from = page * limit;
    const to   = from + limit - 1;

    const { data, error, count } = await sb
      .from('partidos_con_detalles')
      .select('*', { count: 'exact' })
      .eq('organizador_id', user.id)
      .or(`estado.in.(cancelado,finalizado),fecha.lt.${hoy}`)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ items: [], total: 0, page, limit });

    const items = (data ?? []).map((p) => ({
      ...p,
      precio_por_persona: Math.ceil(p.precio_total / (p.jugadores_equipo ?? p.jugadores_max)),
      ya_organizador: true,
      ya_unido: true,
    }));

    return NextResponse.json({ items, total: count ?? 0, page, limit });
  }

  // Default: próximos (pendiente/abierto/completo y fecha >= hoy)
  const { data, error } = await sb
    .from('partidos_con_detalles')
    .select('*')
    .eq('organizador_id', user.id)
    .or('estado.eq.pendiente,estado.eq.abierto,estado.eq.completo')
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  if (error) return NextResponse.json([]);

  const partidos = (data ?? []).map((p) => ({
    ...p,
    precio_por_persona: Math.ceil(p.precio_total / (p.jugadores_equipo ?? p.jugadores_max)),
    ya_organizador: true,
    ya_unido: true,
  }));

  return NextResponse.json(partidos);
}
