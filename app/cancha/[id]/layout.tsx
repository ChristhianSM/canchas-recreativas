import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase';

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // Await params en Next.js 15+
    const { id } = await Promise.resolve(params);
    
    const sb = createServiceClient();
    const { data } = await sb
      .from('canchas')
      .select('nombre, descripcion, imagenes, distrito, tipo, precio_por_hora')
      .eq('id', id)
      .single();

    if (!data) {
      return {
        title: 'Cancha no encontrada',
        description: 'La cancha que buscas no existe o fue eliminada.',
      };
    }

    const tipoLabel: Record<string, string> = {
      futbol: 'Fútbol',
      voley: 'Vóley',
      basquet: 'Básquet',
      tenis: 'Tenis',
      futsal: 'Futsal',
    };

    const title = data.nombre;
    const description = data.descripcion
      ? `${data.descripcion.slice(0, 140)}...`
      : `Reserva ${data.nombre} en ${data.distrito}, Piura. Cancha de ${tipoLabel[data.tipo] ?? data.tipo} desde S/ ${data.precio_por_hora}/hora.`;

    const imagen = data.imagenes?.[0];

    return {
      title,
      description,
      openGraph: {
        title: `${data.nombre} | CanchaGo`,
        description,
        type: 'website',
        ...(imagen ? { images: [{ url: imagen, width: 1200, height: 630, alt: data.nombre }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.nombre} | CanchaGo`,
        description,
        ...(imagen ? { images: [imagen] } : {}),
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Cancha deportiva',
      description: 'Reserva canchas deportivas en Piura con CanchaGo.',
    };
  }
}

export default function CanchaLayout({ children }: Props) {
  return <>{children}</>;
}
