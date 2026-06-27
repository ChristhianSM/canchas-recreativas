"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  FileSpreadsheet,
  X,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  exportarReservasExcel,
  type ResumenExcel,
} from "@/lib/export-reservas";

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
  estado: "pendiente" | "confirmada" | "rechazada" | "cancelada";
  creado_en: string;
  modo_pago?: "completo" | "parcial";
  monto_adelanto?: number;
  saldo_pendiente?: number;
  devolucion_calculada?: number | null;
  devolucion_procesada?: boolean | null;
  grupo_reserva_id?: string | null;
};

type Cancha = { id: string; nombre: string };

function getOwnerToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cp_owner_token");
}

const ESTADOS = ["pendiente", "confirmada", "rechazada", "cancelada"] as const;
const METODOS = ["yape", "plin", "efectivo"];

export default function OwnerReportesPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cancha, setCancha] = useState("");
  const [estado, setEstado] = useState("");
  const [metodo, setMetodo] = useState("");

  useEffect(() => {
    const token = getOwnerToken();
    if (!token) return;
    Promise.all([
      fetch("/api/admin-cancha/reservas", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch("/api/admin-cancha/canchas", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([res, can]) => {
        setReservas(Array.isArray(res) ? res : []);
        setCanchas(Array.isArray(can) ? can : []);
      })
      .finally(() => setCargando(false));
  }, []);

  // Agrupamos multi-hora igual que en reservas
  const reservasBase = useMemo(() => {
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
    for (const [, slots] of grupos) {
      const principal =
        slots.find((s) => s.id === s.grupo_reserva_id) ?? slots[0];
      const horas = slots.map((s) => s.hora).sort();
      const horaFin = `${String(parseInt(horas[horas.length - 1].split(":")[0]) + 1).padStart(2, "0")}:00`;
      resultado.push({
        ...principal,
        hora: horas.length > 1 ? `${horas[0]} - ${horaFin}` : principal.hora,
      });
    }
    return resultado;
  }, [reservas]);

  const filtradas = useMemo(
    () =>
      reservasBase.filter((r) => {
        if (desde && r.fecha < desde) return false;
        if (hasta && r.fecha > hasta) return false;
        if (cancha && r.cancha_id !== cancha) return false;
        if (estado && r.estado !== estado) return false;
        if (metodo && r.metodo_pago !== metodo) return false;
        return true;
      }),
    [reservasBase, desde, hasta, cancha, estado, metodo],
  );

  const hayFiltros = desde || hasta || cancha || estado || metodo;

  const resumen = useMemo(() => {
    const ingresos = filtradas
      .filter((r) => r.estado === "confirmada")
      .reduce((s, r) => s + (r.precio ?? 0), 0);
    const porEstado = filtradas.reduce<Record<string, number>>((acc, r) => {
      acc[r.estado] = (acc[r.estado] ?? 0) + 1;
      return acc;
    }, {});
    return { total: filtradas.length, ingresos, porEstado };
  }, [filtradas]);

  const limpiar = () => {
    setDesde("");
    setHasta("");
    setCancha("");
    setEstado("");
    setMetodo("");
  };

  const handleExportar = () => {
    if (filtradas.length === 0) return;
    setExportando(true);
    try {
      const filas = filtradas.map((r) => ({
        ID: r.id,
        Cliente: r.usuario_nombre,
        Email: r.usuario_email,
        Teléfono: r.usuario_telefono ?? "",
        Cancha: r.cancha_nombre,
        "Fecha juego": new Date(r.fecha + "T00:00:00").toLocaleDateString(
          "es-PE",
        ),
        Hora: r.hora,
        "Fecha reservado": new Date(r.creado_en).toLocaleString("es-PE"),
        "Monto total (S/)": r.precio,
        "Modo pago": r.modo_pago === "parcial" ? "Parcial" : "Completo",
        "Adelanto (S/)":
          r.modo_pago === "parcial" ? (r.monto_adelanto ?? "") : "",
        "Saldo cancha (S/)":
          r.modo_pago === "parcial" ? (r.saldo_pendiente ?? "") : "",
        Método: r.metodo_pago,
        Estado: r.estado.charAt(0).toUpperCase() + r.estado.slice(1),
        "Devolución (S/)": r.devolucion_calculada ?? "",
        "Devolución procesada": r.devolucion_procesada
          ? "Sí"
          : r.devolucion_calculada
            ? "No"
            : "",
      }));
      const resumenExcel: ResumenExcel = {
        total: resumen.total,
        ingresos: resumen.ingresos,
        confirmadas: resumen.porEstado["confirmada"] ?? 0,
        canceladas: resumen.porEstado["cancelada"] ?? 0,
      };
      const sufijo =
        desde && hasta
          ? `${desde}_al_${hasta}`
          : desde
            ? `desde_${desde}`
            : hasta
              ? `hasta_${hasta}`
              : new Date().toISOString().slice(0, 10);
      exportarReservasExcel(filas, `reservas-${sufijo}`, resumenExcel);
    } finally {
      setExportando(false);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground">
          Filtra por temporada y exporta a Excel
        </p>
      </div>

      {/* Filtros */}
      <Card className="border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Filtros de exportación
          </p>
          {hayFiltros && (
            <button
              onClick={limpiar}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Desde */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Desde
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Hasta */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Hasta
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                min={desde || undefined}
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Cancha */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Cancha
            </label>
            <select
              value={cancha}
              onChange={(e) => setCancha(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas las canchas</option>
              {canchas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e.charAt(0).toUpperCase() + e.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Método de pago */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Método de pago
            </label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos los métodos</option>
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <p className="text-xs font-medium">Total reservas</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{resumen.total}</p>
        </Card>
        <Card className="border-border p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <p className="text-xs font-medium">Ingresos confirmados</p>
          </div>
          <p className="text-2xl font-bold text-primary">
            S/ {resumen.ingresos.toFixed(2)}
          </p>
        </Card>
        <Card className="border-border p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-xs font-medium">Confirmadas</p>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {resumen.porEstado["confirmada"] ?? 0}
          </p>
        </Card>
        <Card className="border-border p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <p className="text-xs font-medium">Canceladas</p>
          </div>
          <p className="text-2xl font-bold text-destructive">
            {resumen.porEstado["cancelada"] ?? 0}
          </p>
        </Card>
      </div>

      {/* Vista previa + exportar */}
      <Card className="border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Vista previa
              {filtradas.length > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">
                  ({filtradas.length} reserva{filtradas.length !== 1 ? "s" : ""}
                  )
                </span>
              )}
            </p>
            {hayFiltros && desde && hasta && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Del{" "}
                {new Date(desde + "T00:00:00").toLocaleDateString("es-PE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                al{" "}
                {new Date(hasta + "T00:00:00").toLocaleDateString("es-PE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          <Button
            onClick={handleExportar}
            disabled={filtradas.length === 0 || exportando}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportando
              ? "Exportando..."
              : `Exportar ${filtradas.length > 0 ? filtradas.length : ""} reservas`}
          </Button>
        </div>

        {filtradas.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">
              {reservasBase.length === 0
                ? "No hay reservas registradas aún"
                : "Ninguna reserva coincide con los filtros seleccionados"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {[
                    "Cliente",
                    "Cancha",
                    "Fecha",
                    "Hora",
                    "Monto",
                    "Método",
                    "Estado",
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
                {filtradas.slice(0, 10).map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {r.usuario_nombre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.usuario_email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {r.cancha_nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(r.fecha + "T00:00:00").toLocaleDateString(
                        "es-PE",
                        { day: "numeric", month: "short" },
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {r.hora}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-primary">
                      S/ {r.precio}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize text-muted-foreground">
                      {r.metodo_pago}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          {
                            pendiente:
                              "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                            confirmada:
                              "bg-primary/10 text-primary border-primary/20",
                            rechazada:
                              "bg-destructive/10 text-destructive border-destructive/20",
                            cancelada: "bg-muted text-muted-foreground",
                          }[r.estado]
                        }
                      >
                        {r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtradas.length > 10 && (
              <div className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
                Mostrando 10 de {filtradas.length} reservas — el Excel incluirá
                todas
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
