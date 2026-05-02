import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/** Verifica que el token pertenece a un dueño y que la cancha le pertenece */
async function verificarDueno(sb: ReturnType<typeof createServiceClient>, token: string, canchaId: string) {
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;

  const { data: relaciones } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', user.id);

  const ids = (relaciones ?? []).map((r: any) => r.cancha_id as string);
  if (!ids.includes(canchaId)) return null;

  return user;
}

// ── GET /api/admin-cancha/bloqueos?canchaId=xxx ──────────────────────────────
// Retorna todos los bloqueos admin de una cancha
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const canchaId = req.nextUrl.searchParams.get('canchaId');
  if (!canchaId) return NextResponse.json({ error: 'canchaId requerido' }, { status: 400 });

  const sb = createServiceClient();
  const user = await verificarDueno(sb, token, canchaId);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { data, error } = await sb
    .from('bloqueos_admin')
    .select('*')
    .eq('cancha_id', canchaId)
    .order('creado_en', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// ── POST /api/admin-cancha/bloqueos ──────────────────────────────────────────
// Crea un nuevo bloqueo admin
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { canchaId, tipo, fecha, dia_semana, fecha_desde, fecha_hasta, hora_inicio, hora_fin, motivo } = body;

  if (!canchaId || !tipo || !hora_inicio) {
    return NextResponse.json({ error: 'Faltan campos requeridos: canchaId, tipo, hora_inicio' }, { status: 400 });
  }

  if (!['permanente', 'fecha_especifica', 'recurrente_semanal'].includes(tipo)) {
    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });
  }

  if (tipo === 'fecha_especifica' && !fecha) {
    return NextResponse.json({ error: 'fecha requerida para tipo fecha_especifica' }, { status: 400 });
  }

  if (tipo === 'recurrente_semanal' && (dia_semana === undefined || dia_semana === null)) {
    return NextResponse.json({ error: 'dia_semana requerido para tipo recurrente_semanal' }, { status: 400 });
  }

  const sb = createServiceClient();
  const user = await verificarDueno(sb, token, canchaId);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { data, error } = await sb
    .from('bloqueos_admin')
    .insert({
      cancha_id:   canchaId,
      tipo,
      fecha:       tipo === 'fecha_especifica' ? fecha : null,
      dia_semana:  tipo === 'recurrente_semanal' ? dia_semana : null,
      fecha_desde: tipo === 'recurrente_semanal' ? (fecha_desde ?? null) : null,
      fecha_hasta: tipo === 'recurrente_semanal' ? (fecha_hasta ?? null) : null,
      hora_inicio,
      hora_fin:    hora_fin ?? null,
      motivo:      motivo ?? null,
      creado_por:  user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// ── DELETE /api/admin-cancha/bloqueos?id=xxx&canchaId=xxx ────────────────────
// Elimina un bloqueo admin
export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const id       = req.nextUrl.searchParams.get('id');
  const canchaId = req.nextUrl.searchParams.get('canchaId');
  if (!id || !canchaId) return NextResponse.json({ error: 'id y canchaId requeridos' }, { status: 400 });

  const sb = createServiceClient();
  const user = await verificarDueno(sb, token, canchaId);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { error } = await sb
    .from('bloqueos_admin')
    .delete()
    .eq('id', id)
    .eq('cancha_id', canchaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
