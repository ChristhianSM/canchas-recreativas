'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, TrendingUp, Shield, Search, Calendar, Star, ArrowRight, Zap, Users, Clock } from 'lucide-react';
import { Header } from '@/components/header';
import { CanchaCard } from '@/components/cancha-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SportType } from '@/lib/types';

type Cancha = {
  id: string; nombre: string; tipo: SportType; direccion: string;
  distrito: string; descripcion: string; imagenes: string[];
  rating: number; total_resenas: number; precio_por_hora: number;
  amenidades: string[]; lat: number; lng: number; telefono: string;
  destacada: boolean; activa: boolean;
};

function adaptCancha(c: Cancha) {
  return {
    id: c.id, name: c.nombre, type: c.tipo, address: c.direccion,
    district: c.distrito, description: c.descripcion, images: c.imagenes ?? [],
    rating: c.rating, reviewCount: c.total_resenas, pricePerHour: c.precio_por_hora,
    amenities: c.amenidades ?? [], coordinates: { lat: c.lat, lng: c.lng },
    phone: c.telefono, featured: c.destacada, schedule: {},
  };
}

export default function HomePage() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/canchas/list')
      .then(r => r.json())
      .then(data => { 
        setCanchas(Array.isArray(data) ? data.filter(c => c.destacada) : []); 
        setLoading(false); 
      });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/canchas?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/canchas');
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-background">
      <Header />

      {/* Hero Section - Más impactante */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90 px-4 py-16 md:py-24 lg:py-32">
        {/* Patrón de fondo decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container relative mx-auto">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
              <Zap className="h-4 w-4" />
              <span>Reserva en menos de 2 minutos</span>
            </div>
            
            <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl lg:text-6xl text-balance leading-tight">
              Encuentra y reserva tu cancha deportiva ideal
            </h1>
            
            <p className="mb-10 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              Las mejores canchas de fútbol, vóley, básquet y más en Piura. Reserva online, paga seguro y juega sin preocupaciones.
            </p>

            {/* Buscador Hero */}
            <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
              <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl shadow-2xl">
                <div className="flex-1 flex items-center gap-3 px-4">
                  <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre, distrito o dirección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                  />
                </div>
                <Button 
                  type="submit"
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 rounded-xl"
                >
                  Buscar canchas
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </form>

            {/* Quick Actions */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/canchas?sport=futbol">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                  ⚽ Fútbol
                </Button>
              </Link>
              <Link href="/canchas?sport=voley">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                  🏐 Vóley
                </Button>
              </Link>
              <Link href="/canchas?sport=basquet">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                  🏀 Básquet
                </Button>
              </Link>
              <Link href="/canchas">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                  Ver todas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Más visual */}
      <section className="border-b border-border bg-card py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">¿Por qué elegir CanchaGo?</h2>
            <p className="text-muted-foreground text-lg">La forma más fácil de reservar canchas deportivas</p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { 
                icon: MapPin, 
                title: '+15 Canchas', 
                desc: 'En toda la región de Piura', 
                color: 'text-blue-600', 
                bg: 'bg-blue-50',
                darkBg: 'dark:bg-blue-950/30'
              },
              { 
                icon: Zap, 
                title: 'Reserva Instantánea', 
                desc: 'Confirma en menos de 2 minutos', 
                color: 'text-yellow-600', 
                bg: 'bg-yellow-50',
                darkBg: 'dark:bg-yellow-950/30'
              },
              { 
                icon: Shield, 
                title: 'Pago Seguro', 
                desc: 'Yape, Plin y transferencias', 
                color: 'text-green-600', 
                bg: 'bg-green-50',
                darkBg: 'dark:bg-green-950/30'
              },
              { 
                icon: Clock, 
                title: 'Disponible 24/7', 
                desc: 'Reserva cuando quieras', 
                color: 'text-purple-600', 
                bg: 'bg-purple-50',
                darkBg: 'dark:bg-purple-950/30'
              },
            ].map(f => (
              <div key={f.title} className="flex flex-col items-center text-center p-6">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${f.bg} ${f.darkBg} mb-4`}>
                  <f.icon className={`h-8 w-8 ${f.color}`} />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Canchas Destacadas */}
      {!loading && canchas.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">Canchas Destacadas</h2>
                <p className="text-muted-foreground text-lg">Las más populares y mejor valoradas</p>
              </div>
              <Link href="/canchas">
                <Button variant="outline" className="hidden sm:flex items-center gap-2">
                  Ver todas
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {canchas.slice(0, 4).map(c => <CanchaCard key={c.id} cancha={adaptCancha(c)} />)}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link href="/canchas">
                <Button variant="outline" className="w-full sm:w-auto">
                  Ver todas las canchas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Cómo funciona */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">¿Cómo funciona?</h2>
            <p className="text-muted-foreground text-lg">Reserva tu cancha en 3 simples pasos</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                icon: Search,
                title: 'Busca tu cancha',
                desc: 'Explora canchas por deporte, ubicación, precio y disponibilidad',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                darkBg: 'dark:bg-blue-950/30'
              },
              {
                step: '2',
                icon: Calendar,
                title: 'Selecciona fecha y hora',
                desc: 'Elige el horario que mejor se ajuste a tu agenda',
                color: 'text-green-600',
                bg: 'bg-green-50',
                darkBg: 'dark:bg-green-950/30'
              },
              {
                step: '3',
                icon: Star,
                title: 'Confirma y juega',
                desc: 'Paga de forma segura y recibe tu confirmación al instante',
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                darkBg: 'dark:bg-purple-950/30'
              },
            ].map((item, idx) => (
              <div key={item.step} className="relative">
                {idx < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
                <div className="relative bg-card rounded-2xl p-8 border border-border hover:shadow-lg transition-shadow">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} ${item.darkBg} mb-4`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <div className="absolute top-6 right-6 text-6xl font-bold ">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-foreground text-xl mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/canchas">
              <Button size="lg" className="px-8">
                Comenzar ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Listo para tu próximo partido?
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Únete a miles de deportistas que ya reservan sus canchas con CanchaGo
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/canchas">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8">
                  Explorar canchas
                </Button>
              </Link>
              <Link href="/registro">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Crear cuenta gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center gap-6">
            <Image
              src="/images/logo.png"
              alt="CanchaGo"
              width={280}
              height={50}
              className="h-16 w-auto object-contain"
            />
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/canchas" className="hover:text-foreground transition-colors">
                Canchas
              </Link>
              <Link href="/mis-reservas" className="hover:text-foreground transition-colors">
                Mis Reservas
              </Link>
              <Link href="/login" className="hover:text-foreground transition-colors">
                Iniciar Sesión
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; 2026 CanchaGo. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
