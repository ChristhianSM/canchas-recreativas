import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  maxRequests: number; // máximo de peticiones permitidas
  windowMs: number;    // ventana de tiempo en milisegundos
}

// Map global: ip -> lista de timestamps de peticiones
const store = new Map<string, number[]>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function rateLimit(req: NextRequest, config: RateLimitConfig): NextResponse | null {
  const ip = getIp(req);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Obtener peticiones anteriores de esta IP y filtrar las que ya expiraron
  const prev = (store.get(ip) ?? []).filter(t => t > windowStart);

  if (prev.length >= config.maxRequests) {
    const retrySecs = Math.ceil((prev[0] - windowStart) / 1000);
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera un momento e intenta de nuevo.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retrySecs),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // Registrar esta petición
  store.set(ip, [...prev, now]);
  return null; // null = permitido, continuar
}
