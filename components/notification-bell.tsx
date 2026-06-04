"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, XCircle, Heart } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getToken, apiGetNotificaciones, apiMarcarNotifLeida } from "@/lib/api";
import type { Notificacion } from "@/lib/store";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const cargar = useCallback(async () => {
    if (!getToken()) return;
    const data = await apiGetNotificaciones();
    if (!Array.isArray(data)) return;
    setNotifs(
      data.map((n: any) => ({
        id: n.id,
        reservaId: n.reserva_id,
        mensaje: n.mensaje,
        tipo: n.tipo,
        leida: n.leida,
        creadaEn: n.creado_en,
      })),
    );
  }, []);

  useEffect(() => {
    setHydrated(true);
    cargar();
  }, [cargar]);

  // Recargar al abrir el sheet
  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const marcarLeida = async (id: string) => {
    await apiMarcarNotifLeida(id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
  };

  const marcarTodas = async () => {
    const noLeidas = notifs.filter((n) => !n.leida);
    await Promise.all(noLeidas.map((n) => apiMarcarNotifLeida(n.id)));
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  const noLeidas = notifs.filter((n) => !n.leida).length;

  if (!hydrated || !getToken()) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
        aria-label={`Notificaciones${noLeidas > 0 ? ` (${noLeidas} nuevas)` : ""}`}
      >
        <Bell className="h-5 w-5 text-foreground" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[340px] sm:w-[400px] p-0 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-base font-bold">Notificaciones</SheetTitle>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodas}
                className="text-xs font-semibold text-primary hover:text-primary/70 transition-colors"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Bell className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">Sin notificaciones</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Aquí aparecerán confirmaciones, cancelaciones y más.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifs.map((n) => {
                  const Icon =
                    n.tipo === "confirmada"
                      ? CheckCircle2
                      : n.tipo === "favorito"
                      ? Heart
                      : XCircle;
                  const iconCls =
                    n.tipo === "confirmada"
                      ? "text-primary"
                      : n.tipo === "favorito"
                      ? "text-pink-500"
                      : "text-destructive";

                  return (
                    <button
                      key={n.id}
                      onClick={() => !n.leida && marcarLeida(n.id)}
                      className={cn(
                        "w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40",
                        !n.leida && "bg-primary/5",
                      )}
                    >
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconCls)} />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-xs leading-relaxed",
                            n.leida ? "text-muted-foreground" : "text-foreground font-medium",
                          )}
                        >
                          {n.mensaje}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.creadaEn).toLocaleDateString("es-PE", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {!n.leida && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
