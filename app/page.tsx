'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, TrendingUp, Shield } from 'lucide-react';
import { Header } from '@/components/header';
import { CanchaCard } from '@/components/cancha-card';
import { SportFilter } from '@/components/sport-filter';
import { SearchBar } from '@/components/search-bar';
import { SportType } from '@/lib/types';

type Cancha = {
  id: string; nombre: string; tipo: SportType; direccion: string;
  distrito: string; descripcion: string; imagenes: string[];
  rating: number; total_resenas: number; precio_por_hora: number;
  amenidades: string[]; lat: number; lng: number; telefono: string;
  destacada: boolean; activa: boolean;
};

// Adaptar formato BD → formato que espera CanchaCard
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
  const [canchas, setCanchas]         = useState<Cancha[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all');

  useEffect(() => {
    fetch('/api/canchas/list')
      .then(r => r.json())
      .then(data => { setCanchas(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const featured = useMemo(() => canchas.filter(c => c.destacada), [canchas]);

  const filtered = useMemo(() => canchas.filter(c => {
    const matchSport  = selectedSport === 'all' || c.tipo === selectedSport;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || c.nombre.toLowerCase().includes(q) ||
      c.direccion.toLowerCase().includes(q) || c.distrito.toLowerCase().includes(q);
    return matchSport && matchSearch;
  }), [canchas, selectedSport, searchQuery]);

  return (
    <div className="flex flex-col flex-1 bg-background">
      <Header />

      {/* Hero */}
      <section className="relative bg-primary px-4 py-12 md:py-20">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl text-balance">
              Reserva tu cancha deportiva en Piura
            </h1>
            <p className="mb-8 text-lg text-primary-foreground/80">
              Encuentra las mejores canchas de fútbol, vóley, básquet y más. Reserva fácil y rápida.
            </p>
            <div className="mx-auto max-w-xl">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar por nombre, distrito o dirección..." />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features */}
      <section className="border-b border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: MapPin,     title: '+15 Canchas',         desc: 'En toda la región Piura',  color: 'text-primary',  bg: 'bg-primary/10' },
              { icon: TrendingUp, title: 'Reserva Instantánea', desc: 'Confirma en segundos',     color: 'text-accent',   bg: 'bg-accent/10'  },
              { icon: Shield,     title: 'Pago Seguro',         desc: 'Múltiples métodos de pago', color: 'text-primary', bg: 'bg-primary/10' },
            ].map(f => (
              <div key={f.title} className="flex items-center gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${f.bg}`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Destacadas */}
      {!loading && featured.length > 0 && !searchQuery && selectedSport === 'all' && (
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Canchas Destacadas</h2>
              <p className="text-muted-foreground">Las más populares en Piura</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map(c => <CanchaCard key={c.id} cancha={adaptCancha(c)} />)}
            </div>
          </div>
        </section>
      )}

      {/* Todas */}
      <section className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              {searchQuery || selectedSport !== 'all' ? 'Resultados' : 'Todas las Canchas'}
            </h2>
            <SportFilter selectedSport={selectedSport} onSelectSport={setSelectedSport} />
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1,2,3,4].map(i => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(c => <CanchaCard key={c.id} cancha={adaptCancha(c)} />)}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">No se encontraron canchas</h3>
              <p className="text-muted-foreground">Intenta con otros filtros o términos de búsqueda</p>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">CP</span>
              </div>
              <span className="font-semibold text-foreground">CanchaPiura</span>
            </div>
            <p className="text-sm text-muted-foreground">&copy; 2024 CanchaPiura. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
