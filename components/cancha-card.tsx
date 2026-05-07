'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Star, Heart, Navigation, CalendarDays, AlertTriangle, Timer } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageSlider } from '@/components/image-slider';
import { Cancha, TimeSlot, sportLabels } from '@/lib/types';
import { formatearDistancia } from '@/lib/geolocation-utils';
import { getLocalDateString } from '@/lib/date-utils';
import { apiToggleFavorito, apiGetFavoritos, getToken } from '@/lib/api';

interface CanchaCardProps {
  cancha: Cancha;
  distancia?: number;
  selectedDate?: string;
  availableHours?: string[];
  preselectedHour?: string;
}

function getAvailableSlots(
  cancha: Cancha,
  selectedDate: string,
  availableHours?: string[],
): TimeSlot[] {
  const daySlots = cancha.schedule?.[selectedDate] ?? [];
  const now = new Date();
  const isToday = selectedDate === getLocalDateString();

  return daySlots.filter(slot => {
    if (slot.status !== 'disponible' || !slot.available) return false;

    // Excluir slots pasados si es hoy
    if (isToday) {
      const [h, m] = slot.time.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotMinutes <= nowMinutes) return false;
    }

    // Filtrar por horas seleccionadas en filtros
    if (availableHours && availableHours.length > 0) {
      if (!availableHours.includes(slot.time)) return false;
    }

    return true;
  });
}

function getNextAvailability(
  cancha: Cancha,
  fromDate: string,
): { date: string; time: string } | null {
  const today = getLocalDateString();
  const now = new Date();
  const sortedDates = Object.keys(cancha.schedule ?? {}).sort();

  for (const dateStr of sortedDates) {
    // Solo días posteriores a la fecha seleccionada
    if (dateStr <= fromDate) continue;

    const slots = cancha.schedule[dateStr] ?? [];
    const isToday = dateStr === today;

    for (const slot of slots) {
      if (slot.status !== 'disponible' || !slot.available) continue;
      if (isToday) {
        const [h, m] = slot.time.split(':').map(Number);
        if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) continue;
      }
      return { date: dateStr, time: slot.time };
    }
  }
  return null;
}

function formatNextDate(dateStr: string, fromDate: string): string {
  const today = getLocalDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  if (dateStr === tomorrowStr) return 'Mañana';
  if (dateStr === today) return 'Hoy';

  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' });
}

function getUrgencyBadge(
  cancha: Cancha,
  date: string,
  availableSlots: TimeSlot[],
): { text: string; className: string; dotColor?: string } | null {
  const today = getLocalDateString();
  const isToday = date === today;
  const count = availableSlots.length;

  if (isToday) {
    if (count === 0) {
      // Sin slots hoy — buscar mañana
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getLocalDateString(tomorrow);
      const tomorrowSlots = cancha.schedule?.[tomorrowStr] ?? [];
      const hasTomorrow = tomorrowSlots.some(s => s.status === 'disponible' && s.available);
      if (hasTomorrow) {
        return { text: 'Disponible mañana', className: 'bg-white/95 text-blue-600', dotColor: 'bg-blue-600' };
      }
      return null;
    }

    if (count <= 2) {
      return { text: '¡Últimos horarios!', className: 'bg-white/95 text-red-600', dotColor: 'bg-red-600' };
    }
    if (count <= 4) {
      return { text: 'Pocos horarios hoy', className: 'bg-white/95 text-orange-600', dotColor: 'bg-orange-600' };
    }

    // Slot en la próxima hora
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const hasNearSlot = availableSlots.some(slot => {
      const [h, m] = slot.time.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      return slotMinutes - nowMinutes <= 60 && slotMinutes > nowMinutes;
    });
    if (hasNearSlot) {
      return { text: 'Disponible ahora', className: 'bg-white/95 text-green-600', dotColor: 'bg-green-600' };
    }

    // Muchos slots disponibles hoy
    return { text: 'Disponible hoy', className: 'bg-white/95 text-green-600', dotColor: 'bg-green-600' };
  }

  // Para fechas futuras, mostrar badge según cantidad de slots
  if (count === 0) {
    return null;
  }
  
  if (count <= 2) {
    return { text: '¡Últimos horarios!', className: 'bg-white/95 text-red-600', dotColor: 'bg-red-600' };
  }
  
  if (count <= 4) {
    return { text: 'Pocos horarios', className: 'bg-white/95 text-orange-600', dotColor: 'bg-orange-600' };
  }

  // Muchos slots disponibles
  return { text: 'Disponible', className: 'bg-white/95 text-green-600', dotColor: 'bg-green-600' };
}

