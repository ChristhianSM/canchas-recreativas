"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  Search,
  X,
  CalendarDays,
  PlusCircle,
  RepeatIcon,
  ArrowLeftRight,
} from "lucide-react";
import { getHorasOperacion } from "@/lib/bloqueos-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/loading-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ownerFetch } from "@/lib/api";

type ReservaEstado = "pendiente" | "confirmada" | "rechazada" | "cancelada";

type Reserva = {
  id: string;
  cancha_id: string;
  cancha_nombre: string;
  usuario_nombre: string;
  usuario_email: string;
  usuario_telefono: string;
  fecha: string;
  hora: string;
  precio: number;
  metodo_pago: string;
  comprobante_url: string | null;
  estado: ReservaEstado;
  creado_en: string;
  cancelado_en: string | null;
  devolucion_calculada: number | null;
  penalidad_aplicada: number | null;
  porcentaje_devolucion: number | null;
  devolucion_procesada: boolean | null;
  modo_pago?: "completo" | "parcial";
  monto_adelanto?: number;
  saldo_pendiente?: number;
  saldo_cobrado?: boolean;
  saldo_cobrado_en?: string | null;
  grupo_reserva_id?: string | null;
  cupon_aplicado?: boolean;
  precio_original?: number | null;
  seccion_id?: string | null;
  seccion_nombre?: string | null;
  diferencia_reasignacion?: number | null;
  diferencia_reasignacion_saldada?: boolean | null;
  diferencia_reasignacion_saldada_en?: string | null;
};

function getOwnerToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cp_owner_token");
}

// Extrae el método de devolución desde el campo usuario_telefono
// Formatos posibles: "940394075 (plin)", "Mismo número de yape", "940394075 (yape)"
function getMetodoDevolucion(
  telefono: string | null,
  metodoPago: string,
): { metodo: string; label: string; esDiferente: boolean } {
  const tel = (telefono ?? "").toLowerCase();
  let metodo = metodoPago; // por defecto, el mismo método de pago

  // Buscar si el teléfono indica un método específico
  if (
    tel.includes("(plin)") ||
    tel.includes("de plin") ||
    tel.includes("mismo número de plin")
  ) {
    metodo = "plin";
  } else if (
    tel.includes("(yape)") ||
    tel.includes("de yape") ||
    tel.includes("mismo número de yape")
  ) {
    metodo = "yape";
  }

  const label = metodo === "plin" ? "Plin" : "Yape";
  const esDiferente = metodo !== metodoPago;
  return { metodo, label, esDiferente };
}

// Extrae solo el número del campo usuario_telefono (sin el método entre paréntesis)
function getNumeroLimpio(telefono: string | null): string {
  if (!telefono) return "";
  // Quitar "(plin)", "(yape)", "Mismo número de X"
  return telefono
    .replace(/\s*\(.*?\)/g, "")
    .replace(/mismo número de \w+/gi, "")
    .trim();
}

