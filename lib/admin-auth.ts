import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createServiceClient } from '@/lib/supabase';

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

// Caché de roles en memoria: evita consultar la BD en cada request
const roleCache = new Map<string, { rol: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getRol(userId: string): Promise<string | null> {
  const cached = roleCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.rol;

  const sb = createServiceClient();
  const { data } = await sb.from('usuarios').select('rol').eq('id', userId).single();
  if (!data) return null;

  roleCache.set(userId, { rol: data.rol, expiresAt: Date.now() + CACHE_TTL });
  return data.rol;
}

export async function verifyAdmin(token: string | null | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS);
    const userId = payload.sub;
    if (!userId) return null;
    const rol = await getRol(userId);
    if (rol !== 'superadmin') return null;
    return { id: userId };
  } catch {
    return null;
  }
}

// Verifica JWT localmente sin chequear rol — para rutas de admin-cancha
export async function verifyToken(token: string | null | undefined): Promise<{ id: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS);
    const userId = payload.sub;
    if (!userId) return null;
    return { id: userId };
  } catch {
    return null;
  }
}
