"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { DiaSemanaKey, PreciosPorDia } from "@/lib/precio-utils";

const DIAS_TABS: { key: DiaSemanaKey; label: string }[] = [
  { key: "lunes", label: "Lun" },
  { key: "martes", label: "Mar" },
  { key: "miercoles", label: "Mié" },
  { key: "jueves", label: "Jue" },
  { key: "viernes", label: "Vie" },
  { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

export interface PreciosPorDiaEditorProps {
  /** Precio base "de siempre" (fallback final). Usado como placeholder. */
  precioBase: number;
  /** Overrides de hora "de siempre" (todos los días). */
  preciosPorHora: Record<string, number>;
  onPreciosPorHoraChange: (next: Record<string, number>) => void;
  /** Overrides por día de semana. */
  preciosPorDia: PreciosPorDia;
  onPreciosPorDiaChange: (next: PreciosPorDia) => void;
  horasOperacion: string[];
  /** Tamaño compacto para usarlo dentro de las tarjetas de sección. */
  compact?: boolean;
}

function HoraPrecioGrid({
  horas,
  valores,
  placeholder,
  onChange,
  compact,
}: {
  horas: string[];
  valores: Record<string, number>;
  placeholder: number;
  onChange: (next: Record<string, number>) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-2 ${compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}
    >
      {horas.map((hora) => {
        const valorActual = valores[hora];
        const tienePersonalizado = valorActual !== undefined;
        return (
          <div
            key={hora}
            className={`rounded-xl border space-y-1.5 transition-colors ${compact ? "p-2" : "p-3"} ${tienePersonalizado ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`font-medium text-foreground ${compact ? "text-xs" : "text-sm"}`}
              >
                {hora}
              </span>
              {tienePersonalizado && (
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...valores };
                    delete next[hora];
                    onChange(next);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">S/</span>
              <Input
                type="number"
                min={0}
                placeholder={String(placeholder)}
                value={valorActual ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    const next = { ...valores };
                    delete next[hora];
                    onChange(next);
                  } else {
                    onChange({ ...valores, [hora]: Number(val) });
                  }
                }}
                className={compact ? "h-7 text-xs px-2" : "h-8 text-sm px-2"}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PreciosPorDiaEditor({
  precioBase,
  preciosPorHora,
  onPreciosPorHoraChange,
  preciosPorDia,
  onPreciosPorDiaChange,
  horasOperacion,
  compact,
}: PreciosPorDiaEditorProps) {
  const [activeTab, setActiveTab] = useState<"todos" | DiaSemanaKey>("todos");

  const diaActivo = activeTab === "todos" ? null : activeTab;

  const cfgDia = diaActivo ? (preciosPorDia[diaActivo] ?? {}) : null;

  const actualizarDia = (patch: Partial<{ base?: number; precios_por_hora?: Record<string, number> }>) => {
    if (!diaActivo) return;
    const actual = preciosPorDia[diaActivo] ?? {};
    const next = { ...actual, ...patch };
    onPreciosPorDiaChange({ ...preciosPorDia, [diaActivo]: next });
  };

  const restablecerDia = () => {
    if (!diaActivo) return;
    const next = { ...preciosPorDia };
    delete next[diaActivo];
    onPreciosPorDiaChange(next);
  };

  const tieneOverride = (dia: DiaSemanaKey) => {
    const c = preciosPorDia[dia];
    return !!c && (c.base !== undefined || Object.keys(c.precios_por_hora ?? {}).length > 0);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("todos")}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTab === "todos"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          Todos los días
        </button>
        {DIAS_TABS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setActiveTab(d.key)}
            className={`relative rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === d.key
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {d.label}
            {tieneOverride(d.key) && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "todos" ? (
        <HoraPrecioGrid
          horas={horasOperacion}
          valores={preciosPorHora}
          placeholder={precioBase}
          onChange={onPreciosPorHoraChange}
          compact={compact}
        />
      ) : (
        diaActivo && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">
                Precio base para {DIAS_TABS.find((d) => d.key === diaActivo)?.label}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">S/</span>
                <Input
                  type="number"
                  min={0}
                  placeholder={String(precioBase)}
                  value={cfgDia?.base ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    actualizarDia({ base: val === "" ? undefined : Number(val) });
                  }}
                  className="h-8 w-24 text-sm px-2"
                />
              </div>
              {tieneOverride(diaActivo) && (
                <button
                  type="button"
                  onClick={restablecerDia}
                  className="text-xs text-muted-foreground hover:text-destructive ml-auto"
                >
                  Restablecer este día
                </button>
              )}
            </div>
            <HoraPrecioGrid
              horas={horasOperacion}
              valores={cfgDia?.precios_por_hora ?? {}}
              placeholder={cfgDia?.base ?? precioBase}
              onChange={(next) => actualizarDia({ precios_por_hora: next })}
              compact={compact}
            />
          </div>
        )
      )}
    </div>
  );
}
