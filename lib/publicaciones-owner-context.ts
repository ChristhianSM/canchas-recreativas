import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/admin-auth';

type DuenoAuthContext =
  | { errorResponse: NextResponse }
  | {
      sb: ReturnType<typeof createServiceClient>;
      userId: string;
      puedeGestionarPublicaciones: boolean;
    };

type DuenoPublicacionesContext =
  | { errorResponse: NextResponse }
  | {
      sb: ReturnType<typeof createServiceClient>;
      userId: string;
      canchasDelDueno: string[];
    };

export async function getDuenoAuthContext(
  token: string | null | undefined
): Promise<DuenoAuthContext> {
  const user = await verifyToken(token);

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      ),
    };
  }

  const sb = createServiceClient();

  const { data: perfil, error: perfilError } = await sb
    .from('usuarios')
    .select('rol, puede_gestionar_publicaciones')
    .eq('id', user.id)
    .single();

  if (perfilError) {
    return {
      errorResponse: NextResponse.json(
        { error: perfilError.message },
        { status: 500 }
      ),
    };
  }

  if (perfil?.rol !== 'dueno') {
    return {
      errorResponse: NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      ),
    };
  }

  return {
    sb,
    userId: user.id,
    puedeGestionarPublicaciones: Boolean(perfil.puede_gestionar_publicaciones),
  };
}

export async function getDuenoPublicacionesContext(
  token: string | null | undefined
): Promise<DuenoPublicacionesContext> {
  const context = await getDuenoAuthContext(token);
  if ('errorResponse' in context) {
    return { errorResponse: context.errorResponse };
  }

  if (!context.puedeGestionarPublicaciones) {
    return {
      errorResponse: NextResponse.json(
        { error: 'No tienes permiso para gestionar publicaciones' },
        { status: 403 }
      ),
    };
  }

  const { data: relaciones, error: relacionesError } = await context.sb
    .from('duenos_canchas')
    .select('cancha_id')
    .eq('usuario_id', context.userId);

  if (relacionesError) {
    return {
      errorResponse: NextResponse.json(
        { error: relacionesError.message },
        { status: 500 }
      ),
    };
  }

  const canchasDelDueno = (relaciones ?? [])
    .map((relacion: { cancha_id: string }) => relacion.cancha_id)
    .filter(Boolean);

  return {
    sb: context.sb,
    userId: context.userId,
    canchasDelDueno,
  };
}
