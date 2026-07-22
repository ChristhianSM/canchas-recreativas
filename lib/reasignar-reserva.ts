import { createServiceClient } from '@/lib/supabase';
import { resolverPrecio, type PrecioConfigurable } from '@/lib/precio-utils';

type SupabaseClient = ReturnType<typeof createServiceClient>;

type FilaReserva = { id: string; hora: string; precio: number };

/**
 * Filas del grupo (reserva multi-hora) o solo la fila indicada.
 * Se ordenan por hora ascendente porque al crear la reserva la fila de la
 * PRIMERA hora es la "principal": guarda el precio TOTAL de todo el grupo,
 * mientras que las demás guardan solo el promedio por hora (ver
 * app/api/reservas/route.ts, esPrincipal = i === 0).
 */
async function obtenerFilasGrupo(
  sb: SupabaseClient,
  reserva: { id: string; hora: string; precio: number; grupo_reserva_id: string | null },
): Promise<{ ok: true; filas: FilaReserva[] } | { ok: false }> {
  const { data, error } = reserva.grupo_reserva_id
    ? await sb
        .from('reservas')
        .select('id, hora, precio')
        .eq('grupo_reserva_id', reserva.grupo_reserva_id)
        .order('hora', { ascending: true })
    : { data: [{ id: reserva.id, hora: reserva.hora, precio: reserva.precio }], error: null };

  if (error || !data || data.length === 0) return { ok: false };
  return { ok: true, filas: data };
}

type ReasignarResult =
  | {
      ok: true;
      reservaId: string;
      grupoReservaId: string | null;
      canchaId: string;
      seccionIdDestino: string | null;
      diferencia: number;
      nuevoPrecioTotal: number;
      usuarioId: string | null;
      usuarioTelefono: string | null;
      canchaNombre: string;
      fecha: string;
      horaNotificacion: string;
    }
  | { ok: false; status: number; error: string };

/**
 * Mueve una reserva activa entre "cancha completa" (seccion_id null) y una sección
 * específica de la MISMA cancha (ej. el usuario reservó por error la cancha de 11
 * en vez de una de las 3 secciones de 7 en las que se puede fraccionar).
 *
 * Recalcula el precio real del destino para cada hora del grupo (si es una reserva
 * multi-hora) y registra la diferencia a favor/en contra del usuario para que se
 * resuelva en persona cuando llegue a jugar — no es un reembolso bancario.
 */
