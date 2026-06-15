import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/date-utils';
import { notificarReservaRecibida, notificarNuevoPartido } from '@/lib/whatsapp';

// GET — listar partidos abiertos/completos desde hoy
export async function GET(req: NextRequest) {
  const sb = createServiceClient();
  const { searchParams } = new URL(req.url);
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  const deporte = searchParams.get('deporte');
  const soloHoy = searchParams.get('solo_hoy') === 'true';
  const hoy = getLocalDateString();

  let query = sb
    .from('partidos_con_detalles')
    .select('*')
    .in('estado', ['abierto', 'completo'])
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  if (deporte && deporte !== 'todos') query = query.eq('deporte', deporte);
  if (soloHoy) query = query.eq('fecha', hoy);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hora actual en Lima para descartar partidos de hoy que ya pasaron
  const horaActual = new Date().toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dataSinPasados = (data ?? []).filter(
    (p) => p.fecha > hoy || (p.fecha === hoy && p.hora >= horaActual),
  );

  // Marcar qué partidos ya unió el usuario autenticado
  let userId: string | null = null;
  if (token) {
    const { data: { user } } = await sb.auth.getUser(token);
    userId = user?.id ?? null;
  }

  const partidos = dataSinPasados.map((p) => {
    const esMiembro = userId
      ? Array.isArray(p.jugadores) && p.jugadores.some((j: any) => j.usuario_id === userId)
      : false;

    const esOrganizador = userId
      ? Array.isArray(p.jugadores) && p.jugadores.some((j: any) => j.usuario_id === userId && j.es_organizador)
      : false;

    const jugadores = Array.isArray(p.jugadores)
      ? p.jugadores.map((j: any) => ({
          ...j,
          // Solo el organizador ve nombre y teléfono de los jugadores
          nombre:   esOrganizador ? j.nombre : null,
          inicial:  esOrganizador ? j.inicial : null,
          telefono: esOrganizador ? (j.telefono ?? null) : null,
        }))
      : p.jugadores;

    return {
      ...p,
      jugadores,
      // precio_por_persona se recalcula usando jugadores_equipo (total del partido)
      precio_por_persona: Math.ceil(
        p.precio_total / (p.jugadores_equipo ?? p.jugadores_max)
      ),
      ya_unido: esMiembro,
      ya_organizador: userId
        ? Array.isArray(p.jugadores) && p.jugadores.some((j: any) => j.usuario_id === userId && j.es_organizador)
        : false,
    };
  });

  return NextResponse.json(partidos);
}

