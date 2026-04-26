import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST — sincronizar usuario OAuth con la tabla usuarios y loyalty
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { nombre, email, telefono } = await req.json();

  // Upsert en tabla usuarios
  const { error: upsertError } = await sb.from('usuarios').upsert({
    id:       user.id,
    nombre:   nombre,
    email:    email,
    telefono: telefono ?? '',
  }, { onConflict: 'id' });

  if (upsertError) {
    console.error('[sync-oauth] Error upsert usuarios:', upsertError.message);
  }

  // Crear loyalty si no existe
  const { data: loyalty } = await sb
    .from('loyalty')
    .select('id')
    .eq('usuario_id', user.id)
    .single();

  if (!loyalty) {
    await sb.from('loyalty').insert({
      usuario_id:     user.id,
      sellos:         0,
      total_reservas: 0,
    });
  }

  return NextResponse.json({ ok: true });
}