export function CanchaCard({ cancha, distancia, selectedDate, availableHours, preselectedHour }: CanchaCardProps) {
  const router = useRouter();
  const date = selectedDate ?? getLocalDateString();
  const today = getLocalDateString();
  const isToday = date === today;
  
  // Hook para detectar el ancho de la pantalla - inicializar con el valor correcto
  const [slotsToShow, setSlotsToShow] = useState(() => {
    // En el servidor o primera carga, usar 4 como default (desktop)
    if (typeof window === 'undefined') return 4;
    return window.innerWidth >= 375 ? 4 : 3;
  });
  
  useEffect(() => {
    const updateSlotsToShow = () => {
      const width = window.innerWidth;
      // 3 slots para pantallas < 375px, 4 slots para >= 375px
      setSlotsToShow(width >= 375 ? 4 : 3);
    };
    
    updateSlotsToShow();
    window.addEventListener('resize', updateSlotsToShow);
    return () => window.removeEventListener('resize', updateSlotsToShow);
  }, []);
  
  // Obtener slots del día seleccionado (SIN filtrar por hora para contar todos los del día)
  let availableSlotsForDay = getAvailableSlots(cancha, date);
  let displayDate = date;
  let showingTomorrow = false;
  
  // Si es hoy y no hay slots, intentar mostrar los de mañana
  if (isToday && availableSlotsForDay.length === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);
    const tomorrowSlots = getAvailableSlots(cancha, tomorrowStr);
    
    if (tomorrowSlots.length > 0) {
      availableSlotsForDay = tomorrowSlots;
      displayDate = tomorrowStr;
      showingTomorrow = true;
    }
  }
  
  // Si hay un horario pre-seleccionado, filtrar para mostrar solo desde ese horario en adelante
  let slotsToDisplay = availableSlotsForDay;
  if (preselectedHour) {
    const preselectedIndex = availableSlotsForDay.findIndex(slot => slot.time === preselectedHour);
    if (preselectedIndex !== -1) {
      // Mostrar solo desde el horario pre-seleccionado en adelante
      slotsToDisplay = availableSlotsForDay.slice(preselectedIndex);
    }
  }
  
  // Calcular slots visibles (primeros N slots de los que vamos a mostrar)
  const visibleSlots = slotsToDisplay.slice(0, slotsToShow);
  
  // Contar horarios extras (los que quedan después de los visibles)
  const extraCount = Math.max(0, slotsToDisplay.length - visibleSlots.length);
  
  const nextAvailability = visibleSlots.length === 0 ? getNextAvailability(cancha, date) : null;
  
  // Calcular el badge de urgencia
  let urgencyBadge = null;
  if (showingTomorrow && availableSlotsForDay.length > 0) {
    // Si estamos mostrando horarios de mañana, mostrar badge "Disponible mañana"
    urgencyBadge = { text: 'Disponible mañana', className: 'bg-white/95 text-blue-600', dotColor: 'bg-blue-600' };
  } else {
    // Usar slotsToDisplay para calcular el badge (considera el filtro de hora pre-seleccionada)
    urgencyBadge = getUrgencyBadge(cancha, displayDate, slotsToDisplay);
  }

  // Generar texto dinámico para los horarios según la fecha
  const getHorariosText = () => {
    const today = getLocalDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    if (showingTomorrow) {
      return (
        <>
          Próximos horarios <span className="text-green-600">mañana</span>
        </>
      );
    } else if (displayDate === today) {
      return 'Próximos horarios hoy';
    } else if (displayDate === tomorrowStr) {
      return (
        <>
          Próximos horarios <span className="text-green-600">mañana</span>
        </>
      );
    } else {
      // Para cualquier otra fecha, mostrar la fecha formateada
      const targetDate = new Date(displayDate + 'T00:00:00');
      const formattedDate = targetDate.toLocaleDateString('es-PE', { 
        day: 'numeric', 
        month: 'short' 
      });
      return (
        <>
          Horarios para el <span className="text-green-600">{formattedDate}</span>
        </>
      );
    }
  };

  // Inicializar selectedSlot con preselectedHour si está disponible
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(() => {
    if (preselectedHour) {
      const preselected = availableSlotsForDay.find(slot => slot.time === preselectedHour);
      if (preselected) return preselected;
    }
    return visibleSlots[0] ?? null;
  });
  const [reservando, setReservando] = useState(false);
  const [ocupadoModal, setOcupadoModal] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);

  // Cargar estado de favorito al montar
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiGetFavoritos().then((ids: string[]) => {
      if (Array.isArray(ids)) setIsFav(ids.includes(cancha.id));
    }).catch(() => {});
  }, [cancha.id]);

  const handleToggleFav = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const token = getToken();
    if (!token) {
      router.push(`/login?redirect=/canchas`);
      return;
    }

    if (togglingFav) return;
    setTogglingFav(true);
    const prev = isFav;
    setIsFav(!prev); // optimistic

    try {
      await apiToggleFavorito(cancha.id);
    } catch {
      setIsFav(prev); // revertir si falla
    } finally {
      setTogglingFav(false);
    }
  };

  const startCountdown = (seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSlotClick = (e: React.MouseEvent, slot: TimeSlot) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSlot(prev => (prev?.id === slot.id ? null : slot));
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/cancha/${cancha.id}`);
  };

  const handleReservar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedSlot) {
      router.push(`/cancha/${cancha.id}`);
      return;
    }

    setReservando(true);

    let disponible = true;
    try {
      const res = await fetch(
        `/api/bloqueos/check?canchaId=${cancha.id}&fecha=${displayDate}&hora=${encodeURIComponent(selectedSlot.time)}`
      );
      const data = await res.json();
      disponible = data?.disponible === true;
    } catch {
      setReservando(false);
      router.push(`/cancha/${cancha.id}`);
      return;
    }

    // NO resetear reservando aquí - mantener el botón en loading hasta la redirección

    if (!disponible) {
      setReservando(false); // Solo resetear si el horario está ocupado
      setSelectedSlot(null);
      setOcupadoModal(true);
      startCountdown(5 * 60);
      return;
    }

    // Mantener el loading activo hasta que la redirección ocurra
    router.push(
      `/pago?canchaId=${cancha.id}&fecha=${displayDate}&hora=${selectedSlot.time}&precio=${selectedSlot.price}&from=card`
    );
  };

  const buttonLabel = reservando
    ? 'Verificando...'
    : selectedSlot
    ? 'Reservar'
    : 'Ver horarios';

  return (
    <>
      {/* Modal: horario ocupado */}
      <Dialog open={ocupadoModal} onOpenChange={open => {
        setOcupadoModal(open);
        if (!open && countdownRef.current) clearInterval(countdownRef.current);
      }}>
        <DialogContent className="max-w-sm text-center z-200">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Horario en proceso de reserva</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Otro usuario está completando el pago de este horario ahora mismo.
              </p>
            </div>

            {countdown > 0 ? (
              <div className="w-full rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Se liberará en máximo</p>
                <div className="flex items-center justify-center gap-2 text-yellow-600">
                  <Timer className="h-5 w-5" />
                  <span className="text-2xl font-bold tabular-nums">
                    {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Si el pago no se completa, el horario quedará disponible nuevamente.
                </p>
              </div>
            ) : (
              <div className="w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-sm font-medium text-primary">¡El tiempo venció! Intenta reservar de nuevo.</p>
              </div>
            )}

            <div className="flex w-full flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  setOcupadoModal(false);
                  if (countdownRef.current) clearInterval(countdownRef.current);
                }}
              >
                Elegir otro horario
              </Button>
              {countdown > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setOcupadoModal(false);
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    router.push(`/cancha/${cancha.id}`);
                  }}
                >
                  Actualizar horarios
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="group overflow-hidden border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      {/* Imagen */}
      <div className="relative">
        <Link href={`/cancha/${cancha.id}`}>
          <ImageSlider images={cancha.images} alt={cancha.name} aspectRatio="wide" />
        </Link>

        {/* Badge de urgencia — esquina superior izquierda */}
        {urgencyBadge && (
          <div className={`absolute top-3 left-3 z-10 h-7 flex items-center gap-1.5 rounded-md px-3 text-xs font-semibold backdrop-blur-sm ${urgencyBadge.className}`}>
            {urgencyBadge.dotColor && (
              <span className={`h-1.5 w-1.5 rounded-full ${urgencyBadge.dotColor}`} />
            )}
            {urgencyBadge.text}
          </div>
        )}

        {/* Corazón favorito — esquina superior derecha */}
        <button
          onClick={handleToggleFav}
          disabled={togglingFav}
          className={`absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
            isFav ? 'bg-destructive/20 hover:bg-destructive/30' : 'bg-black/30 hover:bg-black/50'
          }`}
          aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Heart className={`h-4 w-4 transition-all duration-300 ${
            isFav
              ? 'fill-destructive text-destructive scale-110'
              : 'text-white scale-100'
          }`} />
          {togglingFav && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full backdrop-blur-sm">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </span>
          )}
        </button>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Dos columnas: info | precio */}
        <div className="flex gap-3 mb-3">
          {/* Columna izquierda: nombre, rating, dirección, badge */}
          <div className="flex-1 min-w-0">
            <Link href={`/cancha/${cancha.id}`}>
              <h3 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors mb-1">
                {cancha.name}
              </h3>
            </Link>

            {/* Rating + distancia */}
            <div className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
              {cancha.rating > 0 && (
                <>
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                  <span className="font-medium text-foreground">{cancha.rating}</span>
                  {cancha.reviewCount > 0 && <span>({cancha.reviewCount})</span>}
                </>
              )}
              {distancia !== undefined && (
                <>
                  {cancha.rating > 0 && <span>•</span>}
                  <Badge variant="outline" className="gap-1 bg-primary/5 border-primary/20 text-primary px-1.5 py-0">
                    <Navigation className="h-3 w-3 fill-primary" />
                    {formatearDistancia(distancia)}
                  </Badge>
                </>
              )}
            </div>

            {/* Dirección */}
            <div className="mb-2 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs line-clamp-1">{cancha.address}</span>
            </div>

            {/* Badge tipo */}
            <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {sportLabels[cancha.type]}
            </span>
          </div>

          {/* Columna derecha: precio centrado verticalmente */}
          <div className="shrink-0 flex flex-col items-center justify-center text-center min-w-[64px]">
            <span className="text-xl font-bold text-foreground leading-none">S/ {cancha.pricePerHour}</span>
            <span className="text-xs text-muted-foreground mt-0.5">por hora</span>
          </div>
        </div>

        {/* Horarios disponibles */}
        <div className="mb-3 w-full">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {getHorariosText()}
            </p>
            <Link
              href={`/cancha/${cancha.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
            >
              Ver todos →
            </Link>
          </div>

          {visibleSlots.length > 0 ? (
            <div className="flex items-center gap-1.5 w-full">
              {visibleSlots.map(slot => (
                <button
                  key={slot.id}
                  onClick={(e) => handleSlotClick(e, slot)}
                  aria-pressed={selectedSlot?.id === slot.id}
                  aria-label={`Seleccionar horario ${slot.time}`}
                  className={`flex-1 min-w-0 rounded-lg border px-2 py-2 text-sm font-medium transition-all text-center ${
                    selectedSlot?.id === slot.id
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
              {extraCount > 0 && (
                <button
                  onClick={handleMoreClick}
                  className="flex-shrink-0 w-12 rounded-lg border border-border bg-background px-2 py-2 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
                  aria-label={`Ver ${extraCount} horarios más`}
                >
                  +{extraCount}
                </button>
              )}
            </div>
          ) : (
            nextAvailability ? (
              <div className="flex w-full items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>
                  Próxima disponibilidad:{' '}
                  <span className="font-medium text-foreground">
                    {formatNextDate(nextAvailability.date, date)} {nextAvailability.time}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex w-full items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>Sin disponibilidad próxima</span>
              </div>
            )
          )}
        </div>

        {/* Extras */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          {/* Balón */}
          {cancha.balonDisponible ? (
            <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border ${
              cancha.balonPrecio != null
                ? 'bg-primary/5 border-primary/20 text-primary'
                : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
            }`}>
              ⚽ Balón{cancha.balonPrecio != null ? ` · S/ ${cancha.balonPrecio}` : ' · Gratis'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border border-border bg-muted/40 text-muted-foreground line-through opacity-60">
              ⚽ Sin balón
            </span>
          )}

          {/* Chalecos */}
          {cancha.chalecoDisponible ? (
            <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border ${
              cancha.chalecosPrecio != null
                ? 'bg-primary/5 border-primary/20 text-primary'
                : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
            }`}>
              🎽 Chalecos{cancha.chalecosPrecio != null ? ` · S/ ${cancha.chalecosPrecio}` : ' · Gratis'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border border-border bg-muted/40 text-muted-foreground line-through opacity-60">
              🎽 Sin chalecos
            </span>
          )}
        </div>

        {/* Botón Reservar */}
        <button
          onClick={handleReservar}
          disabled={reservando}
          className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {buttonLabel}
        </button>
      </div>
    </Card>
    </>
  );
}
