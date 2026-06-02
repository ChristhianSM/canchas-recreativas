"use client";

import { useState } from "react";
import { Phone, Map, Lock, Crown, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapaPartidoModal } from "@/components/mapa-partido-modal";
import { getLocalDateString } from "@/lib/date-utils";
import type { Coordenadas } from "@/lib/geolocation-utils";

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

export interface PartidoDetalle {
  id: string;
  cancha_nombre: string;
  cancha_distrito: string;
  organizador_nombre: string;
  deporte: Deporte;
  fecha: string;
  hora: string;
  nivel: Nivel;
  jugadores_max: number;
  jugadores_actuales: number;
  jugadores_equipo: number;
  precio_total: number;
  precio_por_persona: number;
  estado: "abierto" | "completo" | "cancelado" | "finalizado";
  descripcion: string | null;
  jugadores: JugadorPreview[] | null;
  ya_unido: boolean;
  ya_organizador: boolean;
  cancha_lat: number | null;
  cancha_lng: number | null;
}

const NIVEL_CONFIG: Record<Nivel, { label: string; cls: string }> = {
  libre:        { label: "Libre",        cls: "bg-green-100 text-green-700" },
  principiante: { label: "Principiante", cls: "bg-blue-100 text-blue-700" },
  intermedio:   { label: "Intermedio",   cls: "bg-amber-100 text-amber-700" },
  avanzado:     { label: "Avanzado",     cls: "bg-orange-100 text-orange-700" },
};

const DEPORTE_EMOJI: Record<string, string> = {
  futbol:  "⚽",
  futsal:  "⚽",
  basquet: "🏀",
  voley:   "🏐",
  tenis:   "🎾",
};

