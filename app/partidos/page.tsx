"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Header } from "@/components/header";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  Plus,
  Loader2,
  X,
  AlertCircle,
  ChevronLeft,
  Upload,
  ImageIcon,
  Smartphone,
  MapPin,
  Map,
} from "lucide-react";
import { getToken, getStoredUser } from "@/lib/api";
import { getLocalDateString } from "@/lib/date-utils";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { MapaPartidoModal } from "@/components/mapa-partido-modal";
import { PartidoDetalleModal } from "@/components/partido-detalle-modal";
import {
  calcularDistancia,
  formatearDistancia,
  obtenerUbicacionActual,
  guardarUbicacion,
  limpiarUbicacion,
  obtenerUbicacionGuardada,
  refrescarUbicacionEnBackground,
  soportaGeolocalizacion,
  type Coordenadas,
} from "@/lib/geolocation-utils";

// ── Tipos ─────────────────────────────────────────────────────

type Nivel = "libre" | "principiante" | "intermedio" | "avanzado";
type Deporte = "futbol" | "voley" | "basquet" | "tenis" | "futsal";

interface JugadorPreview {
  usuario_id: string;
  nombre: string;
  inicial: string;
  es_organizador: boolean;
  estado_pago: string;
  telefono: string | null;
}

interface PartidoAPI {
  id: string;
  cancha_id: string;
  cancha_nombre: string;
  cancha_distrito: string;
  organizador_id: string;
  organizador_nombre: string;
  deporte: Deporte;
  fecha: string;
  hora: string;
  nivel: Nivel;
  jugadores_max: number;
  jugadores_actuales: number;
  precio_total: number;
  precio_por_persona: number;
  estado: "pendiente" | "abierto" | "completo" | "cancelado" | "finalizado";
  descripcion: string | null;
  jugadores: JugadorPreview[] | null;
  ya_unido: boolean;
  ya_organizador: boolean;
  cancha_lat: number | null;
  cancha_lng: number | null;
  jugadores_equipo: number;
}

interface CanchaSimple {
  id: string;
  nombre: string;
  tipo: Deporte;
  precio_por_hora: number;
  precios_por_hora: Record<string, number>;
  distrito: string;
  max_jugadores: number | null;
  yape_numero: string;
  plin_numero: string;
  horariosOcupados: Record<string, "reservado" | "en_proceso">;
  horariosRestringidos: string[];
  horasOperacion: string[];
}

// ── Constantes ────────────────────────────────────────────────

const FILTROS_DEPORTE = [
  { key: "todos",   label: "Todos",   emoji: null },
  { key: "futbol",  label: "Fútbol",  emoji: "⚽" },
  { key: "futsal",  label: "Futsal",  emoji: "🥅" },
  { key: "basquet", label: "Básquet", emoji: "🏀" },
  { key: "voley",   label: "Voley",   emoji: "🏐" },
  { key: "tenis",   label: "Tenis",   emoji: "🎾" },
] as const;

const NIVEL_CONFIG: Record<Nivel, { label: string; cls: string }> = {
  libre: { label: "Libre", cls: "bg-green-100 text-green-700" },
  principiante: { label: "Principiante", cls: "bg-blue-100 text-blue-700" },
  intermedio: { label: "Intermedio", cls: "bg-amber-100 text-amber-700" },
  avanzado: { label: "Avanzado", cls: "bg-orange-100 text-orange-700" },
};

const DEPORTE_EMOJI: Record<string, string> = {
  futbol: "⚽",
  basquet: "🏀",
  voley: "🏐",
  tenis: "🎾",
  futsal: "⚽",
};

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-600",
  "bg-red-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-600",
];

const HORAS = [
  "06:00","07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00",
  "20:00","21:00","22:00","23:00",
];

type PartidoConDistancia = PartidoAPI & { distancia?: number };

// ── Helpers ───────────────────────────────────────────────────

