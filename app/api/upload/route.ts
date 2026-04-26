import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

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
  if (!file) return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });

  // Validar tipo y tamaño
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen no puede superar 5MB' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `canchas/${userId}/${Date.now()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await sb.storage
    .from('imagenes')
    .upload(fileName, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error('[upload] Error storage:', uploadError.message, uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = sb.storage.from('imagenes').getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrl });
}
