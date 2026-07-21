import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'imagenes';

// Extrae el path dentro del bucket a partir de la URL pública de Supabase Storage
export function extraerPath(url: string): string | null {
  const marcador = `/${BUCKET}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  return url.slice(idx + marcador.length);
}

// Elimina del storage las imágenes que estaban antes y ya no están en la lista nueva
export async function eliminarImagenesHuerfanas(
  sb: SupabaseClient,
  imagenesAnteriores: string[] | null | undefined,
  imagenesNuevas: string[] | null | undefined
) {
  if (!imagenesAnteriores?.length) return;

  const nuevasSet = new Set(imagenesNuevas ?? []);
  const paths = imagenesAnteriores
    .filter((url) => !nuevasSet.has(url))
    .map(extraerPath)
    .filter((p): p is string => !!p);

  if (paths.length) {
    const { error } = await sb.storage.from(BUCKET).remove(paths);
    if (error) console.error('[eliminarImagenesHuerfanas] Error:', error.message);
  }
}
