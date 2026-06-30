"use client";

import { useState, useEffect } from "react";
import { User, Phone, Mail, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/loading-button";
import { cn } from "@/lib/utils";
import { ownerFetch } from "@/lib/api";

function getOwnerToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cp_owner_token");
}

export default function PerfilAdminCanchaPage() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [errores, setErrores] = useState<{ nombre?: string; telefono?: string; general?: string }>({});

  useEffect(() => {
    const token = getOwnerToken();
    if (!token) return;
    ownerFetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setNombre(data.nombre ?? "");
        setTelefono(data.telefono ?? "");
        setEmail(data.email ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const validar = () => {
    const e: typeof errores = {};
    if (!nombre.trim()) e.nombre = "El nombre es requerido";
    if (telefono && !/^9\d{8}$/.test(telefono))
      e.telefono = "Ingresa un número válido (9 dígitos, empieza con 9)";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    const token = getOwnerToken();
    if (!token) return;
    setGuardando(true);
    setErrores({});
    try {
      const res = await ownerFetch("/api/auth/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), telefono: telefono.trim() }),
      });
      if (!res.ok) throw new Error();
      // Actualizar localStorage del owner
      const stored = localStorage.getItem("cp_owner_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem("cp_owner_user", JSON.stringify({ ...parsed, name: nombre.trim(), phone: telefono.trim() }));
      }
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch {
      setErrores({ general: "Error al guardar. Intenta de nuevo." });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tu información personal como dueño de cancha
        </p>
      </div>

      {/* Avatar */}
      <Card className="p-5 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-2xl font-bold text-white shrink-0">
          {nombre.charAt(0).toUpperCase() || "?"}
        </div>
        <div>
          <p className="font-semibold text-foreground">{nombre || "Sin nombre"}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
          <span className="mt-1 inline-block rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-700">
            Dueño de cancha
          </span>
        </div>
      </Card>

      {/* Formulario */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-foreground">Información personal</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">Nombre completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setErrores((p) => ({ ...p, nombre: undefined })); }}
              placeholder="Tu nombre completo"
              className={cn("pl-9", errores.nombre && "border-destructive")}
            />
          </div>
          {errores.nombre && <p className="text-xs text-destructive">{errores.nombre}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">Correo electrónico</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={email} disabled className="pl-9 bg-muted/50 text-muted-foreground cursor-not-allowed" />
          </div>
          <p className="text-xs text-muted-foreground">El correo no se puede cambiar</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">
            Teléfono WhatsApp <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="tel"
              value={telefono}
              onChange={(e) => { setTelefono(e.target.value); setErrores((p) => ({ ...p, telefono: undefined })); }}
              placeholder="987654321"
              className={cn("pl-9", errores.telefono && "border-destructive")}
            />
          </div>
          {errores.telefono ? (
            <p className="text-xs text-destructive">{errores.telefono}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              A este número te llegan las notificaciones de nuevas reservas
            </p>
          )}
        </div>

        {errores.general && (
          <p className="text-sm text-destructive">{errores.general}</p>
        )}

        <Separator />

        {guardado ? (
          <Button className="w-full" disabled>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            ¡Guardado!
          </Button>
        ) : (
          <LoadingButton
            onClick={handleGuardar}
            className="w-full"
            isLoading={guardando}
            loadingText="Guardando..."
            loadingVariant="pulse"
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </LoadingButton>
        )}
      </Card>
    </div>
  );
}