export default function OwnerReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [selected, setSelected] = useState<Reserva | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [cancelModal, setCancelModal] = useState<{
    open: boolean;
    reservaId: string | null;
    motivo: string;
  }>({ open: false, reservaId: null, motivo: "" });
  const [marcandoSaldo, setMarcandoSaldo] = useState(false);
  const [marcandoDiferencia, setMarcandoDiferencia] = useState(false);
  const [modalReasignar, setModalReasignar] = useState(false);
  const [seccionesReasignar, setSeccionesReasignar] = useState<
    { id: string; nombre: string; precio_por_hora: number }[]
  >([]);
  const [seccionElegida, setSeccionElegida] = useState("__completa__");
  const [reasignando, setReasignando] = useState(false);
  const [errorReasignar, setErrorReasignar] = useState<string | null>(null);
  const [disponibilidadReasignar, setDisponibilidadReasignar] = useState<{
    completaOcupada: boolean;
    seccionesOcupadas: string[];
    hayReservaCompletaBloqueando: boolean;
    precioCompleta: number;
    preciosPorSeccion: Record<string, number>;
  } | null>(null);
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEmail, setFiltroEmail] = useState("");
  const [filtroCancha, setFiltroCancha] = useState("");
  const [filtroModoPago, setFiltroModoPago] = useState<
    "todos" | "completo" | "parcial"
  >("todos");

  // ── Modal: reserva directa para cliente fijo ──
  const [canchasOwner, setCanchasOwner] = useState<
    { id: string; nombre: string; hora_apertura: string; hora_cierre: string }[]
  >([]);
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([]);
  const [loadingHoras, setLoadingHoras] = useState(false);
  const [modalDirecta, setModalDirecta] = useState(false);
  const [directaLoading, setDirectaLoading] = useState(false);
  const [directaForm, setDirectaForm] = useState({
    cancha_id: "",
    cancha_nombre: "",
    seccion_id: "",
    seccion_nombre: "",
    cliente_nombre: "",
    cliente_telefono: "",
    fecha: "",
    hora: "",
    precio: "",
    metodo_pago: "efectivo",
    semanas: "1",
  });
  const [seccionesCancha, setSeccionesCancha] = useState<{ id: string; nombre: string; precio_por_hora: number }[]>([]);
  const [directaResultado, setDirectaResultado] = useState<{
    created: number;
    skipped: number;
    resultados: { fecha: string; estado: string }[];
  } | null>(null);

  const cancharUnicas = useMemo(
    () =>
      [...new Set(reservas.map((r) => r.cancha_nombre).filter(Boolean))].sort(),
    [reservas],
  );

  const hayFiltrosActivos =
    filtroFecha || filtroEmail || filtroCancha || filtroModoPago !== "todos";

  const limpiarFiltros = () => {
    setFiltroFecha("");
    setFiltroEmail("");
    setFiltroCancha("");
    setFiltroModoPago("todos");
  };

  const aplicarFiltros = (lista: Reserva[]) =>
    lista.filter((r) => {
      if (filtroFecha && r.fecha !== filtroFecha) return false;
      if (
        filtroEmail &&
        !r.usuario_email?.toLowerCase().includes(filtroEmail.toLowerCase())
      )
        return false;
      if (filtroCancha && r.cancha_nombre !== filtroCancha) return false;
      if (
        filtroModoPago !== "todos" &&
        (r.modo_pago ?? "completo") !== filtroModoPago
      )
        return false;
      return true;
    });

  const reload = async () => {
    const token = getOwnerToken();
    if (!token) return;
    const res = await ownerFetch("/api/admin-cancha/reservas");
    const data = await res.json();
    setReservas(
      Array.isArray(data)
        ? data.map((r: any) => ({
            ...r,
            modo_pago: r.modo_pago ?? "completo",
            monto_adelanto: r.monto_adelanto,
            saldo_pendiente: r.saldo_pendiente ?? 0,
            saldo_cobrado: r.saldo_cobrado ?? false,
            saldo_cobrado_en: r.saldo_cobrado_en ?? null,
            grupo_reserva_id: r.grupo_reserva_id ?? null,
            seccion_id: r.seccion_id ?? null,
            seccion_nombre: r.seccion?.nombre ?? null,
            diferencia_reasignacion: r.diferencia_reasignacion ?? null,
            diferencia_reasignacion_saldada: r.diferencia_reasignacion_saldada ?? false,
            diferencia_reasignacion_saldada_en: r.diferencia_reasignacion_saldada_en ?? null,
          }))
        : [],
    );
    setLoading(false);
  };

  useEffect(() => {
    reload();
    const onVisible = () => {
      if (!document.hidden) reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    ownerFetch("/api/admin-cancha/canchas")
      .then((r) => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setCanchasOwner(
            data.map((c: any) => ({
              id: c.id,
              nombre: c.nombre,
              hora_apertura: c.hora_apertura ?? "06:00",
              hora_cierre: c.hora_cierre ?? "22:00",
            })),
          );
          if (data.length === 1) {
            setDirectaForm((f) => ({
              ...f,
              cancha_id: data[0].id,
              cancha_nombre: data[0].nombre,
            }));
          }
        }
      });
  }, []);

  // Cargar secciones cuando cambia la cancha
  useEffect(() => {
    if (!directaForm.cancha_id) { setSeccionesCancha([]); return; }
    ownerFetch(`/api/admin-cancha/secciones?canchaId=${directaForm.cancha_id}`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) setSeccionesCancha(data.map(s => ({ id: s.id, nombre: s.nombre, precio_por_hora: s.precio_por_hora })));
        else setSeccionesCancha([]);
      })
      .catch(() => setSeccionesCancha([]));
  }, [directaForm.cancha_id]);

  // Verificar qué destinos ya están ocupados por otra reserva en ese mismo horario
  useEffect(() => {
    if (!modalReasignar || !selected) { setDisponibilidadReasignar(null); return; }
    setCargandoDisponibilidad(true);
    ownerFetch(`/api/admin-cancha/reservas/reasignar?reservaId=${selected.id}`)
      .then((r) => r.json())
      .then((data) => setDisponibilidadReasignar(data?.error ? null : data))
      .catch(() => setDisponibilidadReasignar(null))
      .finally(() => setCargandoDisponibilidad(false));
  }, [modalReasignar, selected?.id]);

  // Cargar secciones de la cancha de la reserva seleccionada (para poder reasignarla)
  useEffect(() => {
    if (!selected?.cancha_id) { setSeccionesReasignar([]); return; }
    ownerFetch(`/api/admin-cancha/secciones?canchaId=${selected.cancha_id}`)
      .then((r) => r.json())
      .then((data: any[]) => {
        setSeccionesReasignar(
          Array.isArray(data)
            ? data.filter((s) => s.activa !== false).map((s) => ({ id: s.id, nombre: s.nombre, precio_por_hora: s.precio_por_hora }))
            : [],
        );
      })
      .catch(() => setSeccionesReasignar([]));
  }, [selected?.cancha_id]);

  useEffect(() => {
    if (!directaForm.cancha_id || !directaForm.fecha) {
      setHorasOcupadas([]);
      return;
    }
    setLoadingHoras(true);
    fetch(
      `/api/reservas/horarios-ocupados?cancha_id=${directaForm.cancha_id}&fecha=${directaForm.fecha}`,
    )
      .then((r) => r.json())
      .then((d) => setHorasOcupadas(d.ocupadas ?? []))
      .catch(() => setHorasOcupadas([]))
      .finally(() => setLoadingHoras(false));
  }, [directaForm.cancha_id, directaForm.fecha]);

  const submitDirecta = async () => {
    if (
      !directaForm.cancha_id ||
      !directaForm.cliente_nombre ||
      !directaForm.fecha ||
      !directaForm.hora ||
      !directaForm.precio
    )
      return;
    setDirectaLoading(true);
    setDirectaResultado(null);
    try {
      const res = await ownerFetch("/api/admin-cancha/reservas/directa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancha_id: directaForm.cancha_id,
          cancha_nombre: directaForm.cancha_nombre,
          cliente_nombre: directaForm.cliente_nombre.trim(),
          cliente_telefono: directaForm.cliente_telefono.trim() || null,
          fecha: directaForm.fecha,
          hora: directaForm.hora,
          precio: Number(directaForm.precio),
          metodo_pago: directaForm.metodo_pago,
          semanas: Number(directaForm.semanas),
          seccion_id: directaForm.seccion_id || null,
          seccion_nombre: directaForm.seccion_nombre || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDirectaResultado(data);
        reload();
      }
    } finally {
      setDirectaLoading(false);
    }
  };

  const confirmar = async (id: string) => {
    setConfirmando(true);
    const token = getOwnerToken();
    try {
      const res = await ownerFetch(`/api/reservas/update?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "confirmada" }),
      });
      if (res.ok) {
        await reload();
        setSelected(null);
      }
    } catch {
      reload();
    } finally {
      setConfirmando(false);
    }
  };

  const rechazar = async (id: string) => {
    setRechazando(true);
    const token = getOwnerToken();
    try {
      const res = await ownerFetch(`/api/reservas/update?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "rechazada" }),
      });
      if (res.ok) {
        await reload();
        setSelected(null);
      }
    } catch {
      reload();
    } finally {
      setRechazando(false);
    }
  };

  const cancelar = (id: string) => {
    setCancelModal({ open: true, reservaId: id, motivo: "" });
  };

  const confirmarCancelacion = async () => {
    const id = cancelModal.reservaId;
    if (!id) return;
    setCancelModal((m) => ({ ...m, open: false }));
    setCancelando(true);
    setReservas((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, estado: "cancelada" as ReservaEstado } : r,
      ),
    );
    setSelected(null);
    const token = getOwnerToken();
    try {
      await ownerFetch("/api/admin-cancha/reservas/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaId: id, motivo: cancelModal.motivo }),
      });
    } catch {
      reload();
    } finally {
      setCancelando(false);
    }
  };

  const marcarDevolucionRealizada = async (id: string) => {
    setProcesando(true);

    // Optimistic update - actualizar inmediatamente en el estado local
    setReservas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, devolucion_procesada: true } : r)),
    );

    // Cerrar modal inmediatamente
    setSelected(null);

    // Hacer la petición al servidor en segundo plano
    const token = getOwnerToken();
    try {
      await ownerFetch(`/api/reservas/update?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devolucion_procesada: true }),
      });
    } catch (error) {
      // Si falla, recargar para obtener el estado real
      reload();
    } finally {
      setProcesando(false);
    }
  };

  const marcarSaldoCobrado = async (id: string) => {
    setMarcandoSaldo(true);

    // Optimistic update - actualizar inmediatamente en el estado local
    setReservas((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              saldo_cobrado: true,
              saldo_cobrado_en: new Date().toISOString(),
            }
          : r,
      ),
    );

    // Cerrar modal inmediatamente
    setSelected(null);

    // Hacer la petición al servidor en segundo plano
    const token = getOwnerToken();
    try {
      await ownerFetch(`/api/reservas/update?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldo_cobrado: true }),
      });
    } catch (error) {
      // Si falla, recargar para obtener el estado real
      reload();
    } finally {
      setMarcandoSaldo(false);
    }
  };

  const abrirReasignar = () => {
    setErrorReasignar(null);
    setSeccionElegida(selected?.seccion_id ? "__completa__" : (seccionesReasignar[0]?.id ?? "__completa__"));
    setModalReasignar(true);
  };

  const reasignarSeccion = async () => {
    if (!selected) return;
    const destino = seccionElegida === "__completa__" ? null : seccionElegida;
    setErrorReasignar(null);
    setReasignando(true);
    try {
      const res = await ownerFetch("/api/admin-cancha/reservas/reasignar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaId: selected.id, seccionIdDestino: destino }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorReasignar(data.error ?? "No se pudo reasignar la reserva");
        return;
      }
      setModalReasignar(false);
      setSelected(null);
      await reload();
    } catch {
      setErrorReasignar("Error de conexión, intenta de nuevo");
    } finally {
      setReasignando(false);
    }
  };

  const marcarDiferenciaSaldada = async (id: string) => {
    setMarcandoDiferencia(true);
    setReservas((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, diferencia_reasignacion_saldada: true, diferencia_reasignacion_saldada_en: new Date().toISOString() }
          : r,
      ),
    );
    setSelected(null);
    try {
      await ownerFetch(`/api/reservas/update?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diferencia_reasignacion_saldada: true }),
      });
    } catch {
      reload();
    } finally {
      setMarcandoDiferencia(false);
    }
  };

  // Agrupa reservas multi-hora: muestra solo el slot principal con rango "12:00 - 15:00"
  const reservasDisplay = useMemo(() => {
    const grupos = new Map<string, Reserva[]>();
    const resultado: Reserva[] = [];
    for (const r of reservas) {
      if (!r.grupo_reserva_id) {
        resultado.push(r);
        continue;
      }
      if (!grupos.has(r.grupo_reserva_id)) grupos.set(r.grupo_reserva_id, []);
      grupos.get(r.grupo_reserva_id)!.push(r);
    }
    for (const [gid, slots] of grupos) {
      const principal = slots.find((s) => s.id === gid) ?? slots[0];
      const horas = slots.map((s) => s.hora).sort();
      const horaFin = `${String(parseInt(horas[horas.length - 1].split(":")[0]) + 1).padStart(2, "0")}:00`;
      // Si algún slot del grupo está pendiente, mostrar el grupo como pendiente
      const estadoGrupo = slots.some((s) => s.estado === "pendiente")
        ? "pendiente"
        : principal.estado;
      resultado.push({
        ...principal,
        estado: estadoGrupo,
        hora: horas.length > 1 ? `${horas[0]} - ${horaFin}` : principal.hora,
      });
    }
    return resultado;
  }, [reservas]);

  const byEstado = (e: ReservaEstado) =>
    aplicarFiltros(reservasDisplay.filter((r) => r.estado === e));
  const todasFiltradas = () => aplicarFiltros(reservasDisplay);

  // Solo las canceladas con devolución pendiente (monto > 0 y aún no procesada)
  const devolucionesPendientes = byEstado("cancelada").filter(
    (r) => (r.devolucion_calculada ?? 0) > 0 && !r.devolucion_procesada,
  );

  // Reservas reasignadas a un destino más barato: diferencia a entregar al usuario
  const diferenciasPendientes = reservasDisplay.filter(
    (r) => (r.diferencia_reasignacion ?? 0) > 0 && !r.diferencia_reasignacion_saldada,
  );

  const estadoBadge = (estado: ReservaEstado) => {
    const map = {
      pendiente: {
        label: "Pendiente",
        cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      },
      confirmada: {
        label: "Confirmada",
        cls: "bg-primary/10 text-primary border-primary/20",
      },
      rechazada: {
        label: "Rechazada",
        cls: "bg-destructive/10 text-destructive border-destructive/20",
      },
      cancelada: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
    };
    const s = map[estado];
    return (
      <Badge variant="outline" className={s.cls}>
        {s.label}
      </Badge>
    );
  };

  const Row = ({ r }: { r: Reserva }) => (
    <tr
      className="hover:bg-muted/30 cursor-pointer"
      onClick={() => setSelected(r)}
    >
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{r.usuario_nombre}</p>
        <p className="text-xs text-muted-foreground">{r.usuario_telefono}</p>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {r.cancha_nombre}
        {r.seccion_nombre && (
          <span className="block text-xs font-medium text-primary">
            Sección {r.seccion_nombre}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {new Date(r.fecha + "T00:00:00").toLocaleDateString("es-PE", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{r.hora}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {new Date(r.creado_en).toLocaleDateString("es-PE", {
          day: "numeric",
          month: "short",
        })}
        <span className="block text-xs">
          {new Date(r.creado_en).toLocaleTimeString("es-PE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-primary">
        S/ {r.precio}
      </td>
      <td className="px-4 py-3">
        {r.modo_pago === "parcial" && !r.saldo_cobrado ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
            S/ {r.saldo_pendiente}
          </span>
        ) : r.modo_pago === "parcial" && r.saldo_cobrado ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            ✓ Completo
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm capitalize text-muted-foreground">
        {r.metodo_pago}
      </td>
      <td className="px-4 py-3">{estadoBadge(r.estado)}</td>
      <td className="px-4 py-3">
        {r.estado === "cancelada" &&
          (r.devolucion_calculada ?? 0) > 0 &&
          !r.devolucion_procesada && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
              Devolver S/ {r.devolucion_calculada}
            </span>
          )}
        {r.estado === "cancelada" &&
          (r.devolucion_calculada ?? 0) > 0 &&
          r.devolucion_procesada && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              ✓ Devuelto
            </span>
          )}
        {r.estado === "cancelada" &&
          (r.devolucion_calculada ?? 0) === 0 &&
          r.devolucion_calculada !== null && (
            <span className="text-xs text-muted-foreground">
              Sin devolución
            </span>
          )}
      </td>
      <td className="px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(r);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );

  const Empty = () => (
    <div className="py-12 text-center text-muted-foreground">
      <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
      <p>No hay reservas en esta categoría</p>
    </div>
  );

  const Table = ({ list }: { list: Reserva[] }) =>
    list.length === 0 ? (
      <Empty />
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              {[
                "Cliente",
                "Cancha",
                "Fecha juego",
                "Hora",
                "Reservado",
                "Monto",
                "Saldo",
                "Método",
                "Estado",
                "Devolución",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </tbody>
        </table>
      </div>
    );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservas</h1>
          <p className="text-muted-foreground">
            Solo las reservas de tus canchas
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {byEstado("pendiente").length > 0 && (
            <Badge className="bg-yellow-500 text-white text-sm px-3 py-1">
              {byEstado("pendiente").length} pendiente
              {byEstado("pendiente").length > 1 ? "s" : ""}
            </Badge>
          )}
          {devolucionesPendientes.length > 0 && (
            <Badge className="bg-orange-500 text-white text-sm px-3 py-1">
              {devolucionesPendientes.length} devolución
              {devolucionesPendientes.length > 1 ? "es" : ""} pendiente
              {devolucionesPendientes.length > 1 ? "s" : ""}
            </Badge>
          )}
          {diferenciasPendientes.length > 0 && (
            <Badge className="bg-purple-500 text-white text-sm px-3 py-1">
              {diferenciasPendientes.length} diferencia
              {diferenciasPendientes.length > 1 ? "s" : ""} pendiente
              {diferenciasPendientes.length > 1 ? "s" : ""}
            </Badge>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setModalDirecta(true);
              setDirectaResultado(null);
            }}
          >
            <PlusCircle className="h-4 w-4" />
            Crear Reserva
          </Button>
        </div>
      </div>

      {/* Alerta de devoluciones pendientes */}
      {devolucionesPendientes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-orange-800">
                {devolucionesPendientes.length} devolución
                {devolucionesPendientes.length > 1 ? "es" : ""} pendiente
                {devolucionesPendientes.length > 1 ? "s" : ""} de procesar
              </p>
              <div className="mt-2 space-y-2">
                {devolucionesPendientes.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <p className="text-sm text-orange-700">
                      • <span className="font-medium">{r.usuario_nombre}</span>{" "}
                      — devolver{" "}
                      <span className="font-bold">
                        S/ {r.devolucion_calculada}
                      </span>{" "}
                      por{" "}
                      {(() => {
                        const { label, esDiferente } = getMetodoDevolucion(
                          r.usuario_telefono,
                          r.metodo_pago,
                        );
                        const numero = getNumeroLimpio(r.usuario_telefono);
                        return (
                          <>
                            <span
                              className={
                                esDiferente
                                  ? "font-bold text-red-600 underline"
                                  : "font-medium"
                              }
                            >
                              {label}
                            </span>
                            {esDiferente && (
                              <span className="text-red-600 text-xs ml-1">
                                (⚠️ pagó con {r.metodo_pago})
                              </span>
                            )}
                            {numero && (
                              <span className="text-orange-600">
                                {" "}
                                al {numero}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </p>
                    {r.cancelado_en && (
                      <p className="text-xs text-orange-500 mt-0.5 ml-3">
                        Canceló el{" "}
                        {new Date(r.cancelado_en).toLocaleDateString("es-PE", {
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        a las{" "}
                        {new Date(r.cancelado_en).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-orange-400 text-orange-700 hover:bg-orange-100 text-xs"
                      onClick={() => setSelected(r)}
                    >
                      Ver detalle
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Alerta de diferencias pendientes por reasignación de sección */}
      {diferenciasPendientes.length > 0 && (
        <Card className="border-purple-200 bg-purple-50 p-4">
          <div className="flex items-start gap-3">
            <ArrowLeftRight className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-purple-800">
                {diferenciasPendientes.length} diferencia
                {diferenciasPendientes.length > 1 ? "s" : ""} pendiente
                {diferenciasPendientes.length > 1 ? "s" : ""} de entregar por reasignación
              </p>
              <div className="mt-2 space-y-2">
                {diferenciasPendientes.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3">
                    <p className="text-sm text-purple-700">
                      • <span className="font-medium">{r.usuario_nombre}</span> — entregar{" "}
                      <span className="font-bold">S/ {r.diferencia_reasignacion}</span> al llegar a jugar
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-purple-400 text-purple-700 hover:bg-purple-100 text-xs"
                      onClick={() => setSelected(r)}
                    >
                      Ver detalle
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filtros */}
      <Card className="border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Filtros</p>
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <X className="h-3 w-3" />
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por correo..."
              value={filtroEmail}
              onChange={(e) => setFiltroEmail(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filtroCancha}
            onChange={(e) => setFiltroCancha(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todas las canchas</option>
            {cancharUnicas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filtroModoPago}
            onChange={(e) =>
              setFiltroModoPago(
                e.target.value as "todos" | "completo" | "parcial",
              )
            }
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="todos">Modo de pago</option>
            <option value="completo">Completo</option>
            <option value="parcial">Parcial</option>
          </select>
        </div>
      </Card>

      <Card className="border-border overflow-hidden">
        <Tabs defaultValue="pendiente">
          <div className="border-b border-border overflow-x-auto -mx-4 px-4 py-2">
            <TabsList className="inline-flex w-auto h-auto bg-transparent p-0 gap-1">
              <TabsTrigger
                value="pendiente"
                className="shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Pendientes
                {byEstado("pendiente").length > 0 && (
                  <span className="ml-1.5 rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {byEstado("pendiente").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="confirmada"
                className="shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Confirmadas ({byEstado("confirmada").length})
              </TabsTrigger>
              <TabsTrigger
                value="rechazada"
                className="shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Rechazadas ({byEstado("rechazada").length})
              </TabsTrigger>
              <TabsTrigger
                value="cancelada"
                className="shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Canceladas ({byEstado("cancelada").length})
                {devolucionesPendientes.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {devolucionesPendientes.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="todas"
                className="shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Todas ({todasFiltradas().length})
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="pendiente" className="mt-0">
            <Table list={byEstado("pendiente")} />
          </TabsContent>
          <TabsContent value="confirmada" className="mt-0">
            <Table list={byEstado("confirmada")} />
          </TabsContent>
          <TabsContent value="rechazada" className="mt-0">
            <Table list={byEstado("rechazada")} />
          </TabsContent>
          <TabsContent value="cancelada" className="mt-0">
            <Table list={byEstado("cancelada")} />
          </TabsContent>
          <TabsContent value="todas" className="mt-0">
            <Table list={todasFiltradas()} />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Modal detalle */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de reserva</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium text-foreground">
                    {selected.usuario_nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.usuario_telefono}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Cancha</p>
                  <p className="font-medium text-foreground">
                    {selected.cancha_nombre}
                  </p>
                  <p className="text-xs font-medium text-primary mt-0.5">
                    {selected.seccion_nombre ? `Sección ${selected.seccion_nombre}` : "Cancha completa"}
                  </p>
                  {["pendiente", "confirmada"].includes(selected.estado) &&
                    seccionesReasignar.length > 0 &&
                    new Date(`${selected.fecha}T${selected.hora.split(" - ")[0]}`) > new Date() && (
                      <button
                        onClick={abrirReasignar}
                        className="mt-1.5 flex items-center gap-1 text-xs font-medium text-purple-600 hover:underline"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                        Reasignar sección
                      </button>
                    )}
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Fecha y hora</p>
                  <p className="font-medium text-foreground">
                    {new Date(selected.fecha + "T00:00:00").toLocaleDateString(
                      "es-PE",
                      { day: "numeric", month: "long" },
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.hora}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <p className="font-bold text-primary">S/ {selected.precio}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {selected.metodo_pago}
                  </p>
                </div>
              </div>

              {/* Cupón de fidelización */}
              {selected.cupon_aplicado && (
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                      Cupón de fidelización
                    </p>
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 text-purple-700 border-purple-500/30 text-xs"
                    >
                      Aplicado
                    </Badge>
                  </div>
                  {selected.precio_original != null &&
                    selected.precio_original > selected.precio && (
                      <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                        Precio original S/ {selected.precio_original} ·
                        Descuento S/{" "}
                        {selected.precio_original - selected.precio}
                      </p>
                    )}
                  {selected.precio === 0 && (
                    <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                      Hora gratis — sin cobro al cliente
                    </p>
                  )}
                </div>
              )}

              {/* Bloque diferencia por reasignación de sección */}
              {(selected.diferencia_reasignacion ?? 0) !== 0 && (
                <div
                  className={`rounded-lg border p-4 space-y-2 ${
                    selected.diferencia_reasignacion_saldada
                      ? "border-green-200 bg-green-50"
                      : "border-purple-200 bg-purple-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {(selected.diferencia_reasignacion ?? 0) > 0
                        ? "Diferencia a entregar al cliente"
                        : "Diferencia a cobrar al cliente"}
                    </p>
                    {selected.diferencia_reasignacion_saldada ? (
                      <Badge className="bg-green-100 text-green-700 border-green-300">✓ Resuelta</Badge>
                    ) : (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-300">Pendiente</Badge>
                    )}
                  </div>
                  <p className="text-lg font-bold text-purple-700">
                    S/ {Math.abs(selected.diferencia_reasignacion ?? 0)}
                  </p>
                  {!selected.diferencia_reasignacion_saldada ? (
                    <LoadingButton
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => marcarDiferenciaSaldada(selected.id)}
                      isLoading={marcandoDiferencia}
                      loadingText="Guardando"
                      loadingVariant="spinner"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {(selected.diferencia_reasignacion ?? 0) > 0 ? "✅ Ya entregué la diferencia" : "✅ Ya cobré la diferencia"}
                    </LoadingButton>
                  ) : (
                    <p className="text-xs text-green-700">
                      ✓ Diferencia resuelta
                      {selected.diferencia_reasignacion_saldada_en &&
                        ` el ${new Date(selected.diferencia_reasignacion_saldada_en).toLocaleDateString("es-PE", { day: "numeric", month: "long" })}`}
                    </p>
                  )}
                </div>
              )}

              {/* Bloque pago parcial — mostrar desglose y botón para marcar saldo cobrado */}
              {selected.modo_pago === "parcial" &&
                selected.estado !== "cancelada" && (
                  <div
                    className={`rounded-lg border p-4 space-y-3 ${
                      selected.saldo_cobrado
                        ? "border-green-200 bg-green-50"
                        : "border-orange-200 bg-orange-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        Pago parcial — Saldo en cancha
                      </p>
                      {selected.saldo_cobrado ? (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          ✓ Cobrado
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                          Pendiente
                        </Badge>
                      )}
                    </div>

                    {/* Resumen montos */}
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Adelanto online
                        </p>
                        <p className="font-bold text-green-600">
                          S/ {selected.monto_adelanto}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Saldo en cancha
                        </p>
                        <p
                          className={`font-bold ${selected.saldo_cobrado ? "text-green-600" : "text-orange-600"}`}
                        >
                          S/ {selected.saldo_pendiente}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-primary">
                          S/ {selected.precio}
                        </p>
                      </div>
                    </div>

                    {/* Botón o confirmación */}
                    {!selected.saldo_cobrado ? (
                      <>
                        <p className="text-xs text-orange-700 font-medium">
                          Cobra S/ {selected.saldo_pendiente} al cliente cuando
                          llegue a la cancha
                        </p>
                        <LoadingButton
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => marcarSaldoCobrado(selected.id)}
                          isLoading={marcandoSaldo}
                          loadingText="Guardando"
                          loadingVariant="spinner"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />✅ Ya cobré
                          el saldo
                        </LoadingButton>
                      </>
                    ) : (
                      <p className="text-xs text-green-700">
                        ✓ Saldo de S/ {selected.saldo_pendiente} marcado como
                        cobrado
                        {selected.saldo_cobrado_en &&
                          ` el ${new Date(selected.saldo_cobrado_en).toLocaleDateString("es-PE", { day: "numeric", month: "long" })}`}
                      </p>
                    )}
                  </div>
                )}

              {/* Bloque devolución — solo si está cancelada */}
              {selected.estado === "cancelada" &&
                (selected.devolucion_calculada ?? 0) > 0 && (
                  <div
                    className={`rounded-lg border p-4 space-y-3 ${
                      selected.devolucion_procesada
                        ? "border-green-200 bg-green-50"
                        : "border-orange-200 bg-orange-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        Devolución al cliente
                      </p>
                      {selected.devolucion_procesada ? (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          ✓ Realizada
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                          Pendiente
                        </Badge>
                      )}
                    </div>

                    {selected.cancelado_en && (
                      <p className="text-xs text-muted-foreground">
                        Cancelado el{" "}
                        {new Date(selected.cancelado_en).toLocaleDateString(
                          "es-PE",
                          { day: "numeric", month: "long", year: "numeric" },
                        )}{" "}
                        a las{" "}
                        {new Date(selected.cancelado_en).toLocaleTimeString(
                          "es-PE",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </p>
                    )}

                    {/* Resumen montos */}
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Pagado</p>
                        <p className="font-bold text-foreground">
                          S/ {selected.precio}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          A devolver
                        </p>
                        <p
                          className={`font-bold ${selected.devolucion_procesada ? "text-green-600" : "text-orange-600"}`}
                        >
                          S/ {selected.devolucion_calculada}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Penalidad
                        </p>
                        <p className="font-bold text-green-600">
                          S/ {selected.penalidad_aplicada ?? selected.precio}
                        </p>
                      </div>
                    </div>

                    {/* Instrucción o confirmación */}
                    {!selected.devolucion_procesada ? (
                      <>
                        <p className="text-xs text-orange-700 font-medium">
                          {(() => {
                            const { label, esDiferente } = getMetodoDevolucion(
                              selected.usuario_telefono,
                              selected.metodo_pago,
                            );
                            const numero = getNumeroLimpio(
                              selected.usuario_telefono,
                            );
                            return (
                              <>
                                Transfiere S/ {selected.devolucion_calculada} a{" "}
                                <span className="font-bold">
                                  {selected.usuario_nombre}
                                </span>{" "}
                                por{" "}
                                <span
                                  className={
                                    esDiferente
                                      ? "font-bold text-red-600 underline"
                                      : "font-bold"
                                  }
                                >
                                  {label}
                                </span>
                                {esDiferente && (
                                  <span className="ml-1 text-red-600">
                                    (⚠️ pagó con {selected.metodo_pago},
                                    devolver por {label})
                                  </span>
                                )}
                                {numero && ` al número ${numero}`}
                              </>
                            );
                          })()}
                        </p>
                        <LoadingButton
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => marcarDevolucionRealizada(selected.id)}
                          isLoading={procesando}
                          loadingText="Guardando"
                          loadingVariant="spinner"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />✅ Ya devolví
                          el dinero
                        </LoadingButton>
                      </>
                    ) : (
                      <p className="text-xs text-green-700">
                        ✓ Devolución de S/ {selected.devolucion_calculada}{" "}
                        marcada como realizada.
                      </p>
                    )}
                  </div>
                )}

              {/* Sin devolución */}
              {selected.estado === "cancelada" &&
                (selected.devolucion_calculada ?? 0) === 0 &&
                selected.devolucion_calculada !== null && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">
                      Sin devolución — cancelación tardía (menos de 1 hora de
                      anticipación)
                    </p>
                  </div>
                )}

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Comprobante de pago
                </p>
                {selected.comprobante_url ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border">
                    <Image
                      src={selected.comprobante_url}
                      alt="Comprobante"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      Sin comprobante adjunto
                    </p>
                  </div>
                )}
              </div>

              {selected.estado === "pendiente" ? (
                <div className="flex gap-3">
                  <LoadingButton
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => rechazar(selected.id)}
                    isLoading={rechazando}
                    loadingText="Rechazando"
                    loadingVariant="spinner"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar
                  </LoadingButton>
                  <LoadingButton
                    className="flex-1"
                    onClick={() => confirmar(selected.id)}
                    isLoading={confirmando}
                    loadingText="Confirmando"
                    loadingVariant="spinner"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmar
                  </LoadingButton>
                </div>
              ) : selected.estado === "confirmada" ? (
                <div className="flex gap-3">
                  <div className="flex-1 flex justify-center">
                    {estadoBadge(selected.estado)}
                  </div>
                  {new Date(
                    `${selected.fecha}T${selected.hora.split(" - ")[0]}`,
                  ) > new Date() && (
                    <LoadingButton
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => cancelar(selected.id)}
                      isLoading={cancelando}
                      loadingText="Cancelando"
                      loadingVariant="spinner"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar reserva
                    </LoadingButton>
                  )}
                </div>
              ) : (
                selected.estado !== "cancelada" && (
                  <div className="flex justify-center">
                    {estadoBadge(selected.estado)}
                  </div>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: reasignar sección de la reserva */}
      <Dialog open={modalReasignar} onOpenChange={setModalReasignar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-purple-600" />
              Reasignar sección
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Actualmente:{" "}
                <span className="font-medium text-foreground">
                  {selected.seccion_nombre ? `Sección ${selected.seccion_nombre}` : "Cancha completa"}
                </span>{" "}
                — S/ {selected.precio}
              </p>
              <div className="space-y-1.5">
                <Label>Mover a</Label>
                <Select value={seccionElegida} onValueChange={setSeccionElegida}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const completaOcupada = !!disponibilidadReasignar?.completaOcupada;
                      const precio = disponibilidadReasignar?.precioCompleta;
                      return (
                        <SelectItem value="__completa__" disabled={!selected.seccion_id || completaOcupada}>
                          Cancha completa{precio != null ? ` — S/ ${precio}` : ""}
                          {completaOcupada && selected.seccion_id ? " — no disponible (horario ocupado)" : ""}
                        </SelectItem>
                      );
                    })()}
                    {seccionesReasignar.map((s) => {
                      const esActual = selected.seccion_id === s.id;
                      const ocupada =
                        !esActual &&
                        !!disponibilidadReasignar &&
                        (disponibilidadReasignar.seccionesOcupadas.includes(s.id) ||
                          disponibilidadReasignar.hayReservaCompletaBloqueando);
                      const precio = disponibilidadReasignar?.preciosPorSeccion[s.id];
                      return (
                        <SelectItem key={s.id} value={s.id} disabled={esActual || ocupada}>
                          {s.nombre} — S/ {precio != null ? precio : s.precio_por_hora}
                          {ocupada ? " — no disponible (horario ocupado)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {cargandoDisponibilidad && (
                  <p className="text-xs text-muted-foreground">Verificando disponibilidad...</p>
                )}
              </div>
              {errorReasignar && (
                <p className="text-sm text-destructive">{errorReasignar}</p>
              )}
              <p className="text-xs text-muted-foreground">
                El precio se recalculará según el destino. Si el cliente pagó de más, la diferencia
                quedará pendiente de entregar cuando vaya a jugar.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setModalReasignar(false)}>
                  Cancelar
                </Button>
                <LoadingButton
                  onClick={reasignarSeccion}
                  isLoading={reasignando}
                  loadingText="Reasignando"
                  loadingVariant="spinner"
                >
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Confirmar
                </LoadingButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de cancelación */}
      <Dialog
        open={cancelModal.open}
        onOpenChange={(open) => setCancelModal((m) => ({ ...m, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Cancelar reserva
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <p className="font-semibold mb-1">
                ⚠️ Devolución completa requerida
              </p>
              <p>
                Al cancelar como administrador debes devolver el{" "}
                <strong>100%</strong> del pago al cliente. Verifica el método de
                pago antes de continuar.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Motivo (opcional)
              </label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="Ej: Mantenimiento de la cancha, problema técnico..."
                value={cancelModal.motivo}
                onChange={(e) =>
                  setCancelModal((m) => ({ ...m, motivo: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setCancelModal((m) => ({ ...m, open: false }))}
              >
                Volver
              </Button>
              <LoadingButton
                variant="destructive"
                onClick={confirmarCancelacion}
                isLoading={cancelando}
                loadingText="Cancelando"
                loadingVariant="spinner"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Confirmar cancelación
              </LoadingButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: reserva directa para cliente fijo ── */}
      <Dialog
        open={modalDirecta}
        onOpenChange={(open) => {
          setModalDirecta(open);
          if (!open) setDirectaResultado(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RepeatIcon className="h-5 w-5 text-primary" />
              Nueva reserva para cliente fijo
            </DialogTitle>
          </DialogHeader>

          {directaResultado ? (
            <div className="space-y-4">
              <div
                className={`rounded-lg p-4 text-sm ${directaResultado.created > 0 ? "bg-green-50 border border-green-200" : "bg-muted"}`}
              >
                <p className="font-semibold text-foreground mb-2">
                  {directaResultado.created} reserva
                  {directaResultado.created !== 1 ? "s" : ""} creada
                  {directaResultado.created !== 1 ? "s" : ""}
                  {directaResultado.skipped > 0 &&
                    ` · ${directaResultado.skipped} con conflicto`}
                </p>
                <ul className="space-y-1">
                  {directaResultado.resultados.map((r) => (
                    <li key={r.fecha} className="flex items-center gap-2">
                      {r.estado === "creada" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      )}
                      <span
                        className={
                          r.estado === "conflicto"
                            ? "text-destructive"
                            : "text-foreground"
                        }
                      >
                        {new Date(r.fecha + "T00:00:00").toLocaleDateString(
                          "es-PE",
                          { weekday: "short", day: "numeric", month: "short" },
                        )}
                        {r.estado === "conflicto" && " — horario ocupado"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDirectaResultado(null)}
                >
                  Crear otra
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setModalDirecta(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cancha — solo si el dueño tiene más de una */}
              {canchasOwner.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Cancha</Label>
                  <Select
                    value={directaForm.cancha_id}
                    onValueChange={(v) => {
                      const c = canchasOwner.find((x) => x.id === v);
                      setDirectaForm((f) => ({
                        ...f,
                        cancha_id: v,
                        cancha_nombre: c?.nombre ?? "",
                        seccion_id: "",
                        seccion_nombre: "",
                        fecha: "",
                        hora: "",
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cancha" />
                    </SelectTrigger>
                    <SelectContent>
                      {canchasOwner.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sección — solo si la cancha tiene secciones */}
              {seccionesCancha.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Sección</Label>
                  <Select
                    value={directaForm.seccion_id || "__completa__"}
                    onValueChange={(v) => {
                      if (v === "__completa__") {
                        setDirectaForm(f => ({ ...f, seccion_id: "", seccion_nombre: "" }));
                      } else {
                        const sec = seccionesCancha.find(s => s.id === v);
                        setDirectaForm(f => ({
                          ...f,
                          seccion_id: v,
                          seccion_nombre: sec?.nombre ?? "",
                          precio: sec ? String(sec.precio_por_hora) : f.precio,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__completa__">Cancha completa</SelectItem>
                      {seccionesCancha.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre} — S/ {s.precio_por_hora}/h
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Nombre del cliente *</Label>
                  <Input
                    placeholder="Ej: Juan Pérez"
                    disabled={!directaForm.cancha_id}
                    value={directaForm.cliente_nombre}
                    onChange={(e) =>
                      setDirectaForm((f) => ({
                        ...f,
                        cliente_nombre: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Teléfono (opcional)</Label>
                  <Input
                    placeholder="987654321"
                    disabled={!directaForm.cancha_id}
                    value={directaForm.cliente_telefono}
                    onChange={(e) =>
                      setDirectaForm((f) => ({
                        ...f,
                        cliente_telefono: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de inicio *</Label>
                  <Input
                    type="date"
                    disabled={!directaForm.cancha_id}
                    value={directaForm.fecha}
                    onChange={(e) =>
                      setDirectaForm((f) => ({
                        ...f,
                        fecha: e.target.value,
                        hora: "",
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora *</Label>
                  <Select
                    value={directaForm.hora}
                    disabled={!directaForm.fecha || loadingHoras}
                    onValueChange={(v) =>
                      setDirectaForm((f) => ({ ...f, hora: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingHoras
                            ? "Cargando..."
                            : !directaForm.fecha
                              ? "Elige fecha primero"
                              : "Hora"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const c = canchasOwner.find(
                          (x) => x.id === directaForm.cancha_id,
                        );
                        const horas = c
                          ? getHorasOperacion(c.hora_apertura, c.hora_cierre)
                          : getHorasOperacion("06:00", "22:00");
                        return horas.map((h) => (
                          <SelectItem
                            key={h}
                            value={h}
                            disabled={horasOcupadas.includes(h)}
                          >
                            {h}
                            {horasOcupadas.includes(h) ? " — ocupado" : ""}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Precio (S/) *</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="80"
                    disabled={!directaForm.cancha_id}
                    value={directaForm.precio}
                    onChange={(e) =>
                      setDirectaForm((f) => ({ ...f, precio: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cobro</Label>
                  <Select
                    disabled={!directaForm.cancha_id}
                    value={directaForm.metodo_pago}
                    onValueChange={(v) =>
                      setDirectaForm((f) => ({ ...f, metodo_pago: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="yape">Yape</SelectItem>
                      <SelectItem value="plin">Plin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <RepeatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    Repetir semanalmente durante
                  </Label>
                  <Select
                    disabled={!directaForm.cancha_id}
                    value={directaForm.semanas}
                    onValueChange={(v) =>
                      setDirectaForm((f) => ({ ...f, semanas: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">
                        Solo esta fecha (1 semana)
                      </SelectItem>
                      {[2, 3, 4, 6, 8, 12].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} semanas ({Math.round(n / 4)} mes
                          {n >= 8 ? "es" : n === 4 ? "" : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {Number(directaForm.semanas) > 1 &&
                    directaForm.fecha &&
                    directaForm.hora && (
                      <p className="text-xs text-muted-foreground">
                        Se crearán {directaForm.semanas} reservas cada{" "}
                        {new Date(
                          directaForm.fecha + "T00:00:00",
                        ).toLocaleDateString("es-PE", { weekday: "long" })}{" "}
                        — de{" "}
                        {new Date(
                          directaForm.fecha + "T00:00:00",
                        ).toLocaleDateString("es-PE", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        a{" "}
                        {(() => {
                          const d = new Date(directaForm.fecha + "T00:00:00");
                          d.setDate(
                            d.getDate() + (Number(directaForm.semanas) - 1) * 7,
                          );
                          return d.toLocaleDateString("es-PE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          });
                        })()}
                      </p>
                    )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setModalDirecta(false)}
                >
                  Cancelar
                </Button>
                <LoadingButton
                  className="flex-1"
                  onClick={submitDirecta}
                  isLoading={directaLoading}
                  loadingText="Creando..."
                  loadingVariant="spinner"
                  disabled={
                    !directaForm.cancha_id ||
                    !directaForm.cliente_nombre ||
                    !directaForm.fecha ||
                    !directaForm.hora ||
                    !directaForm.precio
                  }
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear{" "}
                  {Number(directaForm.semanas) > 1
                    ? `${directaForm.semanas} reservas`
                    : "reserva"}
                </LoadingButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
