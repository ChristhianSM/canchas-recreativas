'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Header } from '@/components/header';
import { CanchaCard } from '@/components/cancha-card';
import { SportFilter } from '@/components/sport-filter';
import { SearchBar } from '@/components/search-bar';
import { SportType } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Cancha = {
  id: string; nombre: string; tipo: SportType; direccion: string;
  distrito: string; descripcion: string; imagenes: string[];
  rating: number; total_resenas: number; precio_por_hora: number;
  amenidades: string[]; lat: number; lng: number; telefono: string;
  destacada: boolean;
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

type SortOption = 'rating' | 'price-low' | 'price-high' | 'reviews';

export default function CanchasPage() {
  const [canchas, setCanchas]         = useState<Cancha[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all');
  const [sortBy, setSortBy]           = useState<SortOption>('rating');

  useEffect(() => {
    fetch('/api/canchas/list')
      .then(r => r.json())
      .then(data => { setCanchas(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let list = canchas.filter(c => {
      const matchSport  = selectedSport === 'all' || c.tipo === selectedSport;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || c.nombre.toLowerCase().includes(q) ||
        c.direccion.toLowerCase().includes(q) || c.distrito.toLowerCase().includes(q);
      return matchSport && matchSearch;
    });
    switch (sortBy) {
      case 'rating':     return [...list].sort((a, b) => b.rating - a.rating);
      case 'price-low':  return [...list].sort((a, b) => a.precio_por_hora - b.precio_por_hora);
      case 'price-high': return [...list].sort((a, b) => b.precio_por_hora - a.precio_por_hora);
      case 'reviews':    return [...list].sort((a, b) => b.total_resenas - a.total_resenas);
      default:           return list;
    }
  }, [canchas, selectedSport, searchQuery, sortBy]);

  return (
    <div className="flex flex-col flex-1 bg-background">
      <Header />

      <section className="border-b border-border bg-card py-6">
        <div className="container mx-auto px-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-foreground">Todas las Canchas</h1>
            <p className="text-muted-foreground">Encuentra el espacio perfecto para tu deporte</p>
          </div>
          <div className="space-y-4">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar por nombre, distrito o dirección..." />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SportFilter selectedSport={selectedSport} onSelectSport={setSelectedSport} />
              <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-full sm:w-48 bg-secondary border-border">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Mejor puntuación</SelectItem>
                  <SelectItem value="price-low">Menor precio</SelectItem>
                  <SelectItem value="price-high">Mayor precio</SelectItem>
                  <SelectItem value="reviews">Más reseñas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <section className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <p className="mb-6 text-sm text-muted-foreground">
            {loading ? 'Cargando...' : `${filtered.length} ${filtered.length === 1 ? 'cancha encontrada' : 'canchas encontradas'}`}
          </p>

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
