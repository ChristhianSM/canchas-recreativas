"use client";

import { useState, useEffect, useRef } from "react";
import { getAdminTokenFresh } from "@/lib/supabase-browser";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { BloqueosAdminPanel } from "@/components/bloqueos-admin-panel";
import {
  estaBloquedoPor,
  HORAS_APP,
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
  distrito: string;
};

type Usuario = { id: string; nombre: string; email: string; rol: string };

// ── Pestaña de horario ─────────────────────────────────────────
const DIAS_LABEL_ADMIN = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getLunesDeSemanaAdmin(base = new Date()): Date {
  const d = new Date(base);
  const dia = d.getDay();
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia));
  d.setHours(0, 0, 0, 0);
  return d;
}

function HorarioTab({ canchaId }: { canchaId: string }) {
  const [reservas, setReservas] = useState<any[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [semana, setSemana] = useState<Date>(getLunesDeSemanaAdmin);

  useEffect(() => {
    getAdminTokenFresh().then((token) => {
      if (!token) return;
      Promise.all([
        fetch("/api/reservas/all", {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetch(`/api/admin/bloqueos?canchaId=${canchaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
      ])
        .then(([resData, bloqData]) => {
          const lista = Array.isArray(resData)
            ? resData
            : (resData?.data ?? []);
          setReservas(lista.filter((r: any) => r.cancha_id === canchaId));
          setBloqueos(Array.isArray(bloqData) ? bloqData : []);
          setCargando(false);
        })
        .catch(() => setCargando(false));
    });
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

  if (cargando)
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Cargando horario...</span>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navSemana(-1)}
          className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
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
        <button
          onClick={() => navSemana(1)}
          className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

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

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 w-14 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Hora
              </th>
              {dias.map((d, i) => (
                <th
                  key={i}
                  className={cn(
                    "min-w-22 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide",
                    toFecha(d) === hoy
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {DIAS_LABEL_ADMIN[i]}
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
            {HORAS_APP.map((hora) => (
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

// ── Pestaña de ubicación con mapa interactivo ───────────────────
function UbicacionTab({
  direccion,
  lat,
  lng,
  distrito,
  onDireccionChange,
  onCoordsChange,
  onDistritoChange,
}: {
  direccion: string;
  lat: string;
  lng: string;
  distrito: string;
  onDireccionChange: (v: string) => void;
  onCoordsChange: (lat: string, lng: string, direccion?: string) => void;
  onDistritoChange: (v: string) => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [MapPicker, setMapPicker] = useState<React.ComponentType<{
    lat: number;
    lng: number;
    onChange: (lat: number, lng: number, direccion?: string) => void;
  }> | null>(null);

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
      const query = encodeURIComponent(`${direccion}, Piura, Peru`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { "Accept-Language": "es" } },
      );
      const data = await res.json();
      if (data.length === 0) {
        setError("No se encontró la dirección. Intenta ser más específico.");
      } else {
        onCoordsChange(data[0].lat, data[0].lon);
      }
    } catch {
      setError("Error al buscar la dirección.");
    } finally {
      setBuscando(false);
    }
  };

  const tieneCoords = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));
  const mapLat = tieneCoords ? Number(lat) : -5.1945;
  const mapLng = tieneCoords ? Number(lng) : -80.6328;

  return (
    <Card className="border-border p-5 space-y-4">
      <div>
        <p className="font-medium text-foreground">Ubicación de la cancha</p>
        <p className="text-sm text-muted-foreground">
          Busca la dirección y ajusta el pin en el mapa.
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Dirección</label>
        <div className="flex gap-2">
          <Input
            value={direccion}
            onChange={(e) => onDireccionChange(e.target.value)}
            placeholder="Av. Los Algarrobos 1250, Piura"
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
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Distrito</label>
        <Input
          value={distrito}
          onChange={(e) => onDistritoChange(e.target.value)}
          placeholder="Ej: Piura, Castilla, Tambogrande..."
          className="bg-blue-500/5 border-blue-500/20"
        />
        <p className="text-xs text-muted-foreground">
          💡 Escribe el distrito manualmente.
        </p>
      </div>
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
            onChange={(newLat, newLng, newDir) => {
              onCoordsChange(String(newLat), String(newLng));
              if (newDir) onDireccionChange(newDir);
            }}
          />
        ) : (
          <div className="h-72 w-full animate-pulse rounded-xl bg-muted" />
        )}
        <p className="text-xs text-muted-foreground">
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

export default function AdminEditarCanchaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState(0);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [direccion, setDireccion] = useState("");
  const [distrito, setDistrito] = useState("");
  const [duenos, setDuenos] = useState<Usuario[]>([]);
  const [duenoId, setDuenoId] = useState("");
  const [adminToken, setAdminToken] = useState("");

  // Extras
  const [preciosPorHora, setPreciosPorHora] = useState<Record<string, number>>(
    {},
  );
  const [balonDisponible, setBalonDisponible] = useState(false);
  const [balonPrecio, setBalonPrecio] = useState<number | null>(null);
  const [chalecosDisponible, setChalecosDisponible] = useState(false);
  const [chalecosPrecio, setChalecosPrecio] = useState<number | null>(null);
  const [superficie, setSuperficie] = useState<string>("grass_sintetico");
  const [maxJugadores, setMaxJugadores] = useState<number | null>(null);

  useEffect(() => {
    getAdminTokenFresh().then((token) => {
      setAdminToken(token);
      const authHeaders = { Authorization: `Bearer ${token}` };
      Promise.all([
        fetch(`/api/canchas/detail?id=${id}`).then((r) => r.json()),
        fetch("/api/admin/usuarios", { headers: authHeaders }).then((r) =>
          r.json(),
        ),
      ])
        .then(([canchaData, usuariosData]) => {
          if (canchaData.error) {
            router.replace("/admin/canchas");
            return;
          }
          setCancha(canchaData);
          setDescription(canchaData.descripcion ?? "");
          setPhone(canchaData.telefono ?? "");
          setPrice(canchaData.precio_por_hora ?? 0);
          setAmenities(canchaData.amenidades ?? []);
          setImages(canchaData.imagenes ?? []);
          setLat(String(canchaData.lat ?? ""));
          setLng(String(canchaData.lng ?? ""));
          setDireccion(canchaData.direccion ?? "");
          setDistrito(canchaData.distrito ?? "");
          setPreciosPorHora(canchaData.precios_por_hora ?? {});
          setBalonDisponible(canchaData.balon_disponible ?? false);
          setBalonPrecio(canchaData.balon_precio ?? null);
          setChalecosDisponible(canchaData.chalecos_disponible ?? false);
          setChalecosPrecio(canchaData.chalecos_precio ?? null);
          setSuperficie(canchaData.superficie ?? "grass_sintetico");
          setMaxJugadores(canchaData.max_jugadores ?? null);

          const usuarios = Array.isArray(usuariosData) ? usuariosData : [];
          setDuenos(usuarios.filter((u: Usuario) => u.rol === "dueno"));
          setLoading(false);
        })
        .catch(() => setLoading(false));

      fetch("/api/admin/canchas", { headers: authHeaders })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const c = data.find((x: any) => x.id === id);
            if (c?.dueno) setDuenoId(c.dueno.id);
          }
        });
    });
  }, [id, router]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    const token = await getAdminTokenFresh();
    const res = await fetch(`/api/admin/canchas/${id}`, {
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
        balonDisponible,
        balonPrecio,
        chalecosDisponible,
        chalecosPrecio,
        superficie,
        maxJugadores,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        direccion: direccion || undefined,
        distrito: distrito || undefined,
      }),
    });
    if (duenoId) {
      await fetch("/api/admin/asignar-cancha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dueno_id: duenoId, cancha_ids: [id] }),
      });
    }
    // Si duenoId está vacío, no llamamos asignar-cancha (sin dueño = se mantiene sin cambios)
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const d = await res.json();
      setSaveError(d.error ?? "Error al guardar");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("canchaId", id);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.url) setImages((prev) => [...prev, data.url]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (loading)
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  if (!cancha) return null;

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 -mt-4 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:-mx-6 lg:px-6">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">
              {cancha.nombre}
            </h1>
            <p className="text-xs text-muted-foreground">Editar cancha</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "gap-2 shrink-0",
            (activeTab === "bloqueos" || activeTab === "horario") &&
              "invisible",
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
              <TabsTrigger value="dueno">Dueño</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Información ── */}
          <TabsContent value="horario" className="pt-4">
            <Card className="border-border p-5">
              <HorarioTab canchaId={id} />
            </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-4 pt-4">
            <Card className="border-border p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Descripción
                </label>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-30 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe la cancha..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Teléfono
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
                    Se aplica a las horas sin precio personalizado.
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

              {/* Máximo jugadores */}
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
                    ? `Máximo ${maxJugadores} jugadores`
                    : "Sin límite definido"}
                </p>
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

            {/* Extras */}
            <Card className="border-border p-5 space-y-4">
              <div>
                <p className="font-medium text-foreground">
                  Extras disponibles
                </p>
                <p className="text-sm text-muted-foreground">
                  Indica si ofreces balón y/o chalecos.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="balon-disponible"
                      checked={balonDisponible}
                      onCheckedChange={(v) => {
                        setBalonDisponible(v as boolean);
                        if (!v) setBalonPrecio(null);
                      }}
                    />
                    <label
                      htmlFor="balon-disponible"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      ⚽ Ofrezco balón
                    </label>
                  </div>
                  {balonDisponible && (
                    <div className="ml-6 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        ¿Tiene costo adicional?
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground shrink-0">
                          S/
                        </span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Gratis (dejar vacío)"
                          value={balonPrecio ?? ""}
                          onChange={(e) =>
                            setBalonPrecio(
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            )
                          }
                          className="h-8 text-sm"
                        />
                        {balonPrecio != null && (
                          <button
                            type="button"
                            onClick={() => setBalonPrecio(null)}
                            className="text-xs text-muted-foreground hover:text-destructive shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-primary font-medium">
                        {balonPrecio != null
                          ? `Cobrarás S/ ${balonPrecio} por reserva`
                          : "✓ Incluido gratis"}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="chalecos-disponible"
                      checked={chalecosDisponible}
                      onCheckedChange={(v) => {
                        setChalecosDisponible(v as boolean);
                        if (!v) setChalecosPrecio(null);
                      }}
                    />
                    <label
                      htmlFor="chalecos-disponible"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      🎽 Ofrezco chalecos
                    </label>
                  </div>
                  {chalecosDisponible && (
                    <div className="ml-6 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        ¿Tiene costo adicional?
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground shrink-0">
                          S/
                        </span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Gratis (dejar vacío)"
                          value={chalecosPrecio ?? ""}
                          onChange={(e) =>
                            setChalecosPrecio(
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            )
                          }
                          className="h-8 text-sm"
                        />
                        {chalecosPrecio != null && (
                          <button
                            type="button"
                            onClick={() => setChalecosPrecio(null)}
                            className="text-xs text-muted-foreground hover:text-destructive shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-primary font-medium">
                        {chalecosPrecio != null
                          ? `Cobrarás S/ ${chalecosPrecio} por reserva`
                          : "✓ Incluidos gratis"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ── Fotos ── */}
          <TabsContent value="fotos" className="space-y-4 pt-4">
            <Card className="border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {images.length} de 6 foto{images.length !== 1 ? "s" : ""}
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
                        onClick={() =>
                          setImages((prev) => prev.filter((_, j) => j !== i))
                        }
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
            </Card>
          </TabsContent>

          {/* ── Bloqueos ── */}
          <TabsContent value="bloqueos" className="space-y-4 pt-4">
            <div className="rounded-xl border border-border bg-card px-4 py-3 mb-2">
              <p className="text-sm font-medium text-foreground">
                Bloqueos por fecha o recurrentes
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bloquea horarios para un día específico, de forma recurrente
                cada semana, o de forma permanente.
              </p>
            </div>
            <BloqueosAdminPanel canchaId={id} token={adminToken} cancelEndpoint="/api/admin/reservas/cancelar" />
          </TabsContent>

          {/* ── Ubicación ── */}
          <TabsContent value="ubicacion" className="space-y-4 pt-4">
            <UbicacionTab
              direccion={direccion}
              lat={lat}
              lng={lng}
              distrito={distrito}
              onDireccionChange={setDireccion}
              onDistritoChange={setDistrito}
              onCoordsChange={(newLat, newLng, newDir) => {
                setLat(newLat);
                setLng(newLng);
                if (newDir) setDireccion(newDir);
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
                    if (e.key === "Enter" && newAmenity.trim()) {
                      setAmenities((prev) => [...prev, newAmenity.trim()]);
                      setNewAmenity("");
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

          {/* ── Dueño ── */}
          <TabsContent value="dueno" className="space-y-4 pt-4">
            <Card className="border-border p-5 space-y-4">
              <div>
                <p className="font-medium text-foreground">Dueño asignado</p>
                <p className="text-sm text-muted-foreground">
                  El dueño podrá gestionar esta cancha desde su panel.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Seleccionar dueño
                </label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={duenoId}
                  onChange={(e) => setDuenoId(e.target.value)}
                >
                  <option value="">Sin dueño asignado</option>
                  {duenos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} — {d.email}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
