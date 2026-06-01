import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const MINUTOS = 5; // 5 minutos

function horasConsecutivas(horaInicio: string, count: number): string[] {
  const h = parseInt(horaInicio.split(':')[0]);
  return Array.from({ length: count }, (_, i) =>
    `${String((h + i) % 24).padStart(2, '0')}:00`
  );
}

// POST — crear bloqueo temporal al iniciar pago
export async function POST(req: NextRequest) {
  const { canchaId, fecha, hora, horas = 1 } = await req.json();
  if (!canchaId || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const sb = createServiceClient();

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  let usuarioId: string | null = null;
  if (token) {
    const { data: { user } } = await sb.auth.getUser(token);
    usuarioId = user?.id ?? null;
  }

  await sb.from('bloqueos_temporales')
    .delete()
    .lt('expira_en', new Date().toISOString());

  const slots = horasConsecutivas(hora, horas);
  const expira_en = new Date(Date.now() + MINUTOS * 60 * 1000).toISOString();

  for (const slotHora of slots) {
    const { data: existente } = await sb
      .from('bloqueos_temporales')
      .select('id, usuario_id')
      .eq('cancha_id', canchaId)
      .eq('fecha', fecha)
      .eq('hora', slotHora)
      .maybeSingle();

    if (existente) {
      // Solo renovar si el bloqueo pertenece al mismo usuario autenticado.
      // Nunca renovar si usuarioId es null — dos invitados no se pueden distinguir.
      if (usuarioId !== null && existente.usuario_id === usuarioId) {
        await sb.from('bloqueos_temporales').update({ expira_en }).eq('id', existente.id);
        continue;
      }
      return NextResponse.json({ error: 'Horario bloqueado por otro usuario' }, { status: 409 });
    }

    const { data: reservaExistente } = await sb
      .from('reservas')
      .select('id')
      .eq('cancha_id', canchaId)
      .eq('fecha', fecha)
      .eq('hora', slotHora)
      .in('estado', ['pendiente', 'confirmada'])
      .maybeSingle();

    if (reservaExistente) {
      return NextResponse.json({ error: 'Horario ya reservado' }, { status: 409 });
    }

    const { error } = await sb.from('bloqueos_temporales').insert({
      cancha_id: canchaId, fecha, hora: slotHora, usuario_id: usuarioId, expira_en,
    });

    if (error) {
      if (error.code === '23505') {
        // Race condition: otro usuario insertó el bloqueo justo antes
        return NextResponse.json({ error: 'Horario bloqueado por otro usuario' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, expira_en, minutos: MINUTOS });
}

// DELETE — liberar bloqueo al cancelar o completar pago
export async function DELETE(req: NextRequest) {
  const { canchaId, fecha, hora, horas = 1 } = await req.json();
  if (!canchaId || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const sb = createServiceClient();
  const slots = horasConsecutivas(hora, horas);

  await sb.from('bloqueos_temporales')
    .delete()
    .eq('cancha_id', canchaId)
    .eq('fecha', fecha)
    .in('hora', slots);

  return NextResponse.json({ ok: true });
}
