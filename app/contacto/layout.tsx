import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contacto | CanchaGo — Reserva Canchas en Piura',
  description: 'Contáctanos por WhatsApp o correo. Resolvemos tus dudas sobre reservas, pagos y canchas deportivas en Piura. Atención de Lunes a Sábado de 8am a 8pm.',
  keywords: [
    'contacto canchago',
    'soporte canchas piura',
    'reservas canchas piura contacto',
    'whatsapp canchago',
    'ayuda reservas deportivas',
  ],
  openGraph: {
    title: 'Contacto | CanchaGo — Reserva Canchas en Piura',
    description: 'Contáctanos por WhatsApp o correo. Resolvemos tus dudas sobre reservas, pagos y canchas deportivas en Piura.',
    url: 'https://www.tucanchago.com/contacto',
    siteName: 'CanchaGo',
    locale: 'es_PE',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.tucanchago.com/contacto',
  },
};

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
