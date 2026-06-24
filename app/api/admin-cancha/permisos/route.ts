import { NextRequest, NextResponse } from 'next/server';
import { getDuenoAuthContext } from '@/lib/publicaciones-owner-context';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const context = await getDuenoAuthContext(token);

  if ('errorResponse' in context) return context.errorResponse;

  return NextResponse.json({
    puedeGestionarPublicaciones: context.puedeGestionarPublicaciones,
  });
}
