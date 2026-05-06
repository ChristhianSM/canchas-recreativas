import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { estaBloquedoPor, BloqueoAdmin } from '@/lib/bloqueos-utils';

// GET /api/bloqueos/check?canchaId=xxx&fecha=xxx&hora=xxx
// Verifica si un horario está bloqueado o reservado
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const canchaId = searchParams.get('canchaId');
  const fecha    = searchParams.get('fecha');
  const hora     = searchParams.get('hora');

  if (!canchaId || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const sb = createServiceClient();

  // Limpiar bloqueos expirados
  await sb.from('bloqueos_temporales')
    .delete()
    .lt('expira_en', new Date().toISOString());

  // 1. Verificar bloqueo temporal activo (alguien en proceso de pago)
  const { data: bloqueoTmp } = await sb
    .from('bloqueos_temporales')
    .select('id, expira_en')
    .eq('cancha_id', canchaId)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .maybeSingle();

  if (bloqueoTmp) {
    return NextResponse.json({ disponible: false, motivo: 'en_proceso' });
  }

  // 2. Verificar reserva activa
  const { data: reserva } = await sb
    .from('reservas')
    .select('id')
    .eq('cancha_id', canchaId)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .in('estado', ['pendiente', 'confirmada'])
    .maybeSingle();

  if (reserva) {
    return NextResponse.json({ disponible: false, motivo: 'reservado' });
  }

  // 3. Verificar horarios bloqueados permanentes (legacy)
  const { data: horarioPerm } = await sb
    .from('horarios_bloqueados')
    .select('hora')
    .eq('cancha_id', canchaId)
    .eq('hora', hora)
    .maybeSingle();

  if (horarioPerm) {
    return NextResponse.json({ disponible: false, motivo: 'bloqueado_admin' });
  }

  // 4. Verificar bloqueos admin (fecha específica + recurrente + permanente nuevo)
  const { data: bloqueosAdmin } = await sb
    .from('bloqueos_admin')
    .select('*')
    .eq('cancha_id', canchaId);

  if ((bloqueosAdmin ?? []).length > 0) {
    const bloqueado = (bloqueosAdmin as BloqueoAdmin[]).some(b =>
      estaBloquedoPor(b, fecha, hora)
    );
    if (bloqueado) {
      return NextResponse.json({ disponible: false, motivo: 'bloqueado_admin' });
    }
  }

  return NextResponse.json({ disponible: true }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
