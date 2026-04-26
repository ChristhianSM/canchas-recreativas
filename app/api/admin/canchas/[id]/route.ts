import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// PATCH — editar cancha desde el panel admin general (sin restricción de dueño)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createServiceClient();

  const body = await req.json();
  const { descripcion, telefono, precioHora, amenidades, imagenes, horariosRestringidos, lat, lng, direccion } = body;

  const updateData: Record<string, any> = {
    descripcion, telefono, precio_por_hora: precioHora, amenidades, imagenes,
  };
  if (lat !== undefined) updateData.lat = lat;
  if (lng !== undefined) updateData.lng = lng;
  if (direccion !== undefined) updateData.direccion = direccion;

  const { error: canchaError } = await sb
    .from('canchas')
    .update(updateData)
    .eq('id', id);

  if (canchaError) return NextResponse.json({ error: canchaError.message }, { status: 500 });

  // Actualizar horarios bloqueados
  await sb.from('horarios_bloqueados').delete().eq('cancha_id', id);
  if (horariosRestringidos?.length) {
    await sb.from('horarios_bloqueados').insert(
      horariosRestringidos.map((hora: string) => ({ cancha_id: id, hora }))
    );
  }

  return NextResponse.json({ ok: true });
}
