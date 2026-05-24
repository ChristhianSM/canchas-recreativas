import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

// GET — listar todos los usuarios dueños
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('usuarios')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — crear nuevo usuario dueño
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!await verifyAdmin(token)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { nombre, email, password, telefono, rol } = await req.json();

  if (!nombre || !email || !password) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }

  const sb = createServiceClient();

  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, telefono: telefono ?? '', rol: rol ?? 'dueno' },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // Insertar en tabla usuarios
  await sb.from('usuarios').insert({
    id:       userId,
    nombre,
    email,
    telefono: telefono ?? '',
    rol:      rol ?? 'dueno',
  });

  // Crear loyalty
  await sb.from('loyalty').insert({
    usuario_id:     userId,
    sellos:         0,
    total_reservas: 0,
  });

  return NextResponse.json({ ok: true, id: userId });
}
