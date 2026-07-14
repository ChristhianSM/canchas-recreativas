'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Star, Heart, Navigation, CalendarDays, AlertTriangle, Timer, Zap } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageSlider } from '@/components/image-slider';
import { Cancha, TimeSlot, sportLabels } from '@/lib/types';
import { formatearDistancia } from '@/lib/geolocation-utils';
import { getLocalDateString } from '@/lib/date-utils';
import { apiToggleFavorito, apiGetFavoritos, getToken } from '@/lib/api';

interface CanchaCardHorizontalProps {
  cancha: Cancha;
  distancia?: number;
  selectedDate?: string;
  preselectedHour?: string;
  isHighlighted?: boolean;
  onHover?: (id: string | null) => void;
  compact?: boolean;
  isFav?: boolean;
  onToggleFav?: (id: string) => void;
  onCanchaOcupada?: (id: string) => void;
}

function getAvailableSlots(cancha: Cancha, selectedDate: string): TimeSlot[] {
  const daySlots = cancha.schedule?.[selectedDate] ?? [];
  const now = new Date();
  const isToday = selectedDate === getLocalDateString();
  return daySlots.filter(slot => {
    if (slot.status !== 'disponible' || !slot.available) return false;
    if (isToday) {
      const [h, m] = slot.time.split(':').map(Number);
      if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) return false;
    }
    return true;
  });
}

