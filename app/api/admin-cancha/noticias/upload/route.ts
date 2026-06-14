import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { verifyToken } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase';

const BUCKET_NAME = 'imagenes';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const COMPRESSED_MAX_SIZE = 1 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const user = await verifyToken(token);

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const sb = createServiceClient();
  const { data: perfil, error: perfilError } = await sb
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (perfilError) {
    return NextResponse.json({ error: perfilError.message }, { status: 500 });
  }

  if (perfil?.rol !== 'dueno') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No se envio archivo' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo se permiten imagenes' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `La imagen no puede superar ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    const sourceBuffer = new Uint8Array(buffer);
    let quality = 80;
    let attempts = 0;
    let compressedBuffer: Buffer;

    do {
      compressedBuffer = await sharp(sourceBuffer)
        .rotate()
        .resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      if (compressedBuffer.length <= COMPRESSED_MAX_SIZE || quality <= 40) {
        break;
      }

      quality -= 10;
      attempts += 1;
    } while (attempts < 5);

    const fileName = `publicaciones/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webp`;
    const { error: uploadError } = await sb.storage
      .from(BUCKET_NAME)
      .upload(fileName, compressedBuffer, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = sb.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrl,
      originalSize: (buffer.byteLength / 1024).toFixed(2),
      compressedSize: (compressedBuffer.length / 1024).toFixed(2),
    });
  } catch {
    return NextResponse.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}
