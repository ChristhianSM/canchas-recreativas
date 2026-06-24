import { NextRequest, NextResponse } from 'next/server';

const MODO_PREVIEW   = process.env.MODO_PREVIEW    === 'true';
const PREVIEW_SECRET = process.env.PREVIEW_SECRET  ?? '';

const RUTAS_SIEMPRE_PERMITIDAS = [
  '/proximamente',
  '/admin',
  '/api/',
  '/_next/',
  '/images/',
  '/favicon',
];

export function middleware(request: NextRequest) {
  if (!MODO_PREVIEW) return NextResponse.next();

  const { pathname, searchParams } = request.nextUrl;

  // Rutas que nunca se bloquean
  const permitida = RUTAS_SIEMPRE_PERMITIDAS.some(r => pathname.startsWith(r));
  if (permitida) return NextResponse.next();

  // Si viene con ?preview=SECRET → guardar cookie y redirigir sin el param
  const previewParam = searchParams.get('preview');
  if (previewParam && previewParam === PREVIEW_SECRET) {
    const destino = new URL(pathname, request.url);
    const response = NextResponse.redirect(destino);
    response.cookies.set('preview_bypass', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      sameSite: 'lax',
      httpOnly: true,
    });
    return response;
  }

  // Si ya tiene la cookie de bypass → acceso libre
  const bypass = request.cookies.get('preview_bypass')?.value;
  if (bypass === 'true') return NextResponse.next();

  // El resto → próximamente
  return NextResponse.redirect(new URL('/proximamente', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
