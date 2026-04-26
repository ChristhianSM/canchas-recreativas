import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — verificar que el usuario autenticado tiene rol 'admin'
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: usuario, error } = await sb
    .from('usuarios')
    .select('nombre, rol')
    .eq('id', user.id)
    .single();

  if (error || !usuario) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  if (usuario.rol !== 'superadmin') {
    return NextResponse.json({ esAdmin: false }, { status: 403 });
  }

  return NextResponse.json({ esAdmin: true, nombre: usuario.nombre });
}
