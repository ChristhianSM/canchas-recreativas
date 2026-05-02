import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://canchago.pe';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/admin-cancha/',
          '/api/',
          '/pago',
          '/_next/',
          '/debug*',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/admin-cancha/',
          '/api/',
          '/pago',
          '/debug*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
