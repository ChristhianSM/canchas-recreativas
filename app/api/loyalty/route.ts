import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ sellos: 0, total_reservas: 0, historial: [], canchas: [] });

  const sb = createServiceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json({ sellos: 0, total_reservas: 0, historial: [], canchas: [] });

  const [
    { data: loyaltyRows },
    { data: historial },
    { data: canchaSellos },
    { data: canchaCupones },
  ] = await Promise.all([
    sb.from('loyalty').select('*').eq('usuario_id', user.id).order('sellos', { ascending: false }).limit(1),
    sb.from('loyalty_historial').select('*').eq('usuario_id', user.id).order('creado_en', { ascending: false }).limit(20),
    // Sellos por cancha (nuevo sistema)
    sb.from('cancha_sellos')
      .select('*, canchas(nombre, imagenes)')
      .eq('usuario_id', user.id)
      .order('total_reservas', { ascending: false }),
    // Cupones por cancha (nuevo sistema) — solo no usados
    sb.from('cancha_cupones')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('usado', false)
      .order('generado_en', { ascending: false }),
  ]);

  const loyalty = loyaltyRows?.[0] ?? null;

  // Construir vista de canchas: para cada cancha con sellos, incluir config + cupones
  const canchaIds = (canchaSellos ?? []).map((s: any) => s.cancha_id);
  let configsPorCancha: Record<string, any> = {};

  if (canchaIds.length > 0) {
    const { data: configs } = await sb
      .from('cancha_loyalty_config')
      .select('*')
      .in('cancha_id', canchaIds)
      .eq('activo', true);

    for (const cfg of configs ?? []) {
      configsPorCancha[cfg.cancha_id] = cfg;
    }
  }

  const canchas = (canchaSellos ?? [])
    .filter((s: any) => configsPorCancha[s.cancha_id])
    .map((s: any) => {
      const config = configsPorCancha[s.cancha_id];
      const cuponesDeEstaCancha = (canchaCupones ?? []).filter(
        (c: any) => c.cancha_id === s.cancha_id
      );
      return {
        cancha_id:    s.cancha_id,
        cancha_nombre: (s.canchas as any)?.nombre ?? s.cancha_id,
        cancha_imagen: (s.canchas as any)?.imagenes?.[0] ?? null,
        sellos:        s.sellos,
        total_reservas: s.total_reservas,
        umbral:        config.umbral,
        premio_tipo:   config.premio_tipo,
        premio_valor:  config.premio_valor,
        premio_descripcion: config.premio_descripcion,
        cupones:       cuponesDeEstaCancha,
      };
    });

  return NextResponse.json({
    sellos:         loyalty?.sellos ?? 0,
    total_reservas: loyalty?.total_reservas ?? 0,
    historial:      historial ?? [],
    canchas,
  });
}
