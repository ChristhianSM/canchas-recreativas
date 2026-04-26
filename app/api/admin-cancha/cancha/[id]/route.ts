import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — obtener cancha del dueño
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  // Obtener todas las canchas del dueño y verificar
  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const ids = (relaciones ?? []).map((r: any) => r.cancha_id as string);
  if (!ids.includes(params.id)) {
    return NextResponse.json({ error: 'No autorizado', ids, buscado: params.id }, { status: 403 });
  }

  const { data, error } = await sb.from('canchas').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — editar cancha
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const ids = (relaciones ?? []).map((r: any) => r.cancha_id as string);
  if (!ids.includes(params.id)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await req.json();
  console.log('📍 BODY COMPLETO RECIBIDO:', JSON.stringify(body, null, 2));
  
  const { descripcion, telefono, precioHora, amenidades, imagenes, horariosRestringidos, lat, lng, direccion, distrito } = body;

  console.log('Distrito recibido:', distrito);
  console.log('Tipo de distrito:', typeof distrito);

  const updateData: any = { 
    descripcion, 
    telefono, 
    precio_por_hora: precioHora, 
    amenidades, 
    imagenes 
  };

  if (lat !== undefined) updateData.lat = lat;
  if (lng !== undefined) updateData.lng = lng;
  if (direccion !== undefined) updateData.direccion = direccion;
  if (distrito !== undefined) updateData.distrito = distrito;

  console.log('UpdateData que se va a guardar:', updateData);

  const { error: canchaError } = await sb
    .from('canchas')
    .update(updateData)
    .eq('id', params.id);

  if (canchaError) return NextResponse.json({ error: canchaError.message }, { status: 500 });

  await sb.from('horarios_bloqueados').delete().eq('cancha_id', params.id);
  if (horariosRestringidos?.length) {
    await sb.from('horarios_bloqueados').insert(
      horariosRestringidos.map((hora: string) => ({ cancha_id: params.id, hora }))
    );
  }

  return NextResponse.json({ ok: true, distrito });
}
