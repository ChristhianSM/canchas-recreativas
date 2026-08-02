import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';

async function getCanchaIdsDelDueno(sb: ReturnType<typeof createServiceClient>, userId: string): Promise<string[]> {
  const { data } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', userId);
  return (data ?? []).map((r: any) => r.cancha_id as string);
}

// GET — obtener configuración de loyalty de todas las canchas del dueño
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const canchaIds = await getCanchaIdsDelDueno(sb, user.id);

  if (!canchaIds.length) return NextResponse.json([]);

  // Si se pasa ?canchaId=xxx, devolver solo esa cancha
  const canchaId = req.nextUrl.searchParams.get('canchaId');
  if (canchaId) {
    if (!canchaIds.includes(canchaId)) {
      return NextResponse.json({ error: 'No autorizado para esta cancha' }, { status: 403 });
    }

    const { data } = await sb
      .from('cancha_loyalty_config')
      .select('*')
      .eq('cancha_id', canchaId)
      .maybeSingle();

    return NextResponse.json(data ?? null);
  }

  const { data } = await sb
    .from('cancha_loyalty_config')
    .select('*')
    .in('cancha_id', canchaIds);

  return NextResponse.json(data ?? []);
}

// POST — crear o actualizar la config de loyalty de una cancha del dueño
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { canchaId, activo, umbral, premioTipo, premioValor, premioDescripcion, icono } = body;

  if (!canchaId) return NextResponse.json({ error: 'canchaId requerido' }, { status: 400 });

  const sb = createServiceClient();
  const canchaIds = await getCanchaIdsDelDueno(sb, user.id);

  if (!canchaIds.includes(canchaId)) {
    return NextResponse.json({ error: 'No autorizado para esta cancha' }, { status: 403 });
  }

  // Validaciones básicas
  if (umbral !== undefined && (umbral < 1 || umbral > 50)) {
    return NextResponse.json({ error: 'El umbral debe estar entre 1 y 50' }, { status: 400 });
  }

  const tiposValidos = ['descuento_fijo', 'descuento_porcentaje', 'hora_gratis', 'personalizado'];
  if (premioTipo !== undefined && !tiposValidos.includes(premioTipo)) {
    return NextResponse.json({ error: 'premio_tipo inválido' }, { status: 400 });
  }

  if (icono !== undefined && (typeof icono !== 'string' || icono.length === 0 || icono.length > 8)) {
    return NextResponse.json({ error: 'icono inválido' }, { status: 400 });
  }

  const payload: Record<string, unknown> = { actualizado_en: new Date().toISOString() };
  if (activo       !== undefined) payload.activo              = activo;
  if (umbral       !== undefined) payload.umbral              = umbral;
  if (premioTipo   !== undefined) payload.premio_tipo         = premioTipo;
  if (premioValor  !== undefined) payload.premio_valor        = premioValor;
  if (premioDescripcion !== undefined) payload.premio_descripcion = premioDescripcion;
  if (icono        !== undefined) payload.icono               = icono;

  // Upsert: si no existe, lo crea; si existe, lo actualiza
  const { data, error } = await sb
    .from('cancha_loyalty_config')
    .upsert({ cancha_id: canchaId, ...payload }, { onConflict: 'cancha_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
