import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — debug: obtener todas las reservas para verificar datos
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  try {
    // Obtener todas las reservas del usuario
    const { data: reservas, error } = await sb
      .from('reservas')
      .select('*')
      .eq('usuario_id', user.id)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error al obtener reservas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      usuario_id: user.id,
      email: user.email,
      total_reservas: reservas?.length || 0,
      reservas: reservas || []
    });

  } catch (error) {
    console.error('Error en debug-reservas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}