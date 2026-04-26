import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — mostrar todas las reservas con información del usuario
export async function GET(req: NextRequest) {
  const sb = createServiceClient();

  // Obtener todas las reservas con información del usuario
  const { data, error } = await sb
    .from('reservas')
    .select(`
      id,
      cancha_id,
      cancha_nombre,
      usuario_id,
      usuario_nombre,
      usuario_email,
      usuario_telefono,
      fecha,
      hora,
      precio,
      estado,
      creado_en
    `)
    .order('creado_en', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // También obtener información de usuarios de la tabla auth
  const { data: usuarios, error: usuariosError } = await sb.auth.admin.listUsers();

  const usuariosMap = new Map();
  if (!usuariosError && usuarios) {
    usuarios.users.forEach(user => {
      usuariosMap.set(user.id, {
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || 'Sin nombre',
        phone: user.user_metadata?.phone || user.phone || 'Sin teléfono',
      });
    });
  }

  // Enriquecer reservas con información de auth
  const reservasEnriquecidas = (data ?? []).map((reserva: any) => {
    const userInfo = usuariosMap.get(reserva.usuario_id);
    return {
      ...reserva,
      auth_user_email: userInfo?.email,
      auth_user_name: userInfo?.name,
      auth_user_phone: userInfo?.phone,
    };
  });

  return NextResponse.json({
    totalReservas: data?.length ?? 0,
    reservas: reservasEnriquecidas,
    usuariosEnAuth: usuarios?.users?.length ?? 0,
    resumen: {
      porEstado: data?.reduce((acc: any, r: any) => {
        acc[r.estado] = (acc[r.estado] || 0) + 1;
        return acc;
      }, {}),
      porUsuario: data?.reduce((acc: any, r: any) => {
        const key = r.usuario_email || r.usuario_id;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    },
  });
}