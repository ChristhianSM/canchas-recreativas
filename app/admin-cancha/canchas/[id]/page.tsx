"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Gift,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { BloqueosAdminPanel } from "@/components/bloqueos-admin-panel";
import {
  estaBloquedoPor,
  HORAS_APP,
  getHorasOperacion,
  type BloqueoAdmin,
} from "@/lib/bloqueos-utils";

type Cancha = {
  id: string;
  nombre: string;
  descripcion: string;
  telefono: string;
  precio_por_hora: number;
  amenidades: string[];
  imagenes: string[];
  lat: number;
  lng: number;
  direccion: string;
  yape_numero?: string;
  plin_numero?: string;
};

type Accesorio = {
  id: string;
  nombre: string;
  icono: string;
  modalidad: 'prestado' | 'alquilado';
  precio: number | null;
};

const PRESETS_POR_DEPORTE: Record<string, Array<{ nombre: string; icono: string }>> = {
  futbol:  [{ nombre: 'Balón', icono: '⚽' }, { nombre: 'Chalecos', icono: '🎽' }],
  futsal:  [{ nombre: 'Balón', icono: '⚽' }, { nombre: 'Chalecos', icono: '🎽' }],
  voley:   [{ nombre: 'Balón', icono: '🏐' }, { nombre: 'Malla', icono: '🥅' }],
  basquet: [{ nombre: 'Balón', icono: '🏀' }],
  tenis:   [{ nombre: 'Raqueta', icono: '🎾' }, { nombre: 'Pelotas', icono: '🎾' }],
};

function getOwnerToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cp_owner_token");
}

// ── Pestaña de horario ─────────────────────────────────────────
const DIAS_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getLunesDeSemana(base = new Date()): Date {
  const d = new Date(base);
  const dia = d.getDay();
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia));
  d.setHours(0, 0, 0, 0);
  return d;
}