export async function reasignarSeccionReserva(
  sb: SupabaseClient,
  { reservaId, seccionIdDestino }: { reservaId: string; seccionIdDestino: string | null },
): Promise<ReasignarResult> {
  const { data: reserva, error: reservaError } = await sb
    .from('reservas')
    .select('id, cancha_id, cancha_nombre, seccion_id, estado, fecha, hora, precio, grupo_reserva_id, usuario_id, usuario_telefono')
    .eq('id', reservaId)
    .maybeSingle();

  if (reservaError || !reserva) {
    return { ok: false, status: 404, error: 'Reserva no encontrada' };
  }

  if (!['pendiente', 'confirmada'].includes(reserva.estado)) {
    return { ok: false, status: 400, error: 'Solo se pueden reasignar reservas pendientes o confirmadas' };
  }

  // No tiene sentido mover una reserva cuyo horario ya empezó o pasó (el partido ya se jugó o está en curso)
  const fechaHoraReserva = new Date(`${reserva.fecha}T${reserva.hora}`);
  if (fechaHoraReserva < new Date()) {
    return { ok: false, status: 400, error: 'No se puede reasignar una reserva cuyo horario ya pasó' };
  }

  const seccionActual = reserva.seccion_id ?? null;
  if (seccionActual === seccionIdDestino) {
    return { ok: false, status: 400, error: 'La reserva ya está en ese destino' };
  }

  // Config de precio del destino: la sección o la cancha completa
  let precioConfigDestino: PrecioConfigurable;
  if (seccionIdDestino) {
    const { data: seccion, error: seccionError } = await sb
      .from('cancha_secciones')
      .select('cancha_id, activa, precio_por_hora, precios_por_hora, precios_por_dia')
      .eq('id', seccionIdDestino)
      .maybeSingle();

    if (seccionError || !seccion) {
      return { ok: false, status: 404, error: 'Sección destino no encontrada' };
    }
    if (seccion.cancha_id !== reserva.cancha_id) {
      return { ok: false, status: 400, error: 'La sección destino no pertenece a esta cancha' };
    }
    if (!seccion.activa) {
      return { ok: false, status: 400, error: 'La sección destino no está activa' };
    }
    precioConfigDestino = seccion;
  } else {
    const { data: cancha, error: canchaError } = await sb
      .from('canchas')
      .select('precio_por_hora, precios_por_hora, precios_por_dia')
      .eq('id', reserva.cancha_id)
      .maybeSingle();

    if (canchaError || !cancha) {
      return { ok: false, status: 404, error: 'Cancha no encontrada' };
    }
    precioConfigDestino = cancha;
  }

  const filasResult = await obtenerFilasGrupo(sb, reserva);
  if (!filasResult.ok) {
    return { ok: false, status: 500, error: 'No se pudieron obtener los horarios de la reserva' };
  }
  const filasGrupo = filasResult.filas;

  const [filaPrincipal, ...filasRestantes] = filasGrupo;
  const idsGrupo = filasGrupo.map((f) => f.id);
  const horasGrupo = filasGrupo.map((f) => f.hora);

  // Validar disponibilidad del destino para cada hora. Se trae todo activo en ese
  // cancha_id+fecha+hora y se filtra en JS (en vez de usar .not()/.or() con strings
  // armados a mano) para no depender de que el filtro se arme bien del lado de Postgrest
  // y para poder revisar el error explícitamente en vez de asumir "sin conflicto" si falla.
  const { data: candidatos, error: conflictoError } = await sb
    .from('reservas')
    .select('id, hora, seccion_id')
    .eq('cancha_id', reserva.cancha_id)
    .eq('fecha', reserva.fecha)
    .in('hora', horasGrupo)
    .in('estado', ['pendiente', 'confirmada']);

  if (conflictoError) {
    return { ok: false, status: 500, error: 'No se pudo validar la disponibilidad del destino' };
  }

  const idsGrupoSet = new Set(idsGrupo);
  const conflictos = (candidatos ?? []).filter((c) => {
    if (idsGrupoSet.has(c.id)) return false; // fila propia del grupo que se está reasignando
    if (!seccionIdDestino) return true; // destino = cancha completa: cualquier otra reserva activa bloquea
    return c.seccion_id === null || c.seccion_id === seccionIdDestino; // destino = sección: bloquea completa o esa misma sección
  });

  if (conflictos.length > 0) {
    return { ok: false, status: 409, error: `El horario ${conflictos[0].hora} ya está ocupado en el destino elegido` };
  }

  // Precio total nuevo = suma del precio real de cada hora del grupo en el destino
  // (más preciso que la creación original, que solo mira la hora de inicio × horas)
  const nuevoPrecioTotal = horasGrupo.reduce(
    (sum, hora) => sum + resolverPrecio(precioConfigDestino, reserva.fecha, hora),
    0,
  );
  const precioPromedioPorHora = Math.round(nuevoPrecioTotal / horasGrupo.length);
  const precioAnteriorTotal = filaPrincipal.precio; // por convención, ya representa el total del grupo
  const diferencia = precioAnteriorTotal - nuevoPrecioTotal;
  const ahora = new Date().toISOString();

  try {
    const { error: principalError } = await sb
      .from('reservas')
      .update({
        seccion_id: seccionIdDestino,
        precio: nuevoPrecioTotal,
        precio_previo_reasignacion: precioAnteriorTotal,
        diferencia_reasignacion: diferencia,
        diferencia_reasignacion_saldada: diferencia === 0,
        diferencia_reasignacion_saldada_en: diferencia === 0 ? ahora : null,
        reasignado_en: ahora,
      })
      .eq('id', filaPrincipal.id);
    if (principalError) throw principalError;

    if (filasRestantes.length > 0) {
      const { error: restantesError } = await sb
        .from('reservas')
        .update({
          seccion_id: seccionIdDestino,
          precio: precioPromedioPorHora,
          reasignado_en: ahora,
        })
        .in('id', filasRestantes.map((f) => f.id));
      if (restantesError) throw restantesError;
    }
  } catch (e: any) {
    if (e?.code === '23505') {
      return { ok: false, status: 409, error: 'El horario ya no está disponible, otro usuario lo reservó justo ahora' };
    }
    return { ok: false, status: 500, error: e?.message ?? 'Error al reasignar la reserva' };
  }

  // Notificación in-app al usuario (si tiene cuenta registrada)
  if (reserva.usuario_id) {
    const destinoLabel = seccionIdDestino ? 'una sección específica' : 'la cancha completa';
    const mensajeDiferencia =
      diferencia > 0
        ? ` Se te entregará S/ ${diferencia} cuando vayas a jugar.`
        : diferencia < 0
          ? ` Deberás abonar S/ ${Math.abs(diferencia)} adicionales en cancha.`
          : '';
    try {
      await sb.from('notificaciones').insert({
        usuario_id: reserva.usuario_id,
        reserva_id: reserva.id,
        mensaje: `Tu reserva en ${reserva.cancha_nombre} fue reasignada a ${destinoLabel}.${mensajeDiferencia}`,
        tipo: 'reasignada',
      });
    } catch (e) {
      console.error('[reasignar-reserva] Error creando notificación in-app:', e);
    }
  }

  const horaFin = `${String(parseInt(horasGrupo[horasGrupo.length - 1].split(':')[0]) + 1).padStart(2, '0')}:00`;
  const horaNotificacion = horasGrupo.length > 1 ? `${horasGrupo[0]} - ${horaFin}` : horasGrupo[0];

  return {
    ok: true,
    reservaId: reserva.id,
    grupoReservaId: reserva.grupo_reserva_id,
    canchaId: reserva.cancha_id,
    seccionIdDestino,
    diferencia,
    nuevoPrecioTotal,
    usuarioId: reserva.usuario_id,
    usuarioTelefono: reserva.usuario_telefono,
    canchaNombre: reserva.cancha_nombre,
    fecha: reserva.fecha,
    horaNotificacion,
  };
}

