import { SupabaseClient } from '@supabase/supabase-js';

type Motivo = 'reserva' | 'partido' | 'resena';

// Agrega un sello al programa de fidelización de una cancha específica.
// Si la cancha no tiene programa activo, no hace nada.
export async function agregarSelloCancha(
  sb: SupabaseClient,
  usuarioId: string | null | undefined,
  canchaId: string,
) {
  if (!usuarioId) return;

  const { error } = await sb.rpc('agregar_sellos_cancha', {
    p_usuario_id: usuarioId,
    p_cancha_id:  canchaId,
    p_cantidad:   1,
  });

  if (error) {
    console.error('[loyalty-cancha] Error agregar_sellos_cancha:', JSON.stringify(error));
  }
}

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
  }
}

// Revierte el sello de una cancha al cancelar una reserva confirmada.
// Si al confirmar se generó un cupón (sellos actuales = 0), lo elimina y
// restaura a umbral-1. Si no, simplemente resta 1 sello.
export async function revertirSelloCancha(
  sb: SupabaseClient,
  usuarioId: string | null | undefined,
  canchaId: string,
) {
  if (!usuarioId) return;

  const [{ data: selloRow }, { data: config }] = await Promise.all([
    sb.from('cancha_sellos')
      .select('sellos, total_reservas')
      .eq('usuario_id', usuarioId)
      .eq('cancha_id', canchaId)
      .maybeSingle(),
    sb.from('cancha_loyalty_config')
      .select('umbral, activo')
      .eq('cancha_id', canchaId)
      .eq('activo', true)
      .maybeSingle(),
  ]);

  if (!selloRow || !config) return;

  if (selloRow.sellos === 0) {
    // El umbral se alcanzó al confirmar esta reserva → eliminar el cupón generado
    const { data: cupon } = await sb
      .from('cancha_cupones')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('cancha_id', canchaId)
      .eq('usado', false)
      .order('generado_en', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cupon) {
      await sb.from('cancha_cupones').delete().eq('id', cupon.id);
    }

    await sb.from('cancha_sellos')
      .update({
        sellos:         config.umbral - 1,
        total_reservas: Math.max(0, selloRow.total_reservas - 1),
      })
      .eq('usuario_id', usuarioId)
      .eq('cancha_id', canchaId);
  } else {
    await sb.from('cancha_sellos')
      .update({
        sellos:         Math.max(0, selloRow.sellos - 1),
        total_reservas: Math.max(0, selloRow.total_reservas - 1),
      })
      .eq('usuario_id', usuarioId)
      .eq('cancha_id', canchaId);
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
