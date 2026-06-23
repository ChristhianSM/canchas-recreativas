import Image from 'next/image';
import { MapPin, Clock, Bell } from 'lucide-react';

export const metadata = {
  title: 'Próximamente — CanchaGo',
  description: 'Estamos preparando algo increíble. Reserva canchas deportivas fácil y rápido.',
};

export default function ProximamentePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-4">

      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">

        {/* Logo */}
        <Image
          src="/images/logo.png"
          alt="CanchaGo"
          width={180}
          height={60}
          className="mb-10 h-14 w-auto object-contain"
          priority
        />

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Clock className="h-3.5 w-3.5" />
          Muy pronto
        </div>

        {/* Título */}
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Estamos preparando<br />algo increíble
        </h1>

        <p className="mb-10 text-lg text-muted-foreground leading-relaxed">
          CanchaGo llega pronto a tu ciudad. Reserva canchas deportivas de forma fácil, rápida y segura.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 gap-4 w-full sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Canchas cerca de ti</p>
              <p className="text-xs text-muted-foreground mt-0.5">Encuentra y reserva la cancha perfecta en segundos</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Confirmación instantánea</p>
              <p className="text-xs text-muted-foreground mt-0.5">Recibe confirmación por WhatsApp al instante</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
