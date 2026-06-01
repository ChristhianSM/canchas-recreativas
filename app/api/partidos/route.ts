import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/date-utils';

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

  // Marcar qué partidos ya unió el usuario autenticado
  let userId: string | null = null;
  if (token) {
    const { data: { user } } = await sb.auth.getUser(token);
    userId = user?.id ?? null;
  }

  const partidos = (data ?? []).map((p) => ({
    ...p,
    ya_unido: userId
      ? Array.isArray(p.jugadores) && p.jugadores.some((j: any) => j.usuario_id === userId)
      : false,
    ya_organizador: userId
      ? Array.isArray(p.jugadores) && p.jugadores.some((j: any) => j.usuario_id === userId && j.es_organizador)
      : false,
  }));

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
    nivel, jugadores_max, precio_total, descripcion,
    metodo_pago, comprobante_url,
  } = body;

  if (!cancha_id || !cancha_nombre || !deporte || !fecha || !hora || !jugadores_max || !precio_total || !metodo_pago) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }
  if (Number(jugadores_max) < 2) {
    return NextResponse.json({ error: 'Se necesitan al menos 2 jugadores' }, { status: 400 });
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

  // Obtener datos del organizador
  const { data: usuario } = await sb
    .from('usuarios')
    .select('nombre, telefono')
    .eq('id', user.id)
    .single();

  // Crear la reserva que asegura el slot
  const { data: reserva, error: reservaError } = await sb
    .from('reservas')
    .insert({
      cancha_id,
      cancha_nombre,
      usuario_id:       user.id,
      usuario_nombre:   usuario?.nombre ?? user.email ?? 'Usuario',
      usuario_email:    user.email ?? '',
      usuario_telefono: usuario?.telefono ?? '',
      fecha,
      hora,
      precio:           Number(precio_total),
      precio_original:  Number(precio_total),
      metodo_pago,
      comprobante_url:  comprobante_url || null,
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

  // Crear el partido vinculado a la reserva
  const { data: partido, error: insertError } = await sb
    .from('partidos')
    .insert({
      cancha_id,
      reserva_id:    reserva.id,
      deporte,
      fecha,
      hora,
      nivel:         nivel ?? 'libre',
      jugadores_max: Number(jugadores_max),
      precio_total:  Number(precio_total),
      descripcion:   descripcion || null,
      organizador_id: user.id,
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

  return NextResponse.json(partido, { status: 201 });
}
