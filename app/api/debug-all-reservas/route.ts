import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/date-utils';

// GET — debug: obtener todas las reservas para verificar datos
export async function GET(req: NextRequest) {
  const sb = createServiceClient();

  try {
    const hoy = getLocalDateString();
    
    // Obtener todas las reservas de hoy
    const { data: reservas, error } = await sb
      .from('reservas')
      .select(`
        id,
        cancha_id,
        fecha,
        hora,
        estado,
        creado_en,
        canchas (
          nombre
        )
      `)
      .eq('fecha', hoy)
      .order('hora', { ascending: true });

    if (error) {
      console.error('Error al obtener reservas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Obtener bloqueos temporales de hoy
    const { data: bloqueos, error: bloqueosError } = await sb
      .from('bloqueos_temporales')
      .select(`
        id,
        cancha_id,
        fecha,
        hora,
        expira_en,
        canchas (
          nombre
        )
      `)
      .eq('fecha', hoy)
      .order('hora', { ascending: true });

    if (bloqueosError) {
      console.error('Error al obtener bloqueos:', bloqueosError);
    }

    return NextResponse.json({
      fecha: hoy,
      total_reservas: reservas?.length || 0,
      total_bloqueos: bloqueos?.length || 0,
      reservas: reservas || [],
      bloqueos: bloqueos || []
    });

  } catch (error) {
    console.error('Error en debug-all-reservas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}