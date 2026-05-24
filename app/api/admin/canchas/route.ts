import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

// GET — listar todas las canchas con su dueño asignado
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();

  const { data: canchas, error } = await sb
    .from('canchas')
    .select('*')
    .order('nombre');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Obtener dueños asignados
  const { data: duenos } = await sb
    .from('duenos_canchas')
    .select('cancha_id, usuario_id, usuarios(nombre, email)');

  // Mapear dueño a cada cancha
  const canchasConDueno = (canchas ?? []).map((c: any) => {
    const rel = (duenos ?? []).find((d: any) => d.cancha_id === c.id);
    return {
      ...c,
      dueno: rel ? { id: rel.usuario_id, ...(rel.usuarios as any) } : null,
    };
  });

  return NextResponse.json(canchasConDueno);
}

// POST — crear nueva cancha
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const {
    nombre, tipo, direccion, distrito, descripcion,
    precio_por_hora, telefono, amenidades, imagenes,
    lat, lng, dueno_id,
  } = body;

  if (!nombre || !tipo || !precio_por_hora) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }

  const sb = createServiceClient();

  const { data: cancha, error } = await sb.from('canchas').insert({
    nombre,
    tipo,
    direccion:       direccion ?? '',
    distrito:        distrito ?? 'Piura',
    descripcion:     descripcion ?? '',
    precio_por_hora: Number(precio_por_hora),
    telefono:        telefono ?? '',
    amenidades:      amenidades ?? [],
    imagenes:        imagenes ?? [],
    lat:             lat ?? -5.1945,
    lng:             lng ?? -80.6328,
    rating:          0,
    total_resenas:   0,
    destacada:       false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Asignar dueño si se especificó
  if (dueno_id) {
    await sb.from('duenos_canchas').insert({
      cancha_id:  cancha.id,
      usuario_id: dueno_id,
    });
  }

  return NextResponse.json({ ok: true, id: cancha.id });
}
