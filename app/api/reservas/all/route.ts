import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

const PAGE_LIMIT = 50;

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyAdmin(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url    = new URL(req.url);
  const pageParam = url.searchParams.get('page');

  const sb = createServiceClient();

  // Sin paginación: respuesta plana para el dashboard y el layout
  if (pageParam === null) {
    const { data, error } = await sb
      .from('reservas')
      .select('*')
      .order('creado_en', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // Con paginación: dos queries en paralelo
  const page   = Math.max(1, parseInt(pageParam) || 1);
  const limit  = Math.min(200, Math.max(10, parseInt(url.searchParams.get('limit') ?? String(PAGE_LIMIT)) || PAGE_LIMIT));
  const offset = (page - 1) * limit;

  const [countResult, dataResult] = await Promise.all([
    // Query liviana: solo la columna estado para contar con exactitud
    sb.from('reservas').select('estado'),
    // Query paginada: datos completos de la página
    sb.from('reservas').select('*').order('creado_en', { ascending: false }).range(offset, offset + limit - 1),
  ]);

  if (dataResult.error) return NextResponse.json({ error: dataResult.error.message }, { status: 500 });

  const allStatuses = countResult.data ?? [];
  const counts = allStatuses.reduce<Record<string, number>>((acc, r) => {
    acc[r.estado] = (acc[r.estado] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    data:   dataResult.data ?? [],
    total:  allStatuses.length,
    page,
    limit,
    counts,
  });
}
