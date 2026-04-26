import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — obtener reseñas de una cancha
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const canchaId = searchParams.get('cancha_id');
  if (!canchaId) return NextResponse.json({ error: 'cancha_id requerido' }, { status: 400 });

  const sb = createServiceClient();

  const { data, error } = await sb
    .from('resenas')
    .select('id, estrellas, creado_en, usuario_id')
    .eq('cancha_id', canchaId)
    .order('creado_en', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total    = data?.length ?? 0;
  const promedio = total > 0
    ? Math.round((data!.reduce((s, r) => s + r.estrellas, 0) / total) * 10) / 10
    : 0;

  const distribucion: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  data?.forEach(r => { distribucion[r.estrellas] = (distribucion[r.estrellas] || 0) + 1; });

  // Verificar si el usuario autenticado ya calificó
  let miCalificacion: number | null = null;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    const { data: { user } } = await sb.auth.getUser(token);
    if (user) {
      const miResena = data?.find(r => r.usuario_id === user.id);
      if (miResena) miCalificacion = miResena.estrellas;
    }
  }

  return NextResponse.json({ resenas: data ?? [], total, promedio, distribucion, miCalificacion });
}

// POST — crear o actualizar reseña (solo usuarios con reserva confirmada)
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Debes iniciar sesión para calificar' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  
  if (authError || !user) {
    return NextResponse.json({ 
      error: 'Tu sesión expiró. Por favor vuelve a iniciar sesión para calificar.' 
    }, { status: 401 });
  }

  const { canchaId, estrellas } = await req.json();

  if (!canchaId || !estrellas || estrellas < 1 || estrellas > 5) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // Verificar que el usuario tiene una reserva confirmada en esta cancha
  const { data: reserva } = await sb
    .from('reservas')
    .select('id')
    .eq('cancha_id', canchaId)
    .eq('usuario_id', user.id)
    .eq('estado', 'confirmada')
    .limit(1)
    .single();

  if (!reserva) {
    return NextResponse.json({
      error: 'Solo puedes calificar canchas donde hayas tenido una reserva confirmada'
    }, { status: 403 });
  }

  // Verificar que el usuario NO haya calificado ya esta cancha
  const { data: resenaExistente } = await sb
    .from('resenas')
    .select('id, estrellas')
    .eq('cancha_id', canchaId)
    .eq('usuario_id', user.id)
    .single();

  if (resenaExistente) {
    return NextResponse.json({
      error: 'Ya calificaste esta cancha. Solo se permite una calificación por cancha.',
      yaCalificado: true,
      estrellas: resenaExistente.estrellas,
    }, { status: 400 });
  }

  // Insertar nueva reseña (sin upsert — ya verificamos que no existe)
  const { data: resena, error } = await sb
    .from('resenas')
    .insert({
      cancha_id:  canchaId,
      usuario_id: user.id,
      reserva_id: reserva.id,
      estrellas,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Actualizar el rating promedio en la tabla canchas
  const { data: todasResenas } = await sb
    .from('resenas')
    .select('estrellas')
    .eq('cancha_id', canchaId);

  if (todasResenas && todasResenas.length > 0) {
    const nuevoRating = Math.round(
      (todasResenas.reduce((s, r) => s + r.estrellas, 0) / todasResenas.length) * 10
    ) / 10;

    await sb
      .from('canchas')
      .update({ rating: nuevoRating, total_resenas: todasResenas.length })
      .eq('id', canchaId);
  }

  return NextResponse.json({ ok: true, resena });
}
