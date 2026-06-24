import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';

export async function getSuperadminPublicacionesContext(
  token: string | null | undefined
) {
  const user = await verifyAdmin(token);

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      ),
    };
  }

  const sb = createServiceClient();

  const { data: canchas, error: canchasError } = await sb
    .from('canchas')
    .select('id');

  if (canchasError) {
    return {
      errorResponse: NextResponse.json(
        { error: canchasError.message },
        { status: 500 }
      ),
    };
  }

  const todasLasCanchas = (canchas ?? [])
    .map((cancha: { id: string }) => cancha.id)
    .filter(Boolean);

  return { sb, userId: user.id, todasLasCanchas };
}
