'use client';

import { useEffect } from 'react';
import { generateCanchaSchema, generateBreadcrumbSchema } from '@/lib/seo-utils';
import { SportType } from '@/lib/types';

interface CanchaSEOProps {
  cancha: {
    id: string;
    nombre: string;
    descripcion: string;
    direccion: string;
    distrito: string;
    lat: number;
    lng: number;
    telefono: string;
    precio_por_hora: number;
    rating: number;
    total_resenas: number;
    imagenes: string[];
    tipo: SportType;
  };
}

/**
 * Componente que inyecta datos estructurados JSON-LD para SEO
 * Se ejecuta en el cliente para evitar problemas de hidratación
 */
export function CanchaSEO({ cancha }: CanchaSEOProps) {
  useEffect(() => {
    // Generar schemas
    const canchaSchema = generateCanchaSchema(cancha);
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: 'Inicio', url: '/' },
      { name: 'Canchas', url: '/canchas' },
      { name: cancha.nombre, url: `/cancha/${cancha.id}` },
    ]);

    // Crear elementos script
    const canchaScript = document.createElement('script');
    canchaScript.type = 'application/ld+json';
    canchaScript.text = JSON.stringify(canchaSchema);
    canchaScript.id = 'cancha-schema';

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
    breadcrumbScript.id = 'breadcrumb-schema';

    // Agregar al head
    document.head.appendChild(canchaScript);
    document.head.appendChild(breadcrumbScript);

    // Cleanup
    return () => {
      const existingCanchaScript = document.getElementById('cancha-schema');
      const existingBreadcrumbScript = document.getElementById('breadcrumb-schema');
      if (existingCanchaScript) existingCanchaScript.remove();
      if (existingBreadcrumbScript) existingBreadcrumbScript.remove();
    };
  }, [cancha]);

  return null;
}
