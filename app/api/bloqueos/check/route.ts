import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

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

  // Verificar bloqueo temporal activo
  const { data: bloqueo } = await sb
    .from('bloqueos_temporales')
    .select('id, expira_en')
    .eq('cancha_id', canchaId)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .maybeSingle();

  if (bloqueo) {
    return NextResponse.json({ disponible: false, motivo: 'en_proceso' });
  }

  // Verificar reserva activa
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

  return NextResponse.json({ disponible: true });
}
