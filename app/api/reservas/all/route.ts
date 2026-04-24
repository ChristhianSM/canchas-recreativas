import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET — todas las reservas (solo superadmin)
export async function GET() {
  const sb = createServiceClient();

  const { data, error } = await sb
    .from('reservas')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
