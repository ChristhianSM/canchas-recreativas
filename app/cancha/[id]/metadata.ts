import { Metadata } from 'next';
import { generateCanchaMetadata } from '@/lib/seo-utils';

/**
 * Genera metadata dinámica para páginas de canchas
 * Esta función se ejecuta en el servidor durante el build
 */
export async function generateCanchaPageMetadata(id: string): Promise<Metadata> {
  try {
    // Obtener datos de la cancha
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://canchago.pe';
    const response = await fetch(`${baseUrl}/api/canchas/detail?id=${id}`, {
      next: { revalidate: 3600 }, // Revalidar cada hora
    });

    if (!response.ok) {
      return {
        title: 'Cancha no encontrada | CanchaGo',
        description: 'La cancha que buscas no está disponible.',
      };
    }

    const cancha = await response.json();
    
    if (cancha.error) {
      return {
        title: 'Cancha no encontrada | CanchaGo',
        description: 'La cancha que buscas no está disponible.',
      };
    }

    // Generar metadata optimizada
    return generateCanchaMetadata({
      id: cancha.id,
      nombre: cancha.nombre,
      descripcion: cancha.descripcion,
      direccion: cancha.direccion,
      distrito: cancha.distrito,
      lat: cancha.lat,
      lng: cancha.lng,
      telefono: cancha.telefono,
      precio_por_hora: cancha.precio_por_hora,
      rating: cancha.rating,
      total_resenas: cancha.total_resenas,
      imagenes: cancha.imagenes || [],
      tipo: cancha.tipo,
    });
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'CanchaGo — Reserva tu cancha deportiva',
      description: 'Encuentra y reserva las mejores canchas deportivas en Piura.',
    };
  }
}
