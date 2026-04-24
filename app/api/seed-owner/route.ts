import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/seed-owner — crea usuario dueño de prueba y le asigna canchas
export async function GET() {
  const sb = createServiceClient();

  const EMAIL    = 'dueno@canchapiura.com';
  const PASSWORD = 'cancha123';
  const NOMBRE   = 'Carlos Mendoza';
  const TELEFONO = '987654321';

  // 1. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { nombre: NOMBRE, telefono: TELEFONO },
  });

  if (authError && !authError.message.includes('already been registered')) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Obtener el ID del usuario (ya sea nuevo o existente)
  let userId = authData?.user?.id;
  if (!userId) {
    const { data: existing } = await sb.auth.admin.listUsers();
    const found = existing?.users?.find(u => u.email === EMAIL);
    userId = found?.id;
  }

  if (!userId) {
    return NextResponse.json({ error: 'No se pudo obtener el ID del usuario' }, { status: 500 });
  }

  // 2. Insertar en tabla usuarios con rol 'dueno'
  await sb.from('usuarios').upsert({
    id:       userId,
    nombre:   NOMBRE,
    email:    EMAIL,
    telefono: TELEFONO,
    rol:      'dueno',
  }, { onConflict: 'id' });

  // 3. Asignar canchas al dueño
  const CANCHA_IDS = [
    'a1b2c3d4-0001-0001-0001-000000000001',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'a1b2c3d4-0006-0006-0006-000000000006',
  ];

  for (const canchaId of CANCHA_IDS) {
    await sb.from('duenos_canchas').upsert(
      { usuario_id: userId, cancha_id: canchaId },
      { onConflict: 'usuario_id,cancha_id' }
    );
  }

  return NextResponse.json({
    ok: true,
    mensaje: 'Usuario dueño creado correctamente',
    credenciales: { email: EMAIL, password: PASSWORD },
    canchasAsignadas: CANCHA_IDS.length,
  });
}
