"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Search,
  Calendar,
  CheckCircle,
  ArrowRight,
  Zap,
  Phone,
  CreditCard,
  ShieldCheck,
  Clock,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { Header } from "@/components/header";
import { CanchaCard } from "@/components/cancha-card";
import { SportType } from "@/lib/types";
import { getLocalDateString } from "@/lib/date-utils";

type Cancha = {
  id: string;
  nombre: string;
  tipo: SportType;
  direccion: string;
  distrito: string;
  descripcion: string;
  imagenes: string[];
  rating: number;
  total_resenas: number;
  precio_por_hora: number;
  amenidades: string[];
  lat: number;
  lng: number;
  telefono: string;
  destacada: boolean;
  activa: boolean;
  superficie?: string | null;
  max_jugadores?: number | null;
  balon_disponible?: boolean;
  balon_precio?: number | null;
  chalecos_disponible?: boolean;
  chalecos_precio?: number | null;
  horariosOcupados?: Record<string, "reservado" | "en_proceso">;
  horariosRestringidos?: string[];
};

const HORAS = [
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

const UBICACIONES_POR_CIUDAD: Record<string, string[]> = {
  Piura: [
    "Piura",
    "Castilla",
    "Catacaos",
    "La Unión",
    "Las Lomas",
    "Tambogrande",
    "Sullana",
    "Paita",
    "Talara",
    "Chulucanas",
  ],
  // Próximamente: Lima, Trujillo, Chiclayo, Arequipa...
};

const HERO_SLIDES = [
  {
    image: "/images/cancha-login.png",
    eyebrow: "Reserva en segundos",
    title: "Tu pichanchaga",
    highlight: "empieza aquí",
  },
  {
    image: "/images/hero-basquet.jpg",
    eyebrow: "Sin llamadas, sin esperas",
    title: "Encuentra la cancha",
    highlight: "perfecta para ti",
  },
  {
    image: "/images/hero-voley.jpg",
    eyebrow: "Más de 10 canchas disponibles",
    title: "Elige tu horario",
    highlight: "y juega hoy",
  },
];

function adaptCancha(c: Cancha) {
  // Construir schedule para los próximos 14 días usando horarios reales
  const schedule: Record<
    string,
    Array<{
      id: string;
      time: string;
      available: boolean;
      price: number;
      status: "disponible" | "reservado" | "en_proceso";
    }>
  > = {};
  const horariosOcupados = c.horariosOcupados || {};
  const horariosRestringidos = c.horariosRestringidos || [];

  const ahora = new Date();
  const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();
  const hoyStr = getLocalDateString(ahora);

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = getLocalDateString(d);
    const esHoy = dateStr === hoyStr;

    schedule[dateStr] = HORAS.filter(
      (hora) => !horariosRestringidos.includes(hora),
    ).map((hora) => {
      const key = `${dateStr}|${hora}`;
      const estadoOcupado = horariosOcupados[key];
      const esPasada =
        esHoy &&
        (() => {
          const [h] = hora.split(":").map(Number);
          return h * 60 <= horaActualMinutos;
        })();

      return {
        id: `${dateStr}-${hora}`,
        time: hora,
        available: !estadoOcupado && !esPasada,
        price: c.precio_por_hora,
        status: esPasada ? "en_proceso" : estadoOcupado || "disponible",
      };
    });
  }

  return {
    id: c.id,
    name: c.nombre,
    type: c.tipo,
    address: c.direccion,
    district: c.distrito,
    description: c.descripcion,
    images: c.imagenes ?? [],
    rating: c.rating,
    reviewCount: c.total_resenas,
    pricePerHour: c.precio_por_hora,
    amenities: c.amenidades ?? [],
    coordinates: { lat: c.lat, lng: c.lng },
    phone: c.telefono,
    featured: c.destacada,
    schedule,
    superficie: (c.superficie ?? null) as any,
    maxJugadores: c.max_jugadores ?? null,
    balonDisponible: c.balon_disponible ?? false,
    balonPrecio: c.balon_precio ?? null,
    chalecoDisponible: c.chalecos_disponible ?? false,
    chalecosPrecio: c.chalecos_precio ?? null,
  };
}

