import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json([]);

  const sb = createServiceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json([]);

  const { data } = await sb
    .from('favoritos')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  return NextResponse.json(data?.map(f => f.cancha_id) ?? []);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado - sin token' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { canchaId } = body;
  if (!canchaId) return NextResponse.json({ error: 'canchaId requerido' }, { status: 400 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  
  if (authError) return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 401 });
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  // Toggle: si existe lo borra, si no existe lo agrega
  const { data: existing, error: selectError } = await sb
    .from('favoritos')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('cancha_id', canchaId);

  if (selectError) return NextResponse.json({ error: `Select error: ${selectError.message}` }, { status: 500 });

  if (existing && existing.length > 0) {
    const { error: deleteError } = await sb.from('favoritos').delete().eq('id', existing[0].id);
    if (deleteError) return NextResponse.json({ error: `Delete error: ${deleteError.message}` }, { status: 500 });
    return NextResponse.json({ agregado: false });
  } else {
    const { error: insertError } = await sb.from('favoritos').insert({
      usuario_id: user.id,
      cancha_id: canchaId,
    });
    if (insertError) return NextResponse.json({ error: `Insert error: ${insertError.message}` }, { status: 500 });

    // Obtener nombre de la cancha para la notificación
    const { data: cancha } = await sb
      .from('canchas')
      .select('nombre')
      .eq('id', canchaId)
      .single();

    // Crear notificación
    await sb.from('notificaciones').insert({
      usuario_id: user.id,
      mensaje: `❤️ Agregaste "${cancha?.nombre ?? 'una cancha'}" a tus favoritas.`,
      tipo: 'favorito',
    });

    return NextResponse.json({ agregado: true });
  }
}
