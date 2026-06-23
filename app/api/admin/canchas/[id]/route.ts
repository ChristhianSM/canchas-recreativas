import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const sb = createServiceClient();

  const body = await req.json();
  const {
    descripcion, telefono, precioHora, amenidades, imagenes, horariosRestringidos,
    lat, lng, direccion, distrito,
    preciosPorHora, accesorios,
    superficie, maxJugadores, horaApertura, horaCierre, activa,
  } = body;

  const updateData: Record<string, any> = {};
  if (descripcion !== undefined) updateData.descripcion = descripcion;
  if (telefono !== undefined) updateData.telefono = telefono;
  if (precioHora !== undefined) updateData.precio_por_hora = precioHora;
  if (amenidades !== undefined) updateData.amenidades = amenidades;
  if (imagenes !== undefined) updateData.imagenes = imagenes;
  if (lat !== undefined) updateData.lat = lat;
  if (lng !== undefined) updateData.lng = lng;
  if (direccion !== undefined) updateData.direccion = direccion;
  if (distrito !== undefined) updateData.distrito = distrito;
  if (preciosPorHora !== undefined) updateData.precios_por_hora = preciosPorHora;
  if (accesorios !== undefined) updateData.accesorios = accesorios ?? [];
  if (superficie !== undefined) updateData.superficie = superficie;
  if (maxJugadores !== undefined) updateData.max_jugadores = maxJugadores;
  if (horaApertura !== undefined) updateData.hora_apertura = horaApertura;
  if (horaCierre !== undefined) updateData.hora_cierre = horaCierre;
  if (activa !== undefined) updateData.activa = activa;

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
