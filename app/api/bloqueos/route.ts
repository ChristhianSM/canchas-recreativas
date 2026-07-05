import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const MINUTOS = 5;

function horasConsecutivas(horaInicio: string, count: number): string[] {
  const h = parseInt(horaInicio.split(':')[0]);
  return Array.from({ length: count }, (_, i) =>
    `${String((h + i) % 24).padStart(2, '0')}:00`
  );
}

// POST — crear bloqueo temporal al iniciar pago
export async function POST(req: NextRequest) {
  const { canchaId, fecha, hora, horas = 1, seccionId = null } = await req.json();
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
    // Verificar bloqueo temporal existente para esta combinación cancha+sección+hora
    const bloqueoQuery = sb
      .from('bloqueos_temporales')
      .select('id, usuario_id')
      .eq('cancha_id', canchaId)
      .eq('fecha', fecha)
      .eq('hora', slotHora);

    const { data: existente } = await (seccionId
      ? bloqueoQuery.eq('seccion_id', seccionId)
      : bloqueoQuery.is('seccion_id', null)
    ).maybeSingle();

    if (existente) {
      if (usuarioId !== null && existente.usuario_id === usuarioId) {
        await sb.from('bloqueos_temporales').update({ expira_en }).eq('id', existente.id);
        continue;
      }
      return NextResponse.json({ error: 'Horario bloqueado por otro usuario' }, { status: 409 });
    }

    // Verificar conflictos con reservas existentes (sección ↔ completa)
    // Si reservando sección: bloquear si hay reserva completa o de la misma sección
    // Si reservando completa: bloquear si hay cualquier reserva
    const reservaQuery = sb
      .from('reservas')
      .select('id')
      .eq('cancha_id', canchaId)
      .eq('fecha', fecha)
      .eq('hora', slotHora)
      .in('estado', ['pendiente', 'confirmada']);

    let reservaConflicto: any = null;
    if (seccionId) {
      // Reservando sección: conflicto si hay reserva completa (seccion_id IS NULL) o de esta misma sección
      const { data: r1 } = await reservaQuery.is('seccion_id', null).maybeSingle();
      if (r1) { reservaConflicto = r1; }
      else {
        const { data: r2 } = await sb.from('reservas').select('id')
          .eq('cancha_id', canchaId).eq('fecha', fecha).eq('hora', slotHora)
          .eq('seccion_id', seccionId).in('estado', ['pendiente', 'confirmada']).maybeSingle();
        reservaConflicto = r2;
      }
    } else {
      // Reservando completa: conflicto si hay cualquier reserva
      const { data: r } = await reservaQuery.maybeSingle();
      reservaConflicto = r;
    }

    if (reservaConflicto) {
      return NextResponse.json({ error: 'Horario ya reservado' }, { status: 409 });
    }

    // Verificar también conflictos con bloqueos temporales de la parte contraria
    if (seccionId) {
      // ¿Hay bloqueo para la cancha completa en este slot?
      const { data: bloqueoCompleto } = await sb.from('bloqueos_temporales')
        .select('id').eq('cancha_id', canchaId).eq('fecha', fecha).eq('hora', slotHora)
        .is('seccion_id', null).gt('expira_en', new Date().toISOString()).maybeSingle();
      if (bloqueoCompleto) {
        return NextResponse.json({ error: 'Horario bloqueado por otro usuario' }, { status: 409 });
      }
    } else {
      // Reservando completa: ¿hay bloqueo en cualquier sección?
      const { data: bloqueoSeccion } = await sb.from('bloqueos_temporales')
        .select('id').eq('cancha_id', canchaId).eq('fecha', fecha).eq('hora', slotHora)
        .not('seccion_id', 'is', null).gt('expira_en', new Date().toISOString()).maybeSingle();
      if (bloqueoSeccion) {
        return NextResponse.json({ error: 'Horario bloqueado por otro usuario' }, { status: 409 });
      }
    }

    const insertData: Record<string, any> = {
      cancha_id: canchaId, fecha, hora: slotHora, usuario_id: usuarioId, expira_en,
    };
    if (seccionId) insertData.seccion_id = seccionId;

    const { error } = await sb.from('bloqueos_temporales').insert(insertData);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Horario bloqueado por otro usuario' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, expira_en, minutos: MINUTOS });
}

// DELETE — liberar bloqueo al cancelar o completar pago
export async function DELETE(req: NextRequest) {
  const { canchaId, fecha, hora, horas = 1, seccionId = null } = await req.json();
  if (!canchaId || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const sb = createServiceClient();
  const slots = horasConsecutivas(hora, horas);

  const deleteQuery = sb.from('bloqueos_temporales')
    .delete()
    .eq('cancha_id', canchaId)
    .eq('fecha', fecha)
    .in('hora', slots);

  await (seccionId
    ? deleteQuery.eq('seccion_id', seccionId)
    : deleteQuery.is('seccion_id', null)
  );

  return NextResponse.json({ ok: true });
}
