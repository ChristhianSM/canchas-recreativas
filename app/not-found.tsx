import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        {/* Número 404 decorativo */}
        <div className="relative mb-6 select-none">
          <span className="text-[120px] font-black leading-none text-primary/10 md:text-[180px]">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">⚽</span>
          </div>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
          Página no encontrada
        </h1>
        <p className="mb-8 max-w-sm text-muted-foreground">
          La página que buscas no existe o fue movida. Pero hay muchas canchas esperándote.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/canchas">Ver canchas disponibles</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-6">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4">
          <Image
            src="/images/logo.png"
            alt="CanchaGo"
            width={160}
            height={40}
            className="h-10 w-auto object-contain"
          />
          <p className="text-xs text-muted-foreground">
            &copy; 2026 CanchaGo. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
