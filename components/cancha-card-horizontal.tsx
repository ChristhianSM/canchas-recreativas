'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Star, Heart, Navigation, CalendarDays, AlertTriangle, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

  // Slots filtrados excluyendo los bloqueados localmente tras un 409
  const slotsToDisplayFiltered = slotsToDisplay.filter(s => !localOcupados.has(s.id));
  const visibleSlotsFiltered = slotsToDisplayFiltered.slice(0, 5);
  const extraCountFiltered = Math.max(0, slotsToDisplayFiltered.length - visibleSlotsFiltered.length);

  useEffect(() => {
    if (isFavProp !== undefined) setIsFav(isFavProp);
  }, [isFavProp]);

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

  const handleReservar = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();

    // Usar solo slots que existan en slotsToDisplayFiltered actual (descartar obsoletos y bloqueados)
    const validSlots = selectedSlots.filter(s => slotsToDisplayFiltered.some(sl => sl.id === s.id));
    if (validSlots.length === 0) { router.push(`/cancha/${cancha.id}`); return; }
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
  const isToday = date === getLocalDateString();
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
        className={`group flex rounded-xl border bg-white overflow-hidden transition-all duration-200 hover:shadow-md h-[190px] ${
          isHighlighted ? 'border-[#16a34a] shadow-md ring-1 ring-[#16a34a]/30' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* Imagen izquierda — ancho según modo */}
        <div className={`relative shrink-0 h-full ${compact ? 'w-[140px]' : 'w-[280px]'}`}>
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

        {/* Contenido derecho */}
        <div className="flex flex-1 flex-col p-3 min-w-0">
          {/* Fila superior: nombre + precio + corazón */}
          <div className="flex justify-between items-center gap-2 mb-2">
            <Link href={`/cancha/${cancha.id}`} className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1 group-hover:text-[#16a34a] transition-colors">
                {cancha.name}
              </h3>
            </Link>
            {/* Corazón favorito — mismo nivel que el título */}
            <button
              onClick={handleToggleFav}
              disabled={togglingFav}
              className={`relative shrink-0 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
                isFav ? 'bg-destructive/20 hover:bg-destructive/30' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart className={`h-5 w-5 transition-all duration-300 ${
                isFav
                  ? 'fill-destructive text-destructive scale-110'
                  : 'text-gray-400 scale-100'
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
              <div className="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
                {cancha.rating > 0 ? (
                  <>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                    <span className="font-medium text-gray-800">{cancha.rating}</span>
                    {cancha.reviewCount > 0 && <span className="text-gray-400">({cancha.reviewCount})</span>}
                    {distancia !== undefined && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-[11px] text-[#16a34a] font-medium">{formatearDistancia(distancia)}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-[11px] text-gray-400 italic">Sin reseñas aún</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="text-[11px] line-clamp-1">{cancha.address}</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                  {sportLabels[cancha.type]}
                </span>
                {cancha.balonDisponible && (
                  <span className="inline-flex items-center rounded-md bg-green-50 border border-green-200 px-1.5 py-0.5 text-[11px] font-medium text-green-700">
                    ⚽{cancha.balonPrecio ? ` S/${cancha.balonPrecio}` : ' gratis'}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xl font-bold text-gray-900 leading-none">S/ {cancha.pricePerHour}</span>
              <p className="text-[10px] text-gray-400 mt-0.5">por hora</p>
            </div>
          </div>
          </Link>

          {/* Horarios + botón */}
          <div className="mt-auto">
            {visibleSlotsFiltered.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-gray-400 shrink-0">Horarios:</span>
                {visibleSlotsFiltered.map(slot => {
                  const isSelected = selectedSlots.some(s => s.id === slot.id);
                  return (
                    <button
                      key={slot.id}
                      onClick={(e) => handleSlotClick(slot, e)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#16a34a] border-[#16a34a] text-white'
                          : 'border-gray-200 text-gray-700 hover:border-[#16a34a]/50 hover:text-[#16a34a]'
                      }`}
                    >
                      {slot.time}
                    </button>
                  );
                })}
                {extraCountFiltered > 0 && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/cancha/${cancha.id}`); }}
                    className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-400 hover:border-gray-400 transition-all"
                  >
                    +{extraCountFiltered}
                  </button>
                )}
                <button
                  onClick={handleReservar}
                  disabled={reservando}
                  className="ml-auto shrink-0 rounded-lg bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] disabled:opacity-60 text-white px-4 py-2 text-xs font-semibold transition-all"
                >
                  {reservando
                    ? 'Bloqueando...'
                    : selectedSlots.length > 1
                    ? `Reservar ${selectedSlots.length}h`
                    : selectedSlots.length === 1
                    ? 'Reservar'
                    : 'Ver horarios'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <CalendarDays className="h-3 w-3" />
                <span>Sin disponibilidad próxima</span>
                <Link href={`/cancha/${cancha.id}`} className="ml-auto text-[#16a34a] font-medium hover:underline">
                  Ver →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
