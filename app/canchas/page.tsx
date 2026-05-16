'use client';

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { MapPin, X, Search, SlidersHorizontal, ArrowUpDown, CheckCircle, RefreshCw, ShieldCheck, Navigation } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Header } from '@/components/header';
import { CanchaCard } from '@/components/cancha-card';
import { CanchaCardHorizontal } from '@/components/cancha-card-horizontal';
import { CanchasMap } from '@/components/canchas-map';
import { AdvancedFiltersComponent } from '@/components/advanced-filters';
import { UbicacionButton } from '@/components/ubicacion-button';
import { SportType, AdvancedFilters, DEFAULT_FILTERS, sportLabels } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  filterCanchas, sortCanchas, getAllAmenities, getAllDistricts, getPriceRange,
  SortOption,
} from '@/lib/filter-utils';
import { getLocalDateString } from '@/lib/date-utils';
import { apiGetFavoritos, getToken } from '@/lib/api';
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

const DISTRITOS_PIURA = [
  'Piura', 'Castilla', 'Catacaos', 'La Unión', 'Las Lomas',
  'Tambogrande', 'Sullana', 'Paita', 'Talara', 'Chulucanas',
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
  // Una sola llamada a favoritos para toda la página
  const [favIds, setFavIds]           = useState<Set<string>>(new Set());

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

    // Una sola llamada a favoritos para toda la página
    const token = getToken();
    if (token) {
      apiGetFavoritos().then((ids: string[]) => {
        if (Array.isArray(ids)) setFavIds(new Set(ids));
      }).catch(() => {});
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
    
    // Si hay ubicación en los parámetros, filtrar por distrito
    if (ubicacionParam && ubicacionParam !== 'Mi ubicación' && ubicacionParam !== 'Piura, Perú') {
      // Buscar coincidencia exacta o parcial en los distritos de las canchas
      const distritoEncontrado = allDistricts.find(d =>
        d.toLowerCase().includes(ubicacionParam.toLowerCase()) ||
        ubicacionParam.toLowerCase().includes(d.toLowerCase())
      );
      if (distritoEncontrado) {
        setFilters(prev => ({
          ...prev,
          districts: [distritoEncontrado],
        }));
      } else {
        // Si no hay coincidencia en allDistricts, filtrar directamente por el nombre
        // usando searchQuery para que filterCanchas lo tome en cuenta
        setFilters(prev => ({
          ...prev,
          districts: [ubicacionParam], // intentar con el nombre tal cual
        }));
      }
    } else if (!ubicacionParam || ubicacionParam === 'Piura, Perú') {
      // Sin filtro de distrito — mostrar todas
      setFilters(prev => ({ ...prev, districts: [] }));
    }
  }, [searchParams]); // Solo depende de searchParams, no de allDistricts

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

  // Estado del modal fullscreen de búsqueda (estilo Airbnb)
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchStep, setSearchStep] = useState<'ubicacion' | 'fecha' | 'hora'>('ubicacion');
  // Valores temporales dentro del modal (se aplican solo al buscar)
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [modalTime, setModalTime] = useState('');
  const [modalUbicacion, setModalUbicacion] = useState(searchParams.get('ubicacion') || '');
  // ID de cancha hovereada (para resaltar en el mapa)
  const [hoveredCanchaId, setHoveredCanchaId] = useState<string | null>(null);

  // Estados para la barra desktop estilo Airbnb
  const [activeField, setActiveField] = useState<'ubicacion' | 'fecha' | 'hora' | null>(null);
  const [desktopUbicacion, setDesktopUbicacion] = useState(searchParams.get('ubicacion') || '');
  const [desktopFecha, setDesktopFecha] = useState<Date | null>(() => {
    const f = searchParams.get('fecha');
    return f ? new Date(f + 'T00:00:00') : null;
  });
  const [desktopHora, setDesktopHora] = useState(searchParams.get('hora') || '');

  const handleDesktopSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (desktopUbicacion) params.set('ubicacion', desktopUbicacion);
    if (desktopFecha) params.set('fecha', getLocalDateString(desktopFecha));
    else params.delete('fecha');
    if (desktopHora) params.set('hora', desktopHora);
    else params.delete('hora');
    window.location.href = `/canchas?${params.toString()}`;
  };

  const generateDesktopCalendar = (refDate: Date): (Date | null)[] => {
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  };

  // Toggle favorito desde cualquier card — actualiza el Set local sin re-fetch
  const handleToggleFav = (canchaId: string) => {
    setFavIds(prev => {
      const next = new Set(prev);
      if (next.has(canchaId)) next.delete(canchaId);
      else next.add(canchaId);
      return next;
    });
  };

  const openSearchModal = (step: 'ubicacion' | 'fecha' | 'hora' = 'ubicacion') => {
    setModalDate(tempDate || new Date());
    setModalTime(tempTime || filters.availableHours[0] || '');
    setSearchStep(step as any);
    setShowSearchModal(true);
  };

  const handleModalSearch = () => {
    setTempDate(modalDate);
    setTempTime(modalTime);
    setShowSearchModal(false);

    const params = new URLSearchParams(searchParams.toString());
    if (modalDate) params.set('fecha', getLocalDateString(modalDate));
    if (modalTime) params.set('hora', modalTime);
    const ubicacionFinal = modalUbicacion || searchParams.get('ubicacion') || 'Piura, Perú';
    params.set('ubicacion', ubicacionFinal);
    window.location.href = `/canchas?${params.toString()}`;
  };

  // Generar calendario para el modal
  const generateModalCalendar = () => {
    const year = modalDate.getFullYear();
    const month = modalDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
    return days;
  };

  // Horarios disponibles para la fecha del modal
  const modalAvailableHours = useMemo(() => {
    const dateStr = getLocalDateString(modalDate);
    const hoursSet = new Set<string>();
    canchas.forEach((cancha) => {
      const horariosOcupados = cancha.horariosOcupados || {};
      const horariosRestringidos = cancha.horariosRestringidos || [];
      HORAS.forEach(hora => {
        if (!horariosRestringidos.includes(hora)) {
          const key = `${dateStr}|${hora}`;
          if (!horariosOcupados[key]) hoursSet.add(hora);
        }
      });
    });
    return Array.from(hoursSet).sort();
  }, [canchas, modalDate]);

  return (
    <div className="flex flex-col flex-1 bg-white">
      <Header />

      {/* ── MODAL FULLSCREEN DE BÚSQUEDA (mobile) ────────────────── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={() => setShowSearchModal(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50">
              <X className="h-4 w-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-800">Buscar canchas</span>
            <button onClick={() => { setModalUbicacion(''); setModalDate(new Date()); setModalTime(''); }} className="text-xs text-gray-400 hover:text-gray-700 underline">Limpiar</button>
          </div>

          {/* Tabs: Dónde / Fecha / Hora */}
          <div className="flex border-b border-gray-100">
            {(['ubicacion', 'fecha', 'hora'] as const).map((step, i) => (
              <button key={step} onClick={() => setSearchStep(step)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${searchStep === step ? 'border-[#16a34a] text-[#16a34a]' : 'border-transparent text-gray-400'}`}>
                {step === 'ubicacion' ? '📍 Dónde' : step === 'fecha' ? '📅 Fecha' : '🕐 Hora'}
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto px-4 py-4">

            {/* ── UBICACIÓN ── */}
            {searchStep === 'ubicacion' && (
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-3">¿Dónde quieres jugar?</h2>
                {/* Cerca de mí */}
                <button
                  onClick={() => {
                    if (!navigator.geolocation) return;
                    navigator.geolocation.getCurrentPosition(async (pos) => {
                      try {
                        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=es`);
                        const d = await r.json();
                        const city = d.address?.city || d.address?.town || d.address?.village || 'Mi ubicación';
                        setModalUbicacion(city);
                      } catch { setModalUbicacion('Mi ubicación'); }
                    });
                    setSearchStep('fecha');
                  }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl border border-gray-200 hover:border-[#16a34a] hover:bg-green-50 transition-colors mb-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Navigation className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">Cerca de mí</p>
                    <p className="text-xs text-gray-400">Usar mi ubicación actual</p>
                  </div>
                </button>

                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Distritos de Piura</p>
                <div className="space-y-1">
                  {DISTRITOS_PIURA.map(distrito => (
                    <button
                      key={distrito}
                      onClick={() => { setModalUbicacion(distrito); setSearchStep('fecha'); }}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-colors ${modalUbicacion === distrito ? 'border-[#16a34a] bg-green-50 text-[#16a34a]' : 'border-gray-100 hover:border-gray-300 text-gray-700'}`}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="text-sm">{distrito}, Piura</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── FECHA ── */}
            {searchStep === 'fecha' && (
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-3">¿Cuándo quieres jugar?</h2>
                {/* Chips rápidos */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                  {[
                    { label: 'Hoy', date: new Date() },
                    { label: 'Mañana', date: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })() },
                    { label: 'Fin de semana', date: (() => { const d = new Date(); const diff = d.getDay() === 6 ? 0 : 6 - d.getDay(); d.setDate(d.getDate() + diff); return d; })() },
                  ].map(({ label, date }) => {
                    const isSelected = getLocalDateString(modalDate) === getLocalDateString(date);
                    return (
                      <button key={label} onClick={() => { setModalDate(date); setSearchStep('hora'); }}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isSelected ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                {/* Calendario compacto */}
                <div className="max-w-xs mx-auto">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => { const d = new Date(modalDate); d.setMonth(d.getMonth() - 1); setModalDate(d); }} className="p-1.5 rounded-full hover:bg-gray-100">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="text-sm font-semibold capitalize">{modalDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => { const d = new Date(modalDate); d.setMonth(d.getMonth() + 1); setModalDate(d); }} className="p-1.5 rounded-full hover:bg-gray-100">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map((d, i) => <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {generateModalCalendar().map((day, index) => {
                      if (!day) return <div key={`e-${index}`} />;
                      const today = new Date(); today.setHours(0,0,0,0);
                      const dayDate = new Date(day); dayDate.setHours(0,0,0,0);
                      const isToday = dayDate.getTime() === today.getTime();
                      const isSelected = getLocalDateString(dayDate) === getLocalDateString(modalDate);
                      const isPast = dayDate < today;
                      return (
                        <button key={index} disabled={isPast} onClick={() => { if (!isPast) { setModalDate(day); setSearchStep('hora'); } }}
                          className={`aspect-square flex items-center justify-center text-xs rounded-full transition-colors font-medium
                            ${isPast ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-100'}
                            ${isSelected ? 'bg-[#16a34a] text-white hover:bg-[#15803d]' : ''}
                            ${isToday && !isSelected ? 'border-2 border-[#16a34a] text-[#16a34a]' : ''}
                          `}>
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── HORA ── */}
            {searchStep === 'hora' && (
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-1">¿A qué hora?</h2>
                <p className="text-xs text-gray-500 mb-4 capitalize">{modalDate.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                {modalAvailableHours.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {modalAvailableHours.map((time) => {
                      const isToday = getLocalDateString(modalDate) === getLocalDateString();
                      const [hh] = time.split(':').map(Number);
                      const isPast = isToday && hh <= new Date().getHours();
                      return (
                        <button key={time} disabled={isPast} onClick={() => { if (!isPast) setModalTime(time); }}
                          className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                            ${isPast ? 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed'
                              : modalTime === time ? 'bg-[#16a34a] border-[#16a34a] text-white'
                              : 'border-gray-200 text-gray-700 hover:border-[#16a34a]/50'}`}>
                          {time}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-3xl mb-2">😔</p>
                    <p className="font-semibold text-gray-800 text-sm">Sin horarios disponibles</p>
                    <button onClick={() => setSearchStep('fecha')} className="mt-3 text-xs font-semibold text-[#16a34a] underline">Cambiar fecha</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-3 bg-white">
            <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
              <span>{modalUbicacion || 'Piura, Perú'}</span>
              <span>
                {modalDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                {modalTime && ` · ${modalTime}`}
              </span>
            </div>
            <button onClick={handleModalSearch} className="w-full flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold py-3 rounded-xl transition-colors text-sm">
              <Search className="h-4 w-4" />
              Buscar canchas
            </button>
          </div>
        </div>
      )}

      {/* ── BARRA DE BÚSQUEDA DESKTOP (estilo Airbnb) ────────────── */}
      <div className="bg-white border-b border-gray-100 py-3 sticky top-16 z-30">
        <div className="container mx-auto px-4">

          {/* Desktop: barra expandida con 3 campos */}
          <div className="hidden md:flex items-center gap-2 max-w-3xl mx-auto">
            <div className="flex-1 flex items-center gap-0 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">

            {/* Campo: Dónde */}
            <div className="relative flex-1">
              <button
                onClick={() => {
                  setActiveField(activeField === 'ubicacion' ? null : 'ubicacion');
                }}
                className={`w-full text-left px-5 py-3 rounded-xl transition-colors ${activeField === 'ubicacion' ? 'bg-white shadow-lg ring-1 ring-gray-200 rounded-full z-10 relative' : 'hover:bg-gray-50'}`}
              >
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Dónde</p>
                <p className="text-sm font-medium text-gray-800 truncate">{desktopUbicacion || 'Buscar destino'}</p>
              </button>

              {activeField === 'ubicacion' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActiveField(null)} />
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    {/* Opción: Cerca de mí */}
                    <button
                      onClick={() => {
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition(async (pos) => {
                          try {
                            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=es`);
                            const d = await r.json();
                            const city = d.address?.city || d.address?.town || d.address?.village || 'Mi ubicación';
                            setDesktopUbicacion(city);
                          } catch { setDesktopUbicacion('Mi ubicación'); }
                        });
                        setActiveField('fecha');
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                        <Navigation className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">Cerca de mí</p>
                        <p className="text-xs text-gray-400">Usar mi ubicación actual</p>
                      </div>
                    </button>

                    {/* Distritos de Piura */}
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Distritos de Piura</p>
                    </div>
                    {DISTRITOS_PIURA.map(distrito => (
                      <button
                        key={distrito}
                        onClick={() => { setDesktopUbicacion(distrito); setActiveField('fecha'); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          <MapPin className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <span className="text-sm text-gray-700">{distrito}, Piura</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-8 bg-gray-200 shrink-0" />

            {/* Campo: Fecha */}
            <div className="relative flex-1">
              <button
                onClick={() => setActiveField(activeField === 'fecha' ? null : 'fecha')}
                className={`w-full text-left px-5 py-3 transition-colors ${activeField === 'fecha' ? 'bg-white shadow-lg ring-1 ring-gray-200 rounded-xl z-10 relative' : 'hover:bg-gray-50'}`}
              >
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fecha</p>
                <p className="text-sm font-medium text-gray-800">
                  {desktopFecha
                    ? (getLocalDateString(desktopFecha) === getLocalDateString()
                        ? 'Hoy, ' + desktopFecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
                        : desktopFecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }))
                    : 'Agrega fecha'}
                </p>
              </button>

              {activeField === 'fecha' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActiveField(null)} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => { const d = new Date(desktopFecha || new Date()); d.setMonth(d.getMonth() - 1); setDesktopFecha(d); }} className="p-1.5 rounded-full hover:bg-gray-100">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <span className="text-sm font-semibold capitalize">
                        {(desktopFecha || new Date()).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => { const d = new Date(desktopFecha || new Date()); d.setMonth(d.getMonth() + 1); setDesktopFecha(d); }} className="p-1.5 rounded-full hover:bg-gray-100">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map((d, i) => <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {generateDesktopCalendar(desktopFecha || new Date()).map((day, idx) => {
                        if (!day) return <div key={`e-${idx}`} />;
                        const today = new Date(); today.setHours(0,0,0,0);
                        const dayDate = new Date(day); dayDate.setHours(0,0,0,0);
                        const isSelected = desktopFecha && getLocalDateString(dayDate) === getLocalDateString(desktopFecha);
                        const isToday = dayDate.getTime() === today.getTime();
                        const isPast = dayDate < today;
                        return (
                          <button key={idx} disabled={isPast} onClick={() => { setDesktopFecha(day); setActiveField('hora'); }}
                            className={`aspect-square flex items-center justify-center text-xs rounded-full transition-colors font-medium
                              ${isPast ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-100'}
                              ${isSelected ? 'bg-[#16a34a] text-white hover:bg-[#15803d]' : ''}
                              ${isToday && !isSelected ? 'border-2 border-[#16a34a] text-[#16a34a]' : ''}
                            `}>
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-8 bg-gray-200 shrink-0" />

            {/* Campo: Hora */}
            <div className="relative flex-1">
              <button
                onClick={() => setActiveField(activeField === 'hora' ? null : 'hora')}
                className={`w-full text-left px-5 py-3 transition-colors ${activeField === 'hora' ? 'bg-white shadow-lg ring-1 ring-gray-200 rounded-xl z-10 relative' : 'hover:bg-gray-50'}`}
              >
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Hora</p>
                <p className="text-sm font-medium text-gray-800">{desktopHora || 'Cualquier hora'}</p>
              </button>

              {activeField === 'hora' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActiveField(null)} />
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Horarios disponibles</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {HORAS.map(h => {
                        const isToday = desktopFecha
                          ? getLocalDateString(desktopFecha) === getLocalDateString()
                          : true;
                        const now = new Date();
                        const [hh] = h.split(':').map(Number);
                        const isPast = isToday && hh <= now.getHours();
                        const isSelected = desktopHora === h;
                        return (
                          <button
                            key={h}
                            disabled={isPast}
                            onClick={() => { if (!isPast) { setDesktopHora(h); setActiveField(null); } }}
                            className={`py-2.5 rounded-lg text-xs font-semibold border transition-all
                              ${isPast
                                ? 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-[#16a34a] border-[#16a34a] text-white'
                                  : 'border-gray-200 text-gray-700 hover:border-[#16a34a]/50 hover:text-[#16a34a] bg-white'
                              }`}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Botón buscar */}
            <button
              onClick={handleDesktopSearch}
              className="flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm mx-1.5 shrink-0"
            >
              <Search className="h-4 w-4" />
              Buscar
            </button>
          </div>

            {/* Botón filtros — solo en md-lg (768-1023px) */}
            <button
              onClick={() => setShowFiltersSheet(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-full transition-all bg-white shrink-0"
            >
              <SlidersHorizontal className="h-6 w-8 text-gray-600" />
             
            </button>
          </div>

          {/* Mobile: pill compacto */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => openSearchModal('fecha')}
              className="flex-1 flex items-center gap-3 bg-white border border-gray-200 hover:border-gray-400 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md transition-all text-left"
            >
              <Search className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{searchParams.get('ubicacion') || 'Piura, Perú'}</p>
                <p className="text-xs text-gray-400 truncate">
                  {(() => {
                    const fecha = searchParams.get('fecha');
                    const hora = searchParams.get('hora');
                    const parts: string[] = [];
                    if (fecha) {
                      const d = new Date(fecha + 'T00:00:00');
                      parts.push(fecha === getLocalDateString() ? 'Hoy' : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }));
                    } else { parts.push('Cualquier fecha'); }
                    if (hora) parts.push(hora);
                    return parts.join(' · ');
                  })()}
                </p>
              </div>
            </button>
            <button
              onClick={() => setShowFiltersSheet(true)}
              className="flex items-center gap-1.5 px-1 py-2.5 rounded-full  transition-all bg-white"
            >
              <SlidersHorizontal className="h-6 w-8 text-gray-600" />
             
            </button>
          </div>

        </div>
      </div>

      {/* Sheet de filtros */}
      <Sheet open={showFiltersSheet} onOpenChange={setShowFiltersSheet}>
        <SheetContent side="right" className="p-0 flex flex-col sm:max-w-md w-full">
          <div className="sticky top-0 z-10 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Filtros</SheetTitle>
          </div>
          <div className="px-6 pb-3 pt-0 border-b border-border flex justify-end">
            <button onClick={() => setFilters(DEFAULT_FILTERS)} className="flex items-center gap-2 text-[#16a34a] hover:text-[#15803d] text-sm font-medium transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Limpiar todo
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-2" style={{ scrollBehavior: 'auto', overflowAnchor: 'none' }} onScroll={(e) => e.stopPropagation()}>
            <AdvancedFiltersComponent filters={filters} onFiltersChange={setFilters} allAmenities={allAmenities} allDistricts={allDistricts} priceRange={priceRange} sports={sports} activeFilterCount={activeFilterCount} isSidebar={true} resultCount={filtered.length} ubicacion={ubicacion} onUbicacionObtenida={handleUbicacionObtenida} onUbicacionLimpiada={handleUbicacionLimpiada} />
          </div>
          <div className="sticky bottom-0 z-10 bg-white border-t border-border px-6 py-4">
            <button onClick={() => setShowFiltersSheet(false)} className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold py-3 rounded-lg transition-colors">
              Ver {filtered.length} {filtered.length === 1 ? 'cancha' : 'canchas'}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 bg-white">
        <div className="container mx-auto px-4 flex bg-white">
          {/* ── COL 1: Filtros (lg+, ≥1024px) ────────────────────── */}
          <aside className="hidden lg:block w-[240px] xl:w-[280px] shrink-0 pr-3 pt-4">
            <div className="sticky top-20 py-4 px-3 space-y-4 bg-white rounded-xl border border-gray-100 shadow-sm max-h-[calc(100vh-100px)] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Filtros</h2>
                <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs text-[#16a34a] hover:text-[#15803d] font-medium transition-colors">
                  Limpiar todo
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

          {/* ── COL 2: Lista de canchas ────────────────────────────── */}
          <main className="flex-1 min-w-0 pt-4 lg:px-3">
            {/* Contador siempre visible */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">
                {loading ? 'Cargando...' : `${filtered.length} ${filtered.length === 1 ? 'cancha encontrada' : 'canchas encontradas'}`}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 hidden md:inline">Ordenar:</span>
                <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto hover:bg-transparent focus:ring-0">
                    <ArrowUpDown className="h-4 w-4 text-gray-600" />
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
            {/* Cards */}
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex rounded-xl border border-gray-100 overflow-hidden h-[140px] animate-pulse bg-gray-50">
                    <div className="w-[200px] bg-gray-200 shrink-0" />
                    <div className="flex-1 p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <>
                {/* < 768px: cards verticales sin mapa */}
                <div className="md:hidden grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {(filtered as any[]).map(c => (
                    <CanchaCard key={c.id} cancha={c} distancia={c.distancia} selectedDate={filters.selectedDate} preselectedHour={filters.availableHours[0]} isFav={favIds.has(c.id)} onToggleFav={handleToggleFav} />
                  ))}
                </div>

                {/* 768–1023px: cards horizontales compactas + mapa derecha */}
                <div className="hidden md:flex lg:hidden flex-col gap-3">
                  {(filtered as any[]).map(c => (
                    <CanchaCardHorizontal
                      key={c.id} cancha={c} distancia={c.distancia}
                      selectedDate={filters.selectedDate}
                      preselectedHour={filters.availableHours[0]}
                      isHighlighted={hoveredCanchaId === c.id}
                      onHover={setHoveredCanchaId}
                      compact={true}
                      isFav={favIds.has(c.id)}
                      onToggleFav={handleToggleFav}
                    />
                  ))}
                </div>

                {/* 1024–1439px: filtros + cards horizontales compactas + mapa */}
                <div className="hidden lg:flex xl:hidden flex-col gap-3">
                  {(filtered as any[]).map(c => (
                    <CanchaCardHorizontal
                      key={c.id} cancha={c} distancia={c.distancia}
                      selectedDate={filters.selectedDate}
                      preselectedHour={filters.availableHours[0]}
                      isHighlighted={hoveredCanchaId === c.id}
                      onHover={setHoveredCanchaId}
                      compact={true}
                      isFav={favIds.has(c.id)}
                      onToggleFav={handleToggleFav}
                    />
                  ))}
                </div>

                {/* 1440px+: cards horizontales normales */}
                <div className="hidden xl:flex flex-col gap-3">
                  {(filtered as any[]).map(c => (
                    <CanchaCardHorizontal
                      key={c.id} cancha={c} distancia={c.distancia}
                      selectedDate={filters.selectedDate}
                      preselectedHour={filters.availableHours[0]}
                      isHighlighted={hoveredCanchaId === c.id}
                      onHover={setHoveredCanchaId}
                      compact={false}
                      isFav={favIds.has(c.id)}
                      onToggleFav={handleToggleFav}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <MapPin className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-800">No se encontraron canchas</h3>
                <p className="text-gray-500 text-sm mb-4">Intenta ajustar los filtros</p>
                <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-[#16a34a] font-medium hover:underline text-sm">
                  Limpiar filtros
                </button>
              </div>
            )}
          </main>

          {/* ── COL 3: Mapa + panel (md+, ≥768px) ────────────────── */}
          <aside className="hidden md:flex flex-col w-[260px] lg:w-[300px] xl:w-[340px] shrink-0 pl-3 pt-4 gap-4">
            {/* Mapa sticky */}
            <div className="sticky top-20 flex flex-col gap-4">
              {/* Mapa */}
              <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm" style={{ height: '420px' }}>
                <CanchasMap
                  canchas={(filtered as any[])
                    .filter(c => c.coordinates?.lat && c.coordinates?.lng)
                    .map(c => ({
                      id: c.id,
                      name: c.name,
                      lat: c.coordinates.lat,
                      lng: c.coordinates.lng,
                      price: c.pricePerHour,
                      type: sportLabels[c.type as SportType] ?? c.type,
                    }))}
                  selectedId={hoveredCanchaId ?? undefined}
                  onSelectCancha={setHoveredCanchaId}
                  centerLocation={desktopUbicacion || searchParams.get('ubicacion') || undefined}
                />
              </div>

              {/* Panel de beneficios */}
              <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-800">¿Por qué reservar aquí?</h3>
                <div className="space-y-2.5">
                  {[
                    { icon: CheckCircle, text: 'Reserva 100% online', sub: 'Sin llamadas, sin complicaciones.' },
                    { icon: RefreshCw, text: 'Cancelación flexible', sub: 'Cancela gratis hasta 2 horas antes.' },
                    { icon: ShieldCheck, text: 'Canchas verificadas', sub: 'Todas pasan por un proceso de verificación.' },
                  ].map(({ icon: Icon, text, sub }) => (
                    <div key={text} className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#16a34a]/10">
                        <Icon className="h-3.5 w-3.5 text-[#16a34a]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{text}</p>
                        <p className="text-xs text-gray-400">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
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