export function CanchaCardHorizontal({
  cancha, distancia, selectedDate, preselectedHour, isHighlighted, onHover, compact = false, isFav: isFavProp, onToggleFav, onCanchaOcupada,
}: CanchaCardHorizontalProps) {
  const router = useRouter();
  const date = selectedDate ?? getLocalDateString();

  let availableSlots = getAvailableSlots(cancha, date);
  let displayDate = date;

  // Si hoy no hay slots, mostrar mañana
  if (date === getLocalDateString() && availableSlots.length === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);
    const tomorrowSlots = getAvailableSlots(cancha, tomorrowStr);
    if (tomorrowSlots.length > 0) {
      availableSlots = tomorrowSlots;
      displayDate = tomorrowStr;
    }
  }

  // Si hay hora preseleccionada, filtrar desde ahí
  let slotsToDisplay = availableSlots;
  if (preselectedHour) {
    const idx = availableSlots.findIndex(s => s.time === preselectedHour);
    if (idx !== -1) slotsToDisplay = availableSlots.slice(idx);
  }

  const visibleSlots = slotsToDisplay.slice(0, 5);

  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>(() => {
    if (preselectedHour) {
      const pre = availableSlots.find(s => s.time === preselectedHour);
      if (pre) return [pre];
    }
    return visibleSlots[0] ? [visibleSlots[0]] : [];
  });
  const [reservando, setReservando] = useState(false);
  const [ocupadoModal, setOcupadoModal] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isFav, setIsFav] = useState<boolean>(isFavProp ?? false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [localOcupados, setLocalOcupados] = useState<Set<string>>(new Set());
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  // A 1280-1339px (xl sin 2xl) hay menos espacio: mostrar 4 slots
  const maxVisibleSlots = windowWidth >= 1280 && windowWidth < 1340 ? 4 : 5;

  // Slots filtrados excluyendo los bloqueados localmente tras un 409
  const slotsToDisplayFiltered = slotsToDisplay.filter(s => !localOcupados.has(s.id));
  const visibleSlotsFiltered = slotsToDisplayFiltered.slice(0, maxVisibleSlots);
  const extraCountFiltered = Math.max(0, slotsToDisplayFiltered.length - visibleSlotsFiltered.length);

  useEffect(() => {
    if (isFavProp !== undefined) setIsFav(isFavProp);
  }, [isFavProp]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Solo cargar desde API si no se pasó prop (uso standalone)
  useEffect(() => {
    if (isFavProp !== undefined) return;
    const token = getToken();
    if (!token) return;
    apiGetFavoritos().then((ids: string[]) => {
      if (Array.isArray(ids)) setIsFav(ids.includes(cancha.id));
    }).catch(() => {});
  }, [cancha.id, isFavProp]);

  const handleToggleFav = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const token = getToken();
    if (!token) { router.push('/login?redirect=/canchas'); return; }
    if (togglingFav) return;
    setTogglingFav(true);
    const prev = isFav;
    setIsFav(!prev);
    try {
      await apiToggleFavorito(cancha.id);
      onToggleFav?.(cancha.id);
    }
    catch { setIsFav(prev); }
    finally { setTogglingFav(false); }
  };

  const startCountdown = (seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); countdownRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSlotClick = (slot: TimeSlot, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();

    // Descartar slots obsoletos o bloqueados localmente
    const validSelected = selectedSlots.filter(s => slotsToDisplayFiltered.some(sl => sl.id === s.id));

    const isSelected = validSelected.some(s => s.id === slot.id);

    if (isSelected) {
      const first = validSelected[0];
      const last  = validSelected[validSelected.length - 1];
      if (slot.id === last.id)  { setSelectedSlots(validSelected.slice(0, -1)); return; }
      if (slot.id === first.id) { setSelectedSlots(validSelected.slice(1));     return; }
      setSelectedSlots([slot]);
      return;
    }

    if (validSelected.length === 0) { setSelectedSlots([slot]); return; }

    const idx    = slotsToDisplayFiltered.findIndex(s => s.id === slot.id);
    const indices = validSelected.map(s => slotsToDisplayFiltered.findIndex(sl => sl.id === s.id));
    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);

    if (idx === maxIdx + 1)      setSelectedSlots([...validSelected, slot]);
    else if (idx === minIdx - 1) setSelectedSlots([slot, ...validSelected]);
    else                         setSelectedSlots([slot]);
  };

  const tieneSecciones = (cancha.totalSecciones ?? 0) > 0;
  // Precio del próximo horario visible (ya considera la sección más barata disponible)
  const precioMostrado = visibleSlotsFiltered[0]?.price ?? cancha.pricePerHour;

  const handleReservar = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();

    // Usar solo slots que existan en slotsToDisplayFiltered actual (descartar obsoletos y bloqueados)
    const validSlots = selectedSlots.filter(s => slotsToDisplayFiltered.some(sl => sl.id === s.id));
    if (validSlots.length === 0) { router.push(`/cancha/${cancha.id}`); return; }

    // Si la cancha tiene secciones, el usuario debe elegir sección en el detalle
    if (tieneSecciones) {
      router.push(`/cancha/${cancha.id}?fecha=${displayDate}&hora=${validSlots[0].time}`);
      return;
    }

    setReservando(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('cp_token') : null;
    let bloqueoRes: Response;
    try {
      bloqueoRes = await fetch('/api/bloqueos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          canchaId: cancha.id,
          fecha:    displayDate,
          hora:     validSlots[0].time,
          horas:    validSlots.length,
        }),
      });
    } catch {
      setReservando(false);
      router.push(`/cancha/${cancha.id}`);
      return;
    }

    if (!bloqueoRes.ok) {
      const horaInicio = parseInt(validSlots[0].time.split(':')[0]);
      const nuevosOcupados = new Set(
        Array.from({ length: validSlots.length }, (_, i) =>
          `${displayDate}-${String((horaInicio + i) % 24).padStart(2, '0')}:00`
        )
      );
      setLocalOcupados(prev => new Set([...prev, ...nuevosOcupados]));
      setReservando(false);
      setSelectedSlots([]);
      setOcupadoModal(true);
      startCountdown(5 * 60);
      return;
    }

    const bloqueoKey = `cp_bloqueo_inicio_${cancha.id}_${displayDate}_${validSlots[0].time.replace(':', '-')}`;
    localStorage.setItem(bloqueoKey, String(Date.now()));

    router.push(`/pago?canchaId=${cancha.id}&fecha=${displayDate}&hora=${validSlots[0].time}&horas=${validSlots.length}&precio=${validSlots[0].price}&from=card`);
  };

  // Badge de disponibilidad
  const now = new Date();
  const isToday = displayDate === getLocalDateString();
  const isTomorrow = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return displayDate === getLocalDateString(tomorrow);
  })();
  let badge: { text: string; dot: string; textColor: string } | null = null;
  if (visibleSlots.length > 0) {
    if (isToday) {
      const hasNear = visibleSlots.some(s => {
        const [h, m] = s.time.split(':').map(Number);
        const diff = (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
        return diff > 0 && diff <= 60;
      });
      if (hasNear) badge = { text: 'Disponible ahora', dot: 'bg-green-500', textColor: 'text-green-700' };
      else if (visibleSlots.length <= 2) badge = { text: '¡Últimos horarios!', dot: 'bg-red-500', textColor: 'text-red-700' };
      else badge = { text: 'Disponible hoy', dot: 'bg-green-500', textColor: 'text-green-700' };
    } else if (isTomorrow) {
      badge = { text: 'Disponible mañana', dot: 'bg-blue-500', textColor: 'text-blue-600' };
    } else {
      badge = { text: 'Disponible', dot: 'bg-green-500', textColor: 'text-green-700' };
    }
  }

  return (
    <>
      <Dialog open={ocupadoModal} onOpenChange={open => { setOcupadoModal(open); if (!open) { if (countdownRef.current) clearInterval(countdownRef.current); if (preselectedHour) onCanchaOcupada?.(cancha.id); } }}>
        <DialogContent className="max-w-sm text-center z-[200]">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Horario en proceso de reserva</h2>
              <p className="mt-1 text-sm text-muted-foreground">Otro usuario está completando el pago ahora mismo.</p>
            </div>
            {countdown > 0 && (
              <div className="w-full rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Se liberará en máximo</p>
                <div className="flex items-center justify-center gap-2 text-yellow-600">
                  <Timer className="h-5 w-5" />
                  <span className="text-2xl font-bold tabular-nums">
                    {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}
            <Button className="w-full" onClick={() => { setOcupadoModal(false); if (countdownRef.current) clearInterval(countdownRef.current); }}>
              Elegir otro horario
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card horizontal — altura fija para controlar imagen */}
      <div
        onMouseEnter={() => onHover?.(cancha.id)}
        onMouseLeave={() => onHover?.(null)}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a')) return;
          router.push(`/cancha/${cancha.id}`);
        }}
        className={`group flex rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-md h-[210px] md:h-[270px] cursor-pointer ${
          isHighlighted ? 'border-primary shadow-md ring-1 ring-primary/30' : 'border-border hover:border-border/60'
        }`}
      >
        {/* Imagen izquierda — ancho según modo */}
        <div className={`relative shrink-0 h-full ${compact ? 'w-35' : 'w-35 md:w-50'}`}>
          <Link href={`/cancha/${cancha.id}`} className="block h-full">
            <ImageSlider images={cancha.images} alt={cancha.name} aspectRatio="fill" className="h-full" />
          </Link>

          {/* Badge disponibilidad */}
          {badge && (
            <div className={`absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold ${badge.textColor}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
              {badge.text}
            </div>
          )}
        </div>

        {/* Contenido mobile */}
        <div className="flex md:hidden flex-1 flex-col p-3 min-w-0">
          {/* Fila superior: nombre + precio + corazón */}
          <div className="flex justify-between items-center gap-2 mb-2">
            <Link href={`/cancha/${cancha.id}`} className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                {cancha.name}
              </h3>
            </Link>
            {/* Corazón favorito — mismo nivel que el título */}
            <button
              onClick={handleToggleFav}
              disabled={togglingFav}
              className={`relative shrink-0 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
                isFav ? 'bg-destructive/20 hover:bg-destructive/30' : 'bg-muted hover:bg-muted/80'
              }`}
              aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart className={`h-5 w-5 transition-all duration-300 ${
                isFav
                  ? 'fill-destructive text-destructive scale-110'
                  : 'text-muted-foreground scale-100'
              }`} />
              {togglingFav && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-sm">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </span>
              )}
            </button>
          </div>

          {/* Fila 2: info izquierda + precio derecha */}
          <Link href={`/cancha/${cancha.id}`}>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                {cancha.rating > 0 ? (
                  <>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                    <span className="font-medium text-foreground">{cancha.rating}</span>
                    {cancha.reviewCount > 0 && <span className="text-muted-foreground">({cancha.reviewCount})</span>}
                  </>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">Sin reseñas aún</span>
                )}
                {distancia !== undefined && (
                  <>
                    <span className="text-border">•</span>
                    <Navigation className="h-3 w-3 fill-[#16a34a] text-[#16a34a] shrink-0" />
                    <span className="text-[11px] text-[#16a34a] font-medium">{formatearDistancia(distancia)}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[11px] line-clamp-1">{cancha.address}</span>
              </div>
              <div className="pt-0.5">
                <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {sportLabels[cancha.type]}
                </span>
              </div>
              {(cancha.balonDisponible || cancha.chalecoDisponible) && (
                <div className="flex items-center gap-1 flex-wrap mt-2">
                  {cancha.balonDisponible && (
                    <span className="inline-flex items-center rounded-md bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 text-[11px] font-medium text-green-600">
                      ⚽{cancha.balonPrecio != null ? ` S/${cancha.balonPrecio}` : ' gratis'}
                    </span>
                  )}
                  {cancha.chalecoDisponible && (
                    <span className="inline-flex items-center rounded-md bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 text-[11px] font-medium text-green-600">
                      🎽{cancha.chalecosPrecio != null ? ` S/${cancha.chalecosPrecio}` : ' gratis'}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xl font-bold text-foreground leading-none">S/ {precioMostrado}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">por hora</p>
              {tieneSecciones && (
                <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {cancha.totalSecciones} secc.
                </span>
              )}
            </div>
          </div>
          </Link>

          {/* Horarios + botón */}
          <div className="mt-auto">
            {tieneSecciones ? (
              <button
                onClick={handleReservar}
                className="w-full rounded-lg bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] text-white px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                Elegir sección →
              </button>
            ) : visibleSlotsFiltered.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground shrink-0">Horarios:</span>
                {visibleSlotsFiltered.map(slot => {
                  const isSelected = selectedSlots.some(s => s.id === slot.id);
                  return (
                    <button
                      key={slot.id}
                      onClick={(e) => handleSlotClick(slot, e)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-all ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border text-foreground hover:border-primary/50 hover:text-primary'
                      }`}
                    >
                      {slot.time}
                    </button>
                  );
                })}
                {extraCountFiltered > 0 && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/cancha/${cancha.id}`); }}
                    className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-muted-foreground/50 transition-all"
                  >
                    +{extraCountFiltered}
                  </button>
                )}
                <button
                  onClick={handleReservar}
                  disabled={reservando}
                  className="ml-auto shrink-0 rounded-lg bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] disabled:opacity-60 text-white px-4 py-2 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  {reservando && (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0" />
                  )}
                  {reservando ? 'Reservando...' : selectedSlots.length > 1 ? `Reservar ${selectedSlots.length}h` : selectedSlots.length === 1 ? 'Reservar' : 'Ver horarios'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                <span>Sin disponibilidad próxima</span>
                <Link href={`/cancha/${cancha.id}`} className="ml-auto text-[#16a34a] font-medium hover:underline">
                  Ver →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Contenido desktop (md+) */}
        <div className="hidden md:flex flex-1 flex-col justify-between p-4 min-w-0">

          {/* Bloque superior: info + horarios */}
          <div>

          {/* Fila 1: Rating izquierda | Deporte + Corazón derecha */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {cancha.rating > 0 ? (
                <>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-bold text-foreground">{cancha.rating}</span>
                  {cancha.reviewCount > 0 && (
                    <span className="text-xs text-muted-foreground">({cancha.reviewCount})</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground italic">Sin reseñas</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {sportLabels[cancha.type]}{cancha.maxJugadores ? ` ${cancha.maxJugadores}` : ''}
              </span>
              <button
                onClick={handleToggleFav}
                disabled={togglingFav}
                className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-border transition-all duration-300 ${
                  isFav ? 'bg-destructive/10 border-destructive/30' : 'bg-background hover:bg-muted'
                }`}
                aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                <Heart className={`h-4 w-4 transition-all duration-300 ${
                  isFav ? 'fill-destructive text-destructive scale-110' : 'text-muted-foreground scale-100'
                }`} />
                {togglingFav && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Nombre */}
          <Link href={`/cancha/${cancha.id}`}>
            <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-1 hover:text-primary transition-colors mt-1">
              {cancha.name}
            </h3>
          </Link>

          {/* Dirección + distancia */}
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground line-clamp-1">{cancha.address}</span>
            {distancia !== undefined && (
              <>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <Navigation className="h-3 w-3 text-primary" />
                <span className="text-xs text-primary font-semibold">{formatearDistancia(distancia)}</span>
              </>
            )}
          </div>

          {/* Amenidades */}
          {cancha.amenities?.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {cancha.amenities.slice(0, 3).map((amenidad) => (
                <span key={amenidad} className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {amenidad}
                </span>
              ))}
            </div>
          )}

          {/* Horarios */}
          <div className="mt-3">
            {tieneSecciones ? (
              <div className="flex w-full items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
                <span className="text-primary text-sm">⊞</span>
                <span>Entra para elegir sección y horario disponible</span>
              </div>
            ) : visibleSlotsFiltered.length > 0 ? (
              <>
                <p className="text-xs font-medium text-foreground mb-1.5">
                  {displayDate === getLocalDateString()
                    ? 'Horarios libres hoy'
                    : isTomorrow
                      ? 'Horarios libres mañana'
                      : `Horarios libres el ${new Date(displayDate + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}`}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {visibleSlotsFiltered.map((slot) => {
                    const isSelected = selectedSlots.some((s) => s.id === slot.id);
                    return (
                      <button
                        key={slot.id}
                        onClick={(e) => handleSlotClick(slot, e)}
                        className={`rounded-lg border px-3 py-1 text-sm font-semibold transition-all ${
                          isSelected
                            ? 'bg-foreground border-foreground text-background'
                            : 'border-border text-foreground hover:border-primary hover:text-primary'
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                  {extraCountFiltered > 0 && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/cancha/${cancha.id}`); }}
                      className="rounded-lg border border-border px-3 py-1 text-sm font-medium text-muted-foreground hover:border-muted-foreground/60 transition-all"
                    >
                      +{extraCountFiltered}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Sin disponibilidad próxima</span>
              </div>
            )}
          </div>

          </div>{/* fin bloque superior */}

          {/* Precio + botón Reservar */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground leading-none">S/ {precioMostrado}</span>
                <span className="text-xs text-muted-foreground">/hora</span>
              </div>
              {tieneSecciones && (
                <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary self-start">
                  {cancha.totalSecciones} secciones
                </span>
              )}
            </div>
            <button
              onClick={handleReservar}
              disabled={reservando}
              className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {reservando ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {reservando
                ? 'Reservando...'
                : tieneSecciones
                  ? 'Elegir sección →'
                  : selectedSlots.length > 1
                    ? `Reservar ${selectedSlots.length}h`
                    : 'Reservar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
