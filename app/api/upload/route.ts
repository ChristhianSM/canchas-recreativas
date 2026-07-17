import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import sharp from 'sharp';

const MAX_IMAGES_PER_CANCHA = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const COMPRESSED_MAX_SIZE = 1 * 1024 * 1024; // 1MB target

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const sb = createServiceClient();

  // Si hay token, verificar usuario — si no, permitir desde panel admin
  let userId = 'admin';
  if (token) {
    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    userId = user.id;
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const canchaId = formData.get('canchaId') as string;

  if (!file) return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });
  if (!canchaId) return NextResponse.json({ error: 'ID de cancha requerido' }, { status: 400 });

  // Validar tipo
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
  }

  // Validar tamaño original
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `La imagen no puede superar ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 });
  }

  // Verificar cantidad de imágenes existentes para esta cancha
  const { data: existingImages, error: listError } = await sb.storage
    .from('imagenes')
    .list(`canchas/${userId}/${canchaId}`);

  if (!listError && existingImages && existingImages.length >= MAX_IMAGES_PER_CANCHA) {
    return NextResponse.json(
      { error: `Máximo ${MAX_IMAGES_PER_CANCHA} imágenes por cancha. Elimina algunas antes de subir nuevas.` },
      { status: 400 }
    );
  }

  try {
    // Convertir archivo a buffer
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Comprimir imagen con sharp
    let compressedBuffer: Buffer;
    let quality = 80;
    let attempts = 0;
    const maxAttempts = 5;

    // Intentar comprimir hasta que esté bajo el límite o alcanzar máximo de intentos
    do {
      compressedBuffer = await sharp(uint8Array)
        .rotate() // Auto-rotar basado en EXIF
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      if (compressedBuffer.length <= COMPRESSED_MAX_SIZE || quality <= 40) {
        break;
      }

      quality -= 10;
      attempts++;
    } while (attempts < maxAttempts);

    // Generar nombre de archivo con timestamp
    const fileName = `canchas/${userId}/${canchaId}/${Date.now()}.webp`;

    // Subir imagen comprimida
    const { error: uploadError } = await sb.storage
      .from('imagenes')
      .upload(fileName, compressedBuffer, { contentType: 'image/webp', upsert: true });

    if (uploadError) {
      console.error('[upload] Error storage:', uploadError.message, uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Obtener URL pública
    const { data: { publicUrl } } = sb.storage.from('imagenes').getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrl,
      originalSize: (buffer.byteLength / 1024).toFixed(2),
      compressedSize: (compressedBuffer.length / 1024).toFixed(2),
      compression: ((1 - compressedBuffer.length / buffer.byteLength) * 100).toFixed(1),
    });
  } catch (error) {
    console.error('[upload] Error compressing:', error);
    return NextResponse.json({ error: 'Error al procesar la imagen' }, { status: 500 });
  }
}
