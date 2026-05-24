import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase';
import { generateCanchaMetadata, generateCanchaSchema, generateBreadcrumbSchema } from '@/lib/seo-utils';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

async function getCancha(id: string) {
  const sb = createServiceClient();
  const { data } = await sb
    .from('canchas')
    .select('id, nombre, descripcion, imagenes, direccion, distrito, lat, lng, telefono, tipo, precio_por_hora, rating, total_resenas')
    .eq('id', id)
    .single();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const cancha = await getCancha(id);
    if (!cancha) {
      return {
        title: 'Cancha no encontrada',
        description: 'La cancha que buscas no existe o fue eliminada.',
      };
    }
    return generateCanchaMetadata(cancha);
  } catch {
    return {
      title: 'Cancha deportiva',
      description: 'Reserva canchas deportivas en Piura con CanchaGo.',
    };
  }
}

export default async function CanchaLayout({ params, children }: Props) {
  const { id } = await params;
  const cancha = await getCancha(id);

  const canchaSchema = cancha ? generateCanchaSchema(cancha) : null;
  const breadcrumbSchema = cancha
    ? generateBreadcrumbSchema([
        { name: 'Inicio', url: '/' },
        { name: 'Canchas', url: '/canchas' },
        { name: cancha.nombre, url: `/cancha/${cancha.id}` },
      ])
    : null;

  return (
    <>
      {canchaSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(canchaSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      {children}
    </>
  );
}
