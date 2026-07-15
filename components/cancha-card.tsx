"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Star,
  Heart,
  Navigation,
  CalendarDays,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageSlider } from "@/components/image-slider";
import { Cancha, TimeSlot, sportLabels } from "@/lib/types";
import { formatearDistancia } from "@/lib/geolocation-utils";
import { getLocalDateString } from "@/lib/date-utils";
import { apiToggleFavorito, apiGetFavoritos, getToken } from "@/lib/api";

interface CanchaCardProps {
  cancha: Cancha;
  distancia?: number;
  selectedDate?: string;
  availableHours?: string[];
  preselectedHour?: string;
  isFav?: boolean;
  onToggleFav?: (id: string) => void;
  onCanchaOcupada?: (id: string) => void;
}

function getAvailableSlots(
  cancha: Cancha,
  selectedDate: string,
  availableHours?: string[],
): TimeSlot[] {
  const daySlots = cancha.schedule?.[selectedDate] ?? [];
  const now = new Date();
  const isToday = selectedDate === getLocalDateString();

  return daySlots.filter((slot) => {
    if (slot.status !== "disponible" || !slot.available) return false;

    // Excluir slots pasados si es hoy
    if (isToday) {
      const [h, m] = slot.time.split(":").map(Number);
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
): { date: string; time: string; price: number } | null {
  const today = getLocalDateString();
  const now = new Date();
  const sortedDates = Object.keys(cancha.schedule ?? {}).sort();

  for (const dateStr of sortedDates) {
    // Solo días posteriores a la fecha seleccionada
    if (dateStr <= fromDate) continue;

    const slots = cancha.schedule[dateStr] ?? [];
    const isToday = dateStr === today;

    for (const slot of slots) {
      if (slot.status !== "disponible" || !slot.available) continue;
      if (isToday) {
        const [h, m] = slot.time.split(":").map(Number);
        if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) continue;
      }
      return { date: dateStr, time: slot.time, price: slot.price };
    }
  }
  return null;
}

function formatNextDate(dateStr: string, fromDate: string): string {
  const today = getLocalDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  if (dateStr === tomorrowStr) return "Mañana";
  if (dateStr === today) return "Hoy";

  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
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
      const hasTomorrow = tomorrowSlots.some(
        (s) => s.status === "disponible" && s.available,
      );
      if (hasTomorrow) {
        return {
          text: "Disponible mañana",
          className: "bg-white/95 text-blue-600",
          dotColor: "bg-blue-600",
        };
      }
      return null;
    }

    if (count <= 2) {
      return {
        text: "¡Últimos horarios!",
        className: "bg-white/95 text-red-600",
        dotColor: "bg-red-600",
      };
    }
    if (count <= 4) {
      return {
        text: "Pocos horarios hoy",
        className: "bg-white/95 text-orange-600",
        dotColor: "bg-orange-600",
      };
    }

    // Slot en la próxima hora
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const hasNearSlot = availableSlots.some((slot) => {
      const [h, m] = slot.time.split(":").map(Number);
      const slotMinutes = h * 60 + m;
      return slotMinutes - nowMinutes <= 60 && slotMinutes > nowMinutes;
    });
    if (hasNearSlot) {
      return {
        text: "Disponible ahora",
        className: "bg-white/95 text-green-600",
        dotColor: "bg-green-600",
      };
    }

    // Muchos slots disponibles hoy
    return {
      text: "Disponible hoy",
      className: "bg-white/95 text-green-600",
      dotColor: "bg-green-600",
    };
  }

  // Para fechas futuras, mostrar badge según cantidad de slots
  if (count === 0) {
    return null;
  }

  if (count <= 2) {
    return {
      text: "¡Últimos horarios!",
      className: "bg-white/95 text-red-600",
      dotColor: "bg-red-600",
    };
  }

  if (count <= 4) {
    return {
      text: "Pocos horarios",
      className: "bg-white/95 text-orange-600",
      dotColor: "bg-orange-600",
    };
  }

  // Muchos slots disponibles
  return {
    text: "Disponible",
    className: "bg-white/95 text-green-600",
    dotColor: "bg-green-600",
  };
}