const DEPORTE_LABEL: Record<string, string> = {
  futbol:  "Fútbol",
  futsal:  "Futsal",
  basquet: "Básquet",
  voley:   "Voley",
  tenis:   "Tenis",
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

function formatFechaLarga(fecha: string): string {
  const hoy = getLocalDateString();
  const manana = getLocalDateString(
    new Date(new Date().setDate(new Date().getDate() + 1)),
  );
  if (fecha === hoy) return "Hoy";
  if (fecha === manana) return "Mañana";
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface Props {
  partido: PartidoDetalle | null;
  open: boolean;
  onClose: () => void;
  loadingId: string | null;
  onUnirse: (id: string) => void;
  onSolicitarSalir: (id: string) => void;
  onSolicitarCancelar: (id: string) => void;
  ubicacion: Coordenadas | null;
}

export function PartidoDetalleModal({
  partido,
  open,
  onClose,
  loadingId,
  onUnirse,
  onSolicitarSalir,
  onSolicitarCancelar,
  ubicacion,
}: Props) {
  const [mapaAbierto, setMapaAbierto] = useState(false);

  if (!partido) return null;

  const jugadores = partido.jugadores ?? [];
  const lleno =
    partido.estado === "completo" ||
    partido.jugadores_actuales >= partido.jugadores_max;
  const esOrganizador = partido.ya_organizador;
  const isLoading = loadingId === partido.id;
  const { label: nivelLabel, cls: nivelCls } = NIVEL_CONFIG[partido.nivel];
  const cuposLibres = partido.jugadores_max - partido.jugadores_actuales;
  const pct = Math.round(
    (partido.jugadores_actuales / partido.jugadores_max) * 100,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden">

          {/* Header fijo */}
          <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl select-none">
              {DEPORTE_EMOJI[partido.deporte] ?? "🏅"}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold leading-tight truncate">
                {partido.cancha_nombre}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {partido.cancha_distrito} · {formatFechaLarga(partido.fecha)} · {partido.hora}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${nivelCls}`}>
                  {nivelLabel}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {DEPORTE_LABEL[partido.deporte]}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  lleno ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                }`}>
                  {lleno ? "Completo" : "Abierto"}
                </span>
              </div>
            </div>
          </div>

          {/* Body scrollable */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

            {/* Cupos + precio */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Cupos</p>
                <p className="text-lg font-bold text-foreground leading-none">
                  {partido.jugadores_actuales}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{partido.jugadores_max}
                  </span>
                </p>
                {partido.jugadores_equipo > partido.jugadores_max && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {partido.jugadores_equipo} en total
                  </p>
                )}
                <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      lleno ? "bg-muted-foreground" : pct >= 85 ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Precio</p>
                <p className="text-lg font-bold text-foreground leading-none">
                  S/ {partido.precio_por_persona}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {partido.jugadores_equipo > partido.jugadores_max
                    ? `por persona (÷${partido.jugadores_equipo})`
                    : "por persona"}
                </p>
              </div>
            </div>

            {/* Descripción */}
            {partido.descripcion && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {partido.descripcion}
              </p>
            )}

            {/* Botón mapa */}
            {partido.cancha_lat != null && (
              <button
                onClick={() => setMapaAbierto(true)}
                className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <Map className="h-4 w-4 text-primary" />
                Ver cómo llegar
              </button>
            )}

            {/* Lista de jugadores */}
            <div>
              <p className="text-sm font-bold text-foreground mb-2">
                Jugadores ({partido.jugadores_actuales}/{partido.jugadores_max})
              </p>
              <div className="space-y-2">
                {jugadores.map((j, i) => (
                  <div
                    key={j.usuario_id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${
                        AVATAR_COLORS[i % AVATAR_COLORS.length]
                      }`}
                    >
                      {j.inicial ?? (i + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold truncate ${!j.nombre ? "text-muted-foreground italic" : "text-foreground"}`}>
                          {j.nombre ?? "Jugador"}
                        </span>
                        {j.es_organizador && (
                          <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        )}
                      </div>
                      {esOrganizador && j.telefono ? (
                        <a
                          href={`tel:${j.telefono}`}
                          className="flex items-center gap-1 mt-0.5 text-xs text-primary font-medium"
                        >
                          <Phone className="h-3 w-3" />
                          {j.telefono}
                        </a>
                      ) : esOrganizador && !j.telefono ? (
                        <span className="text-xs text-muted-foreground mt-0.5 block">
                          Sin teléfono registrado
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}

                {/* Cupos libres */}
                {cuposLibres > 0 &&
                  Array.from({ length: Math.min(cuposLibres, 3) }).map((_, i) => (
                    <div
                      key={`libre-${i}`}
                      className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2.5 opacity-40"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground text-sm font-bold">
                        ?
                      </div>
                      <span className="text-sm text-muted-foreground">Cupo libre</span>
                    </div>
                  ))}
                {cuposLibres > 3 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{cuposLibres - 3} cupos libres más
                  </p>
                )}
              </div>

              {/* Aviso privacidad */}
              {!esOrganizador && jugadores.length > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Solo el organizador puede ver el nombre y teléfono de los jugadores
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer con botón de acción */}
          <div className="shrink-0 px-5 py-4 border-t border-border bg-background">
            {partido.ya_organizador ? (
              <button
                onClick={() => { onSolicitarCancelar(partido.id); onClose(); }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive/10 text-destructive font-bold py-3 text-sm hover:bg-destructive/20 transition-colors disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Cancelar partido
              </button>
            ) : partido.ya_unido ? (
              <button
                onClick={() => { onSolicitarSalir(partido.id); onClose(); }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border text-foreground font-bold py-3 text-sm hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Salir del partido
              </button>
            ) : lleno ? (
              <button
                disabled
                className="w-full rounded-xl bg-secondary text-muted-foreground font-bold py-3 text-sm cursor-not-allowed"
              >
                Partido completo
              </button>
            ) : (
              <button
                onClick={() => { onUnirse(partido.id); onClose(); }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold py-3 text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Unirme al partido
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {mapaAbierto && partido.cancha_lat != null && partido.cancha_lng != null && (
        <MapaPartidoModal
          open={mapaAbierto}
          onClose={() => setMapaAbierto(false)}
          canchaLat={partido.cancha_lat}
          canchaLng={partido.cancha_lng}
          canchaNombre={partido.cancha_nombre}
          canchaDistrito={partido.cancha_distrito}
          ubicacion={ubicacion}
        />
      )}
    </>
  );
}