function formatFechaDisplay(fecha: string): string {
  const hoy = getLocalDateString();
  const mañana = getLocalDateString(
    new Date(new Date().setDate(new Date().getDate() + 1)),
  );
  if (fecha === hoy) return "Hoy";
  if (fecha === mañana) return "Mañana";
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ── PartidoCard ───────────────────────────────────────────────

function PartidoCard({
  partido,
  loadingId,
  onUnirse,
  onSolicitarSalir,
  onSolicitarCancelar,
  onAbrirMapa,
  onVerDetalle,
  distancia,
}: {
  partido: PartidoAPI;
  loadingId: string | null;
  onUnirse: (id: string) => void;
  onSolicitarSalir: (id: string) => void;
  onSolicitarCancelar: (id: string) => void;
  onAbrirMapa: (partido: PartidoAPI) => void;
  onVerDetalle: (partido: PartidoAPI) => void;
  distancia?: number;
}) {
  const { label: nivelLabel, cls: nivelCls } = NIVEL_CONFIG[partido.nivel];
  const pct = Math.round(
    (partido.jugadores_actuales / partido.jugadores_max) * 100,
  );
  const lleno = partido.estado === "completo" || partido.jugadores_actuales >= partido.jugadores_max;
  const isLoading = loadingId === partido.id;
  const jugadores = partido.jugadores ?? [];
  const cuposRestantes = partido.jugadores_max - partido.jugadores_actuales;
  const casiLleno = !lleno && cuposRestantes <= 2 && partido.jugadores_actuales > 0;


  const esPendiente = partido.estado === "pendiente";

  return (
    <div
      onClick={() => onVerDetalle(partido)}
      className={`bg-card rounded-2xl border shadow-sm p-4 flex flex-col gap-3 transition-shadow hover:shadow-md cursor-pointer ${
        esPendiente
          ? "border-amber-300 opacity-90"
          : lleno && !partido.ya_unido
          ? "border-border opacity-70"
          : "border-border"
      }`}
    >
      {/* Banner de pendiente */}
      {esPendiente && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Pendiente de confirmación por el administrador
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl select-none">
          {DEPORTE_EMOJI[partido.deporte] ?? "🏅"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm truncate leading-tight">
            {partido.cancha_nombre}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              {formatFechaDisplay(partido.fecha)} · {partido.hora}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {partido.cancha_distrito}
            </span>
            {distancia != null && (
              <span className="text-xs text-muted-foreground shrink-0">
                · {formatearDistancia(distancia)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${nivelCls}`}>
            {nivelLabel}
          </span>
          {partido.cancha_lat != null && (
            <button
              onClick={(e) => { e.stopPropagation(); onAbrirMapa(partido); }}
              title="Ver cómo llegar"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/70 transition-colors"
            >
              <Map className="h-3.5 w-3.5" />
              Mapa
            </button>
          )}
        </div>
      </div>

      {/* Avatares + contador */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {jugadores.slice(0, 5).map((j, i) => (
            <div
              key={j.usuario_id}
              title={j.nombre ?? `Jugador ${i + 1}`}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-white text-[10px] font-bold border-2 border-card ${
                AVATAR_COLORS[i % AVATAR_COLORS.length]
              }`}
            >
              {j.inicial ?? String(i + 1)}
            </div>
          ))}
          {partido.jugadores_actuales > 5 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold border-2 border-card">
              +{partido.jugadores_actuales - 5}
            </div>
          )}
          {partido.jugadores_actuales === 0 && (
            <span className="text-xs text-muted-foreground">Sin jugadores aún</span>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {casiLleno && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {cuposRestantes === 1 ? "¡Último cupo!" : `¡Solo ${cuposRestantes} cupos!`}
            </span>
          )}
          <span className="text-xs font-semibold text-muted-foreground">
            {partido.jugadores_actuales}/{partido.jugadores_max} cupos
            {partido.jugadores_equipo > partido.jugadores_max && (
              <span className="font-normal"> · {partido.jugadores_equipo} en total</span>
            )}
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            lleno
              ? "bg-muted-foreground"
              : pct >= 85
              ? "bg-amber-500"
              : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Precio + botón */}
      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0">
          <p className="text-xl font-bold text-foreground leading-none">
            S/ {partido.precio_por_persona}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {partido.jugadores_equipo > partido.jugadores_max
              ? `por persona (÷${partido.jugadores_equipo})`
              : "por persona"}
          </p>
        </div>

        {partido.ya_organizador ? (
          <button
            disabled={isLoading}
            onClick={() => onSolicitarCancelar(partido.id)}
            className="flex-1 flex items-center justify-center gap-1.5 font-bold py-3 rounded-xl text-sm transition-all bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4" />
                {esPendiente ? "Cancelar solicitud" : "Cancelar partido"}
              </>
            )}
          </button>
        ) : partido.ya_unido ? (
          <button
            disabled={isLoading}
            onClick={() => onSolicitarSalir(partido.id)}
            className="flex-1 flex items-center justify-center gap-1.5 font-bold py-3 rounded-xl text-sm transition-all border-2 border-primary text-primary hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4" />
                Salir del partido
              </>
            )}
          </button>
        ) : (
          <button
            disabled={lleno || isLoading}
            onClick={() => onUnirse(partido.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 font-bold py-3 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50
              ${
                lleno
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : lleno ? (
              "Partido completo"
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Unirme al partido
              </>
            )}
          </button>
        )}
      </div>

    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────

function PartidoSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded-full w-3/4" />
          <div className="h-3 bg-muted rounded-full w-1/2" />
        </div>
        <div className="h-6 w-20 bg-muted rounded-full shrink-0" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-7 rounded-full bg-muted border-2 border-card" />
          ))}
        </div>
        <div className="h-3 w-24 bg-muted rounded-full" />
      </div>
      <div className="h-1.5 bg-muted rounded-full" />
      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <div className="h-6 w-12 bg-muted rounded" />
          <div className="h-2.5 w-16 bg-muted rounded-full" />
        </div>
        <div className="flex-1 h-12 bg-muted rounded-xl" />
      </div>
    </div>
  );
}

