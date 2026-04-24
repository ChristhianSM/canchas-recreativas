import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const MINUTOS = 0.5; // 30 segundos para pruebas

// POST — crear bloqueo temporal al iniciar pago
export async function POST(req: NextRequest) {
  const { canchaId, fecha, hora } = await req.json();
  if (!canchaId || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const sb = createServiceClient();

  // Obtener usuario si está logueado
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  let usuarioId: string | null = null;
  if (token) {
    const { data: { user } } = await sb.auth.getUser(token);
    usuarioId = user?.id ?? null;
  }

  // Limpiar bloqueos expirados primero
  await sb.from('bloqueos_temporales')
    .delete()
    .lt('expira_en', new Date().toISOString());

  // Verificar si ya existe un bloqueo activo para este slot
  const { data: existente } = await sb
    .from('bloqueos_temporales')
    .select('id, expira_en, usuario_id')
    .eq('cancha_id', canchaId)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .maybeSingle();

  if (existente) {
    // Si el bloqueo es del mismo usuario, renovarlo
    if (existente.usuario_id === usuarioId) {
      const nuevaExpiracion = new Date(Date.now() + MINUTOS * 60 * 1000).toISOString();
      await sb.from('bloqueos_temporales')
        .update({ expira_en: nuevaExpiracion })
        .eq('id', existente.id);
      return NextResponse.json({ ok: true, expira_en: nuevaExpiracion, renovado: true });
    }
    return NextResponse.json({ error: 'Horario bloqueado por otro usuario' }, { status: 409 });
  }

  // Verificar que no haya reserva activa
  const { data: reservaExistente } = await sb
    .from('reservas')
    .select('id')
    .eq('cancha_id', canchaId)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .in('estado', ['pendiente', 'confirmada'])
    .maybeSingle();

  if (reservaExistente) {
    return NextResponse.json({ error: 'Horario ya reservado' }, { status: 409 });
  }

  const expira_en = new Date(Date.now() + MINUTOS * 60 * 1000).toISOString();

  const { error } = await sb.from('bloqueos_temporales').insert({
    cancha_id: canchaId,
    fecha,
    hora,
    usuario_id: usuarioId,
    expira_en,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, expira_en, minutos: MINUTOS });
}

// DELETE — liberar bloqueo al cancelar o completar pago
export async function DELETE(req: NextRequest) {
  const { canchaId, fecha, hora } = await req.json();
  if (!canchaId || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const sb = createServiceClient();
  await sb.from('bloqueos_temporales')
    .delete()
    .eq('cancha_id', canchaId)
    .eq('fecha', fecha)
    .eq('hora', hora);

  return NextResponse.json({ ok: true });
}
