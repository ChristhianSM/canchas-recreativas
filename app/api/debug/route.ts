import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sb = createServiceClient();
  const results: Record<string, any> = {};

  // Probar cada tabla
  const tablas = ['usuarios', 'canchas', 'reservas', 'favoritos', 'notificaciones', 'loyalty', 'cupones'];
  for (const tabla of tablas) {
    const { error } = await sb.from(tabla).select('count').limit(1);
    results[tabla] = error ? `ERROR: ${error.message}` : 'OK';
  }

  // Probar token si viene en el header
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    const { data: { user }, error } = await sb.auth.getUser(token);
    results['token_valido'] = error ? `ERROR: ${error.message}` : `OK - user: ${user?.id}`;

    if (user) {
      // Probar insertar favorito de prueba
      const { error: favError } = await sb.from('favoritos').select('*').eq('usuario_id', user.id);
      results['favoritos_usuario'] = favError ? `ERROR: ${favError.message}` : 'OK';
    }
  } else {
    results['token_valido'] = 'No se envió token';
  }

  return NextResponse.json(results);
}
