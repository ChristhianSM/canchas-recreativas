"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Star,
  Phone,
  Clock,
  CheckCircle2,
  Navigation,
  Share2,
  Heart,
  CalendarDays,
  AlertTriangle,
  Timer,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepButton } from "@/components/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Header } from "@/components/header";
import { CanchaGallery } from "@/components/cancha-gallery";
import { TimeSlotPicker } from "@/components/time-slot-picker";
import CalificarCancha from "@/components/calificar-cancha";
import { CanchaSEO } from "@/components/cancha-seo";
import { sportLabels, TimeSlot } from "@/lib/types";
import { apiToggleFavorito, apiGetFavoritos, getToken } from "@/lib/api";
import { getLocalDateString } from "@/lib/date-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Carga dinámica para evitar SSR con Leaflet
const MapView = dynamic(
  () => import("@/components/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse bg-muted" />,
  },
);

// Convertir formato 24h a 12h (AM/PM)
function formatTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function addOneHour24(time24: string): string {
  const [h] = time24.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:00`;
}

const HORAS_OPERACION = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
];

function getOperatingHours(horariosRestringidos: string[], horasOperacion?: string[]): string {
  const horas = horasOperacion ?? HORAS_OPERACION;
  const open = horas.filter((h) => !horariosRestringidos.includes(h));
  if (!open.length) return "6:00 AM – 11:00 PM";
  return `${formatTo12Hour(open[0])} – ${formatTo12Hour(open[open.length - 1])}`;
}

type CanchaDB = {
  id: string;
  nombre: string;
  tipo: keyof typeof sportLabels;
  direccion: string;
  distrito: string;
  descripcion: string;
  imagenes: string[];
  rating: number;
  total_resenas: number;
  precio_por_hora: number;
  amenidades: string[];
  precios_por_hora: Record<string, number>;
  lat: number;
  lng: number;
  telefono: string;
  destacada: boolean;
  horariosRestringidos: string[];
  horariosOcupados: Record<string, "reservado" | "en_proceso">;
  horasOperacion?: string[];
  balon_disponible: boolean;
  balon_precio: number | null;
  chalecos_disponible: boolean;
  chalecos_precio: number | null;
  superficie: string | null;
  max_jugadores: number | null;
  yape_numero?: string;
  plin_numero?: string;
};

function buildSchedule(
  horariosRestringidos: string[],
  horariosOcupados: Record<string, "reservado" | "en_proceso">,
  precioBase: number,
  preciosPorHora: Record<string, number> = {},
  horasOperacion: string[] = HORAS_OPERACION,
) {
  const schedule: Record<string, TimeSlot[]> = {};
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    schedule[dateStr] = horasOperacion.map((time, idx) => {
      const key = `${dateStr}|${time}`;
      const ocupado = horariosOcupados[key];
      const bloqueado = horariosRestringidos.includes(time);
      const status =
        bloqueado || ocupado === "reservado"
          ? "reservado"
          : ocupado === "en_proceso"
            ? "en_proceso"
            : "disponible";
      // Usar precio específico de la hora si existe, sino el precio base
      const precio = preciosPorHora[time] ?? precioBase;
      return {
        id: `${dateStr}-${idx}`,
        time,
        available: status === "disponible",
        price: precio,
        status,
      };
    });
  }
  return schedule;
}

export default function CanchaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const id = params.id as string;

  const today = getLocalDateString();
  const [cancha, setCancha] = useState<CanchaDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isFav, setIsFav] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [reservando, setReservando] = useState(false);

  const [ocupadoModal, setOcupadoModal] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [reservaStep, setReservaStep] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Extras seleccionados por el usuario
  const [quiereBalon, setQuiereBalon] = useState(false);
  const [quiereChalecos, setQuiereChalecos] = useState(false);

  const sessionId = useRef(
    typeof window !== "undefined"
      ? (sessionStorage.getItem("cp_session_id") ??
          (() => {
            const id = crypto.randomUUID();
            sessionStorage.setItem("cp_session_id", id);
            return id;
          })())
      : "",
  );
  const slotPickerRef = useRef<HTMLDivElement>(null);
  const [buttonPulse, setButtonPulse] = useState(false);
  const prevSlotLengthRef = useRef(0);

  // Abrir modal automáticamente si viene de /pago con ?ocupado=1
  useEffect(() => {
    if (searchParams.get("ocupado") === "1") {
      setOcupadoModal(true);
      startCountdown(5 * 60);
      router.replace(`/cancha/${id}`, { scroll: false });
      // Refrescar horarios para mostrar el slot como bloqueado/ocupado
      fetch(`/api/canchas/detail?id=${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setCancha(data);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const mostrarOcupado = (refrescarCancha = true) => {
    setReservando(false);
    setReservaStep(0);
    setSelectedSlots([]);
    setOcupadoModal(true);
    startCountdown(5 * 60);
    if (refrescarCancha) {
      fetch(`/api/canchas/detail?id=${cancha!.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setCancha(data);
        });
    }
  };

  const handleReservar = async () => {
    if (!cancha || selectedSlots.length === 0) return;
    setReservando(true);
    setReservaStep(1);

    // Crear bloqueo atómicamente — el UNIQUE constraint en BD garantiza que solo
    // un usuario puede bloquear el mismo slot. No se hace check previo porque
    // check + insert separados crean una ventana de race condition.
    const token =
      typeof window !== "undefined" ? localStorage.getItem("cp_token") : null;
    const bloqueoRes = await fetch("/api/bloqueos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        canchaId: cancha.id,
        fecha: selectedDate,
        hora: selectedSlots[0].time,
        horas: selectedSlots.length,
      }),
    });

    if (!bloqueoRes.ok) {
      if (bloqueoRes.status === 409) {
        mostrarOcupado();
      } else {
        setReservando(false);
        setReservaStep(0);
        toast({
          title: "Error",
          description:
            "No se pudo reservar el horario. Por favor intenta de nuevo.",
          variant: "destructive",
        });
      }
      return;
    }

    // Guardar timestamp en localStorage para que la página de pago arranque el timer
    const bloqueoKey = `cp_bloqueo_inicio_${cancha.id}_${selectedDate}_${selectedSlots[0].time.replace(":", "-")}`;
    localStorage.setItem(bloqueoKey, String(Date.now()));

    // Cachear datos de cancha para que /pago no repita el fetch
    sessionStorage.setItem(`cp_cancha_pago_${cancha.id}`, JSON.stringify({
      id: cancha.id,
      name: cancha.nombre,
      images: cancha.imagenes?.length ? cancha.imagenes : [],
      address: cancha.direccion,
      phone: cancha.telefono,
      balonPrecio: cancha.balon_precio ?? null,
      chalecosPrecio: cancha.chalecos_precio ?? null,
      yapeNumero: cancha.yape_numero ?? "",
      plinNumero: cancha.plin_numero ?? "",
    }));

    setReservaStep(2);
    setTimeout(() => {
      const extrasParams = [
        quiereBalon && cancha.balon_disponible ? `balon=1` : "",
        quiereChalecos && cancha.chalecos_disponible ? `chalecos=1` : "",
      ]
        .filter(Boolean)
        .join("&");
      const extrasStr = extrasParams ? `&${extrasParams}` : "";
      const firstSlot = selectedSlots[0];
      router.push(
        `/pago?canchaId=${cancha.id}&fecha=${selectedDate}&hora=${firstSlot.time}&horas=${selectedSlots.length}&precio=${firstSlot.price}&sid=${sessionId.current}${extrasStr}`,
      );
    }, 800);
  };

  // Limpiar interval al desmontar
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    // Usar query param para evitar bug de Turbopack con rutas dinámicas
    // cache: no-store para siempre obtener bloqueos temporales frescos
    fetch(`/api/canchas/detail?id=${id}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setCancha(data);
        } else {
          // Fallback: buscar en el listado completo
          return fetch("/api/canchas/list")
            .then((r) => r.json())
            .then((list) => {
              const found = Array.isArray(list)
                ? list.find((c: any) => c.id === id)
                : null;
              if (found)
                setCancha({
                  ...found,
                  horariosRestringidos: [],
                  horariosOcupados: {},
                });
            });
        }
      })
      .finally(() => setLoading(false))
      .catch(() => setLoading(false));
  }, [id]);

  // Polling cada 15 segundos para mostrar bloqueos de otros usuarios en tiempo real
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetch(`/api/canchas/detail?id=${id}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setCancha(data);
        })
        .catch(() => {});
    }, 15 * 1000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!cancha) return;
    const token = getToken();
    if (token) {
      apiGetFavoritos().then((ids: string[]) =>
        setIsFav(ids.includes(cancha.id)),
      );
    }
  }, [cancha?.id]);

  useEffect(() => {
    if (selectedSlots.length > 0 && prevSlotLengthRef.current === 0) {
      setButtonPulse(true);
      const timer = setTimeout(() => setButtonPulse(false), 2500);
      return () => clearTimeout(timer);
    }
    prevSlotLengthRef.current = selectedSlots.length;
  }, [selectedSlots.length]);

  const handleToggleFavorite = async () => {
    if (!cancha || togglingFav) return;

    const token = getToken();
    if (!token) {
      // Redirigir al login y volver a esta cancha después
      router.push(`/login?redirect=/cancha/${cancha.id}`);
      return;
    }

    setTogglingFav(true);
    const wasFav = isFav;

    // Optimistic update - cambiar inmediatamente
    setIsFav(!wasFav);

    // Vibración háptica en mobile
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(!wasFav ? [30, 20, 30] : 50); // Patrón diferente para agregar vs quitar
    }

    try {
      await apiToggleFavorito(cancha.id);

      // Toast de confirmación con mejor diseño
      if (!wasFav) {
        // Agregado a favoritos
        toast({
          title: (
            <div className="flex items-center gap-2">
              <span className="text-2xl">❤️</span>
              <span>Agregado a favoritos</span>
            </div>
          ) as any,
          description: `Ahora puedes encontrar "${cancha.nombre}" en tu lista de favoritos`,
          duration: 3000,
          className: "border-l-4 border-l-destructive",
        });
      } else {
        // Eliminado de favoritos
        toast({
          description: `"${cancha.nombre}" fue eliminado de tus favoritos`,
          duration: 2000,
        });
      }
    } catch (error) {
      // Revertir si falla
      setIsFav(wasFav);
      toast({
        title: "Error",
        description: "No se pudo actualizar favoritos. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setTogglingFav(false), 300); // Delay para que se vea la animación
    }
  };

  const handleShare = async () => {
    if (!cancha) return;

    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/cancha/${cancha.id}`;
    const shareData = {
      title: cancha.nombre,
      text: `Mira esta cancha: ${cancha.nombre} - S/ ${cancha.precio_por_hora}/hora`,
      url: shareUrl,
    };

    // Usar Web Share API si está disponible (móviles)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        // Usuario canceló el compartir, no hacer nada
        if (err.name !== "AbortError")
          console.error("Error al compartir:", err);
      }
    } else {
      // Fallback: copiar al portapapeles
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copiado al portapapeles");
      } catch (err) {
        console.error("Error al copiar:", err);
        alert("No se pudo copiar el link");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <Header />
        {/* Botón volver */}
        <div className="container mx-auto px-4 pt-3 pb-1">
          <div className="h-4 w-14 animate-pulse rounded bg-muted" />
        </div>
        {/* Título */}
        <div className="container mx-auto flex items-center justify-between px-4 pt-3">
          <div className="flex-1 min-w-0 pr-4 space-y-2">
            <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-52 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-1 shrink-0">
            <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
        {/* Galería */}
        <div className="container mx-auto px-4 pt-4">
          <div className="aspect-video sm:aspect-2/1 w-full animate-pulse rounded-xl bg-muted" />
        </div>
        {/* Contenido */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <div className="flex gap-3 flex-wrap">
                <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
              </div>
              {/* Info bar mobile */}
              <div className="h-16 w-full animate-pulse rounded-xl bg-muted lg:hidden" />
              {/* Descripción */}
              <div className="space-y-2">
                <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted" />
              </div>
              {/* Slot picker mobile */}
              <div className="lg:hidden space-y-3">
                <div className="h-5 w-36 animate-pulse rounded bg-muted" />
                <div className="flex gap-2 overflow-hidden">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-17 w-15 shrink-0 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({length: 12}).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              </div>
              {/* Servicios */}
              <div className="space-y-3">
                <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-5 animate-pulse rounded-full bg-muted" />
                  ))}
                </div>
              </div>
            </div>
            {/* Sidebar desktop */}
            <div className="hidden lg:block">
              <div className="h-100 animate-pulse rounded-xl bg-muted sticky top-20" />
            </div>
          </div>
        </div>
        {/* Bottom bar mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-4 py-3 shadow-xl">
          <div className="container mx-auto flex items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-28 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-14 w-40 animate-pulse rounded-lg bg-muted shrink-0" />
          </div>
        </div>
      </div>
    );
  }

  if (!cancha) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">
            Cancha no encontrada
          </h1>
          <p className="mb-6 text-muted-foreground">
            La cancha que buscas no existe o fue eliminada.
          </p>
          <Button onClick={() => router.push("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const schedule = buildSchedule(
    cancha.horariosRestringidos ?? [],
    cancha.horariosOcupados ?? {},
    cancha.precio_por_hora,
    cancha.precios_por_hora ?? {},
    cancha.horasOperacion ?? HORAS_OPERACION,
  );

  // ── Inline picker helpers (mobile) ──────────────────────────────────────
  const inlineSlots = schedule[selectedDate] || [];

  const isInlinePasado = (slotTime: string): boolean => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    if (selectedDate !== `${y}-${mo}-${dd}`) return false;
    const [h, m] = slotTime.split(":").map(Number);
    const t = new Date();
    t.setHours(h, m, 0, 0);
    return t <= now;
  };

  const handleInlineSlotClick = (slot: TimeSlot) => {
    const pasado = slot.status === "disponible" && isInlinePasado(slot.time);
    if (!slot.available || pasado) return;
    if (typeof navigator !== "undefined" && navigator.vibrate)
      navigator.vibrate(50);

    const alreadySel = selectedSlots.some((s) => s.id === slot.id);
    if (alreadySel) {
      const first = selectedSlots[0];
      const last = selectedSlots[selectedSlots.length - 1];
      if (slot.id === last.id) {
        setSelectedSlots(selectedSlots.slice(0, -1));
        return;
      }
      if (slot.id === first.id) {
        setSelectedSlots(selectedSlots.slice(1));
        return;
      }
      setSelectedSlots([slot]);
      return;
    }
    if (!selectedSlots.length) {
      setSelectedSlots([slot]);
      return;
    }

    const idx = inlineSlots.findIndex((s) => s.id === slot.id);
    const indices = selectedSlots.map((s) =>
      inlineSlots.findIndex((sl) => sl.id === s.id),
    );
    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);
    if (idx === maxIdx + 1) setSelectedSlots([...selectedSlots, slot]);
    else if (idx === minIdx - 1) setSelectedSlots([slot, ...selectedSlots]);
    else setSelectedSlots([slot]);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const extraBalon =
    quiereBalon && cancha.balon_precio != null ? cancha.balon_precio : 0;
  const extraChalecos =
    quiereChalecos && cancha.chalecos_precio != null
      ? cancha.chalecos_precio
      : 0;
  const precioBase = selectedSlots.reduce((sum, s) => sum + s.price, 0);
  const precioConExtras =
    precioBase > 0 ? precioBase + extraBalon + extraChalecos : 0;
  const hayExtras = extraBalon > 0 || extraChalecos > 0;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${cancha.lat},${cancha.lng}`;
  const selectedDateLabel = new Date(
    selectedDate + "T00:00:00",
  ).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      {/* SEO: Datos estructurados JSON-LD */}
      <CanchaSEO
        cancha={{
          id: cancha.id,
          nombre: cancha.nombre,
          descripcion: cancha.descripcion,
          direccion: cancha.direccion,
          distrito: cancha.distrito,
          lat: cancha.lat,
          lng: cancha.lng,
          telefono: cancha.telefono,
          precio_por_hora: cancha.precio_por_hora,
          rating: cancha.rating,
          total_resenas: cancha.total_resenas,
          imagenes: cancha.imagenes,
          tipo: cancha.tipo,
        }}
      />

      <Header />

      {/* Modal: horario ocupado */}
      <Dialog
        open={ocupadoModal}
        onOpenChange={(open) => {
          setOcupadoModal(open);
          if (!open) {
            if (countdownRef.current) clearInterval(countdownRef.current);
          }
        }}
      >
        <DialogContent className="max-w-sm text-center">
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
                  onClick={async () => {
                    // Reverificar disponibilidad
                    if (!cancha) return;
                    const check = await fetch(
                      `/api/canchas/detail?id=${cancha.id}`,
                    ).then((r) => r.json());
                    if (!check.error) setCancha(check);
                    setOcupadoModal(false);
                    if (countdownRef.current)
                      clearInterval(countdownRef.current);
                  }}
                >
                  Actualizar horarios
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 pt-3 pb-1">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </div>

      <div className="container mx-auto flex items-center justify-between px-4 pt-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge className="bg-primary text-primary-foreground">
              {sportLabels[cancha.tipo]}
            </Badge>
            {cancha.destacada && (
              <Badge className="bg-accent text-accent-foreground">
                Destacado
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground line-clamp-1">
            {cancha.nombre}
          </h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
            disabled={togglingFav}
            className={`relative group transition-all duration-300 ${
              isFav
                ? "bg-destructive/10 hover:bg-destructive/20"
                : "hover:bg-muted"
            }`}
          >
            <Heart
              className={`h-5 w-5 transition-all duration-300 ${
                isFav
                  ? "fill-destructive text-destructive scale-110"
                  : "scale-100 group-hover:scale-110 group-hover:text-destructive/70"
              }`}
            />

            {/* Spinner de loading */}
            {togglingFav && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-md backdrop-blur-sm">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4">
        <CanchaGallery images={cancha.imagenes} alt={cancha.nombre} />
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {cancha.rating > 0 && (
                <>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-accent text-accent" />
                    <span className="font-semibold text-foreground">
                      {cancha.rating}
                    </span>
                    {cancha.total_resenas > 0 && (
                      <span>({cancha.total_resenas} reseñas)</span>
                    )}
                  </div>
                  <span>•</span>
                </>
              )}
              <span>{cancha.distrito}, Piura</span>
              {cancha.superficie && (
                <>
                  <span>•</span>
                  <span className="capitalize">
                    {cancha.superficie === "grass"
                      ? "🌿 Grass natural"
                      : cancha.superficie === "grass_sintetico"
                        ? "🟩 Grass sintético"
                        : cancha.superficie === "loza"
                          ? "🏗️ Loza"
                          : "⬜ Cemento"}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 lg:hidden">
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">Horario</p>
                <p className="text-sm font-medium text-foreground">
                  {getOperatingHours(cancha.horariosRestringidos, cancha.horasOperacion)}
                </p>
              </div>
              {cancha.max_jugadores && (
                <>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="flex-1 text-center">
                    <p className="text-xs text-muted-foreground">Jugadores</p>
                    <p className="text-sm font-medium text-foreground">
                      👥 {cancha.max_jugadores}
                    </p>
                  </div>
                </>
              )}
              {cancha.telefono && (
                <>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="flex-1 text-center">
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <a
                      href={`tel:${cancha.telefono}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {cancha.telefono}
                    </a>
                  </div>
                </>
              )}
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                Descripción
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {cancha.descripcion}
              </p>
            </div>

            {/* ── Horarios inline — solo mobile, construido desde cero ── */}
            <div className="lg:hidden" ref={slotPickerRef}>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                Elige día y hora
              </h2>

              {/* Fechas: scroll horizontal contenido en su propio eje */}
              <div className="overflow-x-auto scrollbar-hide pb-1 mb-3">
                <div className="flex gap-2">
                  {Object.keys(schedule)
                    .sort()
                    .map((date) => {
                      const d = new Date(date + "T00:00:00");
                      const hoy = new Date();
                      hoy.setHours(0, 0, 0, 0);
                      const DIAS = [
                        "Dom",
                        "Lun",
                        "Mar",
                        "Mié",
                        "Jue",
                        "Vie",
                        "Sáb",
                      ];
                      const MESES = [
                        "Ene",
                        "Feb",
                        "Mar",
                        "Abr",
                        "May",
                        "Jun",
                        "Jul",
                        "Ago",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dic",
                      ];
                      return (
                        <button
                          key={date}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedSlots([]);
                          }}
                          className={cn(
                            "flex shrink-0 flex-col items-center justify-center rounded-xl transition-all w-[60px] h-[68px]",
                            selectedDate === date
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                          )}
                        >
                          <span className="text-xs font-medium">
                            {d.getTime() === hoy.getTime()
                              ? "Hoy"
                              : DIAS[d.getDay()]}
                          </span>
                          <span className="text-xl font-bold leading-none mt-0.5">
                            {d.getDate()}
                          </span>
                          <span className="text-xs opacity-70 mt-0.5">
                            {MESES[d.getMonth()]}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Slots: 4 columnas, ancho total del contenedor */}
              <div className="grid grid-cols-4 gap-2">
                {inlineSlots.map((slot) => {
                  const pasado =
                    slot.status === "disponible" && isInlinePasado(slot.time);
                  const sel = selectedSlots.some((s) => s.id === slot.id);
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleInlineSlotClick(slot)}
                      disabled={!slot.available || pasado}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl border py-2.5 px-1 transition-all",
                        slot.status === "disponible" &&
                          !pasado &&
                          !sel &&
                          "border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer",
                        slot.status === "disponible" &&
                          !pasado &&
                          sel &&
                          "border-foreground bg-foreground text-background",
                        slot.status === "reservado" &&
                          "cursor-not-allowed border-transparent bg-muted opacity-50",
                        slot.status === "en_proceso" &&
                          "cursor-not-allowed border-yellow-500/40 bg-yellow-500/10 opacity-75",
                        pasado &&
                          "cursor-not-allowed border-blue-200/40 bg-slate-100 dark:bg-slate-800/40 opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          pasado && "text-slate-400 dark:text-slate-500",
                        )}
                      >
                        {slot.time}
                      </span>
                      <span
                        className={cn(
                          "text-[11px] leading-tight mt-0.5",
                          sel && "text-background/80",
                          !sel &&
                            !pasado &&
                            slot.status === "disponible" &&
                            "text-muted-foreground",
                          slot.status === "reservado" &&
                            "text-muted-foreground",
                          slot.status === "en_proceso" &&
                            "text-yellow-600 font-medium",
                          pasado && "text-slate-400 dark:text-slate-500",
                        )}
                      >
                        {pasado
                          ? "Pasado"
                          : slot.status === "reservado"
                            ? "Ocupado"
                            : slot.status === "en_proceso"
                              ? "En proceso"
                              : `S/ ${slot.price}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Leyenda */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-border bg-card" />
                  Disponible
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-yellow-500/40 bg-yellow-500/10" />
                  En proceso
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-muted opacity-50" />
                  Ocupado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-blue-200/40 bg-slate-100 dark:bg-slate-800/40 opacity-60" />
                  Hora pasada
                </span>
              </div>
            </div>
            {/* ──────────────────────────────────────────────────────────── */}

            {/* Extras mobile — aparece al seleccionar slots si hay extras disponibles */}
            {selectedSlots.length > 0 && (cancha.balon_disponible || cancha.chalecos_disponible) && (
              <div className="lg:hidden rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">¿Necesitas extras?</p>
                {cancha.balon_disponible && (
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span>⚽</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">Balón</p>
                        <p className="text-xs text-muted-foreground">
                          {cancha.balon_precio != null ? `+ S/ ${cancha.balon_precio}` : "Gratis"}
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      checked={quiereBalon}
                      onCheckedChange={(v) => setQuiereBalon(v as boolean)}
                    />
                  </label>
                )}
                {cancha.chalecos_disponible && (
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span>🎽</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">Chalecos</p>
                        <p className="text-xs text-muted-foreground">
                          {cancha.chalecos_precio != null ? `+ S/ ${cancha.chalecos_precio}` : "Gratis"}
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      checked={quiereChalecos}
                      onCheckedChange={(v) => setQuiereChalecos(v as boolean)}
                    />
                  </label>
                )}
              </div>
            )}

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                Servicios
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cancha.amenidades?.map((a) => (
                  <div key={a} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-foreground">{a}</span>
                  </div>
                ))}
              </div>

              {/* Extras: balón y chalecos — 3 escenarios por cada uno */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Balón */}
                {cancha.balon_disponible ? (
                  <div
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      cancha.balon_precio != null
                        ? "border-primary/20 bg-primary/5"
                        : "border-green-500/20 bg-green-500/5"
                    }`}
                  >
                    <span className="text-2xl">⚽</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Balón disponible
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cancha.balon_precio != null
                          ? `S/ ${cancha.balon_precio} por reserva`
                          : "Incluido gratis"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 opacity-60">
                    <span className="text-2xl grayscale">⚽</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Sin balón
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Debes traer el tuyo
                      </p>
                    </div>
                  </div>
                )}

                {/* Chalecos */}
                {cancha.chalecos_disponible ? (
                  <div
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      cancha.chalecos_precio != null
                        ? "border-primary/20 bg-primary/5"
                        : "border-green-500/20 bg-green-500/5"
                    }`}
                  >
                    <span className="text-2xl">🎽</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Chalecos disponibles
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cancha.chalecos_precio != null
                          ? `S/ ${cancha.chalecos_precio} por reserva`
                          : "Incluidos gratis"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 opacity-60">
                    <span className="text-2xl grayscale">🎽</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Sin chalecos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Debes traer los tuyos
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Horarios - Ahora antes del mapa en desktop */}
            <div className="hidden lg:block">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                Selecciona fecha y hora
              </h2>
              <Card className="border-border p-4">
                <TimeSlotPicker
                  schedule={schedule}
                  selectedDate={selectedDate}
                  selectedSlots={selectedSlots}
                  onDateChange={(date) => {
                    setSelectedDate(date);
                    setSelectedSlots([]);
                  }}
                  onSlotsChange={setSelectedSlots}
                />
              </Card>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                Ubicación
              </h2>
              <Card className="overflow-hidden border-border">
                <MapView
                  lat={cancha.lat}
                  lng={cancha.lng}
                  nombre={cancha.nombre}
                />
                <div className="p-4">
                  <div className="mb-3 flex items-start gap-2">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-foreground">{cancha.direccion}</span>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="mr-2 h-4 w-4" />
                      Abrir en Google Maps
                    </a>
                  </Button>
                </div>
              </Card>
            </div>

            {/* Calificaciones — al final */}
            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                Calificaciones
              </h2>
              <CalificarCancha canchaId={cancha.id} />
            </div>
          </div>

          {/* Sidebar desktop */}
          <div className="hidden lg:block">
            <Card className="sticky top-20 border-border p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-bold text-foreground">
                    S/ {cancha.precio_por_hora}
                  </span>
                  <span className="text-muted-foreground"> /hora</span>
                </div>
                {cancha.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-medium text-foreground">
                      {cancha.rating}
                    </span>
                  </div>
                )}
              </div>
              <Separator className="my-4" />
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    Horario: {getOperatingHours(cancha.horariosRestringidos, cancha.horasOperacion)}
                  </span>
                </div>
                {cancha.max_jugadores && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">👥</span>
                    <span className="text-foreground">
                      Máx. {cancha.max_jugadores} jugadores
                    </span>
                  </div>
                )}
                {cancha.telefono && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${cancha.telefono}`}
                      className="text-primary hover:underline"
                    >
                      {cancha.telefono}
                    </a>
                  </div>
                )}
              </div>
              {selectedSlots.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-secondary p-3 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Tu selección
                      {selectedSlots.length > 1
                        ? ` (${selectedSlots.length} horas)`
                        : ""}
                      :
                    </p>
                    <p className="font-semibold capitalize text-foreground">
                      {selectedDateLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSlots[0].time} -{" "}
                      {addOneHour24(
                        selectedSlots[selectedSlots.length - 1].time,
                      )}
                    </p>
                    {hayExtras ? (
                      <div className="mt-2 pt-2 border-t border-border/50 space-y-0.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            Hora
                            {selectedSlots.length > 1
                              ? `s (×${selectedSlots.length})`
                              : ""}
                          </span>
                          <span>S/ {precioBase}</span>
                        </div>
                        {extraBalon > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>⚽ Balón</span>
                            <span>+ S/ {extraBalon}</span>
                          </div>
                        )}
                        {extraChalecos > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>🎽 Chalecos</span>
                            <span>+ S/ {extraChalecos}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-primary pt-0.5">
                          <span>Total</span>
                          <span>S/ {precioConExtras}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="font-bold text-primary">
                        S/ {precioConExtras}
                      </p>
                    )}
                  </div>

                  {/* Extras desktop */}
                  {cancha.balon_disponible || cancha.chalecos_disponible ? (
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        ¿Necesitas extras?
                      </p>
                      {cancha.balon_disponible && (
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span>⚽</span>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                Balón
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {cancha.balon_precio != null
                                  ? `+ S/ ${cancha.balon_precio}`
                                  : "Gratis"}
                              </p>
                            </div>
                          </div>
                          <Checkbox
                            checked={quiereBalon}
                            onCheckedChange={(v) =>
                              setQuiereBalon(v as boolean)
                            }
                          />
                        </label>
                      )}
                      {cancha.chalecos_disponible && (
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span>🎽</span>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                Chalecos
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {cancha.chalecos_precio != null
                                  ? `+ S/ ${cancha.chalecos_precio}`
                                  : "Gratis"}
                              </p>
                            </div>
                          </div>
                          <Checkbox
                            checked={quiereChalecos}
                            onCheckedChange={(v) =>
                              setQuiereChalecos(v as boolean)
                            }
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5 flex items-start gap-2">
                      <span className="text-base leading-none mt-0.5">⚠️</span>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                        Esta cancha{" "}
                        <span className="font-bold">
                          no ofrece balón ni chalecos
                        </span>
                        . Recuerda traer los tuyos.
                      </p>
                    </div>
                  )}

                  <StepButton
                    className="w-full"
                    size="lg"
                    isLoading={reservando}
                    steps={[
                      "Verificando disponibilidad",
                      "Redirigiendo al pago",
                    ]}
                    currentStep={reservaStep - 1}
                    onClick={handleReservar}
                  >
                    Reservar ahora
                  </StepButton>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
                  <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Elige tu horario
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Selecciona una fecha y hora disponible en el panel de la
                    izquierda para continuar
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile barra fija */}
      <div className="lg:hidden">
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-4 py-3 shadow-xl">
          <div className="container mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {/* Fila 1: fecha — invisible si no hay selección para mantener altura */}
              <p className={cn("text-xs text-muted-foreground capitalize leading-tight", selectedSlots.length === 0 && "invisible")}>
                {selectedSlots.length > 0 ? selectedDateLabel : "·"}
              </p>
              {/* Fila 2: rango horario */}
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                {selectedSlots.length > 0
                  ? `${selectedSlots[0].time} – ${addOneHour24(selectedSlots[selectedSlots.length - 1].time)}${selectedSlots.length > 1 ? ` · ${selectedSlots.length}h` : ""}`
                  : "Selecciona un horario"}
              </p>
              {/* Fila 3: precio */}
              <p className="text-xl font-bold text-foreground leading-tight mt-0.5">
                {selectedSlots.length > 0 ? (
                  <>
                    S/ {precioConExtras}
                    {hayExtras && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        c/extras
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    S/ {cancha.precio_por_hora}
                    <span className="text-sm font-normal text-muted-foreground">
                      /hora
                    </span>
                  </>
                )}
              </p>
            </div>
            <StepButton
              size="lg"
              className={cn(
                "gap-2 px-6 shrink-0 w-43.75 h-14 justify-center",
                buttonPulse && "animate-border-pulse",
              )}
              isLoading={reservando}
              stackedLoading
              steps={["Verificando disponibilidad", "Redirigiendo al pago"]}
              currentStep={reservaStep - 1}
              onClick={() => {
                if (selectedSlots.length === 0) {
                  slotPickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                } else {
                  handleReservar();
                }
              }}
            >
              <CalendarDays className="h-5 w-5" />
              {selectedSlots.length > 0 ? "Reservar" : "Seleccionar hora"}
            </StepButton>
          </div>
        </div>
      </div>
    </div>
  );
}
