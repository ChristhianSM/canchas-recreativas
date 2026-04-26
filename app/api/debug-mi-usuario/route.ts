import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — mostrar información del usuario actual
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ 
      error: 'No hay token',
      hasToken: false 
    });
  }

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  
  if (authError || !user) {
    return NextResponse.json({ 
      error: 'Token inválido o usuario no encontrado',
      authError: authError?.message,
      hasToken: true,
      tokenValid: false
    });
  }

  // Buscar reservas de este usuario
  const { data: reservas, error: reservasError } = await sb
    .from('reservas')
    .select('id, cancha_nombre, fecha, hora, estado, creado_en')
    .eq('usuario_id', user.id)
    .order('creado_en', { ascending: false });

  // Buscar en tabla usuarios
  const { data: usuarioData, error: usuarioError } = await sb
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    hasToken: true,
    tokenValid: true,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at,
      user_metadata: user.user_metadata,
    },
    usuarioEnTabla: usuarioData,
    usuarioError: usuarioError?.message,
    reservas: reservas ?? [],
    totalReservas: reservas?.length ?? 0,
    reservasError: reservasError?.message,
  });
}