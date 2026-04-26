import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error } = await sb.auth.getUser(token);

  if (error || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: perfil } = await sb
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();

  // Si no hay perfil en la tabla, devolver datos básicos de user_metadata
  if (!perfil) {
    return NextResponse.json({
      id: user.id,
      email: user.email,
      nombre: user.user_metadata?.nombre ?? user.user_metadata?.full_name ?? '',
      telefono: user.user_metadata?.telefono ?? '',
      rol: 'usuario',
    });
  }

  // Combinar: usar el teléfono de la tabla usuarios (fuente de verdad)
  // Solo si está explícitamente null/vacío en la tabla, no buscar en user_metadata
  return NextResponse.json({
    ...perfil,
    telefono: perfil.telefono ?? '',
  });
}
