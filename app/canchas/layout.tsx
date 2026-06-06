import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explora Canchas Deportivas en Piura | CanchaGo',
  description: 'Encuentra y reserva las mejores canchas de fútbol, vóley, básquet y más en Piura. Compara precios, ubicaciones y disponibilidad en tiempo real.',
  keywords: [
    'canchas deportivas piura',
    'alquiler canchas piura',
    'reservar cancha futbol',
    'canchas voley piura',
    'canchas basquet piura',
    'cancha sintetica piura',
    'loza deportiva piura',
  ],
  openGraph: {
    title: 'Explora Canchas Deportivas en Piura | CanchaGo',
    description: 'Encuentra y reserva las mejores canchas deportivas en Piura. Compara precios, ubicaciones y disponibilidad.',
    url: 'https://www.tucanchago.com/canchas',
    siteName: 'CanchaGo',
    locale: 'es_PE',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.tucanchago.com/canchas',
  },
};

export default function CanchasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