// POST — crear un nuevo partido (+ reserva que asegura el slot)
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const body = await req.json();
  const {
    cancha_id, cancha_nombre, deporte, fecha, hora,
    nivel, jugadores_max, jugadores_equipo, precio_total, descripcion,
    metodo_pago, comprobante_url, organizador_nombre, organizador_telefono,
  } = body;

  if (!cancha_id || !cancha_nombre || !deporte || !fecha || !hora || !jugadores_max || !precio_total || !metodo_pago) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }
  if (Number(jugadores_max) < 1) {
    return NextResponse.json({ error: 'Debes abrir al menos 1 cupo' }, { status: 400 });
  }
  const equipoTotal = Number(jugadores_equipo ?? jugadores_max);
  if (equipoTotal < Number(jugadores_max)) {
    return NextResponse.json({ error: 'El total del partido no puede ser menor que los cupos disponibles' }, { status: 400 });
  }

  // Si el comprobante es base64, subirlo a Supabase Storage y obtener URL pública
  let comprobantePublicUrl: string | null = comprobante_url || null;
  if (comprobante_url?.startsWith('data:')) {
    try {
      const base64Data = comprobante_url.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const mimeMatch = comprobante_url.match(/data:([^;]+);/);
      const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
      const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1] ?? 'jpg';
      const fileName = `comprobantes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await sb.storage
        .from('imagenes')
        .upload(fileName, buffer, { contentType: mimeType });

      if (!uploadError) {
        const { data: { publicUrl } } = sb.storage.from('imagenes').getPublicUrl(fileName);
        comprobantePublicUrl = publicUrl;
      } else {
        comprobantePublicUrl = null;
      }
    } catch {
      comprobantePublicUrl = null;
    }
  }

  // Verificar que el slot no esté ya reservado
  const { data: slotOcupado } = await sb
    .from('reservas')
    .select('id')
    .eq('cancha_id', cancha_id)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .in('estado', ['pendiente', 'confirmada'])
    .maybeSingle();

  if (slotOcupado) {
    return NextResponse.json(
      { error: 'Este horario ya fue reservado. Elige otro.' },
      { status: 409 },
    );
  }

  // Verificar que no exista ya un partido activo en ese horario
  const { data: partidoExistente } = await sb
    .from('partidos')
    .select('id')
    .eq('cancha_id', cancha_id)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .not('estado', 'in', '("cancelado","finalizado")')
    .maybeSingle();

  if (partidoExistente) {
    return NextResponse.json(
      { error: 'Ya existe un partido en este horario. Elige otro.' },
      { status: 409 },
    );
  }

  // Crear la reserva que asegura el slot
  const { data: reserva, error: reservaError } = await sb
    .from('reservas')
    .insert({
      cancha_id,
      cancha_nombre,
      usuario_id:       user.id,
      usuario_nombre:   organizador_nombre ?? user.email ?? 'Usuario',
      usuario_email:    user.email ?? '',
      usuario_telefono: organizador_telefono ?? '',
      fecha,
      hora,
      precio:           Number(precio_total),
      precio_original:  Number(precio_total),
      metodo_pago,
      comprobante_url:  comprobantePublicUrl,
      estado:           'pendiente',
      balon_incluido:   false,
      chalecos_incluido: false,
      modo_pago:        'completo',
      monto_adelanto:   Number(precio_total),
      saldo_pendiente:  0,
      saldo_cobrado:    false,
      cupon_aplicado:   false,
    })
    .select()
    .single();

  if (reservaError) {
    return NextResponse.json({ error: reservaError.message }, { status: 500 });
  }

  // Crear el partido vinculado a la reserva (nace en pendiente hasta confirmación del admin)
  const { data: partido, error: insertError } = await sb
    .from('partidos')
    .insert({
      cancha_id,
      reserva_id:    reserva.id,
      deporte,
      fecha,
      hora,
      nivel:         nivel ?? 'libre',
      jugadores_max:    Number(jugadores_max),
      jugadores_equipo: equipoTotal,
      precio_total:     Number(precio_total),
      descripcion:   descripcion || null,
      organizador_id: user.id,
      estado:        'pendiente',
    })
    .select()
    .single();

  if (insertError) {
    // Rollback: eliminar la reserva recién creada
    await sb.from('reservas').delete().eq('id', reserva.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Insertar al organizador como primer jugador
  await sb.from('partido_jugadores').insert({
    partido_id: partido.id,
    usuario_id: user.id,
    es_organizador: true,
    estado_pago: 'pendiente',
  });

  // Notificar al organizador que su partido está pendiente de confirmación
  if (organizador_telefono) {
    await notificarReservaRecibida({
      clientePhone: organizador_telefono,
      canchaNombre: cancha_nombre,
      fecha,
      hora,
      precio:     Number(precio_total),
      metodoPago: metodo_pago,
      reservaId:  reserva.id,
    });
  }

  // Notificar al dueño de la cancha para que confirme o rechace
  const { data: dueno } = await sb
    .from('duenos_canchas')
    .select('usuarios(telefono)')
    .eq('cancha_id', cancha_id)
    .maybeSingle();

  const duenoPhone = (dueno?.usuarios as any)?.telefono ?? process.env.ADMIN_WHATSAPP_NUMBER;
  if (duenoPhone) {
    await notificarNuevoPartido({
      adminPhone:          duenoPhone,
      canchaNombre:        cancha_nombre,
      fecha,
      hora,
      precio:              Number(precio_total),
      metodoPago:          metodo_pago,
      organizadorNombre:   organizador_nombre ?? user.email ?? 'Organizador',
      organizadorTelefono: organizador_telefono ?? '',
      reservaId:           reserva.id,
      deporte,
      nivel:               nivel ?? 'libre',
      jugadoresMax:        Number(jugadores_max),
      comprobanteUrl:      comprobantePublicUrl,
    });
  }

  return NextResponse.json(partido, { status: 201 });
}
