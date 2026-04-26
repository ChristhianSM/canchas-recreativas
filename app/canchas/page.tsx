'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Header } from '@/components/header';
import { CanchaCard } from '@/components/cancha-card';
import { AdvancedFiltersComponent } from '@/components/advanced-filters';
import { SearchBar } from '@/components/search-bar';
import { SportType, AdvancedFilters, DEFAULT_FILTERS } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  filterCanchas, sortCanchas, getAllAmenities, getAllDistricts, getPriceRange,
  SortOption,
} from '@/lib/filter-utils';

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

export default function CanchasPage() {
  const [canchas, setCanchas]         = useState<Cancha[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filters, setFilters]         = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy]           = useState<SortOption>('relevancia');

  // Datos para los filtros
  const [allAmenities, setAllAmenities] = useState<string[]>([]);
  const [allDistricts, setAllDistricts] = useState<string[]>([]);
  const [priceRange, setPriceRange]     = useState<[number, number]>([0, 100]);
  const [sports, setSports]             = useState<SportType[]>([]);

  const loadCanchas = () => {
    setLoading(true);
    fetch('/api/canchas/list')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setCanchas(list);
        
        // Calcular datos para los filtros
        const adaptedList = list.map(adaptCancha);
        setAllAmenities(getAllAmenities(adaptedList));
        setAllDistricts(getAllDistricts(adaptedList));
        setPriceRange(getPriceRange(adaptedList));
        
        // Obtener deportes únicos
        const sportsSet = new Set(list.map((c: Cancha) => c.tipo));
        setSports(Array.from(sportsSet) as SportType[]);
        
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCanchas();
  }, []);

  // Aplicar filtros y ordenamiento
  const filtered = useMemo(() => {
    const adaptedList = canchas.map(adaptCancha);
    const filtered = filterCanchas(adaptedList, filters);
    return sortCanchas(filtered, sortBy);
  }, [canchas, filters, sortBy]);

  // Contar filtros activos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sports.length > 0) count++;
    if (filters.priceRange[0] !== priceRange[0] || filters.priceRange[1] !== priceRange[1]) count++;
    if (filters.minRating > 0) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.districts.length > 0) count++;
    if (filters.availableHours.length > 0) count++;
    if (filters.onlyFeatured) count++;
    if (filters.searchQuery.trim()) count++;
    return count;
  }, [filters, priceRange]);

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
            <AdvancedFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              allAmenities={allAmenities}
              allDistricts={allDistricts}
              priceRange={priceRange}
              sports={sports}
              activeFilterCount={activeFilterCount}
              onRefresh={loadCanchas}
            />
            <div className="flex justify-end">
              <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-full sm:w-48 bg-secondary border-border">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevancia">Relevancia</SelectItem>
                  <SelectItem value="precio-asc">Menor precio</SelectItem>
                  <SelectItem value="precio-desc">Mayor precio</SelectItem>
                  <SelectItem value="rating">Mejor puntuación</SelectItem>
                  <SelectItem value="nombre">Nombre (A-Z)</SelectItem>
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
              {filtered.map(c => <CanchaCard key={c.id} cancha={c} />)}
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
