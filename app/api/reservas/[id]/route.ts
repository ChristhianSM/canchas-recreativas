import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// PATCH — actualizar estado (confirmar, rechazar, cancelar)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { estado } = await req.json();

  const { data: reserva, error } = await sb
    .from('reservas')
    .update({ estado })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Crear notificación si aplica
  if ((estado === 'confirmada' || estado === 'rechazada') && reserva.usuario_id) {
    const fecha = new Date(reserva.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
    const msg = estado === 'confirmada'
      ? `✅ Tu reserva en ${reserva.cancha_nombre} el ${fecha} a las ${reserva.hora} fue confirmada.`
      : `❌ Tu reserva en ${reserva.cancha_nombre} el ${fecha} a las ${reserva.hora} fue rechazada.`;

    await sb.from('notificaciones').insert({
      usuario_id: reserva.usuario_id,
      reserva_id: reserva.id,
      mensaje:    msg,
      tipo:       estado,
    });

    // Sumar sello de loyalty si fue confirmada
    if (estado === 'confirmada') {
      const { data: loyalty } = await sb
        .from('loyalty')
        .select('*')
        .eq('usuario_id', reserva.usuario_id)
        .single();

      if (loyalty) {
        const nuevosSellos = loyalty.sellos + 1;
        const generaCupon  = nuevosSellos >= 6;

        await sb.from('loyalty').update({
          sellos:         generaCupon ? 0 : nuevosSellos,
          total_reservas: loyalty.total_reservas + 1,
        }).eq('usuario_id', reserva.usuario_id);

        if (generaCupon) {
          await sb.from('cupones').insert({
            usuario_id: reserva.usuario_id,
            descuento:  5,
          });
        }
      }
    }
  }

  return NextResponse.json(reserva);
}