export function CanchaCard({
  cancha,
  distancia,
  selectedDate,
  availableHours,
  preselectedHour,
  isFav: isFavProp,
  onToggleFav,
  onCanchaOcupada,
}: CanchaCardProps) {
  const router = useRouter();
  const date = selectedDate ?? getLocalDateString();
  const today = getLocalDateString();
  const isToday = date === today;

  // Hook para detectar el ancho de la pantalla - inicializar con el valor correcto
  const [slotsToShow, setSlotsToShow] = useState(() => {
    if (typeof window === "undefined") return 4;
    const w = window.innerWidth;
    return w < 375 ? 2 : w < 425 ? 3 : w < 640 ? 4 : w < 720 ? 3 : 4;
  });

  useEffect(() => {
    const updateSlotsToShow = () => {
      const w = window.innerWidth;
      setSlotsToShow(w < 375 ? 2 : w < 425 ? 3 : w < 640 ? 4 : w < 720 ? 3 : 4);
    };

    updateSlotsToShow();
    window.addEventListener("resize", updateSlotsToShow);
    return () => window.removeEventListener("resize", updateSlotsToShow);
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
    const preselectedIndex = availableSlotsForDay.findIndex(
      (slot) => slot.time === preselectedHour,
    );
    if (preselectedIndex !== -1) {
      // Mostrar solo desde el horario pre-seleccionado en adelante
      slotsToDisplay = availableSlotsForDay.slice(preselectedIndex);
    }
  }

  // Calcular slots visibles (primeros N slots de los que vamos a mostrar)
  const visibleSlots = slotsToDisplay.slice(0, slotsToShow);

  const nextAvailability =
    visibleSlots.length === 0 ? getNextAvailability(cancha, date) : null;

  // Calcular el badge de urgencia
  let urgencyBadge = null;
  if (showingTomorrow && availableSlotsForDay.length > 0) {
    // Si estamos mostrando horarios de mañana, mostrar badge "Disponible mañana"
    urgencyBadge = {
      text: "Disponible mañana",
      className: "bg-white/95 text-blue-600",
      dotColor: "bg-blue-600",
    };
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
      return "Próximos horarios hoy";
    } else if (displayDate === tomorrowStr) {
      return (
        <>
          Próximos horarios <span className="text-green-600">mañana</span>
        </>
      );
    } else {
      // Para cualquier otra fecha, mostrar la fecha formateada
      const targetDate = new Date(displayDate + "T00:00:00");
      const formattedDate = targetDate.toLocaleDateString("es-PE", {
        day: "numeric",
        month: "short",
      });
      return (
        <>
          Horarios para el{" "}
          <span className="text-green-600">{formattedDate}</span>
        </>
      );
    }
  };

  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>(() => {
    if (preselectedHour) {
      const preselected = availableSlotsForDay.find(
        (slot) => slot.time === preselectedHour,
      );
      if (preselected) return [preselected];
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  useEffect(() => {
    if (isFavProp !== undefined) setIsFav(isFavProp);
  }, [isFavProp]);

  useEffect(() => {
    if (isFavProp !== undefined) return;
    const token = getToken();
    if (!token) return;
    apiGetFavoritos()
      .then((ids: string[]) => {
        if (Array.isArray(ids)) setIsFav(ids.includes(cancha.id));
      })
      .catch(() => {});
  }, [cancha.id, isFavProp]);

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
    setIsFav(!prev);
    try {
      await apiToggleFavorito(cancha.id);
      onToggleFav?.(cancha.id);
    } catch {
      setIsFav(prev);
    } finally {
      setTogglingFav(false);
    }
  };

  const slotsToDisplayFiltered = slotsToDisplay.filter(
    (s) => !localOcupados.has(s.id),
  );
  const visibleSlotsFiltered = slotsToDisplayFiltered.slice(0, slotsToShow);
  const extraCountFiltered = Math.max(
    0,
    slotsToDisplayFiltered.length - visibleSlotsFiltered.length,
  );

  const startCountdown = (seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
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

    // Descartar slots obsoletos o bloqueados localmente
    const validSelected = selectedSlots.filter((s) =>
      slotsToDisplayFiltered.some((sl) => sl.id === s.id),
    );

    const isSelected = validSelected.some((s) => s.id === slot.id);

    if (isSelected) {
      const first = validSelected[0];
      const last = validSelected[validSelected.length - 1];
      if (slot.id === last.id) {
        setSelectedSlots(validSelected.slice(0, -1));
        return;
      }
      if (slot.id === first.id) {
        setSelectedSlots(validSelected.slice(1));
        return;
      }
      setSelectedSlots([slot]);
      return;
    }

    if (validSelected.length === 0) {
      setSelectedSlots([slot]);
      return;
    }

    const idx = slotsToDisplayFiltered.findIndex((s) => s.id === slot.id);
    const indices = validSelected.map((s) =>
      slotsToDisplayFiltered.findIndex((sl) => sl.id === s.id),
    );
    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);

    if (idx === maxIdx + 1) setSelectedSlots([...validSelected, slot]);
    else if (idx === minIdx - 1) setSelectedSlots([slot, ...validSelected]);
    else setSelectedSlots([slot]);
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(detailUrl);
  };

  const handleReservar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Usar solo slots que existan en slotsToDisplayFiltered actual (descartar obsoletos y bloqueados)
    const validSlots = selectedSlots.filter((s) =>
      slotsToDisplayFiltered.some((sl) => sl.id === s.id),
    );
    if (validSlots.length === 0) {
      router.push(detailUrl);
      return;
    }

    // Si la cancha tiene secciones, el usuario debe elegir sección en el detalle
    if ((cancha.totalSecciones ?? 0) > 0) {
      router.push(`/cancha/${cancha.id}?fecha=${displayDate}&hora=${validSlots[0].time}`);
      return;
    }

    setReservando(true);

    const token =
      typeof window !== "undefined" ? localStorage.getItem("cp_token") : null;
    let bloqueoRes: Response;
    try {
      bloqueoRes = await fetch("/api/bloqueos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          canchaId: cancha.id,
          fecha: displayDate,
          hora: validSlots[0].time,
          horas: validSlots.length,
        }),
      });
    } catch {
      setReservando(false);
      router.push(detailUrl);
      return;
    }

    if (!bloqueoRes.ok) {
      const horaInicio = parseInt(validSlots[0].time.split(":")[0]);
      const nuevosOcupados = new Set(
        Array.from(
          { length: validSlots.length },
          (_, i) =>
            `${displayDate}-${String((horaInicio + i) % 24).padStart(2, "0")}:00`,
        ),
      );
      setLocalOcupados((prev) => new Set([...prev, ...nuevosOcupados]));
      setReservando(false);
      setSelectedSlots([]);
      setOcupadoModal(true);
      startCountdown(5 * 60);
      return;
    }

    const bloqueoKey = `cp_bloqueo_inicio_${cancha.id}_${displayDate}_${validSlots[0].time.replace(":", "-")}`;
    localStorage.setItem(bloqueoKey, String(Date.now()));

    router.push(
      `/pago?canchaId=${cancha.id}&fecha=${displayDate}&hora=${validSlots[0].time}&horas=${validSlots.length}&precio=${validSlots[0].price}&from=card`,
    );
  };

  const tieneSecciones = (cancha.totalSecciones ?? 0) > 0;
  // Precio del próximo horario disponible (ya considera la sección más barata disponible)
  const precioMostrado =
    visibleSlotsFiltered[0]?.price ?? nextAvailability?.price ?? cancha.pricePerHour;
  // URL al detalle que conserva la fecha/hora filtrada (o el próximo horario visible),
  // para que cualquier clic en el card (no solo "Reservar") llegue con eso preseleccionado.
  const detailHora = selectedSlots[0]?.time ?? visibleSlotsFiltered[0]?.time ?? preselectedHour;
  const detailUrl = detailHora
    ? `/cancha/${cancha.id}?fecha=${displayDate}&hora=${detailHora}`
    : `/cancha/${cancha.id}`;
  const buttonLabel = reservando
    ? "Reservando..."
    : tieneSecciones
      ? "Elegir sección →"
      : selectedSlots.length > 1
        ? `Reservar ${selectedSlots.length}h`
        : selectedSlots.length === 1
          ? "Reservar"
          : "Ver horarios";

  return (
    <>
      {/* Modal: horario ocupado */}
      <Dialog
        open={ocupadoModal}
        onOpenChange={(open) => {
          setOcupadoModal(open);
          if (!open) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (preselectedHour) onCanchaOcupada?.(cancha.id);
          }
        }}
      >
        <DialogContent className="max-w-sm text-center z-200">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Horario en proceso de reserva
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Otro usuario está completando el pago de este horario ahora
                mismo.
              </p>
            </div>

            {countdown > 0 ? (
              <div className="w-full rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Se liberará en máximo
                </p>
                <div className="flex items-center justify-center gap-2 text-yellow-600">
                  <Timer className="h-5 w-5" />
                  <span className="text-2xl font-bold tabular-nums">
                    {String(Math.floor(countdown / 60)).padStart(2, "0")}:
                    {String(countdown % 60).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Si el pago no se completa, el horario quedará disponible
                  nuevamente.
                </p>
              </div>
            ) : (
              <div className="w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-sm font-medium text-primary">
                  ¡El tiempo venció! Intenta reservar de nuevo.
                </p>
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
                    if (countdownRef.current)
                      clearInterval(countdownRef.current);
                    router.push(detailUrl);
                  }}
                >
                  Actualizar horarios
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card
        className="group overflow-hidden border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a')) return;
          router.push(detailUrl);
        }}
      >
        {/* Imagen */}
        <div className="relative">
          <Link href={detailUrl}>
            <ImageSlider
              images={cancha.images}
              alt={cancha.name}
              aspectRatio="wide"
              showCounter={false}
            />
          </Link>

          {/* Badge tipo deporte — esquina inferior izquierda */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center rounded-md bg-black/50 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm pointer-events-none">
            {sportLabels[cancha.type]}
          </div>

          {/* Rating overlay — esquina inferior derecha */}
          {cancha.rating > 0 && (
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm pointer-events-none">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{cancha.rating}</span>
            </div>
          )}

          {/* Badge de urgencia — esquina superior izquierda */}
          {urgencyBadge && (
            <div
              className={`absolute top-3 left-3 z-10 h-7 flex items-center gap-1.5 rounded-md px-3 text-xs font-semibold backdrop-blur-sm ${urgencyBadge.className}`}
            >
              {urgencyBadge.dotColor && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${urgencyBadge.dotColor}`}
                />
              )}
              {urgencyBadge.text}
            </div>
          )}

          {/* Distancia — esquina superior derecha */}
          {distancia !== undefined && (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm pointer-events-none">
              <Navigation className="h-3 w-3 fill-white text-white" />
              {formatearDistancia(distancia)}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-4">
          {/* Nombre — ancho completo */}
          <Link href={detailUrl}>
            <h3 className="text-base font-bold group-hover:text-primary transition-colors mb-2 text-brand-green line-clamp-2 sm:min-h-[3rem] leading-6">
              {cancha.name}
            </h3>
          </Link>

          {/* Segunda fila: dirección + badge | precio */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1 min-w-0">
              {/* Dirección */}
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs">{cancha.address}</span>
              </div>
            </div>

            {/* Precio */}
            <div className="shrink-0 flex flex-col items-center justify-center text-center min-w-[64px]">
              <span className="text-xl font-bold text-foreground leading-none">
                S/ {precioMostrado}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                por hora
              </span>
              {tieneSecciones && (
                <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {cancha.totalSecciones} secc.
                </span>
              )}
            </div>
          </div>

          {/* Horarios disponibles */}
          <div className="mb-3 w-full">
            {tieneSecciones ? (
              <div className="flex w-full items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 text-sm text-muted-foreground">
                <span className="text-primary text-base">⊞</span>
                <span>Entra para elegir sección y horario</span>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {getHorariosText()}
                  </p>
                  <Link
                    href={detailUrl}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                  >
                    Ver horarios →
                  </Link>
                </div>

                {visibleSlotsFiltered.length > 0 ? (
                  <div className="flex items-center gap-1.5 w-full">
                    {visibleSlotsFiltered.map((slot) => {
                      const isSelected = selectedSlots.some(
                        (s) => s.id === slot.id,
                      );
                      return (
                        <button
                          key={slot.id}
                          onClick={(e) => handleSlotClick(e, slot)}
                          aria-pressed={isSelected}
                          aria-label={`Seleccionar horario ${slot.time}`}
                          className={`flex-1 min-w-0 rounded-lg border px-2 py-2 text-sm font-medium transition-all text-center ${
                            isSelected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-background text-foreground hover:border-primary/50"
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                    {extraCountFiltered > 0 && (
                      <button
                        onClick={handleMoreClick}
                        className="flex-shrink-0 w-12 rounded-lg border border-border bg-background px-2 py-2 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
                        aria-label={`Ver ${extraCountFiltered} horarios más`}
                      >
                        +{extraCountFiltered}
                      </button>
                    )}
                  </div>
                ) : nextAvailability ? (
                  <div className="flex w-full items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>
                      Próxima disponibilidad:{" "}
                      <span className="font-medium text-foreground">
                        {formatNextDate(nextAvailability.date, date)}{" "}
                        {nextAvailability.time}
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="flex w-full items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>Sin disponibilidad próxima</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Accesorios */}
          {(() => {
            const OBLIGATORIOS: Record<string, Array<{ nombre: string; icono: string }>> = {
              futbol:  [{ nombre: 'Balón', icono: '⚽' }, { nombre: 'Chalecos', icono: '🎽' }],
              futsal:  [{ nombre: 'Balón', icono: '⚽' }, { nombre: 'Chalecos', icono: '🎽' }],
              voley:   [{ nombre: 'Balón', icono: '🏐' }, { nombre: 'Malla', icono: '🥅' }],
              basquet: [{ nombre: 'Balón', icono: '🏀' }, { nombre: 'Canasta', icono: '🪣' }],
              tenis:   [{ nombre: 'Raqueta', icono: '🎾' }, { nombre: 'Pelotas', icono: '🎾' }],
            };
            const obligatorios = (OBLIGATORIOS[cancha.type] ?? []).slice(0, 2);
            if (!obligatorios.length) return null;
            const accesorios = cancha.accesorios ?? [];
            return (
              <div className="mb-3 flex items-center gap-2">
                {obligatorios.map((ob) => {
                  const encontrado = accesorios.find(
                    (a) => a.nombre.toLowerCase() === ob.nombre.toLowerCase()
                  );
                  return encontrado ? (
                    <span key={ob.nombre} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border bg-brand-yellow/25 border-brand-yellow/50 text-brand-black">
                      {ob.icono} {ob.nombre}
                      {encontrado.modalidad === 'alquilado' && encontrado.precio != null
                        ? ` · S/ ${encontrado.precio}`
                        : ' · Gratis'}
                    </span>
                  ) : (
                    <span key={ob.nombre} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border border-border bg-muted/40 text-muted-foreground line-through opacity-60">
                      {ob.icono} Sin {ob.nombre.toLowerCase()}
                    </span>
                  );
                })}
              </div>
            );
          })()}

          {/* Botón Reservar + Favorito */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReservar}
              disabled={reservando}
              className="flex-1 rounded-lg bg-brand-green py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {reservando && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent shrink-0" />
              )}
              {buttonLabel}
            </button>
            {isLoggedIn && (
              <button
                onClick={handleToggleFav}
                disabled={togglingFav}
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 ${
                  isFav
                    ? "border-destructive/30 bg-destructive/10 hover:bg-destructive/20"
                    : "border-border bg-background hover:border-primary/50"
                }`}
                aria-label={
                  isFav ? "Quitar de favoritos" : "Agregar a favoritos"
                }
              >
                <Heart
                  className={`h-5 w-5 transition-all duration-300 ${isFav ? "fill-destructive text-destructive scale-110" : "text-muted-foreground scale-100"}`}
                />
                {togglingFav && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg backdrop-blur-sm">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
