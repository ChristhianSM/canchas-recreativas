import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — partidos creados por el usuario autenticado (organizador)
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data, error } = await sb
    .from('partidos_con_detalles')
    .select('*')
    .eq('organizador_id', user.id)
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const partidos = (data ?? []).map((p) => ({
    ...p,
    precio_por_persona: Math.ceil(
      p.precio_total / (p.jugadores_equipo ?? p.jugadores_max)
    ),
    ya_organizador: true,
    ya_unido: true,
  }));

  return NextResponse.json(partidos);
}
