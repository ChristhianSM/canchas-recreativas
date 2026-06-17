"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  CreditCard,
  AlertTriangle,
  ArrowLeft,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CancelarReservaSimple from "@/components/cancelar-reserva-simple";

type ReservaEstado = "pendiente" | "confirmada" | "rechazada" | "cancelada";

interface Reserva {
  id: string;
  canchaName: string;
  cancha_nombre: string;
  fecha: string;
  hora: string;
  precio: number;
  metodo_pago: string;
  metodoPago: string;
  estado: ReservaEstado;
  usuario_nombre: string;
  usuario_email: string;
  usuario_telefono: string;
  devolucion_calculada: number | null;
  penalidad_aplicada: number | null;
  cancelado_en: string | null;
}

const estadoConfig: Record<
  ReservaEstado,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pendiente: {
    label: "Pendiente de confirmación",
    color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    icon: <Clock className="h-5 w-5 text-yellow-600" />,
  },
  confirmada: {
    label: "Confirmada",
    color: "bg-green-500/10 text-green-700 border-green-500/20",
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  },
  rechazada: {
    label: "Rechazada",
    color: "bg-red-500/10 text-red-700 border-red-500/20",
    icon: <XCircle className="h-5 w-5 text-red-600" />,
  },
  cancelada: {
    label: "Cancelada",
    color: "bg-muted text-muted-foreground",
    icon: <XCircle className="h-5 w-5 text-muted-foreground" />,
  },
};

function MiReservaContent() {
  const searchParams = useSearchParams();
  const reservaId = searchParams.get("id");

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelarOpen, setCancelarOpen] = useState(false);

  useEffect(() => {
    if (!reservaId) {
      setError("No se encontró el ID de la reserva.");
      setLoading(false);
      return;
    }
    fetch(`/api/mi-reserva?id=${reservaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError("No se encontró la reserva. Verifica el link de tu email.");
        } else {
          setReserva({
            ...data,
            canchaName: data.cancha_nombre,
            metodoPago: data.metodo_pago,
          });
        }
      })
      .catch(() => setError("Error al cargar la reserva."))
      .finally(() => setLoading(false));
  }, [reservaId]);

  const handleCancelar = async (id: string) => {
    const res = await fetch(`/api/reservas/${id}/cancelar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cancelar");
    alert(data.mensaje);
    // Recargar la reserva para mostrar el nuevo estado
    const updated = await fetch(`/api/mi-reserva?id=${id}`).then((r) =>
      r.json(),
    );
    setReserva({
      ...updated,
      canchaName: updated.cancha_nombre,
      metodoPago: updated.metodo_pago,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !reserva) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Reserva no encontrada
          </h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const cfg = estadoConfig[reserva.estado];
  const fechaLabel = new Date(reserva.fecha + "T00:00:00").toLocaleDateString(
    "es-PE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
  const codigoCorto = reserva.id.slice(-6).toUpperCase();
  const puedeCancel =
    reserva.estado === "pendiente" || reserva.estado === "confirmada";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4 w-full max-w-lg">
          <Link
            href="/"
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo-new.svg"
              alt="CanchaGo"
              width={110}
              height={32}
              className="h-7 w-auto object-contain"
            />
            <span className="font-semibold text-foreground">Mi Reserva</span>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 py-8 w-full max-w-lg">
        <div className="space-y-4">
          {/* Estado */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              {cfg.icon}
              <div>
                <p className="text-xs text-muted-foreground">
                  Estado de tu reserva
                </p>
                <Badge variant="outline" className={cfg.color}>
                  {cfg.label}
                </Badge>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Código</p>
                <p className="font-bold text-foreground tracking-widest">
                  {codigoCorto}
                </p>
              </div>
            </div>

            {/* Mensaje según estado */}
            {reserva.estado === "pendiente" && (
              <p className="mt-3 text-sm text-muted-foreground bg-yellow-50 rounded-lg p-3">
                ⏳ Tu reserva está siendo revisada por el administrador. Te
                avisaremos pronto.
              </p>
            )}
            {reserva.estado === "confirmada" && (
              <p className="mt-3 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                ✅ ¡Tu reserva fue confirmada! Preséntate puntualmente en la
                cancha.
              </p>
            )}
            {reserva.estado === "rechazada" && (
              <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg p-3">
                ❌ Tu reserva fue rechazada. Puedes intentar reservar otro
                horario.
              </p>
            )}
            {reserva.estado === "cancelada" && (
              <div className="mt-3 text-sm bg-muted rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">Reserva cancelada</p>
                {reserva.devolucion_calculada !== null && (
                  <p className="text-muted-foreground">
                    {(reserva.devolucion_calculada ?? 0) > 0
                      ? `Devolución: S/ ${reserva.devolucion_calculada} por ${reserva.metodo_pago}`
                      : "Sin devolución por cancelación tardía"}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Detalle */}
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold text-foreground">
              {reserva.cancha_nombre}
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="capitalize">{fechaLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{reserva.hora}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>
                  S/ {reserva.precio} ·{" "}
                  <span className="capitalize">{reserva.metodo_pago}</span>
                </span>
              </div>
              {reserva.usuario_telefono && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{reserva.usuario_telefono}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Botón cancelar */}
          {puedeCancel && (
            <Button
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setCancelarOpen(true)}
            >
              Cancelar reserva
            </Button>
          )}

          {/* Crear cuenta */}
          <div className="rounded-lg border border-border bg-card p-4 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">
              ¿Quieres más control?
            </p>
            <p className="text-xs text-muted-foreground">
              Crea una cuenta con tu email y gestiona todas tus reservas desde
              un solo lugar.
            </p>
            <Button size="sm" asChild>
              <Link href={`/registro`}>Crear cuenta gratis</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Dialog cancelación */}
      <CancelarReservaSimple
        reserva={cancelarOpen ? reserva : null}
        onClose={() => setCancelarOpen(false)}
        onConfirm={handleCancelar}
      />
    </div>
  );
}

export default function MiReservaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <MiReservaContent />
    </Suspense>
  );
}
