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
  destacada: boolean; horariosOcupados?: Record<string, 'reservado' | 'en_proceso'>;
  horariosRestringidos?: string[];
};

const HORAS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

function adaptCancha(c: Cancha) {
  // Construir schedule a partir de horariosOcupados
  const schedule: Record<string, Array<{ time: string; available: boolean; price: number; status: 'disponible' | 'reservado' | 'en_proceso' }>> = {};

  // Generar próximos 14 días
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    schedule[dateStr] = HORAS.map(hora => {
      const key = `${dateStr}|${hora}`;
      const horariosOcupados = c.horariosOcupados || {};
      const horariosRestringidos = c.horariosRestringidos || [];
      
      let status: 'disponible' | 'reservado' | 'en_proceso' = 'disponible';
      let available = true;

      if (horariosOcupados[key]) {
        status = horariosOcupados[key];
        available = false;
      } else if (horariosRestringidos.includes(hora)) {
        status = 'en_proceso';
        available = false;
      }

      return {
        time: hora,
        available,
        price: c.precio_por_hora,
        status,
      };
    });
  }

  return {
    id: c.id, name: c.nombre, type: c.tipo, address: c.direccion,
    district: c.distrito, description: c.descripcion, images: c.imagenes ?? [],
    rating: c.rating, reviewCount: c.total_resenas, pricePerHour: c.precio_por_hora,
    amenities: c.amenidades ?? [], coordinates: { lat: c.lat, lng: c.lng },
    phone: c.telefono, featured: c.destacada, schedule,
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
    // No contar selectedDate porque siempre tiene un valor
    return count;
  }, [filters, priceRange]);

  return (
    <div className="flex flex-col flex-1 bg-background">
      <Header />

      <div className="flex flex-1">
        <div className="container mx-auto px-4 flex">
          {/* Sidebar de filtros - Solo en desktop */}
          <aside className="hidden lg:block w-[450px] shrink-0 pr-8">
            <div className="py-6 px-6 space-y-6 bg-muted/30 rounded-lg border border-border/50">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Filtros</h2>
                <p className="text-xs text-muted-foreground">Encuentra tu cancha ideal</p>
              </div>
              <AdvancedFiltersComponent
                filters={filters}
                onFiltersChange={setFilters}
                allAmenities={allAmenities}
                allDistricts={allDistricts}
                priceRange={priceRange}
                sports={sports}
                activeFilterCount={activeFilterCount}
                onRefresh={loadCanchas}
                isSidebar={true}
              />
            </div>
          </aside>

          {/* Contenido principal */}
          <main className="flex-1 min-w-0">
            <section className="border-b border-border bg-card py-6 lg:hidden">
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
                  isSidebar={false}
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
            </section>

            <section className="flex-1 py-8">
              {/* Header solo en desktop */}
              <div className="hidden lg:block mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Todas las Canchas</h1>
                    <p className="text-muted-foreground">Encuentra el espacio perfecto para tu deporte</p>
                  </div>
                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-48 bg-secondary border-border">
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

              <p className="mb-6 text-sm text-muted-foreground">
                {loading ? 'Cargando...' : `${filtered.length} ${filtered.length === 1 ? 'cancha encontrada' : 'canchas encontradas'}`}
              </p>

              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}
                </div>
              ) : filtered.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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
            </section>
          </main>
        </div>
      </div>

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
