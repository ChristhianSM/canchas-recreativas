'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin, Search, Calendar, CheckCircle, ArrowRight,
  Zap, Phone, CreditCard, ShieldCheck, Clock, X, Loader2,
} from 'lucide-react';
import { Header } from '@/components/header';
import { CanchaCard } from '@/components/cancha-card';
import { Button } from '@/components/ui/button';
import { SportType } from '@/lib/types';
import { getLocalDateString } from '@/lib/date-utils';

type Cancha = {
  id: string; nombre: string; tipo: SportType; direccion: string;
  distrito: string; descripcion: string; imagenes: string[];
  rating: number; total_resenas: number; precio_por_hora: number;
  amenidades: string[]; lat: number; lng: number; telefono: string;
  destacada: boolean; activa: boolean;
  superficie?: string | null;
  max_jugadores?: number | null;
  balon_disponible?: boolean;
  balon_precio?: number | null;
  chalecos_disponible?: boolean;
  chalecos_precio?: number | null;
  horariosOcupados?: Record<string, 'reservado' | 'en_proceso'>;
  horariosRestringidos?: string[];
};

const HORAS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00','23:00',
];

function adaptCancha(c: Cancha) {
  // Construir schedule para los próximos 14 días usando horarios reales
  const schedule: Record<string, Array<{ id: string; time: string; available: boolean; price: number; status: 'disponible' | 'reservado' | 'en_proceso' }>> = {};
  const horariosOcupados = c.horariosOcupados || {};
  const horariosRestringidos = c.horariosRestringidos || [];
  
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = getLocalDateString(d);
    
    schedule[dateStr] = HORAS
      .filter(hora => !horariosRestringidos.includes(hora)) // Excluir horarios restringidos
      .map(hora => {
        const key = `${dateStr}|${hora}`;
        const estadoOcupado = horariosOcupados[key];
        
        return {
          id: `${dateStr}-${hora}`,
          time: hora,
          available: !estadoOcupado,
          price: c.precio_por_hora,
          status: estadoOcupado || 'disponible',
        };
      });
  }

  return {
    id: c.id, name: c.nombre, type: c.tipo, address: c.direccion,
    district: c.distrito, description: c.descripcion, images: c.imagenes ?? [],
    rating: c.rating, reviewCount: c.total_resenas, pricePerHour: c.precio_por_hora,
    amenities: c.amenidades ?? [], coordinates: { lat: c.lat, lng: c.lng },
    phone: c.telefono, featured: c.destacada, schedule,
    superficie:        (c.superficie ?? null) as any,
    maxJugadores:      c.max_jugadores ?? null,
    balonDisponible:   c.balon_disponible  ?? false,
    balonPrecio:       c.balon_precio      ?? null,
    chalecoDisponible: c.chalecos_disponible ?? false,
    chalecosPrecio:    c.chalecos_precio   ?? null,
  };
}

