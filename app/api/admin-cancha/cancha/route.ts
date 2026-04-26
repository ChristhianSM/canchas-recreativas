import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/admin-cancha/cancha?id=xxx — obtener cancha del dueño
// PATCH /api/admin-cancha/cancha?id=xxx — editar cancha
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const canchaId = req.nextUrl.searchParams.get('id');
  if (!canchaId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const ids = (relaciones ?? []).map((r: any) => r.cancha_id as string);
  if (!ids.includes(canchaId)) {
    return NextResponse.json({ error: 'No autorizado para esta cancha' }, { status: 403 });
  }

  const { data, error } = await sb.from('canchas').select('*').eq('id', canchaId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Horarios bloqueados
  const { data: horarios } = await sb
    .from('horarios_bloqueados')
    .select('hora')
    .eq('cancha_id', canchaId);

  return NextResponse.json({ ...data, horariosRestringidos: (horarios ?? []).map((h: any) => h.hora) });
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const canchaId = req.nextUrl.searchParams.get('id');
  if (!canchaId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const ids = (relaciones ?? []).map((r: any) => r.cancha_id as string);
  if (!ids.includes(canchaId)) {
    return NextResponse.json({ error: 'No autorizado para esta cancha' }, { status: 403 });
  }

  const body = await req.json();
  const { descripcion, telefono, precioHora, amenidades, imagenes, horariosRestringidos, lat, lng, direccion, distrito } = body;

  console.log('📍 PATCH /api/admin-cancha/cancha');
  console.log('Distrito recibido:', distrito);

  const updateData: Record<string, any> = {
    descripcion, telefono, precio_por_hora: precioHora, amenidades, imagenes,
  };
  if (lat !== undefined) updateData.lat = lat;
  if (lng !== undefined) updateData.lng = lng;
  if (direccion !== undefined) updateData.direccion = direccion;
  if (distrito !== undefined) updateData.distrito = distrito;

  console.log('UpdateData:', updateData);

  const { error: canchaError } = await sb
    .from('canchas')
    .update(updateData)
    .eq('id', canchaId);

  if (canchaError) return NextResponse.json({ error: canchaError.message }, { status: 500 });

  await sb.from('horarios_bloqueados').delete().eq('cancha_id', canchaId);
  if (horariosRestringidos?.length) {
    await sb.from('horarios_bloqueados').insert(
      horariosRestringidos.map((hora: string) => ({ cancha_id: canchaId, hora }))
    );
  }

  return NextResponse.json({ ok: true, distrito });
}
