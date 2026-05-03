'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Header } from '@/components/header';
import { CanchaCard } from '@/components/cancha-card';
import { AdvancedFiltersComponent } from '@/components/advanced-filters';
import { UbicacionButton } from '@/components/ubicacion-button';
import { SportType, AdvancedFilters, DEFAULT_FILTERS } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  filterCanchas, sortCanchas, getAllAmenities, getAllDistricts, getPriceRange,
  SortOption,
} from '@/lib/filter-utils';
import { getLocalDateString } from '@/lib/date-utils';
import {
  obtenerUbicacionGuardada,
  ordenarPorDistancia,
  filtrarPorRadio,
  type Coordenadas,
} from '@/lib/geolocation-utils';

type Cancha = {
  id: string; nombre: string; tipo: SportType; direccion: string;
  distrito: string; descripcion: string; imagenes: string[];
  rating: number; total_resenas: number; precio_por_hora: number;
  amenidades: string[]; lat: number; lng: number; telefono: string;
  destacada: boolean; horariosOcupados?: Record<string, 'reservado' | 'en_proceso'>;
  horariosRestringidos?: string[];
  balon_disponible?: boolean;
  balon_precio?: number | null;
  chalecos_disponible?: boolean;
  chalecos_precio?: number | null;
  superficie?: string | null;
  max_jugadores?: number | null;
};

const HORAS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

function adaptCancha(c: Cancha) {
  // Construir schedule a partir de horariosOcupados
  const schedule: Record<string, Array<{ time: string; available: boolean; price: number; status: 'disponible' | 'reservado' | 'en_proceso' }>> = {};

  // Generar próximos 14 días usando fecha local
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = getLocalDateString(date); // ✅ Usar función local en lugar de toISOString

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
        id: `${dateStr}-${hora}`, // Agregar ID único para el slot
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
    balonDisponible:  c.balon_disponible  ?? false,
    balonPrecio:      c.balon_precio      ?? null,
    chalecoDisponible: c.chalecos_disponible ?? false,
    chalecosPrecio:   c.chalecos_precio   ?? null,
    superficie:       (c.superficie ?? null) as any,
    maxJugadores:     c.max_jugadores ?? null,
  };
}

