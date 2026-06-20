import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

// GET — superadmin: ver todas las configs de loyalty con estadísticas
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();

  const { data: configs, error } = await sb
    .from('cancha_loyalty_config')
    .select('*, canchas(id, nombre, imagenes)')
    .order('activo', { ascending: false })
    .order('actualizado_en', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Para cada cancha con programa activo, contar usuarios y cupones emitidos
  const canchaIds = (configs ?? []).map((c: any) => c.cancha_id);

  if (!canchaIds.length) return NextResponse.json([]);

  const [{ data: sellosStats }, { data: cuponesStats }] = await Promise.all([
    sb.from('cancha_sellos')
      .select('cancha_id, usuario_id')
      .in('cancha_id', canchaIds),
    sb.from('cancha_cupones')
      .select('cancha_id, usado')
      .in('cancha_id', canchaIds),
  ]);

  const result = (configs ?? []).map((cfg: any) => {
    const usuarios = (sellosStats ?? []).filter((s: any) => s.cancha_id === cfg.cancha_id);
    const cupones  = (cuponesStats ?? []).filter((c: any) => c.cancha_id === cfg.cancha_id);
    return {
      ...cfg,
      stats: {
        total_usuarios:        usuarios.length,
        total_cupones_emitidos: cupones.length,
        total_cupones_usados:   cupones.filter((c: any) => c.usado).length,
      },
    };
  });

  return NextResponse.json(result);
}

// PATCH — superadmin: editar cualquier config de loyalty
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { canchaId, activo, umbral, premioTipo, premioValor, premioDescripcion } = body;

  if (!canchaId) return NextResponse.json({ error: 'canchaId requerido' }, { status: 400 });

  const sb = createServiceClient();

  const payload: Record<string, unknown> = { actualizado_en: new Date().toISOString() };
  if (activo            !== undefined) payload.activo              = activo;
  if (umbral            !== undefined) payload.umbral              = umbral;
  if (premioTipo        !== undefined) payload.premio_tipo         = premioTipo;
  if (premioValor       !== undefined) payload.premio_valor        = premioValor;
  if (premioDescripcion !== undefined) payload.premio_descripcion  = premioDescripcion;

  const { data, error } = await sb
    .from('cancha_loyalty_config')
    .upsert({ cancha_id: canchaId, ...payload }, { onConflict: 'cancha_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
