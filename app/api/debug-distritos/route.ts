import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — mostrar todos los distritos de las canchas
export async function GET(req: NextRequest) {
  const sb = createServiceClient();

  // Obtener todas las canchas con sus distritos
  const { data, error } = await sb
    .from('canchas')
    .select('id, nombre, distrito, tipo, activa')
    .order('distrito', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Agrupar por distrito
  const distritoMap: Record<string, any[]> = {};
  
  (data ?? []).forEach((cancha: any) => {
    const distrito = cancha.distrito || 'SIN DISTRITO';
    if (!distritoMap[distrito]) {
      distritoMap[distrito] = [];
    }
    distritoMap[distrito].push({
      id: cancha.id,
      nombre: cancha.nombre,
      tipo: cancha.tipo,
      activa: cancha.activa,
    });
  });

  // Obtener distritos únicos
  const distritosUnicos = Object.keys(distritoMap).sort();

  return NextResponse.json({
    totalCanchas: data?.length ?? 0,
    distritosUnicos,
    distritosConCanchas: distritoMap,
    resumen: distritosUnicos.map(d => ({
      distrito: d,
      cantidad: distritoMap[d].length,
      canchas: distritoMap[d],
    })),
  });
}
