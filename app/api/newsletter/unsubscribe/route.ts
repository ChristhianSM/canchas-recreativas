import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/newsletter/desuscribir?error=token_invalido', req.url));
  }

  const sb = createServiceClient();

  const { error } = await sb
    .from('suscriptores')
    .update({ activo: false })
    .eq('id', token);

  if (error) {
    return NextResponse.redirect(new URL('/newsletter/desuscribir?error=no_encontrado', req.url));
  }

  return NextResponse.redirect(new URL('/newsletter/desuscribir?ok=1', req.url));
}
