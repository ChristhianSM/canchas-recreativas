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
  Star,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { BloqueosAdminPanel } from "@/components/bloqueos-admin-panel";
import { PreciosPorDiaEditor } from "@/components/precios-por-dia-editor";
import { PreciosPorDia } from "@/lib/precio-utils";
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

function HorarioTab({ canchaId, horasOperacion = HORAS_APP }: { canchaId: string; horasOperacion?: string[] }) {
  const [reservas, setReservas] = useState<any[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoAdmin[]>([]);
  const [secciones, setSecciones] = useState<{ id: string; nombre: string }[]>([]);
  const [seccionSeleccionada, setSeccionSeleccionada] = useState<string | null>(null);
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
        fetch(`/api/admin/secciones?canchaId=${canchaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
      ])
        .then(([resData, bloqData, secData]) => {
          const lista = Array.isArray(resData) ? resData : (resData?.data ?? []);
          setReservas(lista.filter((r: any) => r.cancha_id === canchaId));
          setBloqueos(Array.isArray(bloqData) ? bloqData : []);
          setSecciones(Array.isArray(secData) ? secData.filter((s: any) => s.activa) : []);
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
    if (seccionSeleccionada === null) {
      // Vista "Completa": cualquier reserva (cancha entera O sección) bloquea el slot
      return reservas.find(
        (r) =>
          r.fecha === fecha &&
          r.hora === hora &&
          r.estado !== "cancelada" &&
          r.estado !== "rechazada",
      );
    }
    // Vista de sección: reservas de ESTA sección + reservas de cancha completa (bloquean la sección)
    return reservas.find(
      (r) =>
        r.fecha === fecha &&
        r.hora === hora &&
        r.estado !== "cancelada" &&
        r.estado !== "rechazada" &&
        (r.seccion_id === seccionSeleccionada || r.seccion_id == null),
    );
  };

  const esBloqueado = (dia: Date, hora: string) =>
    bloqueos.some((b) => estaBloquedoPor(b, toFecha(dia), hora, seccionSeleccionada));

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
      {/* Selector de sección — solo si la cancha tiene secciones */}
      {secciones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSeccionSeleccionada(null)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
              seccionSeleccionada === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
            )}
          >
            Cancha completa
          </button>
          {secciones.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeccionSeleccionada(s.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
                seccionSeleccionada === s.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
              )}
            >
              Sección {s.nombre}
            </button>
          ))}
        </div>
      )}

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
                    // Vista "Sección X": reserva de cancha completa bloquea el slot
                    const bloqueadaPorCompleta =
                      seccionSeleccionada !== null && reserva.seccion_id == null;
                    // Vista "Cancha completa": reserva de sección bloquea el slot
                    const bloqueadaPorSeccion =
                      seccionSeleccionada === null && reserva.seccion_id != null;

                    if (bloqueadaPorCompleta || bloqueadaPorSeccion) {
                      return (
                        <td key={i} className="px-2 py-2 text-center bg-muted/60">
                          <span className="text-[9px] text-muted-foreground">
                            Bloq.
                          </span>
                          <span className="block text-[8px] text-muted-foreground/60">
                            {bloqueadaPorCompleta ? "completa" : `sec. ${reserva.seccion?.nombre ?? ""}`}
                          </span>
                        </td>
                      );
                    }

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
  const imagenesGuardadasRef = useRef<string[]>([]);

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  type Resena = { id: string; estrellas: number; comentario: string | null; usuario_nombre: string | null; creado_en: string };
  const [resenas, setResenas]           = useState<Resena[]>([]);
  const [loadingResenas, setLoadingResenas] = useState(false);
  const [eliminando, setEliminando]     = useState<string | null>(null);

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

  const [preciosPorHora, setPreciosPorHora] = useState<Record<string, number>>({});
  const [preciosPorDia, setPreciosPorDia] = useState<PreciosPorDia>({});

  // Accesorios
  type Accesorio = { id: string; nombre: string; icono: string; modalidad: 'prestado' | 'alquilado'; precio: number | null };
  const PRESETS_POR_DEPORTE: Record<string, Array<{ nombre: string; icono: string }>> = {
    futbol:  [{ nombre: 'Balón', icono: '⚽' }, { nombre: 'Chalecos', icono: '🎽' }],
    futsal:  [{ nombre: 'Balón', icono: '⚽' }, { nombre: 'Chalecos', icono: '🎽' }],
    voley:   [{ nombre: 'Balón', icono: '🏐' }, { nombre: 'Malla', icono: '🥅' }],
    basquet: [{ nombre: 'Balón', icono: '🏀' }],
    tenis:   [{ nombre: 'Raqueta', icono: '🎾' }, { nombre: 'Pelotas', icono: '🎾' }],
  };
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const precioRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoIcono, setNuevoIcono] = useState('🎯');
  const [nuevaModalidad, setNuevaModalidad] = useState<'prestado' | 'alquilado'>('alquilado');
  const [nuevoPrecio, setNuevoPrecio] = useState<number | null>(null);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [superficie, setSuperficie] = useState<string>("grass_sintetico");
  const [maxJugadores, setMaxJugadores] = useState<number | null>(null);
  const [horaApertura, setHoraApertura] = useState("06:00");
  const [horaCierre, setHoraCierre]     = useState("23:00");

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
          imagenesGuardadasRef.current = canchaData.imagenes ?? [];
          setLat(String(canchaData.lat ?? ""));
          setLng(String(canchaData.lng ?? ""));
          setDireccion(canchaData.direccion ?? "");
          setDistrito(canchaData.distrito ?? "");
          setPreciosPorHora(canchaData.precios_por_hora ?? {});
          setPreciosPorDia(canchaData.precios_por_dia ?? {});
          setAccesorios(canchaData.accesorios ?? []);
          setSuperficie(canchaData.superficie ?? "grass_sintetico");
          setMaxJugadores(canchaData.max_jugadores ?? null);
          setHoraApertura(canchaData.hora_apertura ?? "06:00");
          setHoraCierre(canchaData.hora_cierre ?? "23:00");

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
        preciosPorDia,
        accesorios,
        superficie,
        maxJugadores,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        direccion: direccion || undefined,
        distrito: distrito || undefined,
        horaApertura,
        horaCierre,
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
      imagenesGuardadasRef.current = images;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: "¡Cambios guardados!", description: <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />La cancha se actualizó correctamente.</span>, duration: 2500 });
    } else {
      const d = await res.json();
      setSaveError(d.error ?? "Error al guardar");
      toast({ title: "Error al guardar", description: d.error ?? "Ocurrió un error al guardar los cambios.", variant: "destructive", duration: 2500 });
    }
  };

  const procesarImagen = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      const dibujar = () => {
        const MAX = 2000;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) { URL.revokeObjectURL(url); reject(new Error("no-dim")); return; }
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
          else { w = Math.round((w * MAX) / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error("no-ctx")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) { reject(new Error("no-blob")); return; }
            resolve(new File([blob], "imagen.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.82,
        );
      };
      img.src = url;
      img.decode().then(dibujar).catch(() => { URL.revokeObjectURL(url); reject(new Error("decode")); });
    });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      let archivoFinal: File;
      try {
        archivoFinal = await procesarImagen(file);
      } catch {
        continue;
      }
      const form = new FormData();
      form.append("file", archivoFinal);
      form.append("canchaId", id);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.url) setImages((prev) => [...prev, data.url]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    const url = images[idx];
    setImages((prev) => prev.filter((_, j) => j !== idx));
    // Si aún no estaba guardada en la BD, se borra del storage al instante
    // para no dejarla huérfana (nunca aparecería en el diff al guardar)
    if (url && !imagenesGuardadasRef.current.includes(url)) {
      fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }).catch(() => {});
    }
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
      <div className="sticky -top-4 lg:-top-6 z-20 -mx-4 -mt-4 lg:-mt-6 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:-mx-6 lg:px-6">
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
            (activeTab === "bloqueos" || activeTab === "resenas") && "invisible",
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
              <TabsTrigger value="secciones">Secciones</TabsTrigger>
              <TabsTrigger value="resenas" onClick={() => {
                if (resenas.length === 0 && !loadingResenas) {
                  setLoadingResenas(true);
                  getAdminTokenFresh().then(token =>
                    fetch(`/api/resenas?cancha_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
                      .then(r => r.json())
                      .then(d => { setResenas(d.resenas ?? []); setLoadingResenas(false); })
                  );
                }
              }}>Reseñas</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Horario ── */}
          <TabsContent value="horario" className="pt-4 space-y-4">
            <Card className="border-border p-5 space-y-4">
              <div>
                <p className="font-medium text-foreground">Horario de operación</p>
                <p className="text-sm text-muted-foreground">Define las horas en que esta cancha está disponible para reservas.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Apertura</label>
                  <select
                    value={horaApertura}
                    onChange={e => setHoraApertura(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {HORAS_APP.map(h => (
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
                    {HORAS_APP.map(h => (
                      <option key={h} value={h}>
                        {parseInt(h) <= 5 ? `${h} (madrugada)` : h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Los usuarios solo verán horas entre <span className="font-medium text-foreground">{horaApertura}</span> y <span className="font-medium text-foreground">{horaCierre}</span>
                {horaCierre <= horaApertura && (
                  <span className="text-primary"> (cierra en la madrugada del día siguiente)</span>
                )}
                .
              </p>
            </Card>
            <Card className="border-border p-5">
              <HorarioTab canchaId={id} horasOperacion={getHorasOperacion(horaApertura, horaCierre)} />
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

            {/* Precios por hora y por día */}
            <Card className="border-border p-5 space-y-4">
              <div>
                <p className="font-medium text-foreground">Precios por hora y por día</p>
                <p className="text-sm text-muted-foreground">
                  Personaliza el precio de cada horario, y opcionalmente por
                  día de la semana (ej. fines de semana más caros). Lo que no
                  configures usa el precio base (S/ {price}).
                </p>
              </div>
              <PreciosPorDiaEditor
                precioBase={price}
                preciosPorHora={preciosPorHora}
                onPreciosPorHoraChange={setPreciosPorHora}
                preciosPorDia={preciosPorDia}
                onPreciosPorDiaChange={setPreciosPorDia}
                horasOperacion={getHorasOperacion(horaApertura, horaCierre)}
              />
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
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading || images.length >= 6}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {uploading
                      ? "Subiendo..."
                      : images.length >= 6
                        ? "Límite alcanzado"
                        : "Subir foto"}
                  </Button>
                  {!uploading && images.length < 6 && (
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                    />
                  )}
                </div>
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
            <BloqueosAdminPanel canchaId={id} token={adminToken} cancelEndpoint="/api/admin/reservas/cancelar" endpoint="/api/admin/bloqueos" horasOperacion={getHorasOperacion(horaApertura, horaCierre)} />
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
              <p className="font-medium text-foreground">Servicios y amenidades</p>
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

            {/* Accesorios */}
            <Card className="border-border p-5 space-y-4">
              <div>
                <p className="font-medium text-foreground">Accesorios</p>
                <p className="text-sm text-muted-foreground">
                  Indica qué ofreces con la cancha, si lo prestas gratis o lo alquilas.
                </p>
              </div>

              {accesorios.length > 0 && (
                <div className="space-y-2">
                  {accesorios.map((acc) => (
                    <div key={acc.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <span className="text-xl shrink-0">{acc.icono}</span>
                      <span className="flex-1 text-sm font-medium text-foreground">{acc.nombre}</span>
                      <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs shrink-0">
                        {(['prestado', 'alquilado'] as const).map((m) => (
                          <button key={m} type="button"
                            onClick={() => {
                              setAccesorios(prev => prev.map(a =>
                                a.id === acc.id ? { ...a, modalidad: m, precio: m === 'prestado' ? null : a.precio } : a
                              ));
                              if (m === 'alquilado') {
                                setTimeout(() => precioRefs.current[acc.id]?.focus(), 0);
                              }
                            }}
                            className={cn('px-2.5 py-1.5 font-medium capitalize transition-colors',
                              acc.modalidad === m ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                            )}
                          >{m}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">S/</span>
                        <Input
                          ref={(el) => { precioRefs.current[acc.id] = el; }}
                          type="number" min={0} placeholder="0"
                          disabled={acc.modalidad === 'prestado'}
                          value={acc.modalidad === 'prestado' ? 0 : (acc.precio ?? '')}
                          onChange={(e) => setAccesorios(prev => prev.map(a =>
                            a.id === acc.id ? { ...a, precio: e.target.value === '' ? null : Number(e.target.value) } : a
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
                      <button type="button"
                        onClick={() => setAccesorios(prev => prev.filter(a => a.id !== acc.id))}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(() => {
                const tipo = (cancha as any)?.tipo as string | undefined;
                const presets = tipo ? (PRESETS_POR_DEPORTE[tipo] ?? []) : [];
                const nombresActuales = accesorios.map(a => a.nombre.toLowerCase());
                const sugerencias = presets.filter(p => !nombresActuales.includes(p.nombre.toLowerCase()));
                if (!sugerencias.length) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sugerencias</p>
                    <div className="flex flex-wrap gap-2">
                      {sugerencias.map((s) => (
                        <button key={s.nombre} type="button"
                          onClick={() => setAccesorios(prev => [...prev, { id: crypto.randomUUID(), nombre: s.nombre, icono: s.icono, modalidad: 'alquilado', precio: null }])}
                          className="flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Plus className="h-3 w-3" />{s.icono} {s.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {mostrarFormNuevo ? (
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Agregar accesorio</p>
                  <div className="flex gap-2">
                    <Input placeholder="🎯" value={nuevoIcono} onChange={(e) => setNuevoIcono(e.target.value)} className="h-9 w-16 text-center text-lg px-1" maxLength={2} />
                    <Input placeholder="Nombre del accesorio" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="h-9 flex-1" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
                      {(['prestado', 'alquilado'] as const).map((m) => (
                        <button key={m} type="button"
                          onClick={() => { setNuevaModalidad(m); if (m === 'prestado') setNuevoPrecio(null); }}
                          className={cn('px-3 py-2 font-medium capitalize transition-colors', nuevaModalidad === m ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}
                        >{m}</button>
                      ))}
                    </div>
                    {nuevaModalidad === 'alquilado' && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">S/</span>
                        <Input type="number" min={0} placeholder="0" value={nuevoPrecio ?? ''} onChange={(e) => setNuevoPrecio(e.target.value === '' ? null : Number(e.target.value))} className="h-9 w-20 text-sm" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => {
                      if (!nuevoNombre.trim()) return;
                      setAccesorios(prev => [...prev, { id: crypto.randomUUID(), nombre: nuevoNombre.trim(), icono: nuevoIcono || '🎯', modalidad: nuevaModalidad, precio: nuevaModalidad === 'prestado' ? null : nuevoPrecio }]);
                      setNuevoNombre(''); setNuevoIcono('🎯'); setNuevaModalidad('alquilado'); setNuevoPrecio(null); setMostrarFormNuevo(false);
                    }}>Agregar</Button>
                    <Button variant="outline" size="sm" onClick={() => setMostrarFormNuevo(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setMostrarFormNuevo(true)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" /> Agregar accesorio personalizado
                </button>
              )}
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

          {/* ── Reseñas ── */}
          <TabsContent value="resenas" className="space-y-3 pt-4">
            {loadingResenas ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
              </div>
            ) : resenas.length === 0 ? (
              <Card className="border-border p-10 text-center">
                <Star className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">Esta cancha aún no tiene reseñas</p>
              </Card>
            ) : (
              resenas.map(r => (
                <Card key={r.id} className="border-border p-4 flex items-start gap-4">
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={`h-3.5 w-3.5 ${n <= r.estrellas ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-foreground">{r.usuario_nombre ?? 'Usuario'}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(r.creado_en).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {r.comentario && (
                      <p className="text-sm text-muted-foreground">{r.comentario}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={eliminando === r.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={async () => {
                      setEliminando(r.id);
                      const token = await getAdminTokenFresh();
                      await fetch(`/api/admin/resenas/${r.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      setResenas(prev => prev.filter(x => x.id !== r.id));
                      setEliminando(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Secciones ── */}
          <TabsContent value="secciones" className="pt-4">
            <SeccionesAdminTab canchaId={id as string} horaApertura={horaApertura} horaCierre={horaCierre} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Tab Secciones (superadmin) ────────────────────────────────────────
type SeccionAdmin = {
  id: string;
  nombre: string;
  descripcion: string | null;
  max_jugadores: number | null;
  precio_por_hora: number;
  precios_por_hora: Record<string, number>;
  precios_por_dia?: PreciosPorDia;
  orden: number;
  activa: boolean;
};

function SeccionesAdminTab({ canchaId, horaApertura = '06:00', horaCierre = '23:00' }: { canchaId: string; horaApertura?: string; horaCierre?: string }) {
  const { toast } = useToast();
  const [secciones, setSecciones] = useState<SeccionAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoMaxJ, setNuevoMaxJ] = useState<number | "">(14);
  const [nuevoPrecio, setNuevoPrecio] = useState<number | "">(80);
  const [nuevosPreciosPorHora, setNuevosPreciosPorHora] = useState<Record<string, number>>({});
  const [nuevosPreciosPorDia, setNuevosPreciosPorDia] = useState<PreciosPorDia>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editMaxJ, setEditMaxJ] = useState<number | "">("");
  const [editPrecio, setEditPrecio] = useState<number | "">(0);
  const [editPreciosPorHora, setEditPreciosPorHora] = useState<Record<string, number>>({});
  const [editPreciosPorDia, setEditPreciosPorDia] = useState<PreciosPorDia>({});

  useEffect(() => {
    getAdminTokenFresh().then((token) => {
      fetch(`/api/admin/secciones?canchaId=${canchaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => setSecciones(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setCargando(false));
    });
  }, [canchaId]);

  const crearSeccion = async () => {
    if (!nuevoNombre.trim() || !nuevoPrecio) return;
    setGuardando(true);
    const token = await getAdminTokenFresh();
    const res = await fetch("/api/admin/secciones", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ canchaId, nombre: nuevoNombre.trim(), maxJugadores: nuevoMaxJ || null, precioHora: Number(nuevoPrecio), preciosPorHora: nuevosPreciosPorHora, preciosPorDia: nuevosPreciosPorDia, orden: secciones.length }),
    });
    const data = await res.json();
    setGuardando(false);
    if (res.ok) {
      setSecciones((prev) => [...prev, data]);
      setNuevoNombre(""); setNuevoMaxJ(14); setNuevoPrecio(80); setNuevosPreciosPorHora({}); setNuevosPreciosPorDia({}); setMostrarForm(false);
      toast({ title: "Sección creada", duration: 2000 });
    } else {
      toast({ title: "Error", description: data.error, variant: "destructive", duration: 2500 });
    }
  };

  const guardarEdicion = async (seccionId: string) => {
    setGuardando(true);
    const token = await getAdminTokenFresh();
    const res = await fetch(`/api/admin/secciones?id=${seccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nombre: editNombre, maxJugadores: editMaxJ || null, precioHora: Number(editPrecio), preciosPorHora: editPreciosPorHora, preciosPorDia: editPreciosPorDia }),
    });
    setGuardando(false);
    if (res.ok) {
      setSecciones((prev) => prev.map((s) => s.id === seccionId ? { ...s, nombre: editNombre, max_jugadores: editMaxJ as number | null, precio_por_hora: Number(editPrecio), precios_por_hora: editPreciosPorHora, precios_por_dia: editPreciosPorDia } : s));
      setEditandoId(null);
      toast({ title: "Sección actualizada", duration: 2000 });
    }
  };

  const eliminarSeccion = async (seccionId: string) => {
    if (!confirm("¿Eliminar esta sección? Las reservas existentes no se afectan.")) return;
    const token = await getAdminTokenFresh();
    const res = await fetch(`/api/admin/secciones?id=${seccionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSecciones((prev) => prev.filter((s) => s.id !== seccionId));
      toast({ title: "Sección eliminada", duration: 2000 });
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Cargando secciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border p-5">
        <p className="text-sm font-medium text-foreground mb-1">Secciones de la cancha</p>
        <p className="text-sm text-muted-foreground">
          Si la cancha se puede dividir en partes independientes con mallas, configúralas aquí.
          Cuando se reserva la <strong>cancha completa</strong>, todas las secciones quedan bloqueadas.
        </p>
      </Card>

      {secciones.length > 0 && (
        <div className="space-y-3">
          {secciones.map((sec) => (
            <Card key={sec.id} className="border-border p-4">
              {editandoId === sec.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Nombre</label>
                      <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} placeholder="Ej: A" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Máx. jugadores</label>
                      <Input type="number" min={2} value={editMaxJ} onChange={(e) => setEditMaxJ(e.target.value ? Number(e.target.value) : "")} placeholder="14" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Precio base (S/)</label>
                      <Input type="number" min={0} value={editPrecio} onChange={(e) => setEditPrecio(e.target.value ? Number(e.target.value) : "")} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Precio por horario y por día (opcional — deja vacío para usar el precio base)</p>
                    <PreciosPorDiaEditor
                      precioBase={Number(editPrecio) || 0}
                      preciosPorHora={editPreciosPorHora}
                      onPreciosPorHoraChange={setEditPreciosPorHora}
                      preciosPorDia={editPreciosPorDia}
                      onPreciosPorDiaChange={setEditPreciosPorDia}
                      horasOperacion={getHorasOperacion(horaApertura, horaCierre)}
                      compact
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => guardarEdicion(sec.id)} disabled={guardando}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0">
                      {sec.nombre}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Sección {sec.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {sec.max_jugadores ? `${sec.max_jugadores} jugadores · ` : ""}S/ {sec.precio_por_hora}/hora
                        {Object.keys(sec.precios_por_hora ?? {}).length > 0 && (
                          <span className="ml-1 text-primary">· {Object.keys(sec.precios_por_hora).length} horarios con precio especial</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => { setEditandoId(sec.id); setEditNombre(sec.nombre); setEditMaxJ(sec.max_jugadores ?? ""); setEditPrecio(sec.precio_por_hora); setEditPreciosPorHora(sec.precios_por_hora ?? {}); setEditPreciosPorDia(sec.precios_por_dia ?? {}); }}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => eliminarSeccion(sec.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {secciones.length === 0 && !mostrarForm && (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground mb-1">Esta cancha no tiene secciones configuradas.</p>
          <p className="text-xs text-muted-foreground">Las canchas sin secciones funcionan con el flujo normal de reserva.</p>
        </div>
      )}

      {mostrarForm && (
        <Card className="border-primary/30 p-5 space-y-4">
          <p className="text-sm font-medium text-foreground">Nueva sección</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nombre / Letra</label>
              <Input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej: A, B, Mitad" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Máx. jugadores</label>
              <Input type="number" min={2} value={nuevoMaxJ} onChange={(e) => setNuevoMaxJ(e.target.value ? Number(e.target.value) : "")} placeholder="14" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Precio base (S/)</label>
              <Input type="number" min={0} value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value ? Number(e.target.value) : "")} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Precio por horario y por día (opcional)</p>
            <PreciosPorDiaEditor
              precioBase={Number(nuevoPrecio) || 0}
              preciosPorHora={nuevosPreciosPorHora}
              onPreciosPorHoraChange={setNuevosPreciosPorHora}
              preciosPorDia={nuevosPreciosPorDia}
              onPreciosPorDiaChange={setNuevosPreciosPorDia}
              horasOperacion={getHorasOperacion(horaApertura, horaCierre)}
              compact
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={crearSeccion} disabled={guardando || !nuevoNombre.trim() || !nuevoPrecio}>
              {guardando ? "Guardando..." : "Agregar sección"}
            </Button>
            <Button variant="ghost" onClick={() => setMostrarForm(false)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {!mostrarForm && (
        <Button variant="outline" className="gap-2 w-full" onClick={() => setMostrarForm(true)}>
          <Plus className="h-4 w-4" /> Agregar sección
        </Button>
      )}
    </div>
  );
}
