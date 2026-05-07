'use client';

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { MapPin, X, Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
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

  // Estados para modales editables
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState('');
  const [tempUbicacion, setTempUbicacion] = useState('');
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Refs para posicionar modales
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const timeButtonRef = useRef<HTMLButtonElement>(null);

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
    const fecha = searchParams.get('fecha');
    const hora = searchParams.get('hora');
    const ubicacionParam = searchParams.get('ubicacion');
    
    setFilters(prev => ({
      ...prev,
      searchQuery: query || prev.searchQuery,
      sports: sport ? [sport as SportType] : prev.sports,
      selectedDate: fecha || prev.selectedDate,
      availableHours: hora ? [hora] : prev.availableHours,
    }));
    
    // Inicializar valores temporales con los valores de URL
    if (fecha) {
      setTempDate(new Date(fecha + 'T00:00:00'));
    }
    if (hora) {
      setTempTime(hora);
    }
    if (ubicacionParam) {
      setTempUbicacion(ubicacionParam);
    }
    
    // Si hay ubicación en los parámetros, actualizar el texto de ubicación
    if (ubicacionParam && ubicacionParam !== 'Mi ubicación') {
      // Aquí podrías hacer una búsqueda de geocodificación para obtener las coordenadas
      // Por ahora solo actualizamos el filtro de distrito si coincide
      const distritoEncontrado = allDistricts.find(d => 
        d.toLowerCase().includes(ubicacionParam.toLowerCase())
      );
      if (distritoEncontrado) {
        setFilters(prev => ({
          ...prev,
          districts: [distritoEncontrado],
        }));
      }
    }
  }, [searchParams, allDistricts]);

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

  // Cargar horarios disponibles cuando cambia la fecha temporal
  const loadAvailableHours = async (date: Date) => {
    setLoadingHours(true);
    try {
      const dateStr = getLocalDateString(date);
      const hoursSet = new Set<string>();
      
      canchas.forEach((cancha) => {
        const horariosOcupados = cancha.horariosOcupados || {};
        const horariosRestringidos = cancha.horariosRestringidos || [];
        
        const HORAS = [
          '06:00','07:00','08:00','09:00','10:00','11:00',
          '12:00','13:00','14:00','15:00','16:00','17:00',
          '18:00','19:00','20:00','21:00','22:00','23:00',
        ];
        
        HORAS.forEach(hora => {
          if (!horariosRestringidos.includes(hora)) {
            const key = `${dateStr}|${hora}`;
            if (!horariosOcupados[key]) {
              hoursSet.add(hora);
            }
          }
        });
      });
      
      setAvailableHours(Array.from(hoursSet).sort());
    } catch (error) {
      console.error('Error loading available hours:', error);
      setAvailableHours([]);
    } finally {
      setLoadingHours(false);
    }
  };

  // Manejar apertura de modal de fecha
  const handleOpenDatePicker = () => {
    // Usar tempDate si existe, sino usar el filtro actual
    if (!tempDate || tempDate.toString() === 'Invalid Date') {
      setTempDate(new Date(filters.selectedDate + 'T00:00:00'));
    }
    setShowDatePicker(true);
  };

  // Manejar apertura de modal de hora
  const handleOpenTimePicker = () => {
    // Usar tempTime si existe, sino usar el filtro actual
    if (!tempTime) {
      setTempTime(filters.availableHours[0] || '');
    }
    loadAvailableHours(tempDate || new Date(filters.selectedDate + 'T00:00:00'));
    setShowTimePicker(true);
  };

  // Generar calendario para el mes actual
  const generateCalendar = () => {
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  // Manejar selección de fecha del calendario
  const handleDateSelect = (date: Date) => {
    setTempDate(date);
    // NO actualizar filters aquí, solo cerrar el modal
    setShowDatePicker(false);
  };

  // Manejar selección de hora
  const handleTimeSelect = (time: string) => {
    setTempTime(time);
    // NO actualizar filters aquí, solo cerrar el modal
    setShowTimePicker(false);
  };

  // Manejar búsqueda (aplicar filtros)
  const handleBuscarCanchas = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Aplicar fecha temporal
    if (tempDate) {
      const dateStr = getLocalDateString(tempDate);
      params.set('fecha', dateStr);
    }
    
    // Aplicar hora temporal
    if (tempTime) {
      params.set('hora', tempTime);
    }
    
    // Aplicar ubicación
    const ubicacionActual = searchParams.get('ubicacion') || tempUbicacion || 'Piura, Perú';
    if (ubicacionActual) {
      params.set('ubicacion', ubicacionActual);
    }
    
    // Recargar página con nuevos parámetros
    window.location.href = `/canchas?${params.toString()}`;
  };

  return (
    <div className="flex flex-col flex-1 bg-white">
      <Header />

      {/* Modales globales - Posicionados relativos a sus botones */}
      {showDatePicker && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDatePicker(false)}
          />
          <div 
            className="absolute z-50 bg-white dark:bg-card rounded-lg shadow-md border border-gray-200 dark:border-border p-4"
            style={{
              top: dateButtonRef.current 
                ? `${dateButtonRef.current.getBoundingClientRect().bottom + window.scrollY -1}px`
                : '50%',
              left: dateButtonRef.current
                ? `${dateButtonRef.current.getBoundingClientRect().left + (dateButtonRef.current.getBoundingClientRect().width / 2)}px`
                : '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              maxWidth: '90vw',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">
                {tempDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setShowDatePicker(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendar().map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} />;
                }
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dayDate = new Date(day);
                dayDate.setHours(0, 0, 0, 0);
                const isToday = dayDate.getTime() === today.getTime();
                const isSelected = dayDate.getTime() === new Date(tempDate).setHours(0, 0, 0, 0);
                const isPast = dayDate < today;
                
                return (
                  <button
                    key={index}
                    onClick={() => !isPast && handleDateSelect(day)}
                    disabled={isPast}
                    className={`
                      aspect-square flex items-center justify-center text-sm rounded-md transition-colors
                      ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-muted'}
                      ${isSelected ? 'bg-[#16a34a] text-white hover:bg-[#15803d]' : ''}
                      ${isToday && !isSelected ? 'border-2 border-[#16a34a] text-[#16a34a] font-semibold' : ''}
                    `}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {showTimePicker && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowTimePicker(false)}
          />
          <div 
            className="absolute z-50 bg-white dark:bg-card rounded-lg shadow-md border border-gray-200 dark:border-border p-4 max-h-96 overflow-y-auto"
            style={{
              top: timeButtonRef.current 
                ? `${timeButtonRef.current.getBoundingClientRect().bottom + window.scrollY -1}px`
                : '50%',
              left: timeButtonRef.current
                ? `${timeButtonRef.current.getBoundingClientRect().left + (timeButtonRef.current.getBoundingClientRect().width / 2)}px`
                : '50%',
              transform: 'translateX(-50%)',
              minWidth: '320px',
              maxWidth: '90vw',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Horarios disponibles</h3>
              <button
                onClick={() => setShowTimePicker(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {loadingHours ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#16a34a]"></div>
              </div>
            ) : availableHours.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableHours.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={`
                      px-3 py-2 text-sm rounded-md transition-colors
                      ${tempTime === time 
                        ? 'bg-[#16a34a] text-white' 
                        : 'bg-gray-50 dark:bg-muted hover:bg-gray-100 dark:hover:bg-muted/80'
                      }
                    `}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-500">
                No hay horarios disponibles para esta fecha
              </div>
            )}
          </div>
        </>
      )}

      {/* Sheet de filtros para mobile */}
      <Sheet open={showFiltersSheet} onOpenChange={setShowFiltersSheet}>
        <SheetContent side="right" className="p-0 flex flex-col sm:max-w-md w-full">
          {/* Header fijo con título y botón de cerrar */}
          <div className="sticky top-0 z-10 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Filtros</SheetTitle>
          </div>
          
          {/* Botón Limpiar todo */}
          <div className="px-6 pb-3 pt-0 border-b border-border flex justify-end">
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="flex items-center gap-2 text-[#16a34a] hover:text-[#15803d] text-sm font-medium transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Limpiar todo
            </button>
          </div>
          
          {/* Contenido scrolleable con filtros */}
          <div 
            className="flex-1 overflow-y-auto px-6 py-2" 
            style={{ 
              scrollBehavior: 'auto',
              overflowAnchor: 'none'
            }}
            onScroll={(e) => {
              // Prevenir cualquier scroll automático
              e.stopPropagation();
            }}
          >
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
              onUbicacionObtenida={handleUbicacionObtenida}
              onUbicacionLimpiada={handleUbicacionLimpiada}
            />
          </div>

          {/* Footer sticky con botón de ver resultados */}
          <div className="sticky bottom-0 z-10 bg-white border-t border-border px-6 py-4">
            <button
              onClick={() => setShowFiltersSheet(false)}
              className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Ver {filtered.length} {filtered.length === 1 ? 'cancha' : 'canchas'}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Barra de búsqueda estilo booking - Igual que en home */}
      <div className="bg-white dark:bg-background py-4">
        <div className="container mx-auto px-4">
          {/* Botón de filtros - Solo mobile, arriba del search bar */}
          <div className="lg:hidden flex justify-end mb-4">
            <button 
              onClick={() => setShowFiltersSheet(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <SlidersHorizontal className="h-5 w-5 text-foreground" />
              <span className="text-sm font-medium">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#16a34a] text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="bg-white dark:bg-card rounded-lg p-2 flex flex-col sm:flex-row gap-0 sm:gap-0 max-w-3xl mx-auto" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            {/* Ubicación */}
            <div className="relative flex-1">
              <button
                onClick={() => {
                  // Por ahora solo muestra la ubicación actual, no editable
                }}
                className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors rounded-md sm:rounded-none sm:rounded-l-md border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border"
              >
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Ubicación</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-foreground">
                    {searchParams.get('ubicacion') || 'Piura, Perú'}
                  </p>
                </div>
              </button>
            </div>

            {/* Fecha */}
            <div className="relative flex-1">
              <button
                ref={dateButtonRef}
                onClick={handleOpenDatePicker}
                className="flex items-center justify-between gap-3 px-4 py-2 w-full text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border"
              >
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Fecha</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-foreground">
                      {(() => {
                        const displayDate = tempDate || new Date(filters.selectedDate + 'T00:00:00');
                        const today = getLocalDateString();
                        const dateStr = getLocalDateString(displayDate);
                        if (dateStr === today) {
                          return 'Hoy, ' + displayDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
                        }
                        return displayDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
                      })()}
                    </p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Hora */}
            <div className="relative flex-1">
              <button
                ref={timeButtonRef}
                onClick={handleOpenTimePicker}
                className="flex items-center justify-between gap-3 px-4 py-2 w-full text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border"
              >
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Hora</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-foreground">
                      {tempTime || filters.availableHours[0] || 'Cualquier hora'}
                    </p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Botón buscar */}
            <button
              onClick={handleBuscarCanchas}
              className="flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold px-5 py-2 rounded-md transition-colors text-sm whitespace-nowrap"
            >
              <Search className="h-4 w-4" />
              Buscar canchas
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 bg-white">
        <div className="container mx-auto px-4 flex bg-white">
          {/* Sidebar de filtros - Solo en desktop */}
          <aside className="hidden lg:block w-[320px] shrink-0 pr-6">
            <div className="sticky py-6 px-3 space-y-6 bg-card rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Filtros</h2>
                </div>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="flex items-center gap-2 text-[#16a34a] hover:text-[#15803d] text-sm font-medium transition-colors shrink-0"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Limpiar
                </button>
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
                onUbicacionObtenida={handleUbicacionObtenida}
                onUbicacionLimpiada={handleUbicacionLimpiada}
              />
            </div>
          </aside>

          {/* Contenido principal */}
          <main className="flex-1 min-w-0">
            {/* Nueva sección mobile con diseño actualizado */}
            <section className="bg-white pt-0 lg:hidden">
              {/* Contador de resultados con ordenamiento */}
              <div className="flex items-center justify-between pb-2">
                <p className="text-md font-semibold text-foreground">
                  {loading ? 'Cargando...' : `${filtered.length} ${filtered.length === 1 ? 'cancha encontrada' : 'canchas encontradas'}`}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ordenar:</span>
                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto hover:bg-transparent focus:ring-0">
                      <ArrowUpDown className="h-5 w-5 text-foreground" />
                    </SelectTrigger>
                    <SelectContent align="end">
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

            <section className="flex-1">
              {/* Header con título y ordenamiento */}
              <div className="hidden lg:flex items-center justify-between mb-2 mt-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {loading ? 'Cargando...' : `${filtered.length} ${filtered.length === 1 ? 'cancha encontrada' : 'canchas encontradas'}`}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ordenar:</span>
                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto hover:bg-transparent focus:ring-0">
                      <ArrowUpDown className="h-5 w-5 text-foreground" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="relevancia">{ubicacion ? 'Más cercanas' : 'Recomendados'}</SelectItem>
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
                  {filtered.map(c => (
                  <CanchaCard
                    key={c.id}
                    cancha={c}
                    distancia={(c as any).distancia}
                    selectedDate={filters.selectedDate}
                    preselectedHour={filters.availableHours.length > 0 ? filters.availableHours[0] : undefined}
                  />
                ))}
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
      <div className="flex flex-col flex-1 bg-white md:bg-background">
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
