import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';
import { eliminarImagenesHuerfanas } from '@/lib/storage-cleanup';

// GET — obtener cancha del dueño
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const sb = createServiceClient();

  // Obtener todas las canchas del dueño y verificar
  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const ids = (relaciones ?? []).map((r: any) => r.cancha_id as string);
  if (!ids.includes(id)) {
    return NextResponse.json({ error: 'No autorizado', ids, buscado: id }, { status: 403 });
  }

  const { data, error } = await sb.from('canchas').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — editar cancha
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const sb = createServiceClient();

  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const ids = (relaciones ?? []).map((r: any) => r.cancha_id as string);
  if (!ids.includes(id)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await req.json();
  const { descripcion, telefono, precioHora, amenidades, imagenes, lat, lng, direccion, distrito, preciosPorHora } = body;

  // Imágenes previas, para poder limpiar del storage las que se hayan quitado
  const { data: canchaPrevia } = await sb.from('canchas').select('imagenes').eq('id', id).single();

  const updateData: any = {
    descripcion,
    telefono,
    precio_por_hora: precioHora,
    amenidades,
    imagenes,
    precios_por_hora: preciosPorHora ?? {},
  };

  if (lat !== undefined) updateData.lat = lat;
  if (lng !== undefined) updateData.lng = lng;
  if (direccion !== undefined) updateData.direccion = direccion;
  if (distrito !== undefined) updateData.distrito = distrito;

  const { error: canchaError } = await sb
    .from('canchas')
    .update(updateData)
    .eq('id', id);

  if (canchaError) return NextResponse.json({ error: canchaError.message }, { status: 500 });

  await eliminarImagenesHuerfanas(sb, canchaPrevia?.imagenes, imagenes);

  return NextResponse.json({ ok: true, distrito });
}