function HorarioTab({ canchaId, horasOperacion = HORAS_APP }: { canchaId: string; horasOperacion?: string[] }) {
  const [reservas, setReservas] = useState<any[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [semana, setSemana] = useState<Date>(getLunesDeSemana);

  useEffect(() => {
    const token = getOwnerToken();
    if (!token) return;
    Promise.all([
      fetch("/api/admin-cancha/reservas", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`/api/admin-cancha/bloqueos?canchaId=${canchaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([resData, bloqData]) => {
        setReservas(
          Array.isArray(resData)
            ? resData.filter((r: any) => r.cancha_id === canchaId)
            : [],
        );
        setBloqueos(Array.isArray(bloqData) ? bloqData : []);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, [canchaId]);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semana);
    d.setDate(semana.getDate() + i);
    return d;
  });

  const toFecha = (d: Date) => d.toISOString().split("T")[0];
  const hoy = toFecha(new Date());

  const getReserva = (dia: Date, hora: string) => {
    const fecha = toFecha(dia);
    return reservas.find(
      (r) =>
        r.fecha === fecha &&
        r.hora === hora &&
        r.estado !== "cancelada" &&
        r.estado !== "rechazada",
    );
  };

  const esBloqueado = (dia: Date, hora: string) =>
    bloqueos.some((b) => estaBloquedoPor(b, toFecha(dia), hora));

  const navSemana = (dir: -1 | 1) => {
    const s = new Date(semana);
    s.setDate(s.getDate() + dir * 7);
    setSemana(s);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Cargando horario...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navegación de semana */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => navSemana(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold text-foreground">
          {dias[0].toLocaleDateString("es-PE", {
            day: "numeric",
            month: "long",
          })}
          {" – "}
          {dias[6].toLocaleDateString("es-PE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <Button variant="outline" size="icon" onClick={() => navSemana(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {[
          {
            cls: "bg-green-100 border-green-300 dark:bg-green-950/40 dark:border-green-800",
            label: "Libre",
          },
          {
            cls: "bg-yellow-100 border-yellow-300 dark:bg-yellow-950/40 dark:border-yellow-700",
            label: "Pendiente",
          },
          { cls: "bg-primary/20 border-primary/40", label: "Confirmada" },
          { cls: "bg-muted border-border", label: "Bloqueado" },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-sm border", cls)} />
            {label}
          </span>
        ))}
      </div>

      {/* Grilla */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-14">
                Hora
              </th>
              {dias.map((d, i) => (
                <th
                  key={i}
                  className={cn(
                    "min-w-[88px] px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide",
                    toFecha(d) === hoy
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {DIAS_LABEL[i]}
                  <p className="mt-0.5 text-[10px] font-normal">
                    {d.toLocaleDateString("es-PE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horasOperacion.map((hora) => (
              <tr key={hora} className="border-t border-border">
                <td className="sticky left-0 z-10 bg-background px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {hora}
                </td>
                {dias.map((d, i) => {
                  const reserva = getReserva(d, hora);
                  const bloqueado = !reserva && esBloqueado(d, hora);

                  if (bloqueado)
                    return (
                      <td key={i} className="px-2 py-2 text-center bg-muted/60">
                        <span className="text-[9px] text-muted-foreground">
                          Bloq.
                        </span>
                      </td>
                    );

                  if (reserva) {
                    const isPendiente = reserva.estado === "pendiente";
                    return (
                      <td
                        key={i}
                        className={cn(
                          "px-1 py-1.5 text-center",
                          isPendiente
                            ? "bg-yellow-50 dark:bg-yellow-950/30"
                            : "bg-primary/10",
                        )}
                      >
                        <p
                          className={cn(
                            "truncate text-[10px] font-semibold",
                            isPendiente
                              ? "text-yellow-700 dark:text-yellow-400"
                              : "text-primary",
                          )}
                        >
                          {(reserva.usuario_nombre ?? "Cliente").split(" ")[0]}
                        </p>
                        <p
                          className={cn(
                            "text-[9px]",
                            isPendiente
                              ? "text-yellow-600 dark:text-yellow-500"
                              : "text-primary/70",
                          )}
                        >
                          {isPendiente ? "Pendiente" : "Confirmada"}
                        </p>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={i}
                      className="px-2 py-2 bg-green-50/60 dark:bg-green-950/10"
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Pestaña de ubicación ────────────────────────────────────────
function UbicacionTab({
  direccion,
  lat,
  lng,
  onDireccionChange,
  onCoordsChange,
  distrito,
  onDistritoChange,
}: {
  direccion: string;
  lat: string;
  lng: string;
  distrito: string;
  onDireccionChange: (v: string) => void;
  onCoordsChange: (lat: string, lng: string, distrito?: string) => void;
  onDistritoChange: (v: string) => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [MapPicker, setMapPicker] = useState<React.ComponentType<{
    lat: number;
    lng: number;
    onChange: (lat: number, lng: number) => void;
  }> | null>(null);

  // Cargar MapPicker solo en cliente
  useEffect(() => {
    import("@/components/map-picker").then((m) =>
      setMapPicker(() => m.MapPicker),
    );
  }, []);

  const buscarDireccion = async () => {
    if (!direccion.trim()) return;
    setBuscando(true);
    setError("");
    try {
      const query = encodeURIComponent(direccion);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { "Accept-Language": "es" } },
      );
      const data = await res.json();
      if (data.length === 0) {
        setError("No se encontró la dirección. Intenta ser más específico.");
      } else {
        const lat = data[0].lat;
        const lon = data[0].lon;
        onCoordsChange(lat, lon);
      }
    } catch {
      setError("Error al buscar la dirección. Verifica tu conexión.");
    } finally {
      setBuscando(false);
    }
  };

  const tieneCoords = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));
  // Coords por defecto: centro de Piura
  const mapLat = tieneCoords ? Number(lat) : -5.1945;
  const mapLng = tieneCoords ? Number(lng) : -80.6328;

  return (
    <Card className="border-border p-5 space-y-4">
      <div>
        <p className="font-medium text-foreground">Ubicación de la cancha</p>
        <p className="text-sm text-muted-foreground">
          Busca la dirección y luego arrastra el pin o haz clic en el mapa para
          ajustar la ubicación exacta.
        </p>
      </div>

      {/* Buscador */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Dirección</label>
        <div className="flex gap-2">
          <Input
            value={direccion}
            onChange={(e) => onDireccionChange(e.target.value)}
            placeholder="Ej: Av. Los Algarrobos 1250, Chiclayo"
            onKeyDown={(e) => {
              if (e.key === "Enter") buscarDireccion();
            }}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={buscarDireccion}
            disabled={buscando || !direccion.trim()}
            className="shrink-0 gap-2"
          >
            <MapPin className="h-4 w-4" />
            {buscando ? "Buscando..." : "Buscar"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Campo de distrito editable */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Distrito</label>
        <Input
          value={distrito}
          onChange={(e) => onDistritoChange(e.target.value)}
          placeholder="Ej: Chiclayo, Piura, Tambogrande..."
          className="bg-blue-500/5 border-blue-500/20"
        />
        <p className="text-xs text-muted-foreground">
          💡 Escribe el distrito manualmente. Se guardará tal como lo escribas.
        </p>
      </div>

      {/* Mapa interactivo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Ajusta el pin en el mapa
          </label>
          {tieneCoords && (
            <span className="text-xs text-muted-foreground">
              {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
            </span>
          )}
        </div>

        {MapPicker ? (
          <MapPicker
            lat={mapLat}
            lng={mapLng}
            onChange={(
              newLat: number,
              newLng: number,
              newDireccion?: string,
            ) => {
              onCoordsChange(String(newLat), String(newLng));
              if (newDireccion) onDireccionChange(newDireccion);
            }}
          />
        ) : (
          <div className="h-72 w-full animate-pulse rounded-xl bg-muted" />
        )}

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          💡 Haz clic en el mapa o arrastra el marcador para ajustar la posición
          exacta
        </p>
      </div>

      {tieneCoords && (
        <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <p className="text-sm text-primary font-medium">
            ✅ Ubicación lista. Haz clic en "Guardar cambios" para confirmar.
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0 ml-3"
          >
            <MapPin className="h-3 w-3" /> Ver en Google Maps
          </a>
        </div>
      )}
    </Card>
  );
}

// ── Tab de fidelización ───────────────────────────────────────────────
const UMBRAL_OPCIONES = [4, 5, 6, 7, 8, 9, 10, 12, 15, 20];
const PREMIO_TIPOS = [
  { value: 'descuento_fijo',       label: 'Descuento fijo (S/)' },
  { value: 'descuento_porcentaje', label: 'Descuento en porcentaje (%)' },
  { value: 'hora_gratis',          label: 'Hora gratis' },
  { value: 'personalizado',        label: 'Premio personalizado' },
];

function FidelizacionTab({ canchaId }: { canchaId: string }) {
  const [activo, setActivo]                   = useState(false);
  const [umbral, setUmbral]                   = useState(8);
  const [premioTipo, setPremioTipo]           = useState('descuento_fijo');
  const [premioValor, setPremioValor]         = useState(5);
  const [premioDescripcion, setPremioDesc]    = useState('');
  const [cargando, setCargando]               = useState(true);
  const [guardando, setGuardando]             = useState(false);
  const [guardado, setGuardado]               = useState(false);
  const [error, setError]                     = useState('');

  useEffect(() => {
    const token = getOwnerToken();
    if (!token || !canchaId) return;
    fetch(`/api/admin-cancha/loyalty-config?canchaId=${canchaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data) {
          setActivo(data.activo ?? false);
          setUmbral(data.umbral ?? 8);
          setPremioTipo(data.premio_tipo ?? 'descuento_fijo');
          setPremioValor(data.premio_valor ?? 5);
          setPremioDesc(data.premio_descripcion ?? '');
        }
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, [canchaId]);

  const handleGuardar = async () => {
    const token = getOwnerToken();
    if (!token) return;
    setGuardando(true);
    setError('');
    const res = await fetch('/api/admin-cancha/loyalty-config', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canchaId,
        activo,
        umbral,
        premioTipo,
        premioValor: premioTipo === 'hora_gratis' ? null : premioValor,
        premioDescripcion,
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? 'Error al guardar');
    } else {
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Cargando configuración...</span>
      </div>
    );
  }

  const mostrarValor = premioTipo !== 'hora_gratis' && premioTipo !== 'personalizado';
  const labelValor   = premioTipo === 'descuento_porcentaje' ? '%' : 'S/';

  return (
    <div className="space-y-4 pt-4">
      {/* Banner explicativo */}
      <Card className="border-border bg-primary/5 border-primary/20 p-5">
        <div className="flex items-start gap-3">
          <Gift className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-foreground text-sm">Programa de sellos por cancha</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cada vez que un cliente confirme una reserva aquí, acumulará un sello.
              Al llegar al número que definas, recibirá automáticamente un premio
              canjeble <strong>solo en tu cancha</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* Toggle activo */}
      <Card className="border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground text-sm">Estado del programa</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activo ? 'Los clientes están acumulando sellos.' : 'El programa está desactivado.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActivo(v => !v)}
            className="flex items-center gap-2 focus:outline-none"
          >
            {activo
              ? <ToggleRight className="h-9 w-9 text-primary" />
              : <ToggleLeft  className="h-9 w-9 text-muted-foreground" />}
          </button>
        </div>
      </Card>

      {/* Configuración */}
      <Card className="border-border p-5 space-y-5">
        {/* Umbral */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            ¿Cuántas reservas se necesitan para ganar un premio?
          </label>
          <div className="flex flex-wrap gap-2">
            {UMBRAL_OPCIONES.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setUmbral(n)}
                className={cn(
                  "h-10 w-12 rounded-xl border-2 text-sm font-semibold transition-all",
                  umbral === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/50",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Sellos necesarios: <span className="font-medium text-foreground">{umbral}</span>
          </p>
        </div>

        <Separator />

        {/* Tipo de premio */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Tipo de premio</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PREMIO_TIPOS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPremioTipo(value)}
                className={cn(
                  "rounded-xl border-2 px-4 py-3 text-left text-sm transition-all",
                  premioTipo === value
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border bg-card text-foreground hover:border-primary/30",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Valor del premio */}
        {mostrarValor && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Valor del descuento ({labelValor})
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{labelValor}</span>
              <input
                type="number"
                min={1}
                max={premioTipo === 'descuento_porcentaje' ? 100 : 500}
                value={premioValor}
                onChange={e => setPremioValor(Number(e.target.value))}
                className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Descripción personalizada */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Descripción del premio{premioTipo === 'personalizado' ? '' : ' (opcional)'}
          </label>
          <input
            type="text"
            maxLength={120}
            value={premioDescripcion}
            onChange={e => setPremioDesc(e.target.value)}
            placeholder={
              premioTipo === 'personalizado'
                ? 'Ej: Una bebida gratis, descuento en accesorio...'
                : 'Texto que verá el cliente al ganar el premio'
            }
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Vista previa */}
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-1">
          <p className="text-xs font-medium text-primary uppercase tracking-wide">Vista previa del cliente</p>
          <p className="text-sm text-foreground">
            🎯 Reserva <strong>{umbral} veces</strong> en esta cancha y gana:{' '}
            {premioTipo === 'descuento_fijo'       && <strong>S/ {premioValor} de descuento</strong>}
            {premioTipo === 'descuento_porcentaje' && <strong>{premioValor}% de descuento</strong>}
            {premioTipo === 'hora_gratis'          && <strong>1 hora gratis</strong>}
            {premioTipo === 'personalizado'        && <strong>{premioDescripcion || '(sin descripción)'}</strong>}
            {premioDescripcion && premioTipo !== 'personalizado' && ` — ${premioDescripcion}`}
          </p>
        </div>
      </Card>

      {/* Error y botón guardar */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGuardar}
        disabled={guardando}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-opacity"
      >
        {guardando ? 'Guardando...' : guardado ? '¡Guardado! ✓' : 'Guardar configuración'}
      </button>
    </div>
  );
}

export default function OwnerEditarCanchaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState(0);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("info");
  const [preciosPorHora, setPreciosPorHora] = useState<Record<string, number>>(
    {},
  );
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const precioRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoIcono, setNuevoIcono] = useState('🎯');
  const [nuevaModalidad, setNuevaModalidad] = useState<'prestado' | 'alquilado'>('alquilado');
  const [nuevoPrecio, setNuevoPrecio] = useState<number | null>(null);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [superficie, setSuperficie] = useState<string>("grass_sintetico");
  const [maxJugadores, setMaxJugadores] = useState<number | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [direccion, setDireccion] = useState("");
  const [distrito, setDistrito] = useState("");
  const [yapeNumero, setYapeNumero] = useState("");
  const [plinNumero, setPlinNumero] = useState("");
  const [yapeError, setYapeError] = useState("");
  const [plinError, setPlinError] = useState("");
  const [horaApertura, setHoraApertura] = useState("06:00");
  const [horaCierre, setHoraCierre]     = useState("23:00");

  useEffect(() => {
    const token = getOwnerToken();
    if (!token) {
      router.replace("/admin-cancha/login");
      return;
    }

    // Cargar cancha desde BD
    fetch(`/api/admin-cancha/cancha?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((canchaData) => {
        if (canchaData.error) {
          console.error(
            "Error cargando cancha:",
            canchaData.error,
            canchaData.debug,
          );
          router.replace("/admin-cancha/canchas");
          return;
        }
        setCancha(canchaData);
        setDescription(canchaData.descripcion ?? "");
        setPhone(canchaData.telefono ?? "");
        setPrice(canchaData.precio_por_hora ?? 0);
        setAmenities(canchaData.amenidades ?? []);
        setImages(canchaData.imagenes ?? []);
        setPreciosPorHora(canchaData.precios_por_hora ?? {});
        setAccesorios(canchaData.accesorios ?? []);
        setSuperficie(canchaData.superficie ?? "grass_sintetico");
        setMaxJugadores(canchaData.max_jugadores ?? null);
        setLoading(false);

        setLat(String(canchaData.lat ?? ""));
        setLng(String(canchaData.lng ?? ""));
        setDireccion(canchaData.direccion ?? "");
        setDistrito(canchaData.distrito ?? "");
        setYapeNumero(canchaData.yape_numero ?? "");
        setPlinNumero(canchaData.plin_numero ?? "");
        setHoraApertura(canchaData.hora_apertura ?? "06:00");
        setHoraCierre(canchaData.hora_cierre ?? "23:00");
      })
      .catch((err) => {
        console.error("Error de red:", err);
        setLoading(false);
      });
  }, [id, router]);

  const validarNumero = (num: string) => num === "" || /^9\d{8}$/.test(num);

  const handleSave = async () => {
    const token = getOwnerToken();
    if (!token) return;

    // Validar números de pago antes de guardar
    const yapeOk = validarNumero(yapeNumero);
    const plinOk = validarNumero(plinNumero);
    setYapeError(
      yapeOk
        ? ""
        : "Debe ser un número peruano válido (9 dígitos, empieza con 9)",
    );
    setPlinError(
      plinOk
        ? ""
        : "Debe ser un número peruano válido (9 dígitos, empieza con 9)",
    );
    if (!yapeOk || !plinOk) return;

    setSaving(true);
    setSaveError("");

    console.log("🔍 handleSave - Valores a enviar:");
    console.log("  descripcion:", description);
    console.log("  telefono:", phone);
    console.log("  precioHora:", price);
    console.log("  lat:", lat);
    console.log("  lng:", lng);
    console.log("  direccion:", direccion);
    console.log("  distrito:", distrito);

    const res = await fetch(`/api/admin-cancha/cancha?id=${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        descripcion: description,
        telefono: phone,
        precioHora: price,
        amenidades: amenities,
        imagenes: images,
        preciosPorHora,
        accesorios,
        superficie: superficie,
        maxJugadores: maxJugadores,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        direccion: direccion || undefined,
        distrito: distrito || undefined,
        yapeNumero: yapeNumero || null,
        plinNumero: plinNumero || null,
        horaApertura,
        horaCierre,
      }),
    });

    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setSaveError(data.error ?? "Error al guardar");
    }
  };

  const removeImage = (idx: number) =>
    setImages((prev) => prev.filter((_, i) => i !== idx));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const token = getOwnerToken();
    if (!token) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    setUploadError("");

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("canchaId", id);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (data.error) {
        setUploadError(data.error);
      } else if (data.url) {
        setImages((prev) => [...prev, data.url]);
      }
    }
    setUploading(false);
    // Limpiar el input para permitir subir el mismo archivo de nuevo
    if (fileRef.current) fileRef.current.value = "";
  };

  const addImageUrl = () => {}; // ya no se usa

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!cancha) return null;

  return (
    <div>
      {/* Header — sticky para que el botón siempre sea accesible al hacer scroll */}
      <div className="sticky top-0 z-20 -mx-4 -mt-4 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:-mx-6 lg:px-6">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">
              {cancha.nombre}
            </h1>
            <p className="text-xs text-muted-foreground">Editar mi cancha</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "gap-2 shrink-0",
            (activeTab === "bloqueos" || activeTab === "fidelizacion") && "invisible",
          )}
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">
            {saving ? "Guardando..." : saved ? "¡Guardado! ✓" : "Guardar cambios"}
          </span>
        </Button>
      </div>

      <div className="space-y-4 pt-6">
        {saveError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {saveError}
          </div>
        )}

        <Tabs defaultValue="info" onValueChange={setActiveTab}>
          <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
            <TabsList className="w-max min-w-full sm:w-auto">
              <TabsTrigger value="horario">Horario</TabsTrigger>
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="fotos">Fotos</TabsTrigger>
              <TabsTrigger value="bloqueos">Bloqueos</TabsTrigger>
              <TabsTrigger value="ubicacion">Ubicación</TabsTrigger>
              <TabsTrigger value="servicios">Servicios</TabsTrigger>
              <TabsTrigger value="fidelizacion">Fidelización</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Horario ── */}
          <TabsContent value="horario" className="pt-4 space-y-4">
            {/* Configuración de horario de operación */}
            <Card className="border-border p-5 space-y-4">
              <div>
                <p className="font-medium text-foreground">Horario de operación</p>
                <p className="text-sm text-muted-foreground">Define las horas en que tu cancha está disponible para reservas.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Apertura</label>
                  <select
                    value={horaApertura}
                    onChange={e => setHoraApertura(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {HORAS_APP.filter(h => h < horaCierre).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Cierre</label>
                  <select
                    value={horaCierre}
                    onChange={e => setHoraCierre(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {HORAS_APP.filter(h => h > horaApertura).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Los usuarios solo verán horas entre <span className="font-medium text-foreground">{horaApertura}</span> y <span className="font-medium text-foreground">{horaCierre}</span>.
              </p>
            </Card>

            <Card className="border-border p-5">
              <HorarioTab canchaId={id as string} horasOperacion={getHorasOperacion(horaApertura, horaCierre)} />
            </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-4 pt-4">
            <Card className="border-border p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Descripción
                </label>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px] resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe tu cancha..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Teléfono de contacto
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+51 999 999 999"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Precio base por hora (S/)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se aplica a las horas que no tengan precio personalizado.
                  </p>
                </div>
              </div>

              {/* Superficie */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Tipo de superficie
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      { value: "grass", label: "Grass natural", icon: "🌿" },
                      {
                        value: "grass_sintetico",
                        label: "Grass sintético",
                        icon: "🟩",
                      },
                      { value: "loza", label: "Loza", icon: "🏗️" },
                      { value: "cemento", label: "Cemento", icon: "⬜" },
                    ] as const
                  ).map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSuperficie(value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all",
                        superficie === value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30",
                      )}
                    >
                      <span className="text-xl">{icon}</span>
                      <span className="text-xs font-medium leading-tight">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Máximo de jugadores */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Máximo de jugadores
                </label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {[null, 8, 10, 12, 14, 16, 20, 22].map((n) => (
                    <button
                      key={n ?? "none"}
                      type="button"
                      onClick={() => setMaxJugadores(n)}
                      className={cn(
                        "rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                        maxJugadores === n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40",
                      )}
                    >
                      {n ?? "—"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {maxJugadores
                    ? `Máximo ${maxJugadores} jugadores por partido`
                    : "Sin límite definido"}
                </p>
              </div>

              {/* Métodos de pago */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Métodos de pago aceptados
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ingresa el número de cada billetera. Déjalo vacío si no
                    aceptas ese método.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#6C1FC6]/10">
                        <span className="text-xs font-bold text-[#6C1FC6]">
                          Y
                        </span>
                      </div>
                      <label className="text-sm font-medium text-foreground">
                        Número Yape
                      </label>
                    </div>
                    <Input
                      type="tel"
                      placeholder="Ej: 987654321 (vacío = no aceptas Yape)"
                      value={yapeNumero}
                      onChange={(e) => {
                        setYapeNumero(e.target.value);
                        setYapeError("");
                      }}
                      className={cn(
                        yapeError &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                    {yapeError && (
                      <p className="text-xs text-destructive">{yapeError}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#00C2CB]/10">
                        <span className="text-xs font-bold text-[#00A0A8]">
                          P
                        </span>
                      </div>
                      <label className="text-sm font-medium text-foreground">
                        Número Plin
                      </label>
                    </div>
                    <Input
                      type="tel"
                      placeholder="Ej: 987654321 (vacío = no aceptas Plin)"
                      value={plinNumero}
                      onChange={(e) => {
                        setPlinNumero(e.target.value);
                        setPlinError("");
                      }}
                      className={cn(
                        plinError &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                    {plinError && (
                      <p className="text-xs text-destructive">{plinError}</p>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium",
                    !yapeNumero && !plinNumero
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-700"
                      : "bg-primary/5 border border-primary/20 text-primary",
                  )}
                >
                  {!yapeNumero && !plinNumero ? (
                    <>
                      ⚠️ Sin Yape ni Plin configurado — los clientes pagarán en{" "}
                      <strong className="ml-1">efectivo en cancha</strong>
                    </>
                  ) : (
                    <>
                      ✓ Acepta:{" "}
                      {[yapeNumero && "Yape", plinNumero && "Plin"]
                        .filter(Boolean)
                        .join(" y ")}
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Precios por hora */}
            <Card className="border-border p-5 space-y-4">
              <div>
                <p className="font-medium text-foreground">Precios por hora</p>
                <p className="text-sm text-muted-foreground">
                  Personaliza el precio de cada horario. Las horas sin precio
                  usarán el precio base (S/ {price}).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
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
                ].map((hora) => {
                  const valorActual = preciosPorHora[hora];
                  const tienePersonalizado = valorActual !== undefined;
                  return (
                    <div
                      key={hora}
                      className={`rounded-xl border p-3 space-y-1.5 transition-colors ${tienePersonalizado ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {hora}
                        </span>
                        {tienePersonalizado && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...preciosPorHora };
                              delete next[hora];
                              setPreciosPorHora(next);
                            }}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          S/
                        </span>
                        <Input
                          type="number"
                          min={0}
                          placeholder={String(price)}
                          value={valorActual ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              const next = { ...preciosPorHora };
                              delete next[hora];
                              setPreciosPorHora(next);
                            } else {
                              setPreciosPorHora((prev) => ({
                                ...prev,
                                [hora]: Number(val),
                              }));
                            }
                          }}
                          className="h-8 text-sm px-2"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {Object.keys(preciosPorHora).length > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-2.5">
                  <p className="text-sm text-primary">
                    {Object.keys(preciosPorHora).length} hora
                    {Object.keys(preciosPorHora).length > 1 ? "s" : ""} con
                    precio personalizado
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreciosPorHora({})}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Limpiar todo
                  </button>
                </div>
              )}
            </Card>

            {/* Accesorios dinámicos */}
            <Card className="border-border p-5 space-y-4">
              <div>
                <p className="font-medium text-foreground">Accesorios</p>
                <p className="text-sm text-muted-foreground">
                  Indica qué ofreces con tu cancha, si lo prestas gratis o lo alquilas.
                </p>
              </div>

              {/* Lista de accesorios actuales */}
              {accesorios.length > 0 && (
                <div className="space-y-2">
                  {accesorios.map((acc) => (
                    <div key={acc.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <span className="text-xl shrink-0">{acc.icono}</span>
                      <span className="flex-1 text-sm font-medium text-foreground">{acc.nombre}</span>

                      {/* Toggle prestado / alquilado */}
                      <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs shrink-0">
                        {(['prestado', 'alquilado'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setAccesorios(prev => prev.map(a =>
                                a.id === acc.id
                                  ? { ...a, modalidad: m, precio: m === 'prestado' ? null : a.precio }
                                  : a
                              ));
                              if (m === 'alquilado') {
                                setTimeout(() => precioRefs.current[acc.id]?.focus(), 0);
                              }
                            }}
                            className={cn(
                              'px-2.5 py-1.5 font-medium capitalize transition-colors',
                              acc.modalidad === m
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>

                      {/* Precio — siempre visible, bloqueado si prestado */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">S/</span>
                        <Input
                          ref={(el) => { precioRefs.current[acc.id] = el; }}
                          type="number"
                          min={0}
                          placeholder="0"
                          disabled={acc.modalidad === 'prestado'}
                          value={acc.modalidad === 'prestado' ? 0 : (acc.precio ?? '')}
                          onChange={(e) => setAccesorios(prev => prev.map(a =>
                            a.id === acc.id
                              ? { ...a, precio: e.target.value === '' ? null : Number(e.target.value) }
                              : a
                          ))}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (acc.modalidad === 'alquilado' && (val === '' || Number(val) === 0)) {
                              setAccesorios(prev => prev.map(a =>
                                a.id === acc.id ? { ...a, modalidad: 'prestado', precio: null } : a
                              ));
                            }
                          }}
                          className="h-7 w-16 text-sm px-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => setAccesorios(prev => prev.filter(a => a.id !== acc.id))}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sugerencias según deporte */}
              {(() => {
                const tipo = (cancha as any)?.tipo as string | undefined;
                const presets = tipo ? (PRESETS_POR_DEPORTE[tipo] ?? []) : [];
                const nombresActuales = accesorios.map(a => a.nombre.toLowerCase());
                const sugerencias = presets.filter(p => !nombresActuales.includes(p.nombre.toLowerCase()));
                if (!sugerencias.length) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Sugerencias para tu cancha
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sugerencias.map((s) => (
                        <button
                          key={s.nombre}
                          type="button"
                          onClick={() => setAccesorios(prev => [...prev, {
                            id: crypto.randomUUID(),
                            nombre: s.nombre,
                            icono: s.icono,
                            modalidad: 'alquilado',
                            precio: null,
                          }])}
                          className="flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          {s.icono} {s.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Formulario para agregar personalizado */}
              {mostrarFormNuevo ? (
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Agregar accesorio</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="🎯"
                      value={nuevoIcono}
                      onChange={(e) => setNuevoIcono(e.target.value)}
                      className="h-9 w-16 text-center text-lg px-1"
                      maxLength={2}
                    />
                    <Input
                      placeholder="Nombre del accesorio"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      className="h-9 flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
                      {(['prestado', 'alquilado'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setNuevaModalidad(m);
                            if (m === 'prestado') setNuevoPrecio(null);
                          }}
                          className={cn(
                            'px-3 py-2 font-medium capitalize transition-colors',
                            nuevaModalidad === m
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background text-muted-foreground hover:bg-muted'
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    {nuevaModalidad === 'alquilado' && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">S/</span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={nuevoPrecio ?? ''}
                          onChange={(e) => setNuevoPrecio(e.target.value === '' ? null : Number(e.target.value))}
                          className="h-9 w-20 text-sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!nuevoNombre.trim()) return;
                        setAccesorios(prev => [...prev, {
                          id: crypto.randomUUID(),
                          nombre: nuevoNombre.trim(),
                          icono: nuevoIcono || '🎯',
                          modalidad: nuevaModalidad,
                          precio: nuevaModalidad === 'prestado' ? null : nuevoPrecio,
                        }]);
                        setNuevoNombre('');
                        setNuevoIcono('🎯');
                        setNuevaModalidad('alquilado');
                        setNuevoPrecio(null);
                        setMostrarFormNuevo(false);
                      }}
                    >
                      Agregar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarFormNuevo(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMostrarFormNuevo(true)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Agregar accesorio personalizado
                </button>
              )}
            </Card>
          </TabsContent>

          {/* ── Fidelización ── */}
          <TabsContent value="fidelizacion">
            <FidelizacionTab canchaId={id as string} />
          </TabsContent>

          {/* ── Fotos ── */}
          <TabsContent value="fotos" className="space-y-4 pt-4">
            <Card className="border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {images.length} de {6} foto{images.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Máximo 6 imágenes por cancha
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || images.length >= 6}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {uploading
                    ? "Subiendo..."
                    : images.length >= 6
                      ? "Límite alcanzado"
                      : "Subir foto"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="group relative aspect-video overflow-hidden rounded-xl border border-border"
                  >
                    <Image
                      src={img}
                      alt={`Foto ${i + 1}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => removeImage(i)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {i === 0 && (
                      <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground text-xs">
                        Principal
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
            </Card>
          </TabsContent>

          {/* ── Bloqueos avanzados ── */}
          <TabsContent value="bloqueos" className="space-y-4 pt-4">
            <div className="rounded-xl border border-border bg-card px-4 py-3 mb-2">
              <p className="text-sm font-medium text-foreground">
                Bloqueos por fecha o recurrentes
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bloquea horarios para un día específico, de forma recurrente
                cada semana, o de forma permanente. Los horarios bloqueados no
                estarán disponibles para reservas.
              </p>
            </div>
            <BloqueosAdminPanel canchaId={id} token={getOwnerToken() ?? ""} horasOperacion={getHorasOperacion(horaApertura, horaCierre)} />
          </TabsContent>

          {/* ── Ubicación ── */}
          <TabsContent value="ubicacion" className="space-y-4 pt-4">
            {" "}
            <UbicacionTab
              direccion={direccion}
              lat={lat}
              lng={lng}
              distrito={distrito}
              onDireccionChange={setDireccion}
              onDistritoChange={setDistrito}
              onCoordsChange={(newLat, newLng, newDistrito) => {
                setLat(newLat);
                setLng(newLng);
                if (newDistrito) setDistrito(newDistrito);
              }}
            />
          </TabsContent>

          {/* ── Servicios ── */}
          <TabsContent value="servicios" className="space-y-4 pt-4">
            <Card className="border-border p-5 space-y-4">
              <p className="font-medium text-foreground">
                Servicios y amenidades
              </p>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a) => (
                  <div
                    key={a}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm"
                  >
                    <span className="text-foreground">{a}</span>
                    <button
                      onClick={() =>
                        setAmenities((prev) => prev.filter((x) => x !== a))
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: Estacionamiento, WiFi..."
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (newAmenity.trim()) {
                        setAmenities((prev) => [...prev, newAmenity.trim()]);
                        setNewAmenity("");
                      }
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (newAmenity.trim()) {
                      setAmenities((prev) => [...prev, newAmenity.trim()]);
                      setNewAmenity("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
