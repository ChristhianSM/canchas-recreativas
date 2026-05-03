/**
 * Utilidades para SEO y datos estructurados (JSON-LD Schema)
 */

import { SportType } from './types';

export interface CanchaSchemaData {
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
}

/**
 * Genera JSON-LD Schema para una cancha deportiva
 * Sigue el estándar de Schema.org para SportsActivityLocation
 */
export function generateCanchaSchema(cancha: CanchaSchemaData) {
  const baseUrl = 'https://canchago.pe';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    '@id': `${baseUrl}/cancha/${cancha.id}`,
    name: cancha.nombre,
    description: cancha.descripcion,
    image: cancha.imagenes.map(img => `${baseUrl}${img}`),
    address: {
      '@type': 'PostalAddress',
      streetAddress: cancha.direccion,
      addressLocality: cancha.distrito,
      addressRegion: 'Piura',
      addressCountry: 'PE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: cancha.lat,
      longitude: cancha.lng,
    },
    telephone: cancha.telefono,
    priceRange: `S/ ${cancha.precio_por_hora}`,
    aggregateRating: cancha.total_resenas > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: cancha.rating,
      reviewCount: cancha.total_resenas,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    url: `${baseUrl}/cancha/${cancha.id}`,
    sameAs: [
      // Agregar redes sociales si las tienes
    ],
  };
}

/**
 * Genera JSON-LD Schema para la organización (CanchaGo)
 */
export function generateOrganizationSchema() {
  const baseUrl = 'https://canchago.pe';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CanchaGo',
    description: 'Plataforma de reserva de canchas deportivas en Piura',
    url: baseUrl,
    logo: `${baseUrl}/images/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Spanish'],
    },
    areaServed: {
      '@type': 'City',
      name: 'Piura',
      '@id': 'https://www.wikidata.org/wiki/Q200047',
    },
    sameAs: [
      // Agregar redes sociales cuando las tengas
      // 'https://www.facebook.com/canchago',
      // 'https://www.instagram.com/canchago',
    ],
  };
}

/**
 * Genera JSON-LD Schema para breadcrumbs
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  const baseUrl = 'https://canchago.pe';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Genera metadata optimizada para páginas de canchas
 */
export function generateCanchaMetadata(cancha: CanchaSchemaData) {
  const baseUrl = 'https://canchago.pe';
  const title = `${cancha.nombre} — Reserva tu cancha en ${cancha.distrito} | CanchaGo`;
  const description = `${cancha.descripcion.slice(0, 150)}... Reserva desde S/ ${cancha.precio_por_hora}/hora. ${cancha.rating > 0 ? `⭐ ${cancha.rating} (${cancha.total_resenas} reseñas)` : ''}`;
  
  return {
    title,
    description,
    keywords: [
      cancha.nombre,
      `cancha ${cancha.tipo}`,
      `cancha ${cancha.distrito}`,
      'reservar cancha piura',
      'alquiler cancha',
      cancha.tipo === 'futbol' ? 'cancha de fútbol' : '',
      cancha.tipo === 'voley' ? 'cancha de vóley' : '',
      cancha.tipo === 'basquet' ? 'cancha de básquet' : '',
    ].filter(Boolean),
    openGraph: {
      title,
      description,
      url: `${baseUrl}/cancha/${cancha.id}`,
      siteName: 'CanchaGo',
      images: cancha.imagenes.length > 0 ? [
        {
          url: `${baseUrl}${cancha.imagenes[0]}`,
          width: 1200,
          height: 630,
          alt: cancha.nombre,
        },
      ] : [],
      locale: 'es_PE',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: cancha.imagenes.length > 0 ? [`${baseUrl}${cancha.imagenes[0]}`] : [],
    },
    alternates: {
      canonical: `${baseUrl}/cancha/${cancha.id}`,
    },
  };
}