export default function HomePage() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [ubicacion, setUbicacion] = useState("Mi ubicación");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  // Cache de todas las canchas para evitar re-fetch al calcular horarios disponibles
  const allCanchasRef = useRef<Cancha[]>([]);

  // Estados para el buscador avanzado
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [slideIndex, setSlideIndex] = useState(0);

  const locationRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const timeButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-avance del slider
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // Solicitar permiso de ubicación al cargar la página
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`,
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.state ||
            "Ubicación actual";
          setUbicacion(city);
        } catch {
          setUbicacion("Ubicación actual");
        }
      },
      () => {}, // si niega, no hacemos nada
    );
  }, []);

  useEffect(() => {
    // Fecha de hoy formateada
    const hoy = new Date();
    const opciones: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
    };
    setFecha(`Hoy, ${hoy.toLocaleDateString("es-PE", opciones)}`);

    // Calcular la hora siguiente (redondear hacia arriba)
    const horaActual = hoy.getHours();
    const horaSiguiente = horaActual + 1;

    // Formatear en formato 24 horas (HH:00)
    const horaSiguienteFormateada = `${String(horaSiguiente).padStart(2, "0")}:00`;

    // Establecer la hora siguiente como predeterminada
    setSelectedTime(horaSiguienteFormateada);
    setHora(horaSiguienteFormateada);

    fetch("/api/canchas/list")
      .then((r) => r.json())
      .then((data) => {
        const todas = Array.isArray(data) ? data : [];
        allCanchasRef.current = todas; // guardar en cache para reutilizar
        setCanchas(todas);
        setLoading(false);
        // Calcular horarios disponibles con los datos ya cargados (sin segundo fetch)
        computeAvailableHours(new Date(), todas);
      })
      .catch(() => setLoading(false));

    // Una sola llamada a favoritos para toda la página
    import("@/lib/api").then(({ apiGetFavoritos, getToken }) => {
      const token = getToken();
      if (token) {
        apiGetFavoritos()
          .then((ids: string[]) => {
            if (Array.isArray(ids)) setFavIds(new Set(ids));
          })
          .catch(() => {});
      }
    });
  }, []);

  // Cerrar modales al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      // Solo cerrar si se hace click en el overlay (no en el contenido del modal)
      if (
        showLocationModal &&
        locationRef.current &&
        !locationRef.current.contains(target)
      ) {
        const isOverlay = (event.target as HTMLElement).classList.contains(
          "fixed",
        );
        if (isOverlay) {
          setShowLocationModal(false);
        }
      }
      if (
        showDatePicker &&
        dateRef.current &&
        !dateRef.current.contains(target)
      ) {
        const isOverlay = (event.target as HTMLElement).classList.contains(
          "fixed",
        );
        if (isOverlay) {
          setShowDatePicker(false);
        }
      }
      if (
        showTimePicker &&
        timeRef.current &&
        !timeRef.current.contains(target)
      ) {
        const isOverlay = (event.target as HTMLElement).classList.contains(
          "fixed",
        );
        if (isOverlay) {
          setShowTimePicker(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLocationModal, showDatePicker, showTimePicker]);

  // Recalcular horarios disponibles cuando cambia la fecha (sin fetch extra)
  useEffect(() => {
    if (selectedDate && allCanchasRef.current.length > 0) {
      computeAvailableHours(selectedDate, allCanchasRef.current);
    }
  }, [selectedDate]);

  // Calcula horarios disponibles a partir de los datos ya cargados — sin llamar a la BD
  const computeAvailableHours = (date: Date, todasCanchas: Cancha[]) => {
    setLoadingHours(true);
    try {
      const dateStr = getLocalDateString(date);
      const hoursSet = new Set<string>();

      todasCanchas.forEach((cancha) => {
        const horariosOcupados = cancha.horariosOcupados || {};
        const horariosRestringidos = cancha.horariosRestringidos || [];

        HORAS.forEach((hora) => {
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
      console.error("Error computing available hours:", error);
      setAvailableHours([]);
    } finally {
      setLoadingHours(false);
    }
  };

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización");
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Guardar coordenadas para mostrar canchas cercanas
        setUserCoords({ lat: latitude, lng: longitude });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`,
          );
          const data = await response.json();

          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.state ||
            "Ubicación actual";
          setUbicacion(city);
          setShowLocationModal(false);
        } catch (error) {
          console.error("Error getting location name:", error);
          setUbicacion("Ubicación actual");
          setShowLocationModal(false);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        alert(
          "No se pudo obtener tu ubicación. Por favor, verifica los permisos.",
        );
        setLoadingLocation(false);
      },
    );
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const opciones: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDay = new Date(date);
    selectedDay.setHours(0, 0, 0, 0);

    if (selectedDay.getTime() === today.getTime()) {
      setFecha(`Hoy, ${date.toLocaleDateString("es-PE", opciones)}`);
    } else {
      setFecha(date.toLocaleDateString("es-PE", opciones));
    }
    setShowDatePicker(false);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setHora(time);
    setShowTimePicker(false);
  };

  const handlePrevMonth = () => {
    const today = new Date();
    setCalendarMonth((prev) => {
      const d = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      return d >= new Date(today.getFullYear(), today.getMonth(), 1) ? d : prev;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const handleBuscar = () => {
    // Construir query params para la búsqueda
    const params = new URLSearchParams();

    // Agregar fecha seleccionada
    if (selectedDate) {
      const dateStr = getLocalDateString(selectedDate);
      params.set("fecha", dateStr);
    }

    // Agregar hora seleccionada
    if (selectedTime) {
      params.set("hora", selectedTime);
    }

    // Agregar ubicación si no es la predeterminada
    if (ubicacion !== "Mi ubicación") {
      params.set("ubicacion", ubicacion);
    }

    router.push(`/canchas?${params.toString()}`);
  };

  // Generar calendario para el mes mostrado (puede diferir del mes seleccionado)
  const generateCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
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
      <section className="relative min-h-[calc(100dvh-4rem)] flex items-center">
        {/* Imágenes apiladas con crossfade */}
        <div className="absolute inset-0">
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={slide.image + i}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{ opacity: i === slideIndex ? 1 : 0 }}
            >
              <Image
                src={slide.image}
                alt="Cancha deportiva"
                fill
                className="object-cover object-center"
                priority={i === 0}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div key={slideIndex} className="max-w-4xl">
            <h3 className="text-[#4ade80] hero-enter">
              {HERO_SLIDES[slideIndex].eyebrow}
            </h3>
            <h1 className="hero-enter-d1 text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-3 tracking-tight">
              {HERO_SLIDES[slideIndex].title}
              <br />
              <span className="text-[#4ade80]">
                {HERO_SLIDES[slideIndex].highlight}
              </span>
            </h1>

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
                  className="flex items-center justify-between gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors rounded-md sm:rounded-none sm:rounded-l-md border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0 group-hover:text-[#16a34a] transition-colors" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                        Ubicación
                      </p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-foreground group-hover:text-[#16a34a] transition-colors truncate">
                        {ubicacion}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`h-4 w-4 text-gray-400 shrink-0 group-hover:text-[#16a34a] transition-all ${showLocationModal ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Modal de ubicación */}
                {showLocationModal && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                      onClick={() => setShowLocationModal(false)}
                    />
                    <div
                      ref={locationRef}
                      className="fixed z-50 bg-white dark:bg-card rounded-lg shadow-2xl border border-gray-200 dark:border-border p-4"
                      style={{
                        top: "calc(50dvh + 32px)",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "min(340px, 90vw)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">
                          Seleccionar ubicación
                        </h3>
                        <button
                          onClick={() => setShowLocationModal(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {!userCoords && (
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
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-border max-h-64 overflow-y-auto">
                        {Object.entries(UBICACIONES_POR_CIUDAD).map(
                          ([ciudad, distritos]) => (
                            <div key={ciudad} className="mb-2">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 px-1">
                                {ciudad}
                              </p>
                              <div className="space-y-0.5">
                                {distritos.map((distrito) => (
                                  <button
                                    key={distrito}
                                    onClick={() => {
                                      setUbicacion(distrito);
                                      setShowLocationModal(false);
                                    }}
                                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors text-left ${
                                      ubicacion === distrito
                                        ? "bg-[#16a34a]/10 text-[#16a34a] font-medium"
                                        : "text-gray-700 dark:text-foreground hover:bg-gray-50 dark:hover:bg-muted"
                                    }`}
                                  >
                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                    {distrito}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ),
                        )}
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
                    if (!showDatePicker)
                      setCalendarMonth(new Date(selectedDate));
                    setShowDatePicker(!showDatePicker);
                    setShowLocationModal(false);
                    setShowTimePicker(false);
                  }}
                  className="flex items-center justify-between gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400 shrink-0 group-hover:text-[#16a34a] transition-colors" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                        Fecha
                      </p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-foreground group-hover:text-[#16a34a] transition-colors">
                        {fecha}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`h-4 w-4 text-gray-400 shrink-0 group-hover:text-[#16a34a] transition-all ${showDatePicker ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Calendario */}
                {showDatePicker && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                      onClick={() => setShowDatePicker(false)}
                    />
                    <div
                      ref={dateRef}
                      className="fixed z-50 bg-white dark:bg-card rounded-lg shadow-2xl border border-gray-200 dark:border-border p-4"
                      style={{
                        top: "calc(50dvh + 32px)",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "min(320px, 90vw)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={handlePrevMonth}
                          disabled={
                            calendarMonth.getFullYear() ===
                              new Date().getFullYear() &&
                            calendarMonth.getMonth() <= new Date().getMonth()
                          }
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-foreground" />
                        </button>
                        <h3 className="font-semibold text-sm capitalize">
                          {calendarMonth.toLocaleDateString("es-PE", {
                            month: "long",
                            year: "numeric",
                          })}
                        </h3>
                        <button
                          onClick={handleNextMonth}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-muted transition-colors"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600 dark:text-foreground" />
                        </button>
                      </div>

                      {/* Días de la semana */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["D", "L", "M", "M", "J", "V", "S"].map((day, i) => (
                          <div
                            key={i}
                            className="text-center text-xs font-medium text-gray-500 py-1"
                          >
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
                          const isSelected =
                            dayDate.getTime() ===
                            new Date(selectedDate).setHours(0, 0, 0, 0);
                          const isPast = dayDate < today;

                          return (
                            <button
                              key={index}
                              onClick={() => !isPast && handleDateSelect(day)}
                              disabled={isPast}
                              className={`
                                aspect-square flex items-center justify-center text-sm rounded-md transition-colors
                                ${isPast ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-muted"}
                                ${isSelected ? "bg-[#16a34a] text-white hover:bg-[#15803d]" : ""}
                                ${isToday && !isSelected ? "border-2 border-[#16a34a] text-[#16a34a] font-semibold" : ""}
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
                  className="flex items-center justify-between gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-border cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-400 shrink-0 group-hover:text-[#16a34a] transition-colors" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                        Hora
                      </p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-foreground group-hover:text-[#16a34a] transition-colors">
                        {hora}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`h-4 w-4 text-gray-400 shrink-0 group-hover:text-[#16a34a] transition-all ${showTimePicker ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Selector de hora */}
                {showTimePicker && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                      onClick={() => setShowTimePicker(false)}
                    />
                    <div
                      ref={timeRef}
                      className="fixed z-50 bg-white dark:bg-card rounded-lg shadow-2xl border border-gray-200 dark:border-border p-4 max-h-[80dvh] overflow-y-auto"
                      style={{
                        top: "calc(50dvh + 32px)",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "min(340px, 90vw)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">
                          Horarios disponibles
                        </h3>
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
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {HORAS.map((time) => {
                            const ahora = new Date();
                            const esHoy = selectedDate
                              ? getLocalDateString(selectedDate) ===
                                getLocalDateString(ahora)
                              : true;
                            const [h] = time.split(":").map(Number);
                            const esPasada =
                              esHoy &&
                              h * 60 <=
                                ahora.getHours() * 60 + ahora.getMinutes();
                            const estaDisponible =
                              availableHours.includes(time);
                            const deshabilitada = esPasada || !estaDisponible;

                            return (
                              <button
                                key={time}
                                onClick={() =>
                                  !deshabilitada && handleTimeSelect(time)
                                }
                                disabled={deshabilitada}
                                className={`
                                  px-3 py-2 text-sm rounded-md transition-colors
                                  ${
                                    selectedTime === time
                                      ? "bg-[#16a34a] text-white"
                                      : esPasada
                                        ? "bg-gray-100 dark:bg-muted text-gray-300 dark:text-gray-600 cursor-not-allowed line-through"
                                        : !estaDisponible
                                          ? "bg-gray-100 dark:bg-muted text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                          : "bg-gray-50 dark:bg-muted hover:bg-gray-100 dark:hover:bg-muted/80"
                                  }
                                `}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {availableHours.length === 0 && (
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
                className="flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] active:scale-95 text-white font-bold sm:font-semibold py-4 sm:py-3 px-5 rounded-xl sm:rounded-md transition-all text-base sm:text-sm whitespace-nowrap w-full sm:w-auto mt-1 sm:mt-0"
              >
                <Search className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="sm:hidden">Buscar canchas</span>
              </button>
            </div>

            {/* Badges de confianza */}
            <div className="hero-enter-d2 mt-5 flex flex-wrap gap-4">
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

      {/* ── CANCHAS MEJOR CALIFICADAS / CERCA DE TI ──────────────── */}
      <section className="py-12 bg-white dark:bg-background">
        <div className="container mx-auto px-4">
          {/* Sección 1: Canchas mejor calificadas (siempre visible) */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-foreground">
              {userCoords
                ? "Canchas mejor calificadas"
                : "Canchas mejor calificadas"}
            </h2>
            <Link
              href="/canchas"
              className="text-[#16a34a] text-sm font-medium hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden border border-border animate-pulse"
                >
                  <div className="aspect-[2/1] bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded-full w-3/4" />
                    <div className="h-3 bg-muted rounded-full w-1/3" />
                    <div className="h-3 bg-muted rounded-full w-1/2" />
                    <div className="flex gap-1.5 pt-1">
                      {[1, 2, 3, 4].map((j) => (
                        <div
                          key={j}
                          className="h-9 flex-1 bg-muted rounded-lg"
                        />
                      ))}
                    </div>
                    <div className="h-10 bg-muted rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : canchas.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...canchas]
                .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                .slice(0, 4)
                .map((c) => (
                  <CanchaCard
                    key={c.id}
                    cancha={adaptCancha(c)}
                    selectedDate={getLocalDateString()}
                    isFav={favIds.has(c.id)}
                    onToggleFav={(id) =>
                      setFavIds((prev) => {
                        const n = new Set(prev);
                        n.has(id) ? n.delete(id) : n.add(id);
                        return n;
                      })
                    }
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay canchas disponibles por el momento.</p>
              <Link
                href="/canchas"
                className="mt-3 inline-block text-primary font-medium hover:underline"
              >
                Ver todas las canchas
              </Link>
            </div>
          )}

          {/* Sección 2: Canchas cerca de ti (solo si el usuario dio permiso de ubicación) */}
          {userCoords &&
            canchas.length > 0 &&
            (() => {
              // Calcular distancia y ordenar por cercanía
              const conDistancia = canchas
                .filter((c) => c.lat && c.lng)
                .map((c) => {
                  const dLat = c.lat - userCoords.lat;
                  const dLng = c.lng - userCoords.lng;
                  const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
                  return { ...c, distKm };
                })
                .sort((a, b) => a.distKm - b.distKm)
                .slice(0, 4);

              if (conDistancia.length === 0) return null;

              return (
                <div className="mt-12">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-foreground">
                        Canchas cerca de ti
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Basado en tu ubicación actual
                      </p>
                    </div>
                    <Link
                      href={`/canchas?ubicacion=${encodeURIComponent(ubicacion)}`}
                      className="text-[#16a34a] text-sm font-medium hover:underline flex items-center gap-1"
                    >
                      Ver todas <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {conDistancia.map((c) => (
                      <CanchaCard
                        key={c.id}
                        cancha={adaptCancha(c)}
                        selectedDate={getLocalDateString()}
                        distancia={c.distKm}
                        isFav={favIds.has(c.id)}
                        onToggleFav={(id) =>
                          setFavIds((prev) => {
                            const n = new Set(prev);
                            n.has(id) ? n.delete(id) : n.add(id);
                            return n;
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ─────────────────────────────────────────── */}
      <section className="py-14 bg-gray-50 dark:bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">
              ¿Cómo funciona?
            </h2>
            <p className="text-sm text-gray-500 dark:text-muted-foreground mt-2">
              Reserva tu cancha en menos de 2 minutos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              {
                num: "1",
                icon: Search,
                title: "Busca en tu zona",
                desc: "Filtra por deporte, fecha y hora. Ve disponibilidad en tiempo real, sin llamar a nadie.",
                tag: "Fútbol, vóley, básquet y más",
                highlight: false,
              },
              {
                num: "2",
                icon: Calendar,
                title: "Elige tu horario",
                desc: "Selecciona el día y la hora exacta. Los slots disponibles se actualizan al instante.",
                tag: "Sin dobles reservas",
                highlight: false,
              },
              {
                num: "3",
                icon: CreditCard,
                title: "Paga con Yape o Plin",
                desc: "Confirma con un adelanto desde la app. Recibes tu reserva al momento, sin llamadas.",
                tag: "También transferencia bancaria",
                highlight: true,
              },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div
                  className={`h-full rounded-2xl p-6 border ${item.highlight ? "bg-[#16a34a] border-[#16a34a]" : "bg-white dark:bg-card border-gray-100 dark:border-border shadow-sm"}`}
                >
                  {/* Número */}
                  <div
                    className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold mb-4 ${item.highlight ? "bg-white/20 text-white" : "bg-[#16a34a]/10 text-[#16a34a]"}`}
                  >
                    {item.num}
                  </div>
                  <item.icon
                    className={`h-6 w-6 mb-3 ${item.highlight ? "text-white" : "text-[#16a34a]"}`}
                  />
                  <h3
                    className={`font-bold text-base mb-2 ${item.highlight ? "text-white" : "text-gray-900 dark:text-foreground"}`}
                  >
                    {item.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed mb-4 ${item.highlight ? "text-white/80" : "text-gray-500 dark:text-muted-foreground"}`}
                  >
                    {item.desc}
                  </p>
                  <span
                    className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${item.highlight ? "bg-white/20 text-white" : "bg-[#16a34a]/10 text-[#16a34a]"}`}
                  >
                    {item.tag}
                  </span>
                </div>
                {/* Flecha entre cards — solo desktop */}
                {idx < 2 && (
                  <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-card border border-gray-100 dark:border-border shadow-sm">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFICIOS ────────────────────────────────────────────── */}
      <section
        className="py-8 dark:bg-muted/10"
        style={{ backgroundColor: "#eef2ee" }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 max-w-lg mx-auto lg:max-w-6xl lg:grid lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Reservas en tiempo real",
                desc: "Consulta disponibilidad actualizada al segundo. Sin esperas.",
              },
              {
                icon: Phone,
                title: "Sin llamadas",
                desc: "Olvida marcar y esperar que alguien conteste. Todo es digital.",
              },
              {
                icon: CreditCard,
                title: "Pagos fáciles",
                desc: "Paga con tarjeta, transferencia o saldo en la app de forma segura.",
              },
              {
                icon: ShieldCheck,
                title: "Canchas verificadas",
                desc: "Trabajamos solo con centros deportivos de alta calidad y confianza.",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="bg-white dark:bg-card rounded-2xl p-6 dark:border-border"
                style={{ border: "1.5px solid #d4e6d4" }}
              >
                <b.icon
                  className="h-8 w-8 text-[#16a34a] mb-4"
                  strokeWidth={1.75}
                />
                <h3 className="font-bold text-gray-900 dark:text-foreground text-lg mb-1.5">
                  {b.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-muted-foreground leading-relaxed">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ¿TIENES UNA CANCHA? ───────────────────────────────────── */}
      <section className="py-14 bg-gray-50 dark:bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden bg-white dark:bg-card border border-gray-100 dark:border-border shadow-sm flex flex-col md:flex-row">
            {/* Texto */}
            <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 bg-[#16a34a]/10 text-[#16a34a] text-xs font-semibold px-3 py-1 rounded-full w-fit mb-4">
                <MessageCircle className="h-3.5 w-3.5" />
                Atención personalizada · Cupos disponibles
              </span>

              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-foreground mb-2 leading-tight">
                Llena tus horas vacías{" "}
                <span className="text-[#16a34a]">
                  y cobra sin complicaciones
                </span>
              </h2>
              <p className="text-gray-500 dark:text-muted-foreground mb-6 text-sm leading-relaxed">
                Escríbenos por WhatsApp y te explicamos cómo funciona. Nos
                encargamos de configurar tu cancha desde cero.
              </p>

              <ul className="space-y-3 mb-7">
                {[
                  "Olvida coordinar por WhatsApp: las reservas llegan solas",
                  "Cobros registrados y sin efectivo perdido",
                  "Tus horarios disponibles visibles las 24 horas",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-foreground"
                  >
                    <CheckCircle className="h-4 w-4 text-[#16a34a] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <a
                  href="https://wa.me/51959686193?text=Hola%2C%20me%20interesa%20publicar%20mi%20cancha%20en%20CanchaGo.%20%C2%BFMe%20pueden%20dar%20m%C3%A1s%20informaci%C3%B3n%3F"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] text-white font-bold px-6 py-3.5 rounded-xl transition-all text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  Quiero publicar mi cancha
                </a>
                <p className="text-xs text-gray-400">
                  Sin compromiso · Te respondemos rápido
                </p>
              </div>
            </div>

            {/* Imagen + mockup */}
            <div className="relative flex-1 min-h-70 md:min-h-0 overflow-hidden">
              <Image
                src="/images/cancha-login.png"
                alt="Panel de administración"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/35" />

              {/* Mockup de estadísticas */}
              <div className="absolute bottom-4 right-4 bg-white dark:bg-card rounded-xl shadow-2xl p-4 w-48">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Esta semana
                </p>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-muted-foreground">
                      Reservas
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-foreground">
                      12
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-muted-foreground">
                      Horas ocupadas
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-foreground">
                      24 hrs
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-muted-foreground">
                      Por WhatsApp
                    </span>
                    <span className="text-xs font-bold text-gray-400 line-through">
                      0
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-border pt-2.5">
                  <p className="text-[10px] text-gray-400">Ganancias</p>
                  <p className="text-lg font-bold text-[#16a34a]">S/ 1,250</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────── */}
      <section className="py-16 bg-gray-900 dark:bg-gray-950 relative overflow-hidden">
        {/* Decoración */}
        <div className="absolute right-0 top-0 h-full flex items-center pr-6 opacity-[0.07] pointer-events-none select-none">
          <span className="text-[220px] leading-none">⚽</span>
        </div>
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#16a34a]/20 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl">
            {/* Badges de confianza */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                "Reserva en 60 segundos",
                "Sin llamadas",
                "Paga con Yape o Plin",
              ].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full"
                >
                  <CheckCircle className="h-3 w-3 text-[#4ade80]" />
                  {tag}
                </span>
              ))}
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
              Tu partido empieza
              <br />
              <span className="text-[#4ade80]">cuando tú decides</span>
            </h2>
            <p className="text-gray-400 mb-8 text-base leading-relaxed max-w-md">
              Encuentra cancha, elige horario y reserva en minutos. Sin
              llamadas, sin esperas.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link href="/canchas">
                <button className="inline-flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] text-white font-bold px-7 py-4 rounded-xl transition-all text-base shadow-lg shadow-[#16a34a]/30">
                  Buscar cancha ahora
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <p className="text-sm text-gray-500">
                Gratis · Sin registro previo
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
