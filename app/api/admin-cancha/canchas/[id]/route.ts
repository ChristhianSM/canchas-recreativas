import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Obtiene todos los cancha_ids del dueño (sin filtro doble que rompe con RLS)
async function getCanchaIdsDelDueno(sb: ReturnType<typeof createServiceClient>, userId: string): Promise<string[]> {
  const { data } = await sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', userId);
  return (data ?? []).map((r: any) => r.cancha_id as string);
}

// GET — obtener una cancha específica del dueño
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const ids = await getCanchaIdsDelDueno(sb, user.id);
  if (!ids.includes(params.id)) {
    return NextResponse.json({ error: 'No autorizado para esta cancha' }, { status: 403 });
  }

  const { data, error } = await sb.from('canchas').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — editar cancha (solo si el dueño la posee)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const ids = await getCanchaIdsDelDueno(sb, user.id);
  if (!ids.includes(params.id)) {
    return NextResponse.json({ error: 'No autorizado para esta cancha' }, { status: 403 });
  }

  const body = await req.json();
  const { descripcion, telefono, precioHora, amenidades, imagenes, horariosRestringidos } = body;

  const { error: canchaError } = await sb
    .from('canchas')
    .update({ descripcion, telefono, precio_por_hora: precioHora, amenidades, imagenes })
    .eq('id', params.id);

  if (canchaError) return NextResponse.json({ error: canchaError.message }, { status: 500 });

  await sb.from('horarios_bloqueados').delete().eq('cancha_id', params.id);
  if (horariosRestringidos?.length) {
    await sb.from('horarios_bloqueados').insert(
      horariosRestringidos.map((hora: string) => ({ cancha_id: params.id, hora }))
    );
  }

  return NextResponse.json({ ok: true });
}
