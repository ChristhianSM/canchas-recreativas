import { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://canchago.pe';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 1   },
    { url: `${baseUrl}/canchas`,     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${baseUrl}/login`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/registro`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  try {
    const sb = createServiceClient();
    const { data: canchas } = await sb
      .from('canchas')
      .select('id, destacada, creado_en')
      .eq('activa', true);

    const canchaPages: MetadataRoute.Sitemap = (canchas ?? []).map(cancha => ({
      url:             `${baseUrl}/cancha/${cancha.id}`,
      lastModified:    new Date(cancha.creado_en),
      changeFrequency: 'weekly' as const,
      priority:        cancha.destacada ? 0.8 : 0.6,
    }));

    return [...staticPages, ...canchaPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return staticPages;
  }
}
