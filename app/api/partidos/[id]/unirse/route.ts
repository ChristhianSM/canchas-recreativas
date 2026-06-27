import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST — unirse a un partido
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: partido, error: fetchError } = await sb
    .from('partidos')
    .select('id, estado, jugadores_max, jugadores_actuales')
    .eq('id', id)
    .single();

  if (fetchError || !partido) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
  }
  if (partido.estado !== 'abierto') {
    return NextResponse.json({ error: 'El partido no tiene cupos disponibles' }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const telefono: string | null = body.telefono ?? null;

  const { error: joinError } = await sb.from('partido_jugadores').insert({
    partido_id: id,
    usuario_id: user.id,
    es_organizador: false,
    estado_pago: 'pendiente',
  });

  if (joinError) {
    if (joinError.code === '23505') {
      return NextResponse.json({ error: 'Ya estás en este partido' }, { status: 409 });
    }
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  if (telefono) {
    await sb.from('usuarios').update({ telefono }).eq('id', user.id);
  }

  return NextResponse.json({ ok: true });
}

// DELETE — salir de un partido
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: jugador } = await sb
    .from('partido_jugadores')
    .select('es_organizador')
    .eq('partido_id', id)
    .eq('usuario_id', user.id)
    .single();

  if (jugador?.es_organizador) {
    return NextResponse.json(
      { error: 'El organizador no puede abandonar el partido. Cancélalo si ya no quieres jugar.' },
      { status: 409 },
    );
  }

  const { error } = await sb
    .from('partido_jugadores')
    .delete()
    .eq('partido_id', id)
    .eq('usuario_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
