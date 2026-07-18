import { createWorker } from 'tesseract.js';
import os from 'os';

const PALABRAS_CLAVE = ['yape', 'plin'];
const TIMEOUT_MS = 15_000;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
}

async function reconocerTexto(buffer: Buffer): Promise<string> {
  // cachePath apunta al tmpdir del SO porque en entornos serverless (Vercel)
  // el resto del filesystem es de solo lectura.
  const worker = await createWorker('spa', 1, { cachePath: os.tmpdir() });
  try {
    const { data: { text } } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

// Corre OCR sobre la imagen y verifica que el texto reconocido mencione
// "Yape" o "Plin". Solo filtra imágenes que no tengan nada que ver con el
// pago (fotos random) — no intenta verificar si la operación es legítima.
// Si el OCR se cuelga (ej. problema de red descargando el modelo) se corta
// a los 15s y se deja pasar la imagen, para no bloquear el flujo de pago.
const CORTE_POR_TIEMPO = Symbol('corte-por-tiempo');

export async function pareceCapturaYapePlin(buffer: Buffer): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<typeof CORTE_POR_TIEMPO>((resolve) => {
    timer = setTimeout(() => resolve(CORTE_POR_TIEMPO), TIMEOUT_MS);
  });

  const resultado = await Promise.race([reconocerTexto(buffer), timeout]);
  clearTimeout(timer!);
  if (resultado === CORTE_POR_TIEMPO) return true;

  const normalizado = normalizar(resultado);
  return PALABRAS_CLAVE.some((palabra) => normalizado.includes(palabra));
}
