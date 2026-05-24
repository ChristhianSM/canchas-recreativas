import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://canchago.pe';

  // Páginas estáticas
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/canchas`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/registro`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // Obtener canchas dinámicamente
  try {
    // En desarrollo, usar localhost
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? `${baseUrl}/api/canchas/list`
      : 'http://localhost:3000/api/canchas/list';
    
    const response = await fetch(apiUrl, {
      next: { revalidate: 3600 }, // Revalidar cada hora
    });
    
    if (!response.ok) {
      console.error('Error fetching canchas for sitemap');
      return staticPages;
    }

    const canchas = await response.json();
    
    const canchaPages: MetadataRoute.Sitemap = Array.isArray(canchas)
      ? canchas.map((cancha: any) => ({
          url: `${baseUrl}/cancha/${cancha.id}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: cancha.destacada ? 0.8 : 0.6,
        }))
      : [];

    return [...staticPages, ...canchaPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return staticPages;
  }
}