type DisponibilidadResult =
  | {
      ok: true;
      seccionActual: string | null;
      completaOcupada: boolean;
      seccionesOcupadas: string[];
      hayReservaCompletaBloqueando: boolean;
      precioCompleta: number;
      preciosPorSeccion: Record<string, number>;
    }
  | { ok: false; status: number; error: string };

/**
 * Para el modal de reasignación: indica, para el mismo horario de la reserva,
 * qué destinos están ocupados por OTRA reserva activa (para deshabilitarlos en
 * el selector antes de que el usuario intente confirmar uno inválido) y cuál
 * sería el precio REAL de cada destino para esa fecha/hora exacta (respetando
 * precios_por_hora / precios_por_dia — el precio_por_hora base de la sección
 * no sirve para mostrarlo tal cual, porque puede haber overrides).
 *
 * - completaOcupada: true si cualquier otra reserva activa (de cualquier sección
 *   o de la cancha completa) ocupa ese horario — bloquea mover a "cancha completa".
 * - seccionesOcupadas: ids de sección directamente reservados por otra reserva.
 * - hayReservaCompletaBloqueando: si hay una reserva de la CANCHA COMPLETA activa
 *   en ese horario, bloquea TODAS las secciones (no solo las de seccionesOcupadas).
 *   El frontend combina ambos: una sección se deshabilita si está en
 *   seccionesOcupadas O si hayReservaCompletaBloqueando es true.
 * - precioCompleta / preciosPorSeccion: precio total real (suma por hora, igual
 *   que en reasignarSeccionReserva) que tendría la reserva en cada destino.
 */
export async function verificarDisponibilidadDestinos(
  sb: SupabaseClient,
  { reservaId }: { reservaId: string },
): Promise<DisponibilidadResult> {
  const { data: reserva, error: reservaError } = await sb
    .from('reservas')
    .select('id, cancha_id, seccion_id, fecha, hora, precio, grupo_reserva_id')
    .eq('id', reservaId)
    .maybeSingle();

  if (reservaError || !reserva) {
    return { ok: false, status: 404, error: 'Reserva no encontrada' };
  }

  const filasResult = await obtenerFilasGrupo(sb, reserva);
  if (!filasResult.ok) {
    return { ok: false, status: 500, error: 'No se pudieron obtener los horarios de la reserva' };
  }
  const idsGrupoSet = new Set(filasResult.filas.map((f) => f.id));
  const horasGrupo = filasResult.filas.map((f) => f.hora);

  const [candidatosResult, canchaResult, seccionesResult] = await Promise.all([
    sb
      .from('reservas')
      .select('id, seccion_id')
      .eq('cancha_id', reserva.cancha_id)
      .eq('fecha', reserva.fecha)
      .in('hora', horasGrupo)
      .in('estado', ['pendiente', 'confirmada']),
    sb
      .from('canchas')
      .select('precio_por_hora, precios_por_hora, precios_por_dia')
      .eq('id', reserva.cancha_id)
      .maybeSingle(),
    sb
      .from('cancha_secciones')
      .select('id, precio_por_hora, precios_por_hora, precios_por_dia')
      .eq('cancha_id', reserva.cancha_id)
      .eq('activa', true),
  ]);

  if (candidatosResult.error) {
    return { ok: false, status: 500, error: 'No se pudo consultar la disponibilidad' };
  }
  const canchaConfig = canchaResult.data;
  if (canchaResult.error || !canchaConfig) {
    return { ok: false, status: 404, error: 'Cancha no encontrada' };
  }

  const otrasReservas = (candidatosResult.data ?? []).filter((c) => !idsGrupoSet.has(c.id));
  const hayReservaCompletaBloqueando = otrasReservas.some((c) => c.seccion_id === null);
  const seccionesOcupadas = otrasReservas
    .filter((c) => c.seccion_id !== null)
    .map((c) => c.seccion_id as string);

  const precioCompleta = horasGrupo.reduce(
    (sum, hora) => sum + resolverPrecio(canchaConfig, reserva.fecha, hora),
    0,
  );
  const preciosPorSeccion: Record<string, number> = {};
  for (const seccion of seccionesResult.data ?? []) {
    preciosPorSeccion[seccion.id] = horasGrupo.reduce(
      (sum, hora) => sum + resolverPrecio(seccion, reserva.fecha, hora),
      0,
    );
  }

  return {
    ok: true,
    seccionActual: reserva.seccion_id ?? null,
    completaOcupada: otrasReservas.length > 0,
    seccionesOcupadas,
    hayReservaCompletaBloqueando,
    precioCompleta,
    preciosPorSeccion,
  };
}