// ── CrearPartidoSheet ─────────────────────────────────────────

type MetodoPago = "yape" | "plin" | "efectivo";

function CrearPartidoSheet({
  open,
  onClose,
  onCreado,
}: {
  open: boolean;
  onClose: () => void;
  onCreado: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [canchas, setCanchas] = useState<CanchaSimple[]>([]);
  const [loadingCanchas, setLoadingCanchas] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paso, setPaso] = useState<"form" | "pago">("form");
  const [metodo, setMetodo] = useState<MetodoPago>("yape");
  const [comprobante, setComprobante] = useState<string | null>(null);
  const [telefonoInput, setTelefonoInput] = useState("");

  const [form, setForm] = useState({
    cancha_id: "",
    fecha: getLocalDateString(),
    hora: "",
    nivel: "libre" as Nivel,
    jugadores_equipo: 10,
    jugadores_max: 9,
    descripcion: "",
  });

  // Resetear y cargar canchas al abrir
  useEffect(() => {
    if (!open) return;
    setPaso("form");
    setComprobante(null);
    setError("");
    setLoadingCanchas(true);
    fetch("/api/canchas/list")
      .then((r) => r.json())
      .then((data: any[]) => {
        setCanchas(
          (Array.isArray(data) ? data : []).map((c) => ({
            id: c.id,
            nombre: c.nombre,
            tipo: c.tipo,
            precio_por_hora: c.precio_por_hora,
            precios_por_hora: c.precios_por_hora ?? {},
            distrito: c.distrito,
            max_jugadores: c.max_jugadores ?? null,
            yape_numero: c.yape_numero ?? "",
            plin_numero: c.plin_numero ?? "",
            horariosOcupados: c.horariosOcupados ?? {},
            horariosRestringidos: c.horariosRestringidos ?? [],
            horasOperacion: c.horasOperacion ?? HORAS,
          })),
        );
      })
      .finally(() => setLoadingCanchas(false));
  }, [open]);

  const canchaSeleccionada = canchas.find((c) => c.id === form.cancha_id);

  const precioTotal = canchaSeleccionada
    ? (canchaSeleccionada.precios_por_hora[form.hora] ?? canchaSeleccionada.precio_por_hora)
    : 0;
  const maxJugadores = canchaSeleccionada?.max_jugadores ?? 22;
  const precioPorPersona =
    form.jugadores_equipo > 0 ? Math.ceil(precioTotal / form.jugadores_equipo) : 0;

  const horasDisponibles = useMemo(() => {
    if (!canchaSeleccionada || !form.fecha) return [];
    const esHoy = form.fecha === getLocalDateString();
    const ahoraHora = new Date().getHours();
    return canchaSeleccionada.horasOperacion.filter((hora) => {
      if (esHoy) {
        const [hh] = hora.split(":").map(Number);
        if (hh <= ahoraHora) return false;
      }
      const key = `${form.fecha}|${hora}`;
      if (canchaSeleccionada.horariosOcupados[key]) return false;
      if (canchaSeleccionada.horariosRestringidos.includes(hora)) return false;
      return true;
    });
  }, [canchaSeleccionada, form.fecha]);

  useEffect(() => {
    setForm((p) => {
      if (!p.hora || !horasDisponibles.includes(p.hora)) {
        return { ...p, hora: horasDisponibles[0] ?? "" };
      }
      return p;
    });
  }, [horasDisponibles]);

  const handleCanchaChange = (id: string) => {
    const c = canchas.find((x) => x.id === id);
    const maxCancha = c?.max_jugadores ?? 22;
    setForm((prev) => {
      const equipo = Math.min(prev.jugadores_equipo, maxCancha);
      const max = Math.min(prev.jugadores_max, maxCancha - 1);
      return { ...prev, cancha_id: id, hora: "", jugadores_equipo: equipo, jugadores_max: max };
    });
  };

  // Paso 1: solo valida y avanza al paso de pago
  const handleSubmit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    setError("");
    if (!getToken()) { setError("Debes iniciar sesión para crear un partido."); return; }
    if (!form.cancha_id) { setError("Selecciona una cancha."); return; }
    if (!form.hora) { setError("Selecciona un horario disponible."); return; }
    if (precioTotal <= 0) { setError("La cancha seleccionada no tiene precio configurado."); return; }
    setPaso("pago");
  };

  // Paso 2: crea reserva + partido
  const handleConfirmarPago = async () => {
    setError("");
    const token = getToken();
    if (!token) { setError("Debes iniciar sesión."); return; }
    if (!getStoredUser()?.telefono && telefonoInput && !/^9\d{8}$/.test(telefonoInput)) {
      setError("El número de WhatsApp debe tener 9 dígitos y empezar con 9."); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/partidos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cancha_id: form.cancha_id,
          cancha_nombre: canchaSeleccionada!.nombre,
          deporte: canchaSeleccionada!.tipo,
          fecha: form.fecha,
          hora: form.hora,
          nivel: form.nivel,
          jugadores_max: form.jugadores_max + 1,
          jugadores_equipo: form.jugadores_equipo,
          precio_total: precioTotal,
          descripcion: form.descripcion || null,
          metodo_pago: metodo,
          comprobante_url: comprobante,
          organizador_nombre: getStoredUser()?.nombre ?? null,
          organizador_telefono: getStoredUser()?.telefono || telefonoInput || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al crear el partido."); return; }
      onCreado();
      onClose();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const original = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        setComprobante(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  };

  const yapeDisponible = !!(canchaSeleccionada?.yape_numero);
  const plinDisponible = !!(canchaSeleccionada?.plin_numero);

  // Auto-seleccionar el primer método disponible al cambiar de cancha
  useEffect(() => {
    if (!canchaSeleccionada) return;
    if (!yapeDisponible && plinDisponible) setMetodo("plin");
    else if (yapeDisponible) setMetodo("yape");
    else setMetodo("efectivo");
  }, [canchaSeleccionada?.id]);

  const numPago = metodo === "yape"
    ? canchaSeleccionada?.yape_numero
    : metodo === "plin"
    ? canchaSeleccionada?.plin_numero
    : null;

  const metodosDisponibles: MetodoPago[] = [
    ...(yapeDisponible ? ["yape" as MetodoPago] : []),
    ...(plinDisponible ? ["plin" as MetodoPago] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 h-[92dvh] max-h-[92dvh] flex flex-col gap-0 sm:max-w-lg w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          {paso === "pago" && (
            <button
              onClick={() => { setPaso("form"); setError(""); }}
              className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
          )}
          <DialogTitle className="text-base font-bold text-foreground">
            {paso === "form" ? "Crear partido" : "Confirmar pago"}
          </DialogTitle>
        </div>

        {/* ── Contenedor deslizante ── */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div
            className="flex h-full w-[200%] transition-transform duration-300 ease-in-out"
            style={{ transform: paso === "pago" ? "translateX(-50%)" : "translateX(0)" }}
          >

        {/* ── PASO 1: Formulario ── */}
        <div className="w-1/2 flex flex-col min-h-0">
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Cancha */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                  Cancha
                </label>
                {loadingCanchas ? (
                  <div className="h-11 bg-muted rounded-xl animate-pulse" />
                ) : (
                  <select
                    required
                    value={form.cancha_id}
                    onChange={(e) => handleCanchaChange(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Selecciona una cancha</option>
                    {canchas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} — {c.distrito}
                      </option>
                    ))}
                  </select>
                )}
                <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border h-9 transition-colors ${
                  canchaSeleccionada ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-border"
                }`}>
                  {canchaSeleccionada ? (
                    <>
                      <span className="text-base select-none leading-none">
                        {DEPORTE_EMOJI[canchaSeleccionada.tipo] ?? "🏅"}
                      </span>
                      <span className="text-xs text-primary font-semibold capitalize">
                        {canchaSeleccionada.tipo}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-bold text-foreground">
                        {(() => {
                          const vals = Object.values(canchaSeleccionada.precios_por_hora);
                          const all = [...vals, canchaSeleccionada.precio_por_hora];
                          const min = Math.min(...all);
                          const max = Math.max(...all);
                          return min === max ? `S/ ${min}/hora` : `S/ ${min}–${max}/hora`;
                        })()}
                      </span>
                      {canchaSeleccionada.max_jugadores && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            Máx. {canchaSeleccionada.max_jugadores} jug.
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Selecciona una cancha para ver los detalles
                    </span>
                  )}
                </div>
              </div>

              {/* Fecha + Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    disabled={!form.cancha_id}
                    min={getLocalDateString()}
                    value={form.fecha}
                    onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value, hora: "" }))}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                    Hora disponible
                  </label>
                  {form.cancha_id && horasDisponibles.length === 0 ? (
                    <div className="h-11 flex items-center px-3 rounded-xl border border-destructive/40 bg-destructive/5 text-xs text-destructive font-medium">
                      Sin horarios libres
                    </div>
                  ) : (
                    <select
                      required
                      disabled={!form.cancha_id}
                      value={form.hora}
                      onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!form.hora && <option value="">Selecciona</option>}
                      {horasDisponibles.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Nivel */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                  Nivel
                </label>
                <select
                  value={form.nivel}
                  onChange={(e) => setForm((p) => ({ ...p, nivel: e.target.value as Nivel }))}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="libre">Libre (cualquier nivel)</option>
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>

              {/* Jugadores */}
              <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Jugadores
                </p>

                {/* Total del partido */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Total del partido (para dividir el precio)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(form.jugadores_equipo - 1, 2);
                        const max = Math.max(1, Math.min(form.jugadores_max, next - 1));
                        setForm((p) => ({ ...p, jugadores_equipo: next, jugadores_max: max }));
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-lg font-bold hover:bg-muted transition-colors disabled:opacity-40"
                      disabled={form.jugadores_equipo <= 2}
                    >−</button>
                    <span className="flex-1 text-center text-xl font-bold text-foreground">{form.jugadores_equipo}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(form.jugadores_equipo + 1, maxJugadores);
                        setForm((p) => ({ ...p, jugadores_equipo: next }));
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-lg font-bold hover:bg-muted transition-colors disabled:opacity-40"
                      disabled={form.jugadores_equipo >= maxJugadores}
                    >+</button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {canchaSeleccionada?.max_jugadores ? `Máx. ${maxJugadores} según la cancha` : "Ej: 10 para una pichanga de 5 vs 5"}
                  </p>
                </div>

                {/* Cupos disponibles */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Cupos que abres (jugadores que buscas)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(form.jugadores_max - 1, 1);
                        setForm((p) => ({ ...p, jugadores_max: next }));
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-lg font-bold hover:bg-muted transition-colors disabled:opacity-40"
                      disabled={form.jugadores_max <= 1}
                    >−</button>
                    <span className="flex-1 text-center text-xl font-bold text-foreground">{form.jugadores_max}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(form.jugadores_max + 1, form.jugadores_equipo - 1);
                        setForm((p) => ({ ...p, jugadores_max: next }));
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-lg font-bold hover:bg-muted transition-colors disabled:opacity-40"
                      disabled={form.jugadores_max >= form.jugadores_equipo - 1}
                    >+</button>
                  </div>
                  {form.jugadores_max >= 1 && form.jugadores_max < form.jugadores_equipo && (
                    <p className="text-[10px] text-primary font-semibold mt-1">
                      Tu grupo: {form.jugadores_equipo - form.jugadores_max} · Buscas: {form.jugadores_max} más
                    </p>
                  )}
                </div>
              </div>

              {/* Resumen precio */}
              <div className={`rounded-xl border px-4 py-3 space-y-1.5 transition-colors ${
                precioTotal > 0 ? "border-border bg-secondary/40" : "border-border bg-muted/30"
              }`}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Resumen de costo
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    Precio de la cancha
                    {form.hora && precioTotal > 0 && (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        ({form.hora})
                      </span>
                    )}
                  </span>
                  <span className="font-bold">
                    {precioTotal > 0 ? `S/ ${precioTotal}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {precioTotal > 0 ? `Entre ${form.jugadores_equipo} jugadores` : "Selecciona una cancha"}
                  </span>
                  <span className={`text-xl font-bold ${precioTotal > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {precioTotal > 0 ? `S/ ${precioPorPersona} c/u` : "—"}
                  </span>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                  Descripción{" "}
                  <span className="normal-case font-normal text-muted-foreground">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Ej: Pichanga amistosa, llevamos el balón..."
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </form>

            <div className="px-5 py-4 border-t border-border bg-background shrink-0">
              <button
                onClick={handleSubmit}
                disabled={!form.hora || !form.cancha_id}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                Continuar al pago
              </button>
            </div>
        </div>

        {/* ── PASO 2: Pago ── */}
        <div className="w-1/2 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Resumen del partido */}
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Resumen del partido
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cancha</span>
                  <span className="font-semibold text-foreground text-right max-w-[60%] truncate">
                    {canchaSeleccionada?.nombre}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fecha y hora</span>
                  <span className="font-semibold">{formatFechaDisplay(form.fecha)} · {form.hora}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total del partido</span>
                  <span className="font-semibold">{form.jugadores_equipo} jugadores</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cupos que abres</span>
                  <span className="font-semibold">{form.jugadores_max} cupos</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Total a pagar</span>
                  <span className="text-lg font-bold text-primary">S/ {precioTotal}</span>
                </div>
              </div>

              {/* Selector de método */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                  Método de pago
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {metodosDisponibles.map((m) => {
                    const isYape = m === "yape";
                    const activeColor = isYape ? "#6C1FC6" : "#00C2CB";
                    const isSelected = metodo === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMetodo(m)}
                        className="flex items-center gap-3 rounded-xl border-2 p-3 transition-all"
                        style={isSelected
                          ? { borderColor: activeColor, backgroundColor: `${activeColor}0D` }
                          : { borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }
                        }
                      >
                        <div className="h-9 w-9 shrink-0 rounded-lg overflow-hidden border border-border">
                          <Image
                            src={isYape ? "/images/yape.png" : "/images/plin.png"}
                            alt={m}
                            width={36}
                            height={36}
                            className="object-contain"
                          />
                        </div>
                        <p className="font-semibold text-foreground text-sm">
                          {isYape ? "Yape" : "Plin"}
                        </p>
                        <div
                          className="ml-auto h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center"
                          style={isSelected
                            ? { borderColor: activeColor, backgroundColor: activeColor }
                            : { borderColor: "hsl(var(--border))" }
                          }
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Número de pago */}
              {metodosDisponibles.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Esta cancha no tiene Yape ni Plin configurados. No es posible crear un partido aquí por ahora.
                </div>
              ) : numPago ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide mb-0.5">
                      Envía S/ {precioTotal} a
                    </p>
                    <p className="text-xl font-bold text-foreground tracking-widest">
                      {numPago}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                </div>
              ) : null}

              {/* Teléfono WhatsApp — solo si no está en el perfil */}
              {!getStoredUser()?.telefono && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                    Tu número de WhatsApp
                  </p>
                  <input
                    type="tel"
                    placeholder="Ej: 987654321"
                    value={telefonoInput}
                    onChange={e => setTelefonoInput(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Para notificarte sobre tu partido por WhatsApp.
                  </p>
                </div>
              )}

              {/* Upload comprobante */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                  Comprobante de pago{" "}
                  <span className="normal-case font-normal text-muted-foreground">(opcional)</span>
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {comprobante ? (
                  <div className="space-y-2">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border">
                      <Image src={comprobante} alt="Comprobante" fill className="object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setComprobante(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="flex items-center gap-1.5 text-xs text-destructive font-semibold"
                    >
                      <X className="h-3.5 w-3.5" />
                      Quitar imagen
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <ImageIcon className="h-7 w-7 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      <span className="font-semibold text-primary">Subir captura</span> del comprobante
                    </span>
                  </button>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  También puedes enviar sin comprobante; el admin podrá pedírtelo después.
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border bg-background shrink-0">
              <button
                onClick={handleConfirmarPago}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Confirmar y publicar partido
                  </>
                )}
              </button>
            </div>
        </div>

          </div>{/* fin track */}
        </div>{/* fin outer overflow */}

      </DialogContent>
    </Dialog>
  );
}

// ── Helper: devolución estimada para cancelación de partido ───

function calcularDevolucionEstimada(partido: PartidoAPI) {
  const precio = partido.precio_total;

  if (partido.estado === "pendiente") {
    return { porcentaje: 100, devolucion: precio, motivo: "Partido no confirmado aún" };
  }

  const horasRestantes =
    (new Date(`${partido.fecha}T${partido.hora}`).getTime() - Date.now()) / (1000 * 60 * 60);

  let porcentaje = 0;
  let motivo = "";
  if (horasRestantes >= 4)      { porcentaje = 85; motivo = "Más de 4 h de anticipación"; }
  else if (horasRestantes >= 2) { porcentaje = 60; motivo = "Entre 2 y 4 h de anticipación"; }
  else if (horasRestantes >= 1) { porcentaje = 30; motivo = "Entre 1 y 2 h de anticipación"; }
  else                          { porcentaje = 0;  motivo = "Menos de 1 h de anticipación"; }

  return { porcentaje, devolucion: Math.round(precio * porcentaje / 100), motivo };
}

// ── Página principal ──────────────────────────────────────────

export default function PartidosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [partidos, setPartidos] = useState<PartidoAPI[]>([]);
  const [misPartidosPendientes, setMisPartidosPendientes] = useState<PartidoAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deporte, setDeporte] = useState("todos");
  const [soloHoy, setSoloHoy] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCrear, setShowCrear] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);
  const [loadingUbicacion, setLoadingUbicacion] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ id: string; tipo: "salir" | "cancelar" } | null>(null);
  const [partidoMapa, setPartidoMapa] = useState<PartidoAPI | null>(null);
  const [partidoDetalle, setPartidoDetalle] = useState<PartidoAPI | null>(null);

  const fetchMisPartidosPendientes = useCallback(async () => {
    const token = getToken();
    if (!token) { setMisPartidosPendientes([]); return; }
    try {
      const res = await fetch("/api/partidos/mis-partidos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const pendientes = (Array.isArray(data) ? data : []).filter(
        (p: PartidoAPI) => p.estado === "pendiente"
      );
      setMisPartidosPendientes(pendientes);
    } catch {
      // silencioso: no bloquea la vista principal
    }
  }, []);

  const fetchPartidos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const token = getToken();
      const res = await fetch(`/api/partidos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al cargar los partidos");
      const data = await res.json();
      setPartidos(Array.isArray(data) ? data : []);
    } catch {
      setError("No se pudieron cargar los partidos. Intenta de nuevo.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartidos();
    if (getToken()) fetchMisPartidosPendientes();
  }, [fetchPartidos, fetchMisPartidosPendientes]);

  useEffect(() => {
    const guardada = obtenerUbicacionGuardada();
    if (guardada) setUbicacion(guardada);
    refrescarUbicacionEnBackground((nuevaCoords) => {
      setUbicacion(nuevaCoords);
    });
  }, []);

  const handleObtenerUbicacion = async () => {
    if (!soportaGeolocalizacion()) return;
    setLoadingUbicacion(true);
    try {
      const coords = await obtenerUbicacionActual();
      guardarUbicacion(coords);
      setUbicacion(coords);
    } catch {
      toast({ title: "No se pudo obtener tu ubicación", description: "Verifica que hayas dado permiso al navegador.", variant: "destructive" });
    } finally {
      setLoadingUbicacion(false);
    }
  };

  const limpiarUbicacionActiva = () => {
    limpiarUbicacion();
    setUbicacion(null);
  };

  const solicitarSalir = (id: string) => setConfirmacion({ id, tipo: "salir" });
  const solicitarCancelar = (id: string) => setConfirmacion({ id, tipo: "cancelar" });

  const confirmarAccion = async () => {
    if (!confirmacion) return;
    const { id, tipo } = confirmacion;
    setConfirmacion(null);
    if (tipo === "salir") await handleSalir(id);
    else await handleCancelar(id);
  };

  const handleUnirse = async (id: string) => {
    const token = getToken();
    if (!token) {
      router.push("/login?redirect=/partidos");
      return;
    }
    const partidoInfo = partidos.find((p) => p.id === id);
    setLoadingId(id);
    setAlertMsg("");
    try {
      const res = await fetch(`/api/partidos/${id}/unirse`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg(data.error ?? "No se pudo unir al partido.");
        return;
      }
      toast({
        title: "¡Te uniste al partido!",
        description: partidoInfo
          ? `Recuerda pagar S/ ${partidoInfo.precio_por_persona} al organizador al llegar a la cancha.`
          : "Recuerda pagar tu parte al llegar a la cancha.",
      });
      await fetchPartidos(true);
    } catch {
      setAlertMsg("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleSalir = async (id: string) => {
    const token = getToken();
    if (!token) return;
    setLoadingId(id);
    setAlertMsg("");
    try {
      const res = await fetch(`/api/partidos/${id}/unirse`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg(data.error ?? "No se pudo salir del partido.");
        return;
      }
      await fetchPartidos();
    } catch {
      setAlertMsg("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancelar = async (id: string) => {
    const token = getToken();
    if (!token) return;
    setLoadingId(id);
    setAlertMsg("");
    try {
      const res = await fetch(`/api/partidos/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg(data.error ?? "No se pudo cancelar el partido.");
        return;
      }
      await fetchPartidos();
      await fetchMisPartidosPendientes();
    } catch {
      setAlertMsg("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoadingId(null);
    }
  };

  const partidosFiltrados = useMemo((): PartidoConDistancia[] => {
    let resultado = partidos;

    if (deporte !== "todos") {
      resultado = resultado.filter((p) => p.deporte === deporte);
    }
    if (soloHoy) {
      const hoy = getLocalDateString();
      resultado = resultado.filter((p) => p.fecha === hoy);
    }

    if (!ubicacion) return resultado;
    return [...resultado]
      .map((p) => ({
        ...p,
        distancia:
          p.cancha_lat != null && p.cancha_lng != null
            ? calcularDistancia(ubicacion, { lat: p.cancha_lat, lng: p.cancha_lng })
            : undefined,
      }))
      .sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity));
  }, [partidos, ubicacion, deporte, soloHoy]);

  const disponibles = partidosFiltrados.filter((p) => p.estado === "abierto").length;

  return (
    <div className="flex flex-col flex-1 bg-background">
      <Header />

      {/* Hero + filtros */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">
            Partidos abiertos
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-md leading-relaxed">
            Únete a una pichanga aunque vengas solo. Pagas solo tu parte y
            completas el equipo.
          </p>

          {/* Chips de filtro */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-0.5 scrollbar-hide">
            {FILTROS_DEPORTE.map((d) => (
              <button
                key={d.key}
                onClick={() => setDeporte(d.key)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all
                  ${
                    deporte === d.key
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-background border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
                  }`}
              >
                {d.emoji && (
                  <span className="text-base leading-none">{d.emoji}</span>
                )}
                {d.label}
              </button>
            ))}

            <div className="w-px h-5 bg-border shrink-0" />

            <button
              onClick={() => setSoloHoy(!soloHoy)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all
                ${
                  soloHoy
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-background border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
                }`}
            >
              Hoy
            </button>

            {ubicacion ? (
              <button
                onClick={limpiarUbicacionActiva}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all bg-primary border-primary text-primary-foreground shadow-sm"
              >
                <MapPin className="h-3.5 w-3.5" />
                Cerca de mí
                <X className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={handleObtenerUbicacion}
                disabled={loadingUbicacion}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all bg-background border-border text-foreground hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
              >
                {loadingUbicacion ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                Cerca de mí
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 bg-background">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-5">

          {/* Alerta de error inline */}
          {alertMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {alertMsg}
              <button
                onClick={() => setAlertMsg("")}
                className="ml-auto shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Mis partidos pendientes de confirmación */}
          {misPartidosPendientes.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-amber-700">
                  {misPartidosPendientes.length === 1
                    ? "Tu partido pendiente de confirmación"
                    : `Tus partidos pendientes (${misPartidosPendientes.length})`}
                </h2>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {misPartidosPendientes.map((p) => (
                  <PartidoCard
                    key={p.id}
                    partido={p}
                    loadingId={loadingId}
                    onUnirse={handleUnirse}
                    onSolicitarSalir={solicitarSalir}
                    onSolicitarCancelar={solicitarCancelar}
                    onAbrirMapa={setPartidoMapa}
                    onVerDetalle={setPartidoDetalle}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Contador + botón crear */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">
              {loading
                ? "Cargando..."
                : `${disponibles} ${disponibles === 1 ? "partido disponible" : "partidos disponibles"}`}
            </p>
            <button
              onClick={() => {
                if (!getToken()) {
                  router.push("/login?redirect=/partidos");
                  return;
                }
                setShowCrear(true);
              }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Crear partido
            </button>
          </div>

          {/* Estados: loading / error / vacío / lista */}
          {loading ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <PartidoSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <p className="font-semibold text-foreground mb-4">{error}</p>
              <button
                onClick={() => fetchPartidos()}
                className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl"
              >
                Reintentar
              </button>
            </div>
          ) : partidos.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="h-20 w-20 flex items-center justify-center rounded-full bg-white border border-border text-4xl mb-4 select-none">
                ⚽
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                Sin partidos disponibles
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
                No hay partidos con estos filtros. ¡Crea el primero y completa
                el equipo!
              </p>
              <button
                onClick={() => {
                  if (!getToken()) {
                    router.push("/login?redirect=/partidos");
                    return;
                  }
                  setShowCrear(true);
                }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-3 rounded-xl transition-all"
              >
                <Plus className="h-4 w-4" />
                Crear mi partido
              </button>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {partidosFiltrados.map((p) => (
                <PartidoCard
                  key={p.id}
                  partido={p}
                  loadingId={loadingId}
                  onUnirse={handleUnirse}
                  onSolicitarSalir={solicitarSalir}
                  onSolicitarCancelar={solicitarCancelar}
                  onAbrirMapa={setPartidoMapa}
                  onVerDetalle={setPartidoDetalle}
                  distancia={p.distancia}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalle del partido */}
      <PartidoDetalleModal
        partido={partidoDetalle}
        open={!!partidoDetalle}
        onClose={() => setPartidoDetalle(null)}
        loadingId={loadingId}
        onUnirse={handleUnirse}
        onSolicitarSalir={solicitarSalir}
        onSolicitarCancelar={solicitarCancelar}
        ubicacion={ubicacion}
      />

      {/* Modal de mapa */}
      {partidoMapa?.cancha_lat != null && partidoMapa.cancha_lng != null && (
        <MapaPartidoModal
          open={!!partidoMapa}
          onClose={() => setPartidoMapa(null)}
          canchaLat={partidoMapa.cancha_lat}
          canchaLng={partidoMapa.cancha_lng}
          canchaNombre={partidoMapa.cancha_nombre}
          canchaDistrito={partidoMapa.cancha_distrito}
          ubicacion={ubicacion}
        />
      )}

      {/* Dialog de confirmación para salir/cancelar */}
      {confirmacion && (() => {
        const partidoACancelar = confirmacion.tipo === "cancelar"
          ? ([...partidos, ...misPartidosPendientes].find((p) => p.id === confirmacion.id) ?? null)
          : null;
        const dev = partidoACancelar ? calcularDevolucionEstimada(partidoACancelar) : null;

        return (
          <Dialog open onOpenChange={(v) => !v && setConfirmacion(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogTitle>
                {confirmacion.tipo === "cancelar" ? "Cancelar partido" : "Salir del partido"}
              </DialogTitle>

              {confirmacion.tipo === "cancelar" && dev && partidoACancelar ? (
                <div className="mt-2 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Los jugadores serán notificados. Revisa la devolución estimada:
                  </p>
                  <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Devolución estimada
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pagado</span>
                      <span className="font-semibold">S/ {partidoACancelar.precio_total}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Devolución ({dev.porcentaje}%)</span>
                      <span className={`text-base font-bold ${dev.devolucion > 0 ? "text-primary" : "text-destructive"}`}>
                        S/ {dev.devolucion}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{dev.motivo}</p>
                  </div>
                  {dev.devolucion === 0 && (
                    <p className="text-xs text-destructive font-medium">
                      No se realizará ninguna devolución por cancelación tardía.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  ¿Seguro que quieres salir de este partido?
                </p>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setConfirmacion(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={confirmarAccion}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors"
                >
                  {confirmacion.tipo === "cancelar" ? "Sí, cancelar" : "Sí, salir"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Sheet para crear partido */}
      <CrearPartidoSheet
        open={showCrear}
        onClose={() => setShowCrear(false)}
        onCreado={async () => { await Promise.all([fetchPartidos(true), fetchMisPartidosPendientes()]); }}
      />
    </div>
  );
}
