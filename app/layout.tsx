import type { Metadata, Viewport } from 'next'
import { Inter, Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { generateOrganizationSchema } from '@/lib/seo-utils'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CanchaGo — Reserva tu cancha deportiva en Piura',
    template: '%s | CanchaGo',
  },
  description: 'Encuentra y reserva las mejores canchas de fútbol, vóley, básquet y más en Piura. Reserva online en minutos, paga con Yape o Plin.',
  keywords: ['canchas deportivas', 'canchas piura', 'reservar cancha', 'fútbol piura', 'alquiler cancha'],
  authors: [{ name: 'CanchaGo' }],
  creator: 'CanchaGo',
  metadataBase: new URL('https://canchago.pe'),
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    siteName: 'CanchaGo',
    title: 'CanchaGo — Reserva tu cancha deportiva en Piura',
    description: 'Encuentra y reserva las mejores canchas deportivas en Piura. Fútbol, vóley, básquet y más.',
    images: [
      {
        url: '/images/logo.png',
        width: 1200,
        height: 630,
        alt: 'CanchaGo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CanchaGo — Reserva tu cancha deportiva en Piura',
    description: 'Encuentra y reserva las mejores canchas deportivas en Piura.',
    images: ['/images/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  generator: 'Next.js',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#16a34a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const organizationSchema = generateOrganizationSchema();
  
  return (
    <html lang="es" className="bg-background h-full">
      <head>
        {/* JSON-LD Schema para la organización */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased min-h-screen flex flex-col`}>
        {children}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
