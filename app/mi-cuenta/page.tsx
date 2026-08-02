"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  CalendarPlus,
  Heart,
  Star,
  Stamp,
  Gift,
  LogIn,
  CheckCircle2,
  XCircle,
  Phone,
  Home,
  Users,
  LogOut,
  Search,
  ChevronRight,
  Navigation,
  User,
  Mail,
  Save,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/header";
import CancelarReservaSimple from "@/components/cancelar-reserva-simple";
import { apiCancelarReserva } from "@/lib/api-cancelacion";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/loading-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { canchas } from "@/lib/data";
import { sportLabels } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getUser, logout, type LoyaltyData } from "@/lib/auth";
import { type Reserva } from "@/lib/store";
import {
  apiGetReservas,
  apiGetHistorial,
  apiGetFavoritos,
  apiToggleFavorito,
  apiGetLoyalty,
  apiGetMisPartidos,
  apiGetMisPartidosHistorial,
  getToken,
  getStoredUser,
  signalUnauthorized,
} from "@/lib/api";

// ── Helpers ────────────────────────────────────────────────────────
function generarLinkWhatsApp(
  canchaNombre: string,
  fecha: string,
  hora: string,
  precio: number,
  address?: string,
  lat?: number,
  lng?: number,
): string {
  const fechaLabel = new Date(fecha + "T00:00:00").toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const ubicacionLine =
    lat && lng
      ? `📌 Cómo llegar: https://maps.google.com/?q=${lat},${lng}`
      : address
        ? `📌 Cómo llegar: https://maps.google.com/?q=${encodeURIComponent(address)}`
        : null;
  const mensaje = [
    `⚽ *¡Reserva confirmada!*`,
    ``,
    `📍 *${canchaNombre}*`,
    ...(address ? [`🗺 ${address}`] : []),
    ...(ubicacionLine ? [ubicacionLine] : []),
    ``,
    `📅 ${fechaLabel}`,
    `🕐 ${hora}`,
    `💰 S/ ${precio}`,
    ``,
    `¡Están convocados! Confirmen asistencia 🙋‍♂️`,
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString + "T00:00:00").toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const estadoLabel: Record<Reserva["estado"], string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

const estadoClass: Record<Reserva["estado"], string> = {
  pendiente: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  confirmada: "bg-primary/10 text-primary border-primary/20",
  rechazada: "bg-destructive/10 text-destructive border-destructive/20",
  cancelada: "bg-muted text-muted-foreground",
};

// ── Tarjeta de reserva (mobile) ────────────────────────────────────
function ReservaCard({
  r,
  onDetalle,
  onCancelar,
}: {
  r: Reserva;
  onDetalle: (r: Reserva) => void;
  onCancelar: (r: Reserva) => void;
}) {
  const canchaLocal = canchas.find((c) => c.id === r.canchaId);
  const imagen =
    canchaLocal?.images[0] ??
    "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop";
  const direccion = canchaLocal?.address ?? null;

  const fechaHoraPasada = (() => {
    const [year, month, day] = r.fecha.split("-").map(Number);
    const horaInicio = r.hora.includes(" - ") ? r.hora.split(" - ")[0] : r.hora;
    const [horaNum, minNum] = horaInicio.split(":").map(Number);
    return new Date(year, month - 1, day, horaNum, minNum, 0) < new Date();
  })();

  return (
    <Card className="overflow-hidden border-border">
      <div className="flex flex-col sm:flex-row">
        <Link
          href={`/cancha/${r.canchaId}`}
          className="relative aspect-video w-full sm:aspect-square sm:w-40 shrink-0 overflow-hidden group"
        >
          <Image
            src={imagen}
            alt={r.canchaName}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </Link>
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={estadoClass[r.estado]}>
                  {estadoLabel[r.estado]}
                </Badge>
                {fechaHoraPasada && r.estado === "confirmada" && (
                  <Badge
                    variant="outline"
                    className="bg-orange-500/10 text-orange-600 border-orange-500/20"
                  >
                    Finalizada
                  </Badge>
                )}
                {r.modoPago === "parcial" &&
                  r.estado === "confirmada" &&
                  !fechaHoraPasada && (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/100/10 text-amber-700 border-amber-500/20"
                    >
                      Saldo pendiente en cancha: S/ {r.saldoPendiente}
                    </Badge>
                  )}
                {r.modoPago === "parcial" && r.estado === "pendiente" && (
                  <span className="text-xs text-amber-700 font-medium">
                    Adelanto enviado — pendiente de confirmación
                  </span>
                )}
                {(!r.modoPago || r.modoPago === "completo") &&
                  (r.estado === "confirmada" || r.estado === "pendiente") && (
                    <Badge
                      variant="outline"
                      className="bg-green-500/100/10 text-green-700 border-green-500/20"
                    >
                      Pago completo ✓
                    </Badge>
                  )}
              </div>
              <Link
                href={`/cancha/${r.canchaId}`}
                className="mt-2 block font-semibold text-foreground hover:text-primary transition-colors"
              >
                {r.canchaName}
              </Link>
              <p className="text-xs text-muted-foreground font-mono">
                #{r.id.slice(-6).toUpperCase()}
              </p>
              {canchaLocal && (
                <p className="text-sm text-muted-foreground">
                  {sportLabels[canchaLocal.type]}
                </p>
              )}
            </div>
            <p className="text-lg font-bold text-primary shrink-0">
              S/ {r.precio}
            </p>
          </div>
          <div className="mt-auto space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="capitalize">{formatDate(r.fecha)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {r.hora.includes(" - ")
                  ? r.hora
                  : `${r.hora} - ${String((parseInt(r.hora.split(":")[0]) + 1) % 24).padStart(2, "0")}:00`}
              </span>
            </div>
            {direccion && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{direccion}</span>
              </div>
            )}
          </div>
          {!fechaHoraPasada &&
            (r.estado === "pendiente" || r.estado === "confirmada") && (
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => onDetalle(r)}
                >
                  Detalles de la reservación
                </Button>
                {r.estado === "confirmada" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-auto border-green-500 text-green-600 hover:bg-green-500/10"
                    asChild
                  >
                    <a
                      href={generarLinkWhatsApp(
                        r.canchaName,
                        r.fecha,
                        r.hora,
                        r.precio,
                        canchaLocal?.address,
                        canchaLocal?.coordinates?.lat,
                        canchaLocal?.coordinates?.lng,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => onCancelar(r)}
                >
                  Cancelar reservación
                </Button>
              </div>
            )}
          {(r.estado === "rechazada" ||
            r.estado === "cancelada" ||
            (fechaHoraPasada &&
              (r.estado === "confirmada" || r.estado === "pendiente"))) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/cancha/${r.canchaId}`}>Reservar de nuevo</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyState({
  type,
}: {
  type:
    | "proximas"
    | "historial"
    | "favorites"
    | "partidos_activos"
    | "partidos_cancelados"
    | "partidos_historial";
}) {
  const cfg = {
    proximas: {
      icon: <CalendarPlus className="h-10 w-10 text-muted-foreground" />,
      title: "No tienes reservas próximas",
      desc: "Explora nuestras canchas y haz tu primera reserva",
      actionHref: "/canchas",
      actionLabel: "Explorar canchas",
      actionIcon: <CalendarPlus className="mr-2 h-4 w-4" />,
      bgColor: "bg-primary/5",
      iconBg: "bg-primary/10",
    },
    historial: {
      icon: <Clock className="h-10 w-10 text-muted-foreground" />,
      title: "No tienes reservas en historial",
      desc: "Aquí aparecerán tus reservas pasadas y canceladas",
      actionHref: null,
      actionLabel: null,
      actionIcon: null,
      bgColor: "bg-muted/30",
      iconBg: "bg-muted",
    },
    favorites: {
      icon: <Heart className="h-10 w-10 text-muted-foreground" />,
      title: "No tienes canchas favoritas",
      desc: "Toca el corazón ❤️ en cualquier cancha para guardarla aquí",
      actionHref: "/canchas",
      actionLabel: "Explorar canchas",
      actionIcon: <CalendarPlus className="mr-2 h-4 w-4" />,
      bgColor: "bg-destructive/5",
      iconBg: "bg-destructive/10",
    },
    partidos_activos: {
      icon: <Users className="h-10 w-10 text-muted-foreground" />,
      title: "No tienes partidos activos",
      desc: "Crea un partido desde la sección de partidos y organiza tu próximo juego",
      actionHref: "/partidos",
      actionLabel: "Ir a partidos",
      actionIcon: <Users className="mr-2 h-4 w-4" />,
      bgColor: "bg-primary/5",
      iconBg: "bg-primary/10",
    },
    partidos_cancelados: {
      icon: <XCircle className="h-10 w-10 text-muted-foreground" />,
      title: "No tienes partidos cancelados",
      desc: "Aquí aparecerán los partidos que hayas cancelado",
      actionHref: null,
      actionLabel: null,
      actionIcon: null,
      bgColor: "bg-muted/30",
      iconBg: "bg-muted",
    },
    partidos_historial: {
      icon: <Clock className="h-10 w-10 text-muted-foreground" />,
      title: "No tienes partidos en el historial",
      desc: "Aquí aparecerán tus partidos pasados y finalizados",
      actionHref: null,
      actionLabel: null,
      actionIcon: null,
      bgColor: "bg-muted/30",
      iconBg: "bg-muted",
    },
  }[type];
  return (
    <Card className={`${cfg.bgColor} border-dashed`}>
      <div className="py-12 text-center px-4">
        <div
          className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${cfg.iconBg}`}
        >
          {cfg.icon}
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {cfg.title}
        </h3>
        <p className="mb-6 text-sm text-muted-foreground max-w-md mx-auto">
          {cfg.desc}
        </p>
        {cfg.actionHref && (
          <Button asChild size="lg">
            <Link href={cfg.actionHref}>
              {cfg.actionIcon}
              {cfg.actionLabel}
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── Tipos ──────────────────────────────────────────────────────────
type Section =
  | "cuenta"
  | "reservas"
  | "sellos"
  | "cupones"
  | "favoritos"
  | "perfil"
  | "partidos";

interface PartidoItem {
  id: string;
  cancha_id: string;
  cancha_nombre: string;
  cancha_distrito: string;
  deporte: string;
  fecha: string;
  hora: string;
  nivel: string;
  jugadores_max: number;
  jugadores_actuales: number;
  jugadores_equipo: number;
  precio_total: number;
  precio_por_persona: number;
  estado: "abierto" | "completo" | "cancelado" | "finalizado";
  descripcion: string | null;
  reserva_id: string;
  cancha_lat: number | null;
  cancha_lng: number | null;
}

// ── Página principal ───────────────────────────────────────────────
export default function MiCuentaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <MiCuentaContent />
    </Suspense>
  );
}

function MiCuentaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [historialItems, setHistorialItems] = useState<Reserva[]>([]);
  const [historialTotal, setHistorialTotal] = useState(0);
  const [historialPage, setHistorialPage] = useState(0);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [misPartidos, setMisPartidos] = useState<PartidoItem[]>([]);
  const [partHistorialItems, setPartHistorialItems] = useState<PartidoItem[]>(
    [],
  );
  const [partHistorialTotal, setPartHistorialTotal] = useState(0);
  const [partHistorialPage, setPartHistorialPage] = useState(0);
  const [partHistorialLoading, setPartHistorialLoading] = useState(false);
  const [historialCargado, setHistorialCargado] = useState(false);
  const [partHistorialCargado, setPartHistorialCargado] = useState(false);
  const [favoriteCanchasData, setFavoriteCanchasData] = useState<any[]>([]);
  const [loadingFavs, setLoadingFavs] = useState<Set<string>>(new Set());
  const [loyalty, setLoyalty] = useState<LoyaltyData>({
    sellos: 0,
    totalReservas: 0,
    historial: [],
  });
  const [canchasLoyalty, setCanchasLoyalty] = useState<any[]>([]);
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reservaDetalle, setReservaDetalle] = useState<Reserva | null>(null);
  const [reservaCancelar, setReservaCancelar] = useState<Reserva | null>(null);
  const { toast } = useToast();
  const VALID_SECTIONS: Section[] = [
    "cuenta",
    "reservas",
    "sellos",
    "cupones",
    "favoritos",
    "perfil",
    "partidos",
  ];
  const initialSection = VALID_SECTIONS.includes(
    searchParams.get("tab") as Section,
  )
    ? (searchParams.get("tab") as Section)
    : "cuenta";
  const [activeSection, setActiveSection] = useState<Section>(initialSection);

  // ── Estado de perfil ──
  interface PerfilData {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    rol: string;
  }
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [perfilNombre, setPerfilNombre] = useState("");
  const [perfilTelefono, setPerfilTelefono] = useState("");
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilGuardando, setPerfilGuardando] = useState(false);
  const [perfilGuardado, setPerfilGuardado] = useState(false);
  const [showAllHistorial, setShowAllHistorial] = useState(false);
  const [showAllCuponesActivos, setShowAllCuponesActivos] = useState(false);
  const [showAllCuponesUsados, setShowAllCuponesUsados] = useState(false);
  const [perfilErrores, setPerfilErrores] = useState<{
    nombre?: string;
    telefono?: string;
  }>({});

  const mapReserva = (r: any): Reserva => ({
    id: r.id,
    canchaId: r.cancha_id,
    canchaName: r.cancha_nombre,
    usuarioNombre: r.usuario_nombre,
    usuarioEmail: r.usuario_email,
    usuarioPhone: r.usuario_telefono,
    fecha: r.fecha,
    hora: r.hora,
    precio: r.precio,
    metodoPago: r.metodo_pago,
    comprobante: r.comprobante_url,
    estado: r.estado,
    creadaEn: r.creado_en,
    notificado: true,
    modoPago: r.modo_pago ?? "completo",
    montoAdelanto: r.monto_adelanto,
    saldoPendiente: r.saldo_pendiente ?? 0,
    saldoCobrado: r.saldo_cobrado ?? false,
    grupoReservaId: r.grupo_reserva_id ?? null,
  });

  // Agrupa reservas multi-hora: muestra solo 1 card con rango "14:00 - 16:00"
  const agruparReservas = (lista: Reserva[]): Reserva[] => {
    const grupos = new Map<string, Reserva[]>();
    const resultado: Reserva[] = [];
    for (const r of lista) {
      if (!r.grupoReservaId) {
        resultado.push(r);
        continue;
      }
      if (!grupos.has(r.grupoReservaId)) grupos.set(r.grupoReservaId, []);
      grupos.get(r.grupoReservaId)!.push(r);
    }
    for (const [gid, slots] of grupos) {
      const principal = slots.find((s) => s.id === gid) ?? slots[0];
      const horas = slots.map((s) => s.hora).sort();
      const horaFin = `${String(parseInt(horas[horas.length - 1].split(":")[0]) + 1).padStart(2, "0")}:00`;
      resultado.push({
        ...principal,
        hora: horas.length > 1 ? `${horas[0]} - ${horaFin}` : principal.hora,
      });
    }
    return resultado;
  };

  const reload = async () => {
    const data = await apiGetReservas();
    setReservas(
      agruparReservas(Array.isArray(data) ? data.map(mapReserva) : []),
    );
    setLoading(false);
  };

  const cargarHistorial = async (page: number) => {
    setHistorialLoading(true);
    const { items, total } = await apiGetHistorial(page, 10);
    setHistorialItems((prev) => {
      const nuevos: Reserva[] = agruparReservas(items.map(mapReserva));
      if (page === 0) return nuevos;
      const ids = new Set(prev.map((r: Reserva) => r.id));
      return [...prev, ...nuevos.filter((r: Reserva) => !ids.has(r.id))];
    });
    setHistorialTotal(total);
    setHistorialPage(page);
    setHistorialLoading(false);
  };

  const cargarPartidosHistorial = async (page: number) => {
    setPartHistorialLoading(true);
    const { items, total } = await apiGetMisPartidosHistorial(page, 10);
    setPartHistorialItems((prev) => (page === 0 ? items : [...prev, ...items]));
    setPartHistorialTotal(total);
    setPartHistorialPage(page);
    setPartHistorialLoading(false);
  };

  // Redirigir a home si el evento user-login indica que se cerró sesión
  useEffect(() => {
    const handleAuthChange = () => {
      if (!getToken()) router.replace("/");
    };
    window.addEventListener("user-login", handleAuthChange);
    return () => window.removeEventListener("user-login", handleAuthChange);
  }, [router]);

  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getToken();

    if (!storedUser || !token) {
      router.replace("/");
      return;
    }

    setUser(storedUser);
    setHydrated(true);
    reload();
    if (token) {
      apiGetFavoritos().then((ids: string[]) => {
        if (ids.length > 0) {
          fetch("/api/canchas/list")
            .then((r) => r.json())
            .then((all: any[]) => {
              if (Array.isArray(all)) {
                setFavoriteCanchasData(
                  all
                    .filter((c) => ids.includes(c.id))
                    .map((c) => ({
                      id: c.id,
                      name: c.nombre,
                      images:
                        (c.imagenes ?? []).length > 0
                          ? c.imagenes
                          : [
                              "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop",
                            ],
                      rating: c.rating,
                      address: c.direccion,
                      type: c.tipo,
                      pricePerHour: c.precio_por_hora,
                    })),
                );
              }
            })
            .catch(() => {});
        }
      });
      apiGetMisPartidos().then((data) =>
        setMisPartidos(Array.isArray(data) ? data : []),
      );
      apiGetLoyalty().then((data) => {
        setCanchasLoyalty(data.canchas ?? []);
      });
    }
  }, []);

  const handleCancelar = async (reservaId: string) => {
    try {
      const resultado = await apiCancelarReserva(reservaId);
      toast({ description: resultado.mensaje });
      setReservaCancelar(null);
      setReservas((prev) => prev.filter((r) => r.id !== reservaId));
      reload();
    } catch (error: any) {
      toast({
        title: "Error al cancelar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveFavorite = async (canchaId: string) => {
    setLoadingFavs((prev) => new Set(prev).add(canchaId));
    await apiToggleFavorito(canchaId);
    setFavoriteCanchasData((prev) => prev.filter((c) => c.id !== canchaId));
    setLoadingFavs((prev) => { const s = new Set(prev); s.delete(canchaId); return s; });
  };

  // ── Scroll al top al cambiar de sección ──
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeSection]);

  // ── Carga lazy del historial de reservas y partidos ──
  useEffect(() => {
    if (activeSection === "reservas" && !historialCargado) {
      setHistorialCargado(true);
      cargarHistorial(0);
    }
    if (activeSection === "partidos" && !partHistorialCargado) {
      setPartHistorialCargado(true);
      cargarPartidosHistorial(0);
    }
  }, [activeSection]);

  // ── Carga perfil al entrar a la sección ──
  useEffect(() => {
    if (activeSection !== "perfil") return;
    const token = getToken();
    if (!token) return;
    setPerfilLoading(true);
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (r.status === 401) {
          signalUnauthorized();
          router.replace("/");
          return null;
        }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((data) => {
        if (!data) return;
        setPerfil(data);
        setPerfilNombre(data.nombre || "");
        setPerfilTelefono(data.telefono || "");
      })
      .catch(() => {})
      .finally(() => setPerfilLoading(false));
  }, [activeSection]);

  const perfilHayCambios =
    perfil &&
    (perfilNombre.trim() !== (perfil.nombre || "") ||
      perfilTelefono.trim() !== (perfil.telefono || ""));

  const validarPerfil = () => {
    const e: { nombre?: string; telefono?: string } = {};
    if (!perfilNombre.trim()) e.nombre = "El nombre es requerido";
    if (perfilTelefono && !/^9\d{8}$/.test(perfilTelefono))
      e.telefono = "Ingresa un número válido (9 dígitos)";
    setPerfilErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardarPerfil = async () => {
    if (!perfilHayCambios) {
      setPerfilErrores({ nombre: "No hay cambios para guardar" });
      return;
    }
    if (!validarPerfil()) return;
    setPerfilGuardando(true);
    try {
      const token = getToken();
      const res = await fetch("/api/auth/perfil", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          nombre: perfilNombre.trim(),
          telefono: perfilTelefono.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const storedUser = getStoredUser();
      if (storedUser) {
        localStorage.setItem(
          "cp_user",
          JSON.stringify({
            ...storedUser,
            name: perfilNombre.trim(),
            phone: perfilTelefono.trim(),
          }),
        );
        window.dispatchEvent(new Event("user-login"));
      }
      setUser((prev) =>
        prev
          ? { ...prev, name: perfilNombre.trim(), phone: perfilTelefono.trim() }
          : prev,
      );
      setPerfilGuardado(true);
      setTimeout(() => setPerfilGuardado(false), 3000);
    } catch {
      setPerfilErrores({ nombre: "Error al guardar. Intenta de nuevo." });
    } finally {
      setPerfilGuardando(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const fechaHoraPasada = (fecha: string, hora: string): boolean => {
    const [year, month, day] = fecha.split("-").map(Number);
    const horaInicio = hora.includes(" - ") ? hora.split(" - ")[0] : hora;
    const [horaNum, minNum] = horaInicio.split(":").map(Number);
    return new Date(year, month - 1, day, horaNum, minNum, 0) < new Date();
  };

  const proximas = reservas.filter(
    (r) =>
      (r.estado === "pendiente" || r.estado === "confirmada") &&
      !fechaHoraPasada(r.fecha, r.hora),
  );
  const favoriteCanchas = favoriteCanchasData;

  // Datos para el dashboard desktop
  const proximaReserva = proximas[0] ?? null;
  const hoyStr = new Date().toISOString().split("T")[0];

  const todayLabel = (() => {
    const s = new Date().toLocaleDateString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const recentesAll = [...reservas]
    .sort(
      (a, b) => new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime(),
    )
    .slice(0, 3);

  const partidoReservaIds = new Set(
    misPartidos.map((p) => p.reserva_id).filter(Boolean),
  );

  // Skeleton
  if (!hydrated || loading) {
    return (
      <div className="flex flex-col flex-1 bg-background lg:bg-muted/40">
        <Header />

        {/* Mobile skeleton */}
        <div className="lg:hidden flex-1 bg-muted/40 px-4 py-5 space-y-5">
          {/* Avatar + saludo */}
          <div className="bg-card rounded-xl p-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-5 w-36 bg-muted animate-pulse rounded-lg" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>

          {/* Próxima reserva */}
          <div className="space-y-2">
            <div className="h-4 w-36 bg-muted animate-pulse rounded" />
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>

          {/* Grid 2x2 accesos rápidos */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4">
                <div className="h-9 w-9 rounded-xl bg-muted animate-pulse mb-3" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded mb-1.5" />
                <div className="h-5 w-20 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>

          {/* CTA buscar cancha */}
          <div className="h-12 w-full rounded-xl bg-muted animate-pulse" />
        </div>

        {/* Desktop skeleton */}
        <div className="hidden lg:grid grid-cols-[2fr_6fr] flex-1 container mx-auto px-4 lg:px-12">
          {/* Sidebar */}
          <aside className="flex flex-col gap-3 p-4 pl-0 pt-6">
            <div className="bg-card rounded-xl p-4 flex flex-col items-center animate-pulse">
              <div className="h-16 w-16 rounded-full bg-muted mb-3" />
              <div className="h-4 w-28 bg-muted rounded-full mb-1.5" />
              <div className="h-3 w-20 bg-muted rounded-full mb-3" />
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-xl" />
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl p-2 animate-pulse space-y-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-10 bg-muted rounded-xl" />
              ))}
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 p-6 space-y-6 animate-pulse">
            {/* Saludo + botón */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-8 w-56 bg-muted rounded-lg" />
                <div className="h-4 w-40 bg-muted rounded-lg" />
              </div>
              <div className="h-9 w-36 bg-muted rounded-full" />
            </div>
            {/* Próxima reserva */}
            <div>
              <div className="h-5 w-36 bg-muted rounded mb-3" />
              <div className="bg-card rounded-xl overflow-hidden flex h-44">
                <div className="w-44 shrink-0 bg-muted" />
                <div className="flex-1 p-5 space-y-3">
                  <div className="h-5 w-48 bg-muted rounded" />
                  <div className="h-7 w-64 bg-muted rounded" />
                  <div className="flex gap-4">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded-full" />
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card rounded-xl p-4 space-y-3">
                  <div className="h-10 w-10 bg-muted rounded-xl" />
                  <div className="h-6 w-16 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              ))}
            </div>
            {/* Dos columnas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card rounded-xl p-5 space-y-4">
                <div className="h-5 w-36 bg-muted rounded" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-11 w-11 bg-muted rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-20 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-card rounded-xl p-5 space-y-4">
                <div className="h-5 w-28 bg-muted rounded" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="h-9 w-9 bg-muted rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-20 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── Componente de item de navegación del sidebar ─────────────────
  const NavItem = ({
    icon,
    label,
    count,
    section,
  }: {
    icon: React.ReactNode;
    label: string;
    count?: string | number;
    section: Section;
  }) => {
    const isActive = activeSection === section;
    return (
      <button
        onClick={() => setActiveSection(section)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
          isActive ? "bg-primary/10" : "hover:bg-muted/50",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            isActive
              ? "bg-green-600 text-white"
              : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            "flex-1 text-sm font-medium",
            isActive ? "text-green-700" : "text-foreground/80",
          )}
        >
          {label}
        </span>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground font-medium">
            {count}
          </span>
        )}
      </button>
    );
  };

  // ── Tarjeta de stat del dashboard ────────────────────────────────
  const StatCard = ({
    icon,
    value,
    label,
    sub,
    iconBg,
    onClick,
  }: {
    icon: React.ReactNode;
    value: string;
    label: string;
    sub: string;
    iconBg: string;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl p-4 flex flex-col gap-3 text-left w-full",
        onClick &&
          "hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer active:scale-95",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          iconBg,
        )}
      >
        {icon}
      </span>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-foreground/80">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </button>
  );

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          DESKTOP LAYOUT (lg+)
      ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:flex-col min-h-screen bg-muted/40">
        <Header />
        <div className="grid grid-cols-[2fr_6fr] flex-1 container mx-auto px-8 lg:px-12">
          {/* ── Sidebar ────────────────────────────────────────── */}
          <aside className="flex flex-col gap-3 p-4 pl-0 sticky top-16 self-start overflow-y-auto max-h-[calc(100vh-4rem)]">
            {/* Perfil */}
            <div className="bg-card rounded-xl p-4 flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="h-16 w-16 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold shadow">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
                <button
                  onClick={() => setActiveSection("perfil")}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-card border-2 border-green-600 text-green-600 hover:bg-green-500/10 transition-colors shadow-sm"
                  title="Editar perfil"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              <p className="font-semibold text-foreground text-sm">
                {user?.name ?? "Usuario"}
              </p>
              {user?.phone && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user.phone}
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-1.5 w-full">
                <div className="flex flex-col items-center rounded-xl bg-green-500/10 py-1.5 px-1">
                  <span className="text-base font-bold text-green-600">
                    {proximas.length}
                  </span>
                  <span className="text-[10px] text-green-600 font-medium">
                    Reservas
                  </span>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-emerald-50 py-1.5 px-1">
                  <span className="text-base font-bold text-emerald-600">
                    {favoriteCanchas.length}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    Favs
                  </span>
                </div>
              </div>
            </div>

            {/* Navegación */}
            <div className="bg-card rounded-xl p-2 flex-1">
              <NavItem
                icon={<Home className="h-4 w-4" />}
                label="Mi cuenta"
                section="cuenta"
              />

              <NavItem
                icon={<User className="h-4 w-4" />}
                label="Mi perfil"
                section="perfil"
              />
              <NavItem
                icon={<Calendar className="h-4 w-4" />}
                label="Mis reservas"
                count={
                  proximas.length > 0 ? `${proximas.length} activas` : undefined
                }
                section="reservas"
              />
              {canchasLoyalty.length > 0 && (
                <NavItem
                  icon={<Gift className="h-4 w-4" />}
                  label="Mis cupones"
                  count={
                    canchasLoyalty.reduce(
                      (acc: number, c: any) =>
                        acc +
                        (c.cupones ?? []).filter((cu: any) => !cu.usado).length,
                      0,
                    ) || undefined
                  }
                  section="cupones"
                />
              )}
              <NavItem
                icon={<Heart className="h-4 w-4" />}
                label="Favoritos"
                count={
                  favoriteCanchas.length > 0
                    ? favoriteCanchas.length
                    : undefined
                }
                section="favoritos"
              />
              <NavItem
                icon={<Users className="h-4 w-4" />}
                label="Mis partidos"
                count={misPartidos.length > 0 ? misPartidos.length : undefined}
                section="partidos"
              />
            </div>

            {/* Cerrar sesión */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors rounded-xl hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </aside>

          {/* ── Contenido principal ────────────────────────────── */}
          <main className="flex-1 overflow-y-auto p-6 pr-0">
            {/* ── SECCIÓN: MI CUENTA (dashboard) ── */}
            {activeSection === "cuenta" && (
              <div className="max-w-4xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      ¡Hola, {user?.name?.split(" ")[0] ?? "Usuario"}!
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {todayLabel} · Piura
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2 rounded-full"
                    asChild
                  >
                    <Link href="/canchas">
                      <Search className="h-4 w-4" />
                      Buscar cancha
                    </Link>
                  </Button>
                </div>

                {/* Próxima reserva */}
                {proximaReserva ? (
                  (() => {
                    const cl = canchas.find(
                      (c) => c.id === proximaReserva.canchaId,
                    );
                    const img =
                      cl?.images[0] ??
                      "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop";
                    const horaFin = proximaReserva.hora.includes(" - ")
                      ? proximaReserva.hora.split(" - ")[1]
                      : `${String((parseInt(proximaReserva.hora.split(":")[0]) + 1) % 24).padStart(2, "0")}:00`;
                    const esHoy = proximaReserva.fecha === hoyStr;
                    const fechaLabel = esHoy
                      ? "Hoy"
                      : new Date(
                          proximaReserva.fecha + "T00:00:00",
                        ).toLocaleDateString("es-PE", {
                          day: "numeric",
                          month: "short",
                        });
                    const codigo = `CG-${proximaReserva.id.slice(0, 4).toUpperCase()}`;
                    const mapsUrl = cl?.coordinates
                      ? `https://maps.google.com/?q=${cl.coordinates.lat},${cl.coordinates.lng}`
                      : cl?.address
                        ? `https://maps.google.com/?q=${encodeURIComponent(cl.address)}`
                        : "#";
                    const wppUrl = generarLinkWhatsApp(
                      proximaReserva.canchaName,
                      proximaReserva.fecha,
                      proximaReserva.hora,
                      proximaReserva.precio,
                      cl?.address,
                      cl?.coordinates?.lat,
                      cl?.coordinates?.lng,
                    );
                    return (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="font-semibold text-foreground">
                            Tu próxima reserva
                          </h2>
                          <button
                            onClick={() => setActiveSection("reservas")}
                            className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                          >
                            Ver todas <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="bg-card rounded-xl overflow-hidden flex gap-0">
                          <div className="relative w-44 shrink-0">
                            <Image
                              src={img}
                              alt={proximaReserva.canchaName}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 p-5 flex gap-4">
                            <div className="flex-1 min-w-0">
                              {cl && (
                                <Badge className="mb-2 bg-green-500/100/20 text-green-700 border-0 hover:bg-green-500/100/20 text-xs font-medium">
                                  ⚽ {sportLabels[cl.type]}
                                </Badge>
                              )}
                              <h3 className="text-2xl font-bold text-foreground mb-2">
                                {proximaReserva.canchaName}
                              </h3>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {fechaLabel}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {proximaReserva.hora} - {horaFin}
                                </span>
                                {cl?.address && (
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {cl.address.split(",")[0]}
                                  </span>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs font-mono border-dashed"
                              >
                                🔖 {codigo}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <Button
                                className="bg-green-600 hover:bg-green-700 text-white gap-2 rounded-xl"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Navigation className="h-4 w-4" />
                                  Cómo llegar
                                </a>
                              </Button>
                              <Button
                                variant="outline"
                                className="gap-2 rounded-xl border-green-200 text-green-700 hover:bg-green-500/10"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={wppUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                  </svg>
                                  WhatsApp
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-foreground">
                        Tu próxima reserva
                      </h2>
                    </div>
                    <div className="bg-card rounded-xl p-8 text-center border border-dashed border-green-200">
                      <CalendarPlus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No tienes reservas próximas
                      </p>
                      <Button size="sm" className="mt-3" asChild>
                        <Link href="/canchas">Explorar canchas</Link>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {/* SELLOS CONGELADOS — descomentar para reactivar
                  <StatCard
                    icon={<Stamp className="h-5 w-5 text-amber-600" />}
                    value={`${loyalty.sellos} de 8`}
                    label="Mis sellos"
                    sub={`Faltan ${Math.max(0, 8 - loyalty.sellos)} para 1h gratis`}
                    iconBg="bg-amber-500/20"
                    onClick={() => setActiveSection("sellos")}
                  />
                  */}
                  <StatCard
                    icon={<Calendar className="h-5 w-5 text-green-600" />}
                    value={`${proximas.length} activas`}
                    label="Mis reservas"
                    sub={`${reservas.length} en total`}
                    iconBg="bg-green-500/100/20"
                    onClick={() => setActiveSection("reservas")}
                  />
                  <StatCard
                    icon={<Heart className="h-5 w-5 text-rose-500" />}
                    value={`${favoriteCanchas.length} canchas`}
                    label="Favoritos"
                    sub="Guardadas"
                    iconBg="bg-rose-500/20"
                    onClick={() => setActiveSection("favoritos")}
                  />
                  <StatCard
                    icon={<Users className="h-5 w-5 text-orange-500" />}
                    value={`${misPartidos.length} creados`}
                    label="Mis partidos"
                    sub={`${misPartidos.filter((p) => p.estado === "abierto" || p.estado === "completo").length} activos`}
                    iconBg="bg-orange-500/20"
                    onClick={() => setActiveSection("partidos")}
                  />
                </div>

                {/* Reservas recientes + Configuración */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Reservas recientes */}
                  <div className="bg-card rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-foreground">
                        Reservas recientes
                      </h3>
                      <button
                        onClick={() => setActiveSection("reservas")}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Ver todas
                      </button>
                    </div>
                    {recentesAll.length > 0 ? (
                      <div className="space-y-3">
                        {recentesAll.map((r) => {
                          const cl = canchas.find((c) => c.id === r.canchaId);
                          const img =
                            cl?.images[0] ??
                            "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop";
                          return (
                            <div key={r.id} className="flex items-center gap-3">
                              <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-green-900">
                                <Image
                                  src={img}
                                  alt={r.canchaName}
                                  fill
                                  className="object-cover opacity-90"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {r.canchaName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    r.fecha + "T00:00:00",
                                  ).toLocaleDateString("es-PE", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                  {cl ? ` · ${sportLabels[cl.type]}` : ""}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs border-amber-200 text-amber-600 bg-amber-500/10 shrink-0"
                              >
                                {(() => {
                                  const n = partidoReservaIds.has(r.id) ? 2 : 1;
                                  return `🎟 +${n} sello${n > 1 ? "s" : ""}`;
                                })()}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Sin reservas aún
                      </p>
                    )}
                  </div>

                  {/* Acciones rápidas */}
                  <div className="bg-card rounded-xl p-5">
                    <h3 className="font-semibold text-foreground mb-4">
                      Acciones rápidas
                    </h3>
                    <div className="space-y-1">
                      {[
                        {
                          icon: <User className="h-4 w-4" />,
                          label: "Editar perfil",
                          sub: "Nombre, teléfono y foto",
                          onClick: () => setActiveSection("perfil"),
                          danger: false,
                        },
                        {
                          icon: <Users className="h-4 w-4" />,
                          label: "Mis partidos",
                          sub: "Pichangas organizadas",
                          onClick: () => setActiveSection("partidos"),
                          danger: false,
                        },
                        {
                          icon: <Phone className="h-4 w-4" />,
                          label: "Ayuda y soporte",
                          sub: "Escríbenos por WhatsApp",
                          onClick: () =>
                            window.open("https://wa.me/51987654321", "_blank"),
                          danger: false,
                        },
                      ].map(({ icon, label, sub, onClick, danger }) => (
                        <button
                          key={label}
                          onClick={onClick}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                              danger
                                ? "bg-red-50 text-red-500"
                                : "bg-green-500/10 text-green-600",
                            )}
                          >
                            {icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                danger ? "text-red-600" : "text-foreground",
                              )}
                            >
                              {label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sub}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SECCIÓN: MIS RESERVAS ── */}
            {activeSection === "reservas" && (
              <div className="max-w">
                <h1 className="text-2xl font-bold text-foreground mb-6">
                  Mis reservas
                </h1>
                <Tabs defaultValue="proximas" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="proximas" className="gap-1.5">
                      <CalendarPlus className="h-4 w-4" />
                      Próximas
                      {proximas.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 h-5 min-w-5 px-1.5 text-xs"
                        >
                          {proximas.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="historial" className="gap-1.5">
                      <Clock className="h-4 w-4" />
                      Historial
                      {historialLoading ? (
                        <span className="ml-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                      ) : (
                        historialTotal > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-1 h-5 min-w-5 px-1.5 text-xs"
                          >
                            {historialTotal}
                          </Badge>
                        )
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="proximas" className="space-y-4">
                    {proximas.length > 0 ? (
                      proximas.map((r) => (
                        <ReservaCard
                          key={r.id}
                          r={r}
                          onDetalle={setReservaDetalle}
                          onCancelar={setReservaCancelar}
                        />
                      ))
                    ) : (
                      <EmptyState type="proximas" />
                    )}
                  </TabsContent>
                  <TabsContent value="historial" className="space-y-4">
                    {historialItems.length > 0 ? (
                      <>
                        {historialItems.map((r) => (
                          <ReservaCard
                            key={r.id}
                            r={r}
                            onDetalle={setReservaDetalle}
                            onCancelar={setReservaCancelar}
                          />
                        ))}
                        {historialItems.length < historialTotal && (
                          <button
                            onClick={() => cargarHistorial(historialPage + 1)}
                            disabled={historialLoading}
                            className="w-full py-3 text-sm font-medium text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors disabled:opacity-50"
                          >
                            {historialLoading
                              ? "Cargando..."
                              : `Ver más (${historialTotal - historialItems.length} restantes)`}
                          </button>
                        )}
                      </>
                    ) : historialLoading ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Cargando...
                      </div>
                    ) : (
                      <EmptyState type="historial" />
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* ── SECCIÓN: MIS CUPONES (por cancha) ── */}
            {activeSection === "cupones" && (
              <div className="w-full max-w-2xl space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Mis cupones
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Premios ganados por fidelidad en cada cancha.
                  </p>
                </div>

                {canchasLoyalty.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center px-4">
                    <Gift className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Aún no tienes cupones
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Reserva en canchas con programa de fidelización y acumula
                      sellos.
                    </p>
                  </div>
                ) : (
                  canchasLoyalty.map((cancha: any) => {
                    const cuponesActivos = (cancha.cupones ?? []).filter(
                      (c: any) => !c.usado,
                    );
                    const cuponesUsados = (cancha.cupones ?? []).filter(
                      (c: any) => c.usado,
                    );
                    const progreso = Math.min(
                      100,
                      Math.round((cancha.sellos / cancha.umbral) * 100),
                    );

                    return (
                      <div
                        key={cancha.cancha_id}
                        className="rounded-xl border border-border bg-card overflow-hidden"
                      >
                        {/* Header cancha */}
                        <div className="flex items-center gap-3 border-b border-border px-5 py-4 bg-muted/30">
                          {cancha.cancha_imagen ? (
                            <Image
                              src={cancha.cancha_imagen}
                              alt={cancha.cancha_nombre}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                              <MapPin className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">
                              {cancha.cancha_nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cancha.total_reservas} reserva
                              {cancha.total_reservas !== 1 ? "s" : ""}{" "}
                              confirmada{cancha.total_reservas !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {cuponesActivos.length > 0 && (
                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                              {cuponesActivos.length} disponible
                              {cuponesActivos.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        <div className="p-5 space-y-4">
                          {/* Tarjeta de sellos */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">
                                Progreso hacia el próximo premio
                              </span>
                              <span className="font-semibold text-foreground">
                                {cancha.sellos}/{cancha.umbral}
                              </span>
                            </div>
                            {/* Grid de sellos */}
                            <div
                              className="grid gap-2"
                              style={{
                                gridTemplateColumns: `repeat(${Math.min(cancha.umbral, 10)}, minmax(0,1fr))`,
                              }}
                            >
                              {Array.from({ length: cancha.umbral }).map(
                                (_, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "aspect-square rounded-full border-2 flex items-center justify-center text-base sm:text-lg transition-all",
                                      i < cancha.sellos
                                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                                        : "border-dashed border-border bg-muted/20 text-muted-foreground/25",
                                    )}
                                  >
                                    {i < cancha.sellos ? (cancha.icono || "⭐") : "○"}
                                  </div>
                                ),
                              )}
                            </div>
                            {/* Barra de progreso */}
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${progreso}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Premio:{" "}
                              <span className="font-medium text-foreground">
                                {cancha.premio_tipo === "descuento_fijo" &&
                                  `S/ ${cancha.premio_valor} de descuento`}
                                {cancha.premio_tipo ===
                                  "descuento_porcentaje" &&
                                  `${cancha.premio_valor}% de descuento`}
                                {cancha.premio_tipo === "hora_gratis" &&
                                  "1 hora gratis"}
                                {cancha.premio_tipo === "personalizado" &&
                                  (cancha.premio_descripcion ||
                                    "Premio especial")}
                              </span>
                              {cancha.premio_descripcion &&
                                cancha.premio_tipo !== "personalizado" &&
                                ` — ${cancha.premio_descripcion}`}
                            </p>
                          </div>

                          {/* Cupones disponibles */}
                          {cuponesActivos.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                                Disponibles ({cuponesActivos.length})
                              </p>
                              {cuponesActivos.map((c: any) => (
                                <div
                                  key={c.id}
                                  className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
                                >
                                  <Gift className="h-5 w-5 text-primary shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground">
                                      {c.premio_tipo === "descuento_fijo" &&
                                        `S/ ${c.premio_valor} de descuento`}
                                      {c.premio_tipo ===
                                        "descuento_porcentaje" &&
                                        `${c.premio_valor}% de descuento`}
                                      {c.premio_tipo === "hora_gratis" &&
                                        "1 hora gratis"}
                                      {c.premio_tipo === "personalizado" &&
                                        (c.premio_descripcion ||
                                          "Premio especial")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Ganado el{" "}
                                      {new Date(
                                        c.generado_en,
                                      ).toLocaleDateString("es-PE", {
                                        day: "numeric",
                                        month: "long",
                                      })}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                                    Válido
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Cupones usados */}
                          {cuponesUsados.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Usados ({cuponesUsados.length})
                              </p>
                              {cuponesUsados.slice(0, 3).map((c: any) => (
                                <div
                                  key={c.id}
                                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 opacity-60"
                                >
                                  <Gift className="h-5 w-5 text-muted-foreground shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground line-through">
                                      {c.premio_tipo === "descuento_fijo" &&
                                        `S/ ${c.premio_valor} de descuento`}
                                      {c.premio_tipo ===
                                        "descuento_porcentaje" &&
                                        `${c.premio_valor}% de descuento`}
                                      {c.premio_tipo === "hora_gratis" &&
                                        "1 hora gratis"}
                                      {c.premio_tipo === "personalizado" &&
                                        (c.premio_descripcion ||
                                          "Premio especial")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Usado el{" "}
                                      {new Date(c.usado_en).toLocaleDateString(
                                        "es-PE",
                                        { day: "numeric", month: "long" },
                                      )}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                    Canjeado
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── SECCIÓN: MI PERFIL ── */}
            {activeSection === "perfil" && (
              <div className="">
                <h1 className="text-2xl font-bold text-foreground">
                  Mi perfil
                </h1>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Actualiza tu información personal
                </p>

                {perfilLoading ? (
                  <div className="space-y-4">
                    <div className="h-24 animate-pulse rounded-xl bg-muted" />
                    <div className="h-64 animate-pulse rounded-xl bg-muted" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Avatar */}
                    <div className="bg-card rounded-xl p-5 flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-2xl font-bold text-white shrink-0">
                        {perfilNombre.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {perfilNombre || "Sin nombre"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {perfil?.email}
                        </p>
                        <span className="mt-1 inline-block rounded-full bg-green-500/100/20 px-2 py-0.5 text-xs font-medium text-green-700 capitalize">
                          {perfil?.rol === "superadmin"
                            ? "Administrador"
                            : perfil?.rol === "dueno"
                              ? "Dueño de cancha"
                              : "Usuario"}
                        </span>
                      </div>
                    </div>

                    {/* Formulario */}
                    <div className="bg-card rounded-xl p-5 space-y-4">
                      <h2 className="font-semibold text-foreground">
                        Información personal
                      </h2>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground/80">
                          Nombre completo
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Tu nombre completo"
                            value={perfilNombre}
                            onChange={(e) => {
                              setPerfilNombre(e.target.value);
                              setPerfilErrores((prev) => ({
                                ...prev,
                                nombre: undefined,
                              }));
                            }}
                            className={cn(
                              "pl-9",
                              perfilErrores.nombre && "border-destructive",
                            )}
                          />
                        </div>
                        {perfilErrores.nombre && (
                          <p className="text-xs text-destructive">
                            {perfilErrores.nombre}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground/80">
                          Correo electrónico
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="email"
                            value={perfil?.email || ""}
                            disabled
                            className="pl-9 bg-muted/50 text-muted-foreground cursor-not-allowed"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          El correo no se puede cambiar
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground/80">
                          Número de Yape/Plin
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="987654321"
                            value={perfilTelefono}
                            onChange={(e) => {
                              setPerfilTelefono(e.target.value);
                              setPerfilErrores((prev) => ({
                                ...prev,
                                telefono: undefined,
                              }));
                            }}
                            className={cn(
                              "pl-9",
                              perfilErrores.telefono && "border-destructive",
                            )}
                          />
                        </div>
                        {perfilErrores.telefono ? (
                          <p className="text-xs text-destructive">
                            {perfilErrores.telefono}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Se usa para devoluciones si cancelas una reserva
                          </p>
                        )}
                      </div>

                      <Separator />

                      {perfilGuardado ? (
                        <Button className="w-full" disabled>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          ¡Guardado!
                        </Button>
                      ) : (
                        <LoadingButton
                          onClick={handleGuardarPerfil}
                          disabled={!perfilHayCambios}
                          className="w-full"
                          isLoading={perfilGuardando}
                          loadingText="Guardando cambios"
                          loadingVariant="pulse"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Guardar cambios
                        </LoadingButton>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SECCIÓN: MIS PARTIDOS ── */}
            {activeSection === "partidos" &&
              (() => {
                const deporteEmoji: Record<string, string> = {
                  futbol: "⚽",
                  futsal: "🥅",
                  basquet: "🏀",
                  voley: "🏐",
                  tenis: "🎾",
                };
                const estadoConfig: Record<
                  string,
                  { label: string; cls: string }
                > = {
                  abierto: {
                    label: "Abierto",
                    cls: "bg-green-500/100/10 text-green-700 border-green-500/20",
                  },
                  completo: {
                    label: "Completo",
                    cls: "bg-blue-500/100/10 text-blue-700 border-blue-500/20",
                  },
                  cancelado: {
                    label: "Cancelado",
                    cls: "bg-destructive/10 text-destructive border-destructive/20",
                  },
                  finalizado: {
                    label: "Finalizado",
                    cls: "bg-muted text-muted-foreground",
                  },
                };

                const proximos = misPartidos;

                const PartidoCard = ({ p }: { p: PartidoItem }) => {
                  const cfg = estadoConfig[p.estado] ?? estadoConfig.abierto;
                  const esHoy = p.fecha === hoyStr;
                  const fechaLabel = esHoy
                    ? "Hoy"
                    : new Date(p.fecha + "T00:00:00").toLocaleDateString(
                        "es-PE",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      );
                  const horaFin = `${String((parseInt(p.hora.split(":")[0]) + 1) % 24).padStart(2, "0")}:00`;
                  const cuposOcupados = p.jugadores_actuales ?? 0;
                  const canchaLocal = canchas.find((c) => c.id === p.cancha_id);
                  const img =
                    canchaLocal?.images[0] ??
                    "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop";

                  return (
                    <Card className="overflow-hidden border-border">
                      <div className="flex">
                        <div className="relative w-36 shrink-0">
                          <Image
                            src={img}
                            alt={p.cancha_nombre}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={cfg.cls}>
                                {cfg.label}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-700 border-amber-200"
                              >
                                {deporteEmoji[p.deporte] ?? "🏟️"}{" "}
                                {p.deporte.charAt(0).toUpperCase() +
                                  p.deporte.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm font-bold text-primary shrink-0">
                              S/ {p.precio_total}
                            </p>
                          </div>

                          <p className="font-semibold text-foreground">
                            {p.cancha_nombre}
                          </p>
                          {p.reserva_id && (
                            <p className="text-xs text-muted-foreground font-mono">
                              #{p.reserva_id.slice(-6).toUpperCase()}
                            </p>
                          )}
                          {p.cancha_distrito && (
                            <p className="text-xs text-muted-foreground">
                              {p.cancha_distrito}
                            </p>
                          )}

                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span className="capitalize">{fechaLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {p.hora} - {horaFin}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>
                                {cuposOcupados}/{p.jugadores_max} jugadores ·
                                nivel {p.nivel}
                              </span>
                            </div>
                          </div>

                          {p.descripcion && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-1 italic">
                              "{p.descripcion}"
                            </p>
                          )}

                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Cupos</span>
                              <span>
                                {cuposOcupados}/{p.jugadores_max}
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-green-500/100 transition-all"
                                style={{
                                  width: `${Math.min(100, (cuposOcupados / p.jugadores_max) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                };

                return (
                  <div className="w-full">
                    <h1 className="text-2xl font-bold text-foreground">
                      Mis partidos
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 mb-6">
                      Partidos que organizaste en CanchaGo
                    </p>

                    {misPartidos.length === 0 &&
                    partHistorialTotal === 0 &&
                    !partHistorialLoading ? (
                      <EmptyState type="partidos_activos" />
                    ) : (
                      <Tabs defaultValue="proximos" className="w-full">
                        <TabsList className="mb-6">
                          <TabsTrigger value="proximos" className="gap-1.5">
                            <CalendarPlus className="h-4 w-4" />
                            Próximos
                            {proximos.length > 0 && (
                              <Badge
                                variant="secondary"
                                className="ml-1 h-5 min-w-5 px-1.5 text-xs"
                              >
                                {proximos.length}
                              </Badge>
                            )}
                          </TabsTrigger>
                          <TabsTrigger value="historial" className="gap-1.5">
                            <Clock className="h-4 w-4" />
                            Historial
                            {partHistorialLoading ? (
                              <span className="ml-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                            ) : (
                              partHistorialTotal > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="ml-1 h-5 min-w-5 px-1.5 text-xs"
                                >
                                  {partHistorialTotal}
                                </Badge>
                              )
                            )}
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="proximos" className="space-y-4">
                          {proximos.length > 0 ? (
                            proximos.map((p) => (
                              <PartidoCard key={p.id} p={p} />
                            ))
                          ) : (
                            <EmptyState type="partidos_activos" />
                          )}
                        </TabsContent>
                        <TabsContent value="historial" className="space-y-4">
                          {partHistorialItems.length > 0
                            ? partHistorialItems.map((p) => (
                                <PartidoCard key={p.id} p={p} />
                              ))
                            : !partHistorialLoading && (
                                <EmptyState type="partidos_historial" />
                              )}
                          {partHistorialItems.length < partHistorialTotal && (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() =>
                                cargarPartidosHistorial(partHistorialPage + 1)
                              }
                              disabled={partHistorialLoading}
                            >
                              {partHistorialLoading
                                ? "Cargando..."
                                : `Ver más (${partHistorialTotal - partHistorialItems.length} restantes)`}
                            </Button>
                          )}
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                );
              })()}

            {/* ── SECCIÓN: FAVORITOS ── */}
            {activeSection === "favoritos" && (
              <div className="max-w">
                <h1 className="text-2xl font-bold text-foreground mb-6">
                  Favoritos
                </h1>
                {favoriteCanchas.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {favoriteCanchas.map((cancha) => (
                      <Card
                        key={cancha.id}
                        className="overflow-hidden border-border group hover:shadow-md transition-shadow"
                      >
                        <div className="relative aspect-video">
                          <Image
                            src={cancha.images[0]}
                            alt={cancha.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            onClick={() => handleRemoveFavorite(cancha.id)}
                            disabled={loadingFavs.has(cancha.id)}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm text-destructive shadow hover:bg-card transition-colors disabled:opacity-70"
                          >
                            {loadingFavs.has(cancha.id)
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Heart className="h-4 w-4 fill-destructive" />}
                          </button>
                        </div>
                        <div className="p-4">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-foreground line-clamp-1">
                              {cancha.name}
                            </h3>
                            {cancha.rating > 0 && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Star className="h-4 w-4 fill-accent text-accent" />
                                <span className="text-sm font-medium">
                                  {cancha.rating}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="line-clamp-1">
                              {cancha.address}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {
                                sportLabels[
                                  cancha.type as keyof typeof sportLabels
                                ]
                              }
                            </span>
                            <span className="font-bold text-primary">
                              S/ {cancha.pricePerHour}/h
                            </span>
                          </div>
                          <Button className="mt-3 w-full" size="sm" asChild>
                            <Link href={`/cancha/${cancha.id}`}>
                              Ver cancha
                            </Link>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState type="favorites" />
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MOBILE LAYOUT (< lg)
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 bg-muted/40 lg:hidden">
        <Header />

        {!user ? (
          /* ── Sin sesión ── */
          <main className="flex-1 px-4 py-8">
            <Card className="border-border p-6">
              <div className="text-center space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Inicia sesión para ver tus reservas
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Crea una cuenta o inicia sesión para gestionar tus reservas
                    y acumular recompensas.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button size="lg" asChild>
                    <Link href="/registro">Crear cuenta</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/login">
                      <LogIn className="mr-2 h-4 w-4" />
                      Iniciar sesión
                    </Link>
                  </Button>
                </div>
                <Separator />
                <div className="bg-blue-500/10 border border-blue-200 rounded-xl p-4 text-left">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    ¿Reservaste como invitado?
                  </p>
                  <p className="text-sm text-blue-700">
                    Revisa tu correo, te enviamos los detalles con un enlace
                    para ver el estado.
                  </p>
                </div>
              </div>
            </Card>
          </main>
        ) : activeSection !== "cuenta" ? (
          /* ── Sección interior (reservas, sellos, favoritos, perfil) ── */
          <main className="flex-1 px-4 py-4">
            <button
              onClick={() => setActiveSection("cuenta")}
              className="flex items-center gap-2 text-sm font-medium text-green-700 mb-4"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Volver
            </button>

            {activeSection === "reservas" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">
                  Mis reservas
                </h2>
                <Tabs defaultValue="proximas">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="proximas" className="flex-1 gap-1.5">
                      Próximas
                      {proximas.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 h-4 min-w-4 px-1 text-xs"
                        >
                          {proximas.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="historial" className="flex-1 gap-1.5">
                      Historial
                      {historialLoading ? (
                        <span className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                      ) : (
                        historialTotal > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-1 h-4 min-w-4 px-1 text-xs"
                          >
                            {historialTotal}
                          </Badge>
                        )
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="proximas" className="space-y-3">
                    {proximas.length > 0 ? (
                      proximas.map((r) => (
                        <ReservaCard
                          key={r.id}
                          r={r}
                          onDetalle={setReservaDetalle}
                          onCancelar={setReservaCancelar}
                        />
                      ))
                    ) : (
                      <EmptyState type="proximas" />
                    )}
                  </TabsContent>
                  <TabsContent value="historial" className="space-y-3">
                    {historialItems.length > 0 ? (
                      <>
                        {historialItems.map((r) => (
                          <ReservaCard
                            key={r.id}
                            r={r}
                            onDetalle={setReservaDetalle}
                            onCancelar={setReservaCancelar}
                          />
                        ))}
                        {historialItems.length < historialTotal && (
                          <button
                            onClick={() => cargarHistorial(historialPage + 1)}
                            disabled={historialLoading}
                            className="w-full py-3 text-sm font-medium text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors disabled:opacity-50"
                          >
                            {historialLoading
                              ? "Cargando..."
                              : `Ver más (${historialTotal - historialItems.length} restantes)`}
                          </button>
                        )}
                      </>
                    ) : historialLoading ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Cargando...
                      </div>
                    ) : (
                      <EmptyState type="historial" />
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {activeSection === "cupones" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">
                  Mis cupones
                </h2>
                {canchasLoyalty.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center px-4">
                    <Gift className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Aún no tienes cupones
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Reserva en canchas con programa de fidelización y acumula
                      sellos.
                    </p>
                  </div>
                ) : (
                  canchasLoyalty.map((cancha: any) => {
                    const cuponesActivos = (cancha.cupones ?? []).filter(
                      (c: any) => !c.usado,
                    );
                    const progreso = Math.min(
                      100,
                      Math.round((cancha.sellos / cancha.umbral) * 100),
                    );
                    return (
                      <div
                        key={cancha.cancha_id}
                        className="rounded-xl border border-border bg-card overflow-hidden"
                      >
                        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/30">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">
                              {cancha.cancha_nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cancha.sellos}/{cancha.umbral} sellos
                            </p>
                          </div>
                          {cuponesActivos.length > 0 && (
                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                              {cuponesActivos.length}
                            </span>
                          )}
                        </div>
                        <div className="p-4 space-y-3">
                          {/* Barra progreso */}
                          <div className="space-y-2">
                            <div
                              className="grid gap-2"
                              style={{
                                gridTemplateColumns: `repeat(${Math.min(cancha.umbral, 8)}, minmax(0,1fr))`,
                              }}
                            >
                              {Array.from({ length: cancha.umbral }).map(
                                (_: any, i: number) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "aspect-square rounded-full border-2 flex items-center justify-center text-lg transition-all",
                                      i < cancha.sellos
                                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                                        : "border-dashed border-border bg-muted/20 text-muted-foreground/25",
                                    )}
                                  >
                                    {i < cancha.sellos ? (cancha.icono || "⭐") : "○"}
                                  </div>
                                ),
                              )}
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${progreso}%` }}
                              />
                            </div>
                          </div>
                          {/* Cupones activos */}
                          {cuponesActivos.map((c: any) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5"
                            >
                              <Gift className="h-4 w-4 text-primary shrink-0" />
                              <p className="flex-1 text-sm font-semibold text-foreground">
                                {c.premio_tipo === "descuento_fijo" &&
                                  `S/ ${c.premio_valor} de descuento`}
                                {c.premio_tipo === "descuento_porcentaje" &&
                                  `${c.premio_valor}% de descuento`}
                                {c.premio_tipo === "hora_gratis" &&
                                  "1 hora gratis"}
                                {c.premio_tipo === "personalizado" &&
                                  (c.premio_descripcion || "Premio especial")}
                              </p>
                              <span className="text-xs text-primary font-medium">
                                Válido
                              </span>
                            </div>
                          ))}
                          {cuponesActivos.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Premio:{" "}
                              {cancha.premio_tipo === "descuento_fijo" &&
                                `S/ ${cancha.premio_valor} de descuento`}
                              {cancha.premio_tipo === "descuento_porcentaje" &&
                                `${cancha.premio_valor}% de descuento`}
                              {cancha.premio_tipo === "hora_gratis" &&
                                "1 hora gratis"}
                              {cancha.premio_tipo === "personalizado" &&
                                (cancha.premio_descripcion ||
                                  "Premio especial")}{" "}
                              al llegar a {cancha.umbral} sellos
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeSection === "favoritos" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">Favoritos</h2>
                {favoriteCanchas.length > 0 ? (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {favoriteCanchas.map((cancha) => (
                      <Card key={cancha.id} className="overflow-hidden group">
                        <div className="relative aspect-video">
                          <Image
                            src={cancha.images[0]}
                            alt={cancha.name}
                            fill
                            className="object-cover"
                          />
                          <button
                            onClick={() => handleRemoveFavorite(cancha.id)}
                            disabled={loadingFavs.has(cancha.id)}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-destructive shadow disabled:opacity-70"
                          >
                            {loadingFavs.has(cancha.id)
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Heart className="h-3.5 w-3.5 fill-destructive" />}
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-sm text-foreground line-clamp-1">
                            {cancha.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {
                              sportLabels[
                                cancha.type as keyof typeof sportLabels
                              ]
                            }
                          </p>
                          <p className="text-sm font-bold text-primary mt-1">
                            S/ {cancha.pricePerHour}/h
                          </p>
                          <Button className="mt-2 w-full" size="sm" asChild>
                            <Link href={`/cancha/${cancha.id}`}>
                              Ver cancha
                            </Link>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState type="favorites" />
                )}
              </div>
            )}

            {activeSection === "partidos" &&
              (() => {
                const deporteEmoji: Record<string, string> = {
                  futbol: "⚽",
                  futsal: "🥅",
                  basquet: "🏀",
                  voley: "🏐",
                  tenis: "🎾",
                };
                const estadoConfig: Record<
                  string,
                  { label: string; cls: string }
                > = {
                  abierto: {
                    label: "Abierto",
                    cls: "bg-green-500/10 text-green-700 border-green-500/20",
                  },
                  completo: {
                    label: "Completo",
                    cls: "bg-blue-500/10 text-blue-700 border-blue-500/20",
                  },
                  cancelado: {
                    label: "Cancelado",
                    cls: "bg-destructive/10 text-destructive border-destructive/20",
                  },
                  finalizado: {
                    label: "Finalizado",
                    cls: "bg-muted text-muted-foreground",
                  },
                };

                const MobilePartidoCard = ({ p }: { p: PartidoItem }) => {
                  const cfg = estadoConfig[p.estado] ?? estadoConfig.abierto;
                  const esHoy = p.fecha === hoyStr;
                  const fechaLabel = esHoy
                    ? "Hoy"
                    : new Date(p.fecha + "T00:00:00").toLocaleDateString(
                        "es-PE",
                        { day: "numeric", month: "long", year: "numeric" },
                      );
                  const horaFin = `${String((parseInt(p.hora.split(":")[0]) + 1) % 24).padStart(2, "0")}:00`;
                  const cuposOcupados = p.jugadores_actuales ?? 0;
                  const canchaLocal = canchas.find((c) => c.id === p.cancha_id);
                  const img =
                    canchaLocal?.images[0] ??
                    "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop";

                  return (
                    <Card className="overflow-hidden border-border">
                      <div className="flex">
                        <div className="relative w-28 shrink-0">
                          <Image
                            src={img}
                            alt={p.cancha_nombre}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className={cfg.cls}>
                                {cfg.label}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-700 border-amber-200"
                              >
                                {deporteEmoji[p.deporte] ?? "🏟️"}{" "}
                                {p.deporte.charAt(0).toUpperCase() +
                                  p.deporte.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm font-bold text-primary shrink-0">
                              S/ {p.precio_total}
                            </p>
                          </div>
                          <p className="font-semibold text-foreground text-sm">
                            {p.cancha_nombre}
                          </p>
                          {p.reserva_id && (
                            <p className="text-xs text-muted-foreground font-mono">
                              #{p.reserva_id.slice(-6).toUpperCase()}
                            </p>
                          )}
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span className="capitalize">{fechaLabel}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {p.hora} - {horaFin}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>
                                {cuposOcupados}/{p.jugadores_max} jugadores ·
                                nivel {p.nivel}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-green-500 transition-all"
                                style={{
                                  width: `${Math.min(100, (cuposOcupados / p.jugadores_max) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                };

                return (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground">
                      Mis partidos
                    </h2>
                    {misPartidos.length === 0 &&
                    partHistorialTotal === 0 &&
                    !partHistorialLoading ? (
                      <EmptyState type="partidos_activos" />
                    ) : (
                      <Tabs defaultValue="proximos" className="w-full">
                        <TabsList className="w-full mb-4">
                          <TabsTrigger
                            value="proximos"
                            className="flex-1 gap-1.5"
                          >
                            Próximos
                            {misPartidos.length > 0 && (
                              <Badge
                                variant="secondary"
                                className="ml-1 h-4 min-w-4 px-1 text-xs"
                              >
                                {misPartidos.length}
                              </Badge>
                            )}
                          </TabsTrigger>
                          <TabsTrigger
                            value="historial"
                            className="flex-1 gap-1.5"
                          >
                            Historial
                            {partHistorialLoading ? (
                              <span className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                            ) : (
                              partHistorialTotal > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="ml-1 h-4 min-w-4 px-1 text-xs"
                                >
                                  {partHistorialTotal}
                                </Badge>
                              )
                            )}
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="proximos" className="space-y-3">
                          {misPartidos.length > 0 ? (
                            misPartidos.map((p) => (
                              <MobilePartidoCard key={p.id} p={p} />
                            ))
                          ) : (
                            <EmptyState type="partidos_activos" />
                          )}
                        </TabsContent>
                        <TabsContent value="historial" className="space-y-3">
                          {partHistorialItems.length > 0
                            ? partHistorialItems.map((p) => (
                                <MobilePartidoCard key={p.id} p={p} />
                              ))
                            : !partHistorialLoading && (
                                <EmptyState type="partidos_historial" />
                              )}
                          {partHistorialItems.length < partHistorialTotal && (
                            <button
                              onClick={() =>
                                cargarPartidosHistorial(partHistorialPage + 1)
                              }
                              disabled={partHistorialLoading}
                              className="w-full py-3 text-sm font-medium text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors disabled:opacity-50"
                            >
                              {partHistorialLoading
                                ? "Cargando..."
                                : `Ver más (${partHistorialTotal - partHistorialItems.length} restantes)`}
                            </button>
                          )}
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                );
              })()}

            {activeSection === "perfil" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">Mi perfil</h2>
                {perfilLoading ? (
                  <div className="space-y-3">
                    <div className="h-20 animate-pulse rounded-xl bg-muted" />
                    <div className="h-56 animate-pulse rounded-xl bg-muted" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-card rounded-xl p-4 flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white shrink-0">
                        {perfilNombre.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {perfilNombre || "Sin nombre"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {perfil?.email}
                        </p>
                      </div>
                    </div>
                    <div className="bg-card rounded-xl p-4 space-y-4">
                      <h3 className="font-semibold text-foreground">
                        Información personal
                      </h3>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground/80">
                          Nombre completo
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Tu nombre completo"
                            value={perfilNombre}
                            onChange={(e) => {
                              setPerfilNombre(e.target.value);
                              setPerfilErrores((p) => ({
                                ...p,
                                nombre: undefined,
                              }));
                            }}
                            className={cn(
                              "pl-9",
                              perfilErrores.nombre && "border-destructive",
                            )}
                          />
                        </div>
                        {perfilErrores.nombre && (
                          <p className="text-xs text-destructive">
                            {perfilErrores.nombre}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground/80">
                          Correo electrónico
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="email"
                            value={perfil?.email || ""}
                            disabled
                            className="pl-9 bg-muted/50 text-muted-foreground cursor-not-allowed"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          El correo no se puede cambiar
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground/80">
                          Número de Yape/Plin
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="987654321"
                            value={perfilTelefono}
                            onChange={(e) => {
                              setPerfilTelefono(e.target.value);
                              setPerfilErrores((p) => ({
                                ...p,
                                telefono: undefined,
                              }));
                            }}
                            className={cn(
                              "pl-9",
                              perfilErrores.telefono && "border-destructive",
                            )}
                          />
                        </div>
                        {perfilErrores.telefono ? (
                          <p className="text-xs text-destructive">
                            {perfilErrores.telefono}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Se usa para devoluciones si cancelas
                          </p>
                        )}
                      </div>
                      <Separator />
                      {perfilGuardado ? (
                        <Button className="w-full" disabled>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          ¡Guardado!
                        </Button>
                      ) : (
                        <LoadingButton
                          onClick={handleGuardarPerfil}
                          disabled={!perfilHayCambios}
                          className="w-full"
                          isLoading={perfilGuardando}
                          loadingText="Guardando..."
                          loadingVariant="pulse"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Guardar cambios
                        </LoadingButton>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        ) : (
          /* ── Dashboard mobile (Mi cuenta) ── */
          <main className="flex-1 px-4 py-5 space-y-5">
            {/* Saludo + avatar */}
            <div className="bg-card rounded-xl p-4 flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="h-14 w-14 rounded-full bg-green-600 flex items-center justify-center text-white text-xl font-bold shadow">
                  {user.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
                <button
                  onClick={() => setActiveSection("perfil")}
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-card border-2 border-green-600 text-green-600 shadow-sm"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-2.5 w-2.5"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  ¡Hola, {user.name?.split(" ")[0]}!
                </h1>
                {user.phone && (
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                )}
              </div>
            </div>

            {/* Tu próxima reserva */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">
                Tu próxima reserva
              </p>
              {proximaReserva ? (
                (() => {
                  const cl = canchas.find(
                    (c) => c.id === proximaReserva.canchaId,
                  );
                  const img =
                    cl?.images[0] ??
                    "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop";
                  const esHoy = proximaReserva.fecha === hoyStr;
                  const fechaLabel = esHoy
                    ? "Hoy"
                    : new Date(
                        proximaReserva.fecha + "T00:00:00",
                      ).toLocaleDateString("es-PE", {
                        day: "numeric",
                        month: "short",
                      });
                  const horaFin = `${String((parseInt(proximaReserva.hora.split(":")[0]) + 1) % 24).padStart(2, "0")}:00`;
                  const codigo = `CG-${proximaReserva.id.slice(0, 4).toUpperCase()}`;
                  return (
                    <button
                      onClick={() => setActiveSection("reservas")}
                      className="w-full bg-card rounded-xl p-4 flex items-center gap-3 active:opacity-80 transition-opacity text-left"
                    >
                      <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-green-800">
                        <Image
                          src={img}
                          alt={proximaReserva.canchaName}
                          fill
                          className="object-cover opacity-90"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">
                          {proximaReserva.canchaName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cl ? `${sportLabels[cl.type]} · ` : ""}
                          {fechaLabel} {proximaReserva.hora} - {horaFin}
                        </p>
                        <p className="text-xs text-green-600 font-semibold mt-1">
                          🔖 {codigo}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })()
              ) : (
                <button
                  onClick={() => setActiveSection("reservas")}
                  className="w-full bg-card rounded-xl p-4 flex items-center justify-between active:opacity-80 transition-opacity"
                >
                  <p className="text-sm text-muted-foreground">
                    No tienes reservas próximas
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Grid 2x2 de accesos rápidos */}
            <div className="grid grid-cols-2 gap-3">
              {[
                /* SELLOS CONGELADOS — descomentar para reactivar
                {
                  icon: <Stamp className="h-5 w-5 text-amber-600" />,
                  iconBg: "bg-amber-500/20",
                  label: "Mis sellos",
                  value: `${loyalty.sellos} de 8`,
                  section: "sellos" as Section,
                },
                */
                {
                  icon: <Calendar className="h-5 w-5 text-green-600" />,
                  iconBg: "bg-green-500/100/20",
                  label: "Mis reservas",
                  value: `${proximas.length} activas`,
                  section: "reservas" as Section,
                },
                {
                  icon: <Heart className="h-5 w-5 text-rose-500" />,
                  iconBg: "bg-rose-500/20",
                  label: "Favoritos",
                  value: `${favoriteCanchas.length} canchas`,
                  section: "favoritos" as Section,
                },
                {
                  icon: <Users className="h-5 w-5 text-orange-500" />,
                  iconBg: "bg-orange-500/20",
                  label: "Mis partidos",
                  value: `${misPartidos.length} creados`,
                  section: "partidos" as Section,
                },
                {
                  icon: <Gift className="h-5 w-5 text-purple-500" />,
                  iconBg: "bg-purple-500/20",
                  label: "Mis cupones",
                  value: (() => {
                    const total = canchasLoyalty.reduce(
                      (acc: number, c: any) =>
                        acc +
                        (c.cupones ?? []).filter((cu: any) => !cu.usado).length,
                      0,
                    );
                    return total > 0
                      ? `${total} disponible${total !== 1 ? "s" : ""}`
                      : "Acumula sellos";
                  })(),
                  section: "cupones" as Section,
                },
              ].map(({ icon, iconBg, label, value, section }) => (
                <button
                  key={label}
                  onClick={() => setActiveSection(section)}
                  className="bg-card rounded-xl p-4 text-left active:opacity-80 transition-opacity"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl mb-3",
                      iconBg,
                    )}
                  >
                    {icon}
                  </span>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {value}
                  </p>
                </button>
              ))}
            </div>

            {/* CTA buscar cancha */}
            <Link
              href="/canchas"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white active:opacity-80 transition-opacity"
            >
              <Search className="h-4 w-4" />
              Buscar cancha
            </Link>
          </main>
        )}
      </div>

      {/* ── Modales (compartidos) ───────────────────────────────────── */}
      <Dialog
        open={!!reservaDetalle}
        onOpenChange={() => setReservaDetalle(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de reserva</DialogTitle>
          </DialogHeader>
          {reservaDetalle &&
            (() => {
              const canchaLocal = canchas.find(
                (c) => c.id === reservaDetalle.canchaId,
              );
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "Cancha", value: reservaDetalle.canchaName },
                      {
                        label: "Estado",
                        value: estadoLabel[reservaDetalle.estado],
                        cls: estadoClass[reservaDetalle.estado]
                          .split(" ")
                          .find((c) => c.startsWith("text-")),
                      },
                      {
                        label: "Fecha",
                        value: new Date(
                          reservaDetalle.fecha + "T00:00:00",
                        ).toLocaleDateString("es-PE", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        }),
                        capitalize: true,
                      },
                      { label: "Hora", value: reservaDetalle.hora },
                      {
                        label: "Método de pago",
                        value: reservaDetalle.metodoPago,
                        capitalize: true,
                      },
                      {
                        label: "Total pagado",
                        value: `S/ ${reservaDetalle.precio}`,
                        bold: true,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg bg-muted/50 p-3"
                      >
                        <p className="text-xs text-muted-foreground">
                          {item.label}
                        </p>
                        <p
                          className={cn(
                            "font-medium text-foreground",
                            item.cls,
                            item.capitalize && "capitalize",
                            item.bold && "font-bold text-primary",
                          )}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {reservaDetalle.modoPago === "parcial" && (
                    <>
                      <Separator />
                      <div className="rounded-lg bg-amber-500/10 border border-amber-200 p-3 space-y-2 text-sm">
                        <p className="font-semibold text-amber-800">
                          Desglose de pago
                        </p>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Adelanto pagado online:</span>
                          <span className="font-medium text-foreground">
                            S/ {reservaDetalle.montoAdelanto}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Saldo a pagar en cancha:</span>
                          <span className="font-medium text-amber-700">
                            S/ {reservaDetalle.saldoPendiente}
                          </span>
                        </div>
                        <Separator className="border-amber-200" />
                        <div className="flex justify-between font-semibold">
                          <span>Precio total:</span>
                          <span className="text-primary">
                            S/ {reservaDetalle.precio}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  {canchaLocal && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-primary" />
                        <span>{canchaLocal.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 shrink-0 text-primary" />
                        <a
                          href={`tel:${canchaLocal.phone}`}
                          className="text-primary hover:underline"
                        >
                          {canchaLocal.phone}
                        </a>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      <CancelarReservaSimple
        reserva={reservaCancelar}
        onClose={() => setReservaCancelar(null)}
        onConfirm={handleCancelar}
      />
    </>
  );
}
