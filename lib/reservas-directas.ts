import { NextResponse } from 'next/server';

export async function crearReservasDirectas({
  sb, cancha_id, cancha_nombre, cliente_nombre, cliente_telefono,
  fecha, hora, precio, metodo_pago, semanas, nota,
}: {
  sb: any;
  cancha_id: string;
  cancha_nombre: string;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  fecha: string;
  hora: string;
  precio: number;
  metodo_pago: string;
  semanas: number;
  nota?: string | null;
}) {
  const nSemanas = Math.min(Math.max(1, Number(semanas)), 52);
  const fechaBase = new Date(fecha + 'T00:00:00');

  const resultados: { fecha: string; estado: 'creada' | 'conflicto' }[] = [];
  const reservasCreadas: any[] = [];

  for (let i = 0; i < nSemanas; i++) {
    const fechaActual = new Date(fechaBase);
    fechaActual.setDate(fechaBase.getDate() + i * 7);
    const fechaStr = fechaActual.toISOString().split('T')[0];

    // Verificar conflicto: reserva activa en ese slot
    const { data: conflicto } = await sb
      .from('reservas')
      .select('id')
      .eq('cancha_id', cancha_id)
      .eq('fecha', fechaStr)
      .eq('hora', hora)
      .in('estado', ['pendiente', 'confirmada'])
      .maybeSingle();

    if (conflicto) {
      resultados.push({ fecha: fechaStr, estado: 'conflicto' });
      continue;
    }

    const { data: reserva, error } = await sb
      .from('reservas')
      .insert({
        cancha_id,
        cancha_nombre,
        usuario_id:         null,
        usuario_nombre:     cliente_nombre,
        usuario_email:      '',
        usuario_telefono:   cliente_telefono ?? '',
        fecha:              fechaStr,
        hora,
        precio:             Number(precio),
        precio_original:    Number(precio),
        metodo_pago,
        estado:             'confirmada',
        modo_pago:          'completo',
        monto_adelanto:     Number(precio),
        saldo_pendiente:    0,
        saldo_cobrado:      false,
        balon_incluido:     false,
        chalecos_incluido:  false,
        cupon_aplicado:     false,
        es_reserva_directa: true,
      })
      .select()
      .single();

    if (!error && reserva) {
      reservasCreadas.push(reserva);
      resultados.push({ fecha: fechaStr, estado: 'creada' });
    }
  }

  return NextResponse.json({
    created:    reservasCreadas.length,
    skipped:    resultados.filter(r => r.estado === 'conflicto').length,
    resultados,
    reservas:   reservasCreadas,
  });
}
