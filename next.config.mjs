/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'zjsyttahawvqvjhieueu.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'vqtgxwpvpvrheesmhsgy.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // tesseract.js usa worker_threads y resuelve sus propios archivos (core/worker)
  // por ruta de node_modules; si Next lo empaqueta con webpack esa resolución se
  // rompe y el worker se queda colgado sin arrojar error.
  serverExternalPackages: ['tesseract.js', 'tesseract.js-core'],
  // El rastreador de archivos de `output: standalone` no sigue los requires que
  // tesseract.js hace desde dentro de su worker_thread (un archivo cargado por
  // ruta, no por import estático), así que ni el propio paquete ni sus
  // dependencias declaradas en su package.json (bmp-js, is-url, node-fetch,
  // regenerator-runtime, wasm-feature-detect, idb-keyval, zlibjs) se incluyen
  // solas en el build de producción — hay que listarlas explícitamente o la
  // validación de captura de pago falla en silencio (siempre "pasa" cualquier
  // imagen). También se incluye lib/tessdata (modelo de idioma empaquetado
  // localmente) para no depender de una descarga por red en cada cold start.
  outputFileTracingIncludes: {
    'app/api/reservas/route': [
      './node_modules/tesseract.js/**',
      './node_modules/tesseract.js-core/**',
      './node_modules/bmp-js/**',
      './node_modules/is-url/**',
      './node_modules/node-fetch/**',
      './node_modules/whatwg-url/**',
      './node_modules/regenerator-runtime/**',
      './node_modules/wasm-feature-detect/**',
      './node_modules/idb-keyval/**',
      './node_modules/zlibjs/**',
      './lib/tessdata/**',
    ],
    'app/api/partidos/route': [
      './node_modules/tesseract.js/**',
      './node_modules/tesseract.js-core/**',
      './node_modules/bmp-js/**',
      './node_modules/is-url/**',
      './node_modules/node-fetch/**',
      './node_modules/whatwg-url/**',
      './node_modules/regenerator-runtime/**',
      './node_modules/wasm-feature-detect/**',
      './node_modules/idb-keyval/**',
      './node_modules/zlibjs/**',
      './lib/tessdata/**',
    ],
  },
  // Optimizaciones de rendimiento
  compress: true,
  poweredByHeader: false,
  // Generación estática para mejor SEO
  output: 'standalone',
  // Headers de seguridad y SEO
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },
}

export default nextConfig