export default function HomePage() {  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [ubicacion, setUbicacion] = useState('Mi ubicación');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  
  // Estados para el buscador avanzado
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);
  
  const locationRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const timeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Fecha de hoy formateada
    const hoy = new Date();
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    setFecha(`Hoy, ${hoy.toLocaleDateString('es-PE', opciones)}`);
    
    // Calcular la hora siguiente (redondear hacia arriba)
    const horaActual = hoy.getHours();
    const horaSiguiente = horaActual + 1;
    
    // Formatear en formato 24 horas (HH:00)
    const horaSiguienteFormateada = `${String(horaSiguiente).padStart(2, '0')}:00`;
    
    // Establecer la hora siguiente como predeterminada
    setSelectedTime(horaSiguienteFormateada);
    setHora(horaSiguienteFormateada);

    fetch('/api/canchas/list')
      .then(r => r.json())
      .then(data => {
        setCanchas(Array.isArray(data) ? data.filter((c: Cancha) => c.destacada) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Cerrar modales al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // Solo cerrar si se hace click en el overlay (no en el contenido del modal)
      if (showLocationModal && locationRef.current && !locationRef.current.contains(target)) {
        const isOverlay = (event.target as HTMLElement).classList.contains('fixed');
        if (isOverlay) {
          setShowLocationModal(false);
        }
      }
      if (showDatePicker && dateRef.current && !dateRef.current.contains(target)) {
        const isOverlay = (event.target as HTMLElement).classList.contains('fixed');
        if (isOverlay) {
          setShowDatePicker(false);
        }
      }
      if (showTimePicker && timeRef.current && !timeRef.current.contains(target)) {
        const isOverlay = (event.target as HTMLElement).classList.contains('fixed');
        if (isOverlay) {
          setShowTimePicker(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLocationModal, showDatePicker, showTimePicker]);

  // Cargar horarios disponibles cuando cambia la fecha
  useEffect(() => {
    if (selectedDate) {
      loadAvailableHours(selectedDate);
    }
  }, [selectedDate]);

  const loadAvailableHours = async (date: Date) => {
    setLoadingHours(true);
    try {
      const dateStr = getLocalDateString(date);
      const response = await fetch(`/api/canchas/list`);
      const canchas = await response.json();
      
      // Obtener todos los horarios disponibles de todas las canchas para esa fecha
      const hoursSet = new Set<string>();
      
      canchas.forEach((cancha: any) => {
        const horariosOcupados = cancha.horariosOcupados || {};
        const horariosRestringidos = cancha.horariosRestringidos || [];
        
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

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Usar API de geocodificación inversa para obtener la ciudad
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`
          );
          const data = await response.json();
          
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || 'Ubicación actual';
          setUbicacion(city);
          setShowLocationModal(false);
        } catch (error) {
          console.error('Error getting location name:', error);
          setUbicacion('Ubicación actual');
          setShowLocationModal(false);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('No se pudo obtener tu ubicación. Por favor, verifica los permisos.');
        setLoadingLocation(false);
      }
    );
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDay = new Date(date);
    selectedDay.setHours(0, 0, 0, 0);
    
    if (selectedDay.getTime() === today.getTime()) {
      setFecha(`Hoy, ${date.toLocaleDateString('es-PE', opciones)}`);
    } else {
      setFecha(date.toLocaleDateString('es-PE', opciones));
    }
    setShowDatePicker(false);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setHora(time);
    setShowTimePicker(false);
  };

  const handleBuscar = () => {
    // Construir query params para la búsqueda
    const params = new URLSearchParams();
    
    // Agregar fecha seleccionada
    if (selectedDate) {
      const dateStr = getLocalDateString(selectedDate);
      params.set('fecha', dateStr);
    }
    
    // Agregar hora seleccionada
    if (selectedTime) {
      params.set('hora', selectedTime);
    }
    
    // Agregar ubicación si no es la predeterminada
    if (ubicacion !== 'Mi ubicación') {
      params.set('ubicacion', ubicacion);
    }
    
    router.push(`/canchas?${params.toString()}`);
  };

  // Generar calendario para el mes actual
  const generateCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
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

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-background">
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[520px] md:min-h-[600px] flex items-center">
        {/* Imagen de fondo */}
        <div className="absolute inset-0">
          <Image
            src="/images/cancha-login.png"
            alt="Cancha deportiva"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Overlay oscuro degradado */}
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-3 tracking-tight">
              Reserva tu cancha
              <br />
              <span className="text-[#4ade80]">en segundos</span>
            </h1>
            <p className="text-white/80 text-lg mb-8 max-w-md">
              Encuentra canchas cerca de ti, elige horario y reserva sin llamadas.
            </p>

            {/* Buscador tipo booking */}
            <div className="bg-white dark:bg-card rounded-lg shadow-2xl p-2 flex flex-col sm:flex-row gap-0 sm:gap-0 max-w-3xl">
              {/* Ubicación */}
              <div className="relative flex-1">
                <button
                  ref={locationButtonRef}
                  onClick={() => {
                    setShowLocationModal(!showLocationModal);
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors rounded-md sm:rounded-none sm:rounded-l-md border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border"
                >
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Ubicación</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-foreground">{ubicacion}</p>
                  </div>
                </button>
                
                {/* Modal de ubicación */}
                {showLocationModal && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowLocationModal(false)}
                    />
                    <div 
                      ref={locationRef}
                      className="absolute z-50 bg-white dark:bg-card rounded-lg shadow-2xl border border-gray-200 dark:border-border p-4"
                      style={{
                        top: 'calc(100% - 2px)',
                        left: '0',
                        minWidth: '320px',
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">Seleccionar ubicación</h3>
                        <button
                          onClick={() => setShowLocationModal(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <button
                        onClick={handleRequestLocation}
                        disabled={loadingLocation}
                        className="w-full flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-gray-300 text-white font-medium px-4 py-2.5 rounded-md transition-colors text-sm"
                      >
                        {loadingLocation ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Obteniendo ubicación...
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4" />
                            Usar mi ubicación actual
                          </>
                        )}
                      </button>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-border">
                        <p className="text-xs text-gray-500 dark:text-muted-foreground">
                          Necesitamos tu permiso para acceder a tu ubicación
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Fecha */}
              <div className="relative flex-1">
                <button
                  ref={dateButtonRef}
                  onClick={() => {
                    setShowDatePicker(!showDatePicker);
                    setShowLocationModal(false);
                    setShowTimePicker(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border"
                >
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Fecha</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-foreground">{fecha}</p>
                  </div>
                </button>
                
                {/* Calendario */}
                {showDatePicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowDatePicker(false)}
                    />
                    <div 
                      ref={dateRef}
                      className="absolute z-50 bg-white dark:bg-card rounded-lg shadow-2xl border border-gray-200 dark:border-border p-4"
                      style={{
                        top: 'calc(100% - 2px)',
                        left: '0',
                        width: '320px',
                        maxWidth: '90vw',
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm">
                          {selectedDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
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
                          const isSelected = dayDate.getTime() === new Date(selectedDate).setHours(0, 0, 0, 0);
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
              </div>

              {/* Hora */}
              <div className="relative flex-1">
                <button
                  ref={timeButtonRef}
                  onClick={() => {
                    setShowTimePicker(!showTimePicker);
                    setShowLocationModal(false);
                    setShowDatePicker(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border"
                >
                  <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Hora</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-foreground">{hora}</p>
                  </div>
                </button>
                
                {/* Selector de hora */}
                {showTimePicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowTimePicker(false)}
                    />
                    <div 
                      ref={timeRef}
                      className="absolute z-50 bg-white dark:bg-card rounded-lg shadow-2xl border border-gray-200 dark:border-border p-4 max-h-96 overflow-y-auto"
                      style={{
                        top: 'calc(100% - 2px)',
                        left: '0',
                        minWidth: '320px',
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
                          <Loader2 className="h-6 w-6 animate-spin text-[#16a34a]" />
                        </div>
                      ) : availableHours.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {availableHours.map((time) => (
                            <button
                              key={time}
                              onClick={() => handleTimeSelect(time)}
                              className={`
                                px-3 py-2 text-sm rounded-md transition-colors
                                ${selectedTime === time 
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
              </div>

              {/* Botón buscar */}
              <button
                onClick={handleBuscar}
                className="flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold px-5 py-3 rounded-md transition-colors text-sm whitespace-nowrap"
              >
                <Search className="h-4 w-4" />
                Buscar canchas
              </button>
            </div>

            {/* Badges de confianza */}
            <div className="mt-5 flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 text-white/90 text-sm">
                <CheckCircle className="h-4 w-4 text-[#4ade80]" />
                Sin llamadas
              </div>
              <div className="flex items-center gap-1.5 text-white/90 text-sm">
                <CheckCircle className="h-4 w-4 text-[#4ade80]" />
                Reserva 100% online
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CANCHAS CERCA DE TI ───────────────────────────────────── */}
      <section className="py-12 bg-white dark:bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-foreground">Canchas cerca de ti</h2>
            <Link href="/canchas" className="text-[#16a34a] text-sm font-medium hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-md overflow-hidden border border-border">
                  <div className="aspect-video bg-muted animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : canchas.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {canchas.slice(0, 4).map(c => (
                <CanchaCard 
                  key={c.id} 
                  cancha={adaptCancha(c)} 
                  selectedDate={getLocalDateString()}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay canchas disponibles por el momento.</p>
              <Link href="/canchas" className="mt-3 inline-block text-primary font-medium hover:underline">
                Ver todas las canchas
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ─────────────────────────────────────────── */}
      <section className="py-14 bg-gray-50 dark:bg-muted/20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-foreground mb-10">¿Cómo funciona?</h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0 max-w-3xl mx-auto">
            {[
              {
                icon: Search,
                step: '1. Busca tu cancha',
                desc: 'Explora canchas disponibles cerca de ti.',
                color: 'bg-[#dcfce7] dark:bg-[#16a34a]/20',
                iconColor: 'text-[#16a34a]',
              },
              {
                icon: Calendar,
                step: '2. Elige fecha y hora',
                desc: 'Selecciona el día y horario que más te convenga.',
                color: 'bg-[#dcfce7] dark:bg-[#16a34a]/20',
                iconColor: 'text-[#16a34a]',
              },
              {
                icon: CheckCircle,
                step: '3. Reserva y juega',
                desc: 'Confirma tu reserva y disfruta del juego.',
                color: 'bg-[#16a34a]',
                iconColor: 'text-white',
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-0">
                <div className="flex flex-col items-center text-center w-48">
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-3 ${item.color}`}>
                    <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-foreground text-base">{item.step}</p>
                  <p className="text-sm text-gray-500 dark:text-muted-foreground mt-1">{item.desc}</p>
                </div>
                {idx < 2 && (
                  <ArrowRight className="h-5 w-5 text-gray-300 dark:text-muted-foreground mx-2 shrink-0 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ────────────────────────────────────────────── */}
      <section className="py-16 bg-white dark:bg-background border-t border-gray-100 dark:border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-foreground mb-3">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-gray-500 dark:text-muted-foreground max-w-2xl mx-auto">
              Hacemos que reservar tu cancha sea rápido, seguro y sin complicaciones
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Zap,
                title: 'Reserva en tiempo real',
                desc: 'Consulta disponibilidad al instante y confirma tu reserva en segundos.',
                gradient: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20',
                iconBg: 'bg-gradient-to-br from-yellow-400 to-orange-500',
                iconColor: 'text-white',
              },
              {
                icon: Phone,
                title: 'Sin llamadas',
                desc: 'Todo el proceso es 100% online. Olvídate de esperar respuestas.',
                gradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
                iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-500',
                iconColor: 'text-white',
              },
              {
                icon: CreditCard,
                title: 'Pagos fáciles',
                desc: 'Paga de forma segura y rápida con múltiples métodos de pago.',
                gradient: 'from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
                iconBg: 'bg-gradient-to-br from-purple-400 to-pink-500',
                iconColor: 'text-white',
              },
              {
                icon: ShieldCheck,
                title: 'Canchas verificadas',
                desc: 'Todas las canchas pasan por un riguroso proceso de verificación.',
                gradient: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
                iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500',
                iconColor: 'text-white',
              },
            ].map(b => (
              <div 
                key={b.title} 
                className={`relative group bg-gradient-to-br ${b.gradient} rounded-xl p-6 border border-gray-100 dark:border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
              >
                <div className={`h-12 w-12 rounded-lg ${b.iconBg} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <b.icon className={`h-6 w-6 ${b.iconColor}`} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-foreground text-base mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ¿TIENES UNA CANCHA? ───────────────────────────────────── */}
      <section className="py-14 bg-gray-50 dark:bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto rounded-md overflow-hidden bg-white dark:bg-card border border-gray-100 dark:border-border shadow-sm flex flex-col md:flex-row">
            {/* Texto */}
            <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-foreground mb-3">
                ¿Tienes una cancha?
              </h2>
              <p className="text-gray-500 dark:text-muted-foreground mb-5">
                Únete a nuestra plataforma y aumenta tus reservas.
              </p>
              <ul className="space-y-2 mb-7">
                {[
                  'Publica tu cancha gratis',
                  'Gestiona tus horarios',
                  'Aumenta tus reservas y ganancias',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-foreground">
                    <CheckCircle className="h-4 w-4 text-[#16a34a] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/admin-cancha/login">
                <button className="inline-flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold px-6 py-3 rounded-md transition-colors text-sm w-fit">
                  Publicar mi cancha
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>

            {/* Imagen + mockup */}
            <div className="relative flex-1 min-h-[280px] md:min-h-0 overflow-hidden">
              <Image
                src="/images/cancha-login.png"
                alt="Panel de administración"
                fill
                className="object-cover object-center"
              />
              {/* Overlay con mockup de stats */}
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute bottom-4 right-4 bg-white dark:bg-card rounded-md shadow-xl p-4 w-44">
                <p className="text-xs text-gray-500 dark:text-muted-foreground font-medium mb-2">Mis reservas</p>
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-foreground">Hoy 18:00 - 20:00</span>
                    <div className="h-4 w-4 rounded-full bg-[#16a34a] flex items-center justify-center">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-foreground">Mañana 10:00 - 12:00</span>
                    <div className="h-4 w-4 rounded-full bg-[#16a34a] flex items-center justify-center">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-border pt-2">
                  <p className="text-[10px] text-gray-400">Ganancias</p>
                  <p className="text-base font-bold text-gray-900 dark:text-foreground">S/ 1,250</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────── */}
      <section className="py-14 bg-gray-900 dark:bg-gray-950 relative overflow-hidden">
        <div className="absolute right-8 bottom-0 opacity-20 pointer-events-none select-none">
          <span className="text-[160px]">⚽</span>
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">¿Listo para jugar?</h2>
            <p className="text-gray-400 mb-7">Encuentra tu cancha ideal y reserva ahora.</p>
            <Link href="/canchas">
              <button className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm">
                Buscar canchas ahora
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-border bg-white dark:bg-card py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center gap-5">
            <Image
              src="/images/logo.png"
              alt="CanchaGo"
              width={200}
              height={50}
              className="h-12 w-auto object-contain"
            />
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-muted-foreground">
              <Link href="/canchas" className="hover:text-gray-900 dark:hover:text-foreground transition-colors">Canchas</Link>
              <Link href="/mis-reservas" className="hover:text-gray-900 dark:hover:text-foreground transition-colors">Mis Reservas</Link>
              <Link href="/login" className="hover:text-gray-900 dark:hover:text-foreground transition-colors">Iniciar Sesión</Link>
              <Link href="/registro" className="hover:text-gray-900 dark:hover:text-foreground transition-colors">Registrarse</Link>
            </div>
            <p className="text-xs text-gray-400 dark:text-muted-foreground">&copy; 2026 CanchaGo. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
