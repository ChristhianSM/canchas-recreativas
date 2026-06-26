import { SportType } from './types';

const BASE_URL = 'https://www.tucanchago.com';

function resolveImageUrl(img: string): string {
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
}

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

export function generateCanchaSchema(cancha: CanchaSchemaData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    '@id': `${BASE_URL}/cancha/${cancha.id}`,
    name: cancha.nombre,
    description: cancha.descripcion,
    image: cancha.imagenes.map(resolveImageUrl),
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
    url: `${BASE_URL}/cancha/${cancha.id}`,
    sameAs: [
      'https://www.facebook.com/profile.php?id=61590374610935&locale=es_LA',
      'https://www.instagram.com/tucanchago?igsh=MTZheXE0bnFhZmVpbg==',
      'https://www.tiktok.com/@canchago1?_r=1&_t=ZS-97WYLM6JDIz',
    ],
  };
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TuCanchaGo',
    alternateName: 'CanchaGo',
    description: 'Plataforma de reserva de canchas deportivas en Piura, Perú',
    url: BASE_URL,
    logo: `${BASE_URL}/images/logo.png`,
    telephone: '+51940394075',
    email: 'admin@tucanchago.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Piura',
      addressRegion: 'Piura',
      addressCountry: 'PE',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+51940394075',
      contactType: 'customer service',
      availableLanguage: ['Spanish'],
      areaServed: 'PE',
    },
    areaServed: {
      '@type': 'City',
      name: 'Piura',
      '@id': 'https://www.wikidata.org/wiki/Q200047',
    },
    sameAs: [
      'https://www.facebook.com/profile.php?id=61590374610935&locale=es_LA',
      'https://www.instagram.com/tucanchago?igsh=MTZheXE0bnFhZmVpbg==',
      'https://www.tiktok.com/@canchago1?_r=1&_t=ZS-97WYLM6JDIz',
    ],
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

export function generateFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

export function generateCanchaMetadata(cancha: CanchaSchemaData) {
  const title = `${cancha.nombre} — Reserva tu cancha en ${cancha.distrito} | CanchaGo`;
  const ratingText = cancha.rating > 0 ? ` ${cancha.rating} estrellas (${cancha.total_resenas} reseñas).` : '';
  const description = `${cancha.descripcion.slice(0, 150)}... Reserva desde S/ ${cancha.precio_por_hora}/hora.${ratingText}`;

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
      url: `${BASE_URL}/cancha/${cancha.id}`,
      siteName: 'CanchaGo',
      images: cancha.imagenes.length > 0 ? [
        {
          url: resolveImageUrl(cancha.imagenes[0]),
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
      images: cancha.imagenes.length > 0 ? [resolveImageUrl(cancha.imagenes[0])] : [],
    },
    alternates: {
      canonical: `${BASE_URL}/cancha/${cancha.id}`,
    },
  };
}