function CanchasContent() {
  const searchParams = useSearchParams();
  const [canchas, setCanchas]         = useState<Cancha[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filters, setFilters]         = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy]           = useState<SortOption>('relevancia');
  const [ubicacion, setUbicacion]     = useState<Coordenadas | null>(null);

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
        setAllAmenities(getAllAmenities(adaptedList as any));
        setAllDistricts(getAllDistricts(adaptedList as any));
        setPriceRange(getPriceRange(adaptedList as any));
        
        // Obtener deportes únicos
        const sportsSet = new Set(list.map((c: Cancha) => c.tipo));
        setSports(Array.from(sportsSet) as SportType[]);
        
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCanchas();
    
    // Cargar ubicación guardada si existe
    const ubicacionGuardada = obtenerUbicacionGuardada();
    if (ubicacionGuardada) {
      setUbicacion(ubicacionGuardada);
    }
  }, []);

  // Aplicar parámetros de URL al cargar
  useEffect(() => {
    const query = searchParams.get('q');
    const sport = searchParams.get('sport');
    
    if (query || sport) {
      setFilters(prev => ({
        ...prev,
        searchQuery: query || '',
        sports: sport ? [sport as SportType] : [],
      }));
    }
  }, [searchParams]);

  // Aplicar filtros, ordenamiento y geolocalización
  const filtered = useMemo(() => {
    const adaptedList = canchas.map(adaptCancha);
    let filtered = filterCanchas(adaptedList as any, filters); // Type assertion temporal
    
    // Aplicar filtro de radio si hay ubicación y radio seleccionado
    if (ubicacion && filters.radioKm && filters.radioKm > 0) {
      filtered = filtrarPorRadio(filtered as any, ubicacion, filters.radioKm);
    }
    
    // Si hay ubicación y se ordena por relevancia, ordenar por distancia
    if (ubicacion && sortBy === 'relevancia') {
      const conDistancia = ordenarPorDistancia(filtered as any, ubicacion);
      return conDistancia.map(c => ({ ...c, distancia: c.distancia }));
    }
    
    // Si hay ubicación pero se ordena por otro criterio, agregar distancia pero mantener orden
    if (ubicacion) {
      const conDistancia = ordenarPorDistancia(filtered as any, ubicacion);
      const sorted = sortCanchas(conDistancia as any, sortBy);
      return sorted;
    }
    
    return sortCanchas(filtered as any, sortBy); // Type assertion temporal
  }, [canchas, filters, sortBy, ubicacion]);

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
    if (filters.conBalon) count++;
    if (filters.conChalecos) count++;
    if (filters.superficies.length > 0) count++;
    if (filters.minJugadores > 0) count++;
    if (filters.radioKm && filters.radioKm > 0) count++;
    return count;
  }, [filters, priceRange]);

  const handleUbicacionObtenida = (coords: Coordenadas) => {
    setUbicacion(coords);
  };

  const handleUbicacionLimpiada = () => {
    setUbicacion(null);
    // Limpiar filtro de radio también
    setFilters(prev => ({ ...prev, radioKm: undefined }));
  };

  return (
    <div className="flex flex-col flex-1 bg-background">
      <Header />

      <div className="flex flex-1">
        <div className="container mx-auto px-4 flex">
          {/* Sidebar de filtros - Solo en desktop */}
          <aside className="hidden lg:block w-[450px] shrink-0 pr-8">
            <div className="sticky mt-2 py-6 px-6 space-y-6 bg-card rounded-xl border border-border shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Filtros</h2>
                  <p className="text-sm text-muted-foreground">Encuentra tu cancha ideal</p>
                </div>
                <UbicacionButton
                  onUbicacionObtenida={handleUbicacionObtenida}
                  onUbicacionLimpiada={handleUbicacionLimpiada}
                  ubicacionActual={ubicacion}
                  className="shrink-0"
                />
              </div>
              <AdvancedFiltersComponent
                filters={filters}
                onFiltersChange={setFilters}
                allAmenities={allAmenities}
                allDistricts={allDistricts}
                priceRange={priceRange}
                sports={sports}
                activeFilterCount={activeFilterCount}
                isSidebar={true}
                resultCount={filtered.length}
                ubicacion={ubicacion}
              />
            </div>
          </aside>

          {/* Contenido principal */}
          <main className="flex-1 min-w-0">
            <section className="border-b border-border bg-card py-6 lg:hidden">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Explora Canchas</h1>
                  <p className="text-muted-foreground">Encuentra el espacio perfecto para tu deporte</p>
                </div>
                <UbicacionButton
                  onUbicacionObtenida={handleUbicacionObtenida}
                  onUbicacionLimpiada={handleUbicacionLimpiada}
                  ubicacionActual={ubicacion}
                />
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
                  isSidebar={false}
                  resultCount={filtered.length}
                  ubicacion={ubicacion}
                />
                <div className="flex justify-end">
                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-full sm:w-48 bg-background border-border">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevancia">{ubicacion ? 'Más cercanas' : 'Relevancia'}</SelectItem>
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
                  <div className="flex items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-1">Explora Canchas</h1>
                      <p className="text-muted-foreground">
                        {loading ? 'Cargando...' : `${filtered.length} ${filtered.length === 1 ? 'cancha encontrada' : 'canchas encontradas'}`}
                      </p>
                    </div>
                    <UbicacionButton
                      onUbicacionObtenida={handleUbicacionObtenida}
                      onUbicacionLimpiada={handleUbicacionLimpiada}
                      ubicacionActual={ubicacion}
                    />
                  </div>
                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-56 bg-background border-border">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevancia">{ubicacion ? 'Más cercanas' : 'Relevancia'}</SelectItem>
                      <SelectItem value="precio-asc">Menor precio</SelectItem>
                      <SelectItem value="precio-desc">Mayor precio</SelectItem>
                      <SelectItem value="rating">Mejor puntuación</SelectItem>
                      <SelectItem value="nombre">Nombre (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />)}
                </div>
              ) : filtered.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {filtered.map(c => <CanchaCard key={c.id} cancha={c} distancia={(c as any).distancia} />)}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <MapPin className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">No se encontraron canchas</h3>
                  <p className="text-muted-foreground mb-6">Intenta ajustar los filtros o términos de búsqueda</p>
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="text-primary hover:underline font-medium"
                  >
                    Limpiar todos los filtros
                  </button>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <footer className="border-t border-border bg-card py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <Image
              src="/images/logo.png"
              alt="CanchaGo"
              width={280}
              height={50}
              className="h-16 w-auto object-contain"
            />
            <p className="text-sm text-muted-foreground">&copy; 2026 CanchaGo. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


export default function CanchasPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col flex-1 bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-6 space-y-2">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </main>
      </div>
    }>
      <CanchasContent />
    </Suspense>
  );
}
