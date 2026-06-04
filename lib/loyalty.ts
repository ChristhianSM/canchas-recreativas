import { SupabaseClient } from '@supabase/supabase-js';

type Motivo = 'reserva' | 'partido' | 'resena';

export async function agregarSellos(
  sb: SupabaseClient,
  usuarioId: string | null | undefined,
  cantidad: number,
  motivo: Motivo,
) {
  if (!usuarioId) return;

  const { error } = await sb.rpc('agregar_sellos', {
    p_usuario_id: usuarioId,
    p_cantidad:   cantidad,
    p_es_reserva: motivo === 'reserva',
    p_motivo:     motivo,
  });

  if (error) {
    console.error(`[loyalty] Error agregar_sellos (${motivo}):`, JSON.stringify(error));
  } else {
    console.log(`[loyalty] +${cantidad} sello(s) [${motivo}] → ${usuarioId}`);
  }
}

// Detecta si la reserva es de un partido y otorga los sellos correctos:
// - Reserva de partido confirmada → +2 al organizador
// - Reserva normal confirmada     → +1 al usuario
export async function agregarSellosReserva(
  sb: SupabaseClient,
  reserva: { id: string; cancha_id: string; fecha: string; hora: string; usuario_id: string | null },
) {
  // Búsqueda primaria por reserva_id
  let { data: partido } = await sb
    .from('partidos')
    .select('organizador_id')
    .eq('reserva_id', reserva.id)
    .maybeSingle();

  // Fallback: buscar por cancha/fecha/hora/organizador (cubre partidos viejos sin reserva_id)
  if (!partido && reserva.cancha_id && reserva.usuario_id) {
    const { data: p } = await sb
      .from('partidos')
      .select('organizador_id')
      .eq('cancha_id', reserva.cancha_id)
      .eq('fecha', reserva.fecha)
      .eq('hora', reserva.hora)
      .eq('organizador_id', reserva.usuario_id)
      .maybeSingle();
    partido = p;
  }

  if (partido) {
    await agregarSellos(sb, partido.organizador_id, 2, 'partido');
  } else {
    await agregarSellos(sb, reserva.usuario_id, 1, 'reserva');
  }
}
