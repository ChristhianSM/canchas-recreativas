"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Copy,
  Smartphone,
  Shield,
  Upload,
  ImageIcon,
  Timer,
  Mail,
  ExternalLink,
  Lock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/loading-button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type Cupon } from "@/lib/auth";
import { apiCrearReserva, getToken } from "@/lib/api"; /* apiGetLoyalty — SELLOS CONGELADOS */

type MetodoPago = "yape" | "plin" | "efectivo";
type Paso = "pago" | "datos" | "metodo" | "confirmar" | "exito";
const TIEMPO_LIMITE = 5 * 60;


function bloqueoKey(canchaId: string, fecha: string, hora: string) {
  return `cp_bloqueo_inicio_${canchaId}_${fecha}_${hora.replace(":", "-")}`;
}

function getSegundosRestantes(
  canchaId: string,
  fecha: string,
  hora: string,
): number {
  if (typeof window === "undefined") return TIEMPO_LIMITE;
  const raw = localStorage.getItem(bloqueoKey(canchaId, fecha, hora));
  if (!raw) return TIEMPO_LIMITE;
  const inicio = Number(raw);
  const transcurrido = Math.floor((Date.now() - inicio) / 1000);
  return Math.max(0, TIEMPO_LIMITE - transcurrido);
}

function limpiarInicioBloqueo(canchaId: string, fecha: string, hora: string) {
  localStorage.removeItem(bloqueoKey(canchaId, fecha, hora));
}

const _sesionesActivas = new Set<string>();

function PagoContent() {
  const router = useRouter();
  const params = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const autoSkipRef = useRef(false);

  const canchaId = params.get("canchaId") ?? "";
  const fecha = params.get("fecha") ?? "";
  const hora = params.get("hora") ?? "";
  const horas = Math.max(1, Number(params.get("horas") ?? 1));
  const precioRaw = Number(params.get("precio") ?? 0);
  const fromCard = params.get("from") === "card";

  const horaFin = `${String((parseInt(hora.split(":")[0]) + horas) % 24).padStart(2, "0")}:00`;

  const [conBalon, setConBalon] = useState(params.get("balon") === "1");
  const [conChalecos, setConChalecos] = useState(
    params.get("chalecos") === "1",
  );

  const [cancha, setCancha] = useState<any>(null);
  const [canchaLoading, setCanchaLoading] = useState(true);

  const [metodo, setMetodo] = useState<MetodoPago>("yape");
  const [paso, setPaso] = useState<Paso>("datos");
  const [copiado, setCopiado] = useState(false);
  /* SELLOS CONGELADOS const [cupones, setCupones] = useState<Cupon[]>([]); */
  const cupones: Cupon[] = [];
  const [cuponSeleccionado, setCuponSeleccionado] = useState<string | null>(
    null,
  );
  const [comprobante, setComprobante] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [segundos, setSegundos] = useState(TIEMPO_LIMITE);
  const [montoCopiado, setMontoCopiado] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [modoPago, setModoPago] = useState<"completo" | "parcial">("completo");
  const [authChecked, setAuthChecked] = useState(false);

  const [esInvitado, setEsInvitado] = useState(false);
  const [emailInvitado, setEmailInvitado] = useState("");
  const [emailRegistrado, setEmailRegistrado] = useState("");
  const [emailError, setEmailError] = useState("");

  const [telefonoInvitado, setTelefonoInvitado] = useState("");
  const [telefonoRegistrado, setTelefonoRegistrado] = useState("");
  const [telefonoError, setTelefonoError] = useState("");

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Cargar cancha
  useEffect(() => {
    if (!canchaId) return;

    // Leer caché de sessionStorage (guardado al hacer click en "Reservar")
    const cached = sessionStorage.getItem(`cp_cancha_pago_${canchaId}`);
    if (cached) {
      try {
        setCancha(JSON.parse(cached));
        sessionStorage.removeItem(`cp_cancha_pago_${canchaId}`);
        setCanchaLoading(false);
        return;
      } catch {}
    }

    fetch(`/api/canchas/detail?id=${canchaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setCancha({
            id: data.id,
            name: data.nombre,
            images: data.imagenes?.length
              ? data.imagenes
              : [
                  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop",
                ],
            address: data.direccion,
            phone: data.telefono,
            balonPrecio: data.balon_precio ?? null,
            chalecosPrecio: data.chalecos_precio ?? null,
            lat: data.latitud ?? null,
            lng: data.longitud ?? null,
            yapeNumero: data.yape_numero ?? "",
            plinNumero: data.plin_numero ?? "",
          });
        } else {
          import("@/lib/data").then(({ getCanchaById }) => {
            const c = getCanchaById(canchaId);
            if (c)
              setCancha({
                id: c.id,
                name: c.name,
                images: c.images,
                address: c.address,
                phone: c.phone,
                lat: c.coordinates?.lat ?? null,
                lng: c.coordinates?.lng ?? null,
              });
          });
        }
      })
      .catch(() => {
        import("@/lib/data").then(({ getCanchaById }) => {
          const c = getCanchaById(canchaId);
          if (c)
            setCancha({
              id: c.id,
              name: c.name,
              images: c.images,
              address: c.address,
              phone: c.phone,
              lat: c.coordinates?.lat ?? null,
              lng: c.coordinates?.lng ?? null,
            });
        });
      })
      .finally(() => setCanchaLoading(false));
  }, [canchaId]);

  // Timer del bloqueo
  useEffect(() => {
    if (!canchaId || !fecha || !hora) return;
    const sesionKey = `${canchaId}_${fecha}_${hora}`;
    _sesionesActivas.add(sesionKey);
    const restantes = getSegundosRestantes(canchaId, fecha, hora);
    if (restantes <= 0) {
      _sesionesActivas.delete(sesionKey);
      limpiarInicioBloqueo(canchaId, fecha, hora);
      fetch("/api/bloqueos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canchaId, fecha, hora, horas }),
      });
      router.replace("/");
      return;
    }
    setSegundos(restantes);
    const interval = setInterval(() => {
      const restante = getSegundosRestantes(canchaId, fecha, hora);
      setSegundos(restante);
      if (restante <= 0) clearInterval(interval);
    }, 1000);
    const timeout = setTimeout(() => {
      _sesionesActivas.delete(sesionKey);
      limpiarInicioBloqueo(canchaId, fecha, hora);
      fetch("/api/bloqueos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canchaId, fecha, hora, horas }),
      });
      router.push("/");
    }, restantes * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      limpiarInicioBloqueo(canchaId, fecha, hora);
      _sesionesActivas.delete(sesionKey);
      queueMicrotask(() => {
        if (!_sesionesActivas.has(sesionKey)) {
          fetch("/api/bloqueos", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ canchaId, fecha, hora, horas }),
          });
        }
      });
    };
  }, [canchaId, fecha, hora]);

  // Auth
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => {
          if (!r.ok) {
            localStorage.removeItem("cp_token");
            localStorage.removeItem("cp_user");
            localStorage.removeItem("cp_token_time");
            setEsInvitado(true);
            setAuthChecked(true);
            return Promise.reject("Token inválido");
          }
          return r.json();
        })
        .then((perfil) => {
          /* SELLOS CONGELADOS — descomentar para reactivar
          apiGetLoyalty().then((data) => {
            setCupones((data.cupones ?? []).filter((c: Cupon) => !c.usado));
          });
          */
          const tel = perfil?.telefono || "";
          const email = perfil?.email || perfil?.correo || "";
          if (tel) setTelefonoRegistrado(tel);
          if (email) setEmailRegistrado(email);
          setAuthChecked(true);
        })
        .catch(() => {
          setEsInvitado(true);
          setAuthChecked(true);
        });
    } else {
      setEsInvitado(true);
      setAuthChecked(true);
    }
  }, []);

  // Saltar paso "datos" solo una vez al cargar, si el usuario ya tiene todos sus datos.
  // El ref se bloquea en cuanto authChecked es true para evitar que el salto
  // se dispare cuando el usuario empieza a escribir su teléfono manualmente.
  useEffect(() => {
    if (autoSkipRef.current) return;
    if (!authChecked) return;
    if (!esInvitado && emailRegistrado && telefonoRegistrado) {
      setPaso("pago");
    }
    autoSkipRef.current = true;
  }, [authChecked, esInvitado, emailRegistrado, telefonoRegistrado]);

  const prevPaso = useRef<Paso>("pago");
  useEffect(() => {
    const orden = ["pago", "datos", "metodo", "confirmar"];
    if (orden.indexOf(paso) > orden.indexOf(prevPaso.current)) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
    prevPaso.current = paso;
  }, [paso]);

  const numeroYape = cancha?.yapeNumero ?? "";
  const numeroPlin = cancha?.plinNumero ?? "";
  const yapeDisponible = !!numeroYape;
  const plinDisponible = !!numeroPlin;
  const soloEfectivo = !yapeDisponible && !plinDisponible;

  // Pre-seleccionar único método disponible
  const [metodoPrelisto, setMetodoPrelisto] = useState(false);
  useEffect(() => {
    if (!cancha || metodoPrelisto) return;
    setMetodoPrelisto(true);
    if (!yapeDisponible && plinDisponible) setMetodo("plin");
    else if (yapeDisponible && !plinDisponible) setMetodo("yape");
  }, [cancha, metodoPrelisto, yapeDisponible, plinDisponible]);

  if (canchaLoading || !authChecked)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );

  if (!cancha)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Reserva no encontrada.</p>
      </div>
    );

  const descuento = cuponSeleccionado ? 5 : 0;
  const extraBalon =
    conBalon && cancha?.balonPrecio != null ? cancha.balonPrecio : 0;
  const extraChalecos =
    conChalecos && cancha?.chalecosPrecio != null ? cancha.chalecosPrecio : 0;
  const total = Math.max(
    0,
    precioRaw * horas + extraBalon + extraChalecos - descuento,
  );
  const montoAdelanto =
    modoPago === "parcial" ? Math.round(total * 0.2) : total;
  const saldoPendiente = modoPago === "parcial" ? total - montoAdelanto : 0;
  // Valores fijos del 20%/80% para mostrar en el botón (independiente del modo seleccionado)
  const previewAdelanto = Math.round(total * 0.2);
  const previewSaldo = total - previewAdelanto;

  const fechaLabel = new Date(fecha + "T00:00:00").toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const copiarNumero = () => {
    const num = metodo === "yape" ? numeroYape : numeroPlin;
    navigator.clipboard.writeText(num.replace(/\s/g, ""));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const original = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        setComprobante(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  };

  // Validación del paso 2
  const validarDatos = (): boolean => {
    if (esInvitado) {
      let ok = true;
      if (!emailInvitado.trim()) {
        setEmailError("Ingresa tu correo");
        ok = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInvitado)) {
        setEmailError("Correo no válido");
        ok = false;
      } else {
        setEmailError("");
      }
      if (!telefonoInvitado.trim()) {
        setTelefonoError("Ingresa tu número de WhatsApp");
        ok = false;
      } else if (!/^9\d{8}$/.test(telefonoInvitado)) {
        setTelefonoError("Número inválido (9 dígitos, empieza en 9)");
        ok = false;
      } else {
        setTelefonoError("");
      }
      return ok;
    } else {
      if (!telefonoRegistrado.trim()) {
        setTelefonoError("Ingresa tu número para devoluciones");
        return false;
      }
      if (!/^9\d{8}$/.test(telefonoRegistrado.trim())) {
        setTelefonoError("Número inválido (9 dígitos, empieza en 9)");
        return false;
      }
      setTelefonoError("");
      return true;
    }
  };

  const handleEnviar = async () => {
    setSubmitError(null);

    if (soloEfectivo) {
      if (esInvitado) {
        if (!emailInvitado.trim()) {
          setEmailError("Ingresa tu correo para recibir la confirmación");
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInvitado)) {
          setEmailError("Ingresa un correo válido");
          return;
        }
        setEmailError("");
      }
      setEnviando(true);
      const res = await apiCrearReserva({
        canchaId,
        canchaNombre: cancha.name,
        fecha,
        hora,
        horas,
        precio: total,
        precioOriginal: precioRaw,
        cuponId: cuponSeleccionado,
        metodoPago: "efectivo",
        balonIncluido: conBalon,
        chalecosIncluido: conChalecos,
        modoPago,
        montoAdelanto,
        saldoPendiente,
        ...(esInvitado && emailInvitado
          ? {
              emailInvitado,
              telefonoInvitado: telefonoInvitado || "",
              metodoDevolucion: "yape",
            }
          : {}),
      });
      if (res.error) {
        setEnviando(false);
        setSubmitError(
          res.error.includes("ya fue reservado")
            ? "Este horario ya fue reservado por otro usuario. Vuelve y elige otro horario."
            : "No se pudo crear la reserva. Intenta de nuevo.",
        );
        return;
      }
      limpiarInicioBloqueo(canchaId, fecha, hora);
      fetch("/api/bloqueos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canchaId, fecha, hora, horas }),
      });
      setEnviando(false);
      setPaso("exito");
      return;
    }

    setEnviando(true);
    const result = await apiCrearReserva({
      canchaId,
      canchaNombre: cancha.name,
      fecha,
      hora,
      horas,
      precio: total,
      precioOriginal: precioRaw,
      cuponId: cuponSeleccionado,
      metodoPago: metodo,
      comprobanteUrl: comprobante,
      balonIncluido: conBalon,
      chalecosIncluido: conChalecos,
      modoPago,
      montoAdelanto,
      saldoPendiente,
      ...(esInvitado && emailInvitado
        ? {
            emailInvitado,
            telefonoInvitado: telefonoInvitado,
            metodoDevolucion: metodo,
          }
        : {}),
      ...(!esInvitado
        ? {
            telefonoDevolucion: telefonoRegistrado
              ? `${telefonoRegistrado} (${metodo})`
              : "",
            actualizarTelefono: false,
            nuevoTelefono: "",
          }
        : {}),
    });
    if (result.error) {
      setEnviando(false);
      setSubmitError(
        result.error.includes("ya fue reservado")
          ? "Este horario ya fue reservado por otro usuario. Vuelve y elige otro horario."
          : "No se pudo crear la reserva. Intenta de nuevo.",
      );
      return;
    }
    limpiarInicioBloqueo(canchaId, fecha, hora);
    fetch("/api/bloqueos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canchaId, fecha, hora, horas }),
    });
    setEnviando(false);
    setPaso("exito");
  };

  const handleBack = () => {
    if (paso === "datos") {
      router.back();
      return;
    }
    const orden: Paso[] = ["datos", "pago", "metodo", "confirmar"];
    const i = orden.indexOf(paso);
    if (i > 0) setPaso(orden[i - 1]);
  };

  const handleLoginModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Correo o contraseña incorrectos");
        return;
      }
      localStorage.setItem("cp_token", data.token);
      localStorage.setItem("cp_user", JSON.stringify(data.user));
      setEsInvitado(false);
      setEmailRegistrado(data.user.email || "");
      setTelefonoRegistrado(data.user.phone || "");
      /* SELLOS CONGELADOS — descomentar para reactivar
      apiGetLoyalty().then((loyaltyData) => {
        setCupones((loyaltyData.cupones ?? []).filter((c: Cupon) => !c.usado));
      });
      */
      setLoginModalOpen(false);
      setLoginEmail("");
      setLoginPassword("");
    } finally {
      setLoginLoading(false);
    }
  };

  // Desktop: pago + método combinados → 3 pasos (igual que mobile)
  const PASOS_LABELS = soloEfectivo
    ? (["Datos", "Pago", "Resumen"] as const)
    : (["Datos", "Pago", "Confirmar"] as const);

  const PASO_INDEX: Record<string, number> = soloEfectivo
    ? { datos: 0, pago: 1, metodo: 2 }
    : { datos: 0, pago: 1, metodo: 1, confirmar: 2 };

  // Mobile: pago + método combinados → 3 pasos
  const MOBILE_PASOS_LABELS = soloEfectivo
    ? (["Datos", "Pago", "Resumen"] as const)
    : (["Datos", "Pago", "Confirmar"] as const);

  const MOBILE_PASO_INDEX: Record<string, number> = soloEfectivo
    ? { datos: 0, pago: 1, metodo: 2 }
    : { datos: 0, pago: 1, metodo: 1, confirmar: 2 };

  const idx = PASO_INDEX[paso] ?? 0;
  // Mobile usa el mismo índice que desktop (ambos tienen 3 pasos ahora)
  const mobileIdx = MOBILE_PASO_INDEX[paso] ?? 0;

  const makeStepperJSX = (labels: readonly string[], activeIdx: number) => (
    <div className="flex items-center justify-center gap-0 w-full">
      {labels.map((label, i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                  done
                    ? "bg-primary text-primary-foreground"
                    : current
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  current
                    ? "text-primary"
                    : done
                      ? "text-primary/70"
                      : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 mx-1 mb-4 transition-all",
                  i < activeIdx ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const stepperJSX = makeStepperJSX(PASOS_LABELS, idx);
  const mobileStepperJSX = makeStepperJSX(MOBILE_PASOS_LABELS, mobileIdx);

  const headerTitles: Record<string, string> = {
    pago: "Tipo de pago",
    datos: "Tus datos",
    metodo: soloEfectivo ? "Resumen" : "Método de pago",
    confirmar: "Confirmar pago",
  };

  // ── Éxito ────────────────────────────────────────────────────────
  if (paso === "exito") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center mb-2">
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {soloEfectivo ? "¡Reserva recibida!" : "¡Listo, ya casi!"}
        </h1>
        <p className="mb-3 text-muted-foreground">
          {soloEfectivo
            ? "Tu reserva fue registrada. Paga en efectivo el día del partido."
            : "Tu comprobante fue recibido correctamente."}
        </p>
        <div className="mb-6 flex items-center gap-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-4 py-2">
          <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
            {soloEfectivo
              ? "El admin confirmará tu reserva en breve"
              : "El admin verificará tu pago en breve"}
          </p>
        </div>
        {esInvitado && emailInvitado ? (
          <div className="mb-8 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-primary font-medium">
                Te enviaremos la confirmación a{" "}
                <span className="font-bold">{emailInvitado}</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              Cuando el administrador verifique tu pago, recibirás un correo con
              el estado de tu reserva.
            </p>
          </div>
        ) : (
          <p className="mb-8 text-sm text-muted-foreground max-w-xs">
            El administrador verificará tu pago y recibirás una notificación
            cuando tu reserva sea confirmada.
          </p>
        )}
        <Card className="mb-8 w-full max-w-sm border-border p-5 text-left">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-medium text-foreground">{cancha.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-primary" />
              <span className="capitalize text-foreground">{fechaLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-foreground">
                {hora} - {horaFin}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {soloEfectivo ? "Monto a pagar en cancha" : "Total pagado"}
              </span>
              <span className="font-bold text-primary">S/ {total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              <Badge
                className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                variant="outline"
              >
                Pendiente de confirmación
              </Badge>
            </div>
          </div>
        </Card>
        {process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER && (
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent("Hola, acabo de hacer una reserva y quiero recibir mis notificaciones")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-sm flex items-start gap-3 rounded-xl border border-[#25D366]/40 bg-[#25D366]/5 px-4 py-3.5 text-left hover:bg-[#25D366]/10 transition-colors"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
              <svg className="h-5 w-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                ¿Quieres recibir notificaciones más rápidas?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                Escríbenos por WhatsApp y te avisamos en cuanto el admin confirme tu reserva.
              </p>
              <p className="mt-1.5 text-xs font-medium text-[#25D366]">
                Escribir ahora &rarr;
              </p>
            </div>
          </a>
        )}
        <div className="flex w-full max-w-sm flex-col gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent([`⚽ *¡Acabo de reservar una cancha!*`, ``, `📍 *${cancha.name}*`, ...(cancha.address ? [`🗺 ${cancha.address}`] : []), ...(cancha.lat && cancha.lng ? [`📌 Cómo llegar: https://maps.google.com/?q=${cancha.lat},${cancha.lng}`] : cancha.address ? [`📌 Cómo llegar: https://maps.google.com/?q=${encodeURIComponent(cancha.address)}`] : []), ``, `📅 ${fechaLabel}`, `🕐 ${hora}`, `💰 S/ ${total}`, ``, `¡Están convocados! Confirmen asistencia 🙋‍♂️`].join("\n"))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:bg-[#20bd5a] transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Compartir con tu equipo
          </a>
          {!esInvitado && (
            <Button size="lg" onClick={() => router.push("/mi-cuenta")}>
              Ver mis reservas
            </Button>
          )}
          <Button
            variant={esInvitado ? "default" : "outline"}
            size="lg"
            onClick={() => router.push("/")}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  // ── Opciones de modo de pago (compartido mobile/desktop) ──
  const modoPagoOpcionesJSX = (
    <div className="space-y-3">
      <button
        onClick={() => setModoPago("completo")}
        className={cn(
          "w-full text-left rounded-xl border-2 p-4 transition-all",
          modoPago === "completo"
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border hover:border-muted-foreground/40",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                modoPago === "completo"
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40",
              )}
            >
              {modoPago === "completo" && (
                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="font-semibold text-foreground">
              Pago completo (100%)
            </span>
          </div>
          <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 text-xs">
            Recomendado
          </Badge>
        </div>
        <p className="mt-2 ml-7 text-sm font-bold text-primary">
          S/ {total} ahora
        </p>
        <ul className="mt-2 ml-7 space-y-1">
          <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
            Cancelación con devolución hasta 85%
          </li>
          <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
            Reserva garantizada
          </li>
        </ul>
      </button>
      <button
        onClick={() => total > 0 && setModoPago("parcial")}
        disabled={total === 0}
        className={cn(
          "w-full text-left rounded-xl border-2 p-4 transition-all",
          total === 0 && "opacity-50 cursor-not-allowed",
          modoPago === "parcial" && total > 0
            ? "border-amber-500 bg-amber-500/5 shadow-sm"
            : "border-border hover:border-muted-foreground/40",
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
              modoPago === "parcial" && total > 0
                ? "border-amber-500 bg-amber-500"
                : "border-muted-foreground/40",
            )}
          >
            {modoPago === "parcial" && total > 0 && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="font-semibold text-foreground">
            Pago con adelanto (20%)
          </span>
        </div>
        <p className="mt-2 ml-7 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">S/ {previewAdelanto}</span>{" "}
          ahora ·{" "}
          <span className="font-medium">S/ {previewSaldo}</span>{" "}
          en cancha
        </p>
        <div className="mt-2 ml-7">
          <span className="text-xs text-amber-600 font-medium">
            ⚠ Sin devolución al cancelar
          </span>
        </div>
      </button>
    </div>
  );

  // ── Columna derecha: resumen de reserva (reutilizado en ambos pasos) ──
  const resumenReserva = (
    <div className="bg-white dark:bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="relative aspect-video w-full">
        <Image
          src={cancha.images[0]}
          alt={cancha.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-base font-bold text-foreground">{cancha.name}</p>
          {cancha.address && (
            <p className="mt-0.5 text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {cancha.address}
            </p>
          )}
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground capitalize">
                {fechaLabel}
              </p>
              <p className="text-xs text-muted-foreground">Día seleccionado</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {hora} – {horaFin}
              </p>
              <p className="text-xs text-muted-foreground">
                {horas > 1 ? `${horas} horas` : "1 hora"}
              </p>
            </div>
          </div>
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>
              {horas > 1
                ? `${horas}h × S/ ${precioRaw}`
                : `1h × S/ ${precioRaw}`}
            </span>
            <span className="text-foreground">S/ {precioRaw * horas}</span>
          </div>
          {conBalon && cancha?.balonPrecio != null && extraBalon > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>⚽ Balón</span>
              <span className="text-foreground">S/ {extraBalon}</span>
            </div>
          )}
          {conChalecos &&
            cancha?.chalecosPrecio != null &&
            extraChalecos > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>🎽 Chalecos</span>
                <span className="text-foreground">S/ {extraChalecos}</span>
              </div>
            )}
          <div className={cn(
            "flex justify-between text-primary overflow-hidden transition-all duration-300",
            descuento > 0 ? "max-h-8 opacity-100" : "max-h-0 opacity-0"
          )}>
            <span>🎟 Descuento cupón</span>
            <span>− S/ {descuento}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span className="text-foreground">Total</span>
            <span className="text-primary">S/ {total}</span>
          </div>
          {modoPago === "parcial" && (
            <div className="flex justify-between items-center text-sm font-semibold text-primary mt-1 pt-2.5 border-t border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
              <span>Pagas ahora (20%)</span>
              <span>S/ {montoAdelanto}</span>
            </div>
          )}
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2.5">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {modoPago === "parcial"
              ? "El adelanto (S/ " + previewAdelanto + ") no se devuelve si cancelas."
              : "Cancela hasta 2 h antes sin costo. Después, se cobra el 50%."}
          </p>
        </div>
      </div>
    </div>
  );

  // JSX reutilizable: QR + comprobante (compartido mobile/desktop)
  const confirmarPagoJSX = (
    <>
      <div className="flex justify-center">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold border",
            metodo === "yape"
              ? "bg-[#6C1FC6]/10 text-[#6C1FC6] border-[#6C1FC6]/30"
              : "bg-[#00C2CB]/10 text-[#00A0A8] border-[#00C2CB]/30",
          )}
        >
          <Image
            src={metodo === "yape" ? "/images/yape.png" : "/images/plin.png"}
            alt={metodo}
            width={16}
            height={16}
            className="object-contain rounded"
          />
          Pagando con {metodo === "yape" ? "Yape" : "Plin"}
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Ingresa el número en tu app o ábrela directamente.
      </p>
      <Card className="border-border overflow-hidden">
        <div
          className={cn(
            "flex items-center gap-3 px-5 py-4",
            metodo === "yape" ? "bg-[#6C1FC6]" : "bg-[#00B4D8]",
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white overflow-hidden">
            <Image
              src={metodo === "yape" ? "/images/yape.png" : "/images/plin.png"}
              alt={metodo}
              width={40}
              height={40}
              className="object-contain w-full h-full"
            />
          </div>
          <div>
            <p className="font-bold text-white">
              {metodo === "yape" ? "Yape" : "Plin"}
            </p>
            <p className="text-xs text-white/80">Pago móvil instantáneo</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              O ingresa el número de teléfono
            </p>
            <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold tracking-widest text-foreground">
                  {metodo === "yape" ? numeroYape : numeroPlin}
                </span>
              </div>
              <button
                onClick={copiarNumero}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiado ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">Monto exacto</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">
                S/ {montoAdelanto}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(String(montoAdelanto));
                  setMontoCopiado(true);
                  setTimeout(() => setMontoCopiado(false), 2000);
                }}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Copy className="h-3 w-3" />
                {montoCopiado ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              window.location.href = metodo === "yape" ? "yape://" : "plin://";
            }}
            className="sm:hidden flex items-center justify-center gap-3 w-full rounded-xl py-3.5 font-bold text-white active:scale-[0.98] transition-all"
            style={{
              backgroundColor: metodo === "yape" ? "#6C1FC6" : "#00B4D8",
            }}
          >
            <Image
              src={metodo === "yape" ? "/images/yape.png" : "/images/plin.png"}
              alt={metodo}
              width={22}
              height={22}
              className="object-contain rounded"
            />
            Abrir {metodo === "yape" ? "Yape" : "Plin"} · Enviar S/{" "}
            {montoAdelanto}
            <ExternalLink className="h-4 w-4 opacity-70" />
          </button>
        </div>
      </Card>
      <Card className="border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <p className="font-medium text-foreground">
            Sube tu comprobante de pago
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          El administrador revisará la captura y confirmará tu reserva en
          minutos.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {comprobante ? (
          <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border">
              <Image
                src={comprobante}
                alt="Comprobante"
                fill
                className="object-contain"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              Cambiar imagen
            </Button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 hover:border-primary/40 transition-colors"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Toca para subir captura
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG hasta 10MB
              </p>
            </div>
          </button>
        )}
        <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Si no tienes el comprobante a mano, puedes enviarlo después. El administrador revisará tu pago y te confirmará la reserva por WhatsApp.
          </p>
        </div>
      </Card>
      {submitError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {submitError}
        </div>
      )}
      <div className="space-y-3">
        <LoadingButton
          size="lg"
          className="w-full"
          onClick={handleEnviar}
          isLoading={enviando}
          loadingText="Confirmando..."
          loadingVariant="spinner"
        >
          {comprobante ? "Confirmar pago ✓" : "Enviar sin comprobante"}
        </LoadingButton>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => setPaso("metodo")}
        >
          Cambiar método
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header compartido ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-4 lg:px-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <button
            onClick={handleBack}
            className="hidden lg:flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" /> Volver
          </button>
          <h1 className="flex-1 text-sm font-semibold text-foreground lg:flex-none">
            <span className="lg:hidden">{headerTitles[paso] ?? ""}</span>
            <span className="hidden lg:inline">
              {paso === "confirmar" ? "Confirmar pago" : "Confirmar reserva"}
            </span>
          </h1>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold shrink-0",
              segundos > 60
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive animate-pulse",
            )}
          >
            <Timer className="h-4 w-4" />
            {String(Math.floor(segundos / 60)).padStart(2, "0")}:
            {String(segundos % 60).padStart(2, "0")}
          </div>
        </div>
        {/* Stepper solo mobile */}
        <div className="lg:hidden px-4 pb-3 pt-1">
          {mobileStepperJSX}
        </div>
      </header>

      {/* Aviso de urgencia cuando quedan menos de 60 segundos */}
      {segundos > 0 && segundos <= 60 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-destructive px-4 py-3 flex items-center justify-center gap-2 animate-pulse shadow-lg">
          <Timer className="h-4 w-4 text-white shrink-0" />
          <p className="text-white text-sm font-bold">
            ¡Tu reserva expira en {segundos} {segundos === 1 ? "segundo" : "segundos"}! Completa el pago ahora.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MOBILE: wizard original con pasos
      ══════════════════════════════════════════════════════════ */}
      <div key={paso} className="lg:hidden container mx-auto max-w-lg px-4 py-6 space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* PASO 1: TIPO DE PAGO */}
        {paso === "pago" && (
          <>
            <Card className="border-border p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resumen de reserva
              </p>
              <div className="flex gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={cancha.images[0]}
                    alt={cancha.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground line-clamp-1">
                    {cancha.name}
                  </p>
                  <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-1.5 capitalize">
                      <Calendar className="h-3.5 w-3.5" />
                      {fechaLabel}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {hora} – {horaFin}
                    </p>
                  </div>
                </div>
              </div>
              {/* Desglose de precio */}
              <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{horas > 1 ? `${horas}h × S/ ${precioRaw}` : `1h × S/ ${precioRaw}`}</span>
                  <span>S/ {precioRaw * horas}</span>
                </div>
                {conBalon && extraBalon > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>⚽ Balón</span><span>S/ {extraBalon}</span>
                  </div>
                )}
                {conChalecos && extraChalecos > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>🎽 Chalecos</span><span>S/ {extraChalecos}</span>
                  </div>
                )}
                {descuento > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>🎟 Cupón</span><span>− S/ {descuento}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">S/ {total}</span>
                </div>
              </div>
            </Card>
            {fromCard &&
              cancha &&
              (cancha.balonPrecio != null || cancha.chalecosPrecio != null) && (
                <Card className="border-border p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    ¿Necesitas extras?
                  </p>
                  <div className="space-y-3">
                    {cancha.balonPrecio != null && (
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⚽</span>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Balón
                            </p>
                            <p className="text-xs text-muted-foreground">
                              + S/ {cancha.balonPrecio} por reserva
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConBalon((v) => !v)}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                            conBalon ? "bg-primary" : "bg-muted-foreground/30",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                              conBalon
                                ? "translate-x-5.5"
                                : "translate-x-0.5",
                            )}
                          />
                        </button>
                      </label>
                    )}
                    {cancha.chalecosPrecio != null && (
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎽</span>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Chalecos
                            </p>
                            <p className="text-xs text-muted-foreground">
                              + S/ {cancha.chalecosPrecio} por reserva
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConChalecos((v) => !v)}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                            conChalecos
                              ? "bg-primary"
                              : "bg-muted-foreground/30",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                              conChalecos
                                ? "translate-x-5.5"
                                : "translate-x-0.5",
                            )}
                          />
                        </button>
                      </label>
                    )}
                  </div>
                </Card>
              )}
            {/* SELLOS CONGELADOS — cambiar false por (!esInvitado && cupones.length > 0) para reactivar */}
            {false && (
              <Card className="border-border p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cupones disponibles
                </p>
                <div className="space-y-2">
                  {cupones.map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        setCuponSeleccionado(
                          cuponSeleccionado === c.id ? null : c.id,
                        )
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left transition-all",
                        cuponSeleccionado === c.id
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/20 hover:border-primary/40",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold",
                          cuponSeleccionado === c.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <span>S/5</span>
                        <span className="text-[10px] font-normal">OFF</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Descuento de S/ 5
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cuponSeleccionado === c.id
                            ? "✓ Aplicado"
                            : "Toca para aplicar"}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full border-2",
                          cuponSeleccionado === c.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {cuponSeleccionado === c.id && (
                          <svg
                            className="h-full w-full text-primary-foreground p-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}
            {soloEfectivo ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <span className="text-xl shrink-0 mt-0.5">💵</span>
                <div>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    Esta cancha solo acepta pago en efectivo
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                    El pago se realiza directamente en la cancha el día de tu
                    partido.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    ¿Cómo quieres pagar?
                  </p>
                  {modoPagoOpcionesJSX}
                </div>
                {modoPago === "parcial" && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                    <span className="text-xl shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <p className="text-sm font-bold text-amber-700">
                        El adelanto no se devuelve si cancelas
                      </p>
                      <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                        Los{" "}
                        <span className="font-bold">S/ {montoAdelanto}</span>{" "}
                        del adelanto no son reembolsables. El saldo de{" "}
                        <span className="font-bold">S/ {saldoPendiente}</span>{" "}
                        lo pagas en la cancha.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Selector de método integrado (solo en mobile, para no duplicar paso) */}
            {!soloEfectivo && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Método de pago
                </p>
                <div className="space-y-3">
                  {(["yape", "plin"] as MetodoPago[])
                    .filter((m) => m === "yape" ? yapeDisponible : plinDisponible)
                    .map((m) => (
                      <button
                        key={m}
                        onClick={() => setMetodo(m)}
                        className={cn(
                          "w-full flex items-center gap-4 rounded-xl border-2 p-4 transition-all text-left",
                          metodo === m
                            ? m === "yape"
                              ? "border-[#6C1FC6] bg-[#6C1FC6]/5 shadow-sm"
                              : "border-[#00C2CB] bg-[#00C2CB]/5 shadow-sm"
                            : "border-border hover:border-muted-foreground/40",
                        )}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white border border-border">
                          <Image src={m === "yape" ? "/images/yape.png" : "/images/plin.png"} alt={m} width={48} height={48} className="object-contain" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{m === "yape" ? "Yape" : "Plin"}</p>
                          <p className="text-xs text-muted-foreground">Pago móvil instantáneo</p>
                        </div>
                        <div className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                          metodo === m
                            ? m === "yape" ? "border-[#6C1FC6] bg-[#6C1FC6]" : "border-[#00C2CB] bg-[#00C2CB]"
                            : "border-muted-foreground/40",
                        )}>
                          {metodo === m && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                onClick={() => soloEfectivo ? setPaso("metodo") : setPaso("confirmar")}
              >
                {soloEfectivo ? "Continuar" : "Ir a pagar"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setPaso("datos")}
              >
                Volver
              </Button>
            </div>
          </>
        )}

        {/* PASO 2: TUS DATOS */}
        {paso === "datos" && (
          <>
            <p className="text-sm text-muted-foreground">
              {esInvitado
                ? "Te enviaremos la confirmación a estos datos."
                : "Verifica tus datos de contacto."}
            </p>
            <Card className="border-border bg-card p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Correo electrónico
                </label>
                {esInvitado ? (
                  <>
                    <Input
                      type="email"
                      placeholder="tu@correo.com"
                      value={emailInvitado}
                      onChange={(e) => {
                        setEmailInvitado(e.target.value);
                        setEmailError("");
                      }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (!v) setEmailError("Ingresa tu correo");
                        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) setEmailError("Correo no válido");
                      }}
                      className={cn(
                        "bg-background",
                        emailError &&
                          "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                    {emailError && (
                      <p className="text-xs text-destructive">{emailError}</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <Input
                        type="email"
                        value={emailRegistrado}
                        disabled
                        className="bg-muted text-muted-foreground pr-9 cursor-not-allowed"
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Este es el correo de tu cuenta
                    </p>
                  </>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  {esInvitado ? "WhatsApp *" : "Número de celular"}
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground shrink-0">
                    +51
                  </div>
                  <Input
                    type="tel"
                    placeholder="987654321"
                    maxLength={9}
                    value={esInvitado ? telefonoInvitado : telefonoRegistrado}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                      if (esInvitado) {
                        setTelefonoInvitado(val);
                        setTelefonoError("");
                      } else {
                        setTelefonoRegistrado(val);
                        setTelefonoError("");
                      }
                    }}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (!v) setTelefonoError("Ingresa tu número de WhatsApp");
                      else if (!/^9\d{8}$/.test(v)) setTelefonoError("Número inválido (9 dígitos, empieza en 9)");
                    }}
                    className={cn(
                      "bg-background flex-1",
                      telefonoError && "border-destructive",
                    )}
                  />
                </div>
                {telefonoError ? (
                  <p className="text-xs text-destructive">{telefonoError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Te enviaremos la confirmación por WhatsApp a este número
                  </p>
                )}
              </div>
            </Card>
            <div className="space-y-3 pt-1">
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  if (!validarDatos()) return;
                  setPaso("pago");
                }}
              >
                Continuar
              </Button>
              {esInvitado && (
                <p className="text-center text-sm text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setLoginModalOpen(true)}
                    className="text-primary font-medium hover:underline"
                  >
                    Inicia sesión
                  </button>
                </p>
              )}
            </div>
          </>
        )}

        {/* PASO 3: MÉTODO / RESUMEN */}
        {paso === "metodo" && (
          <>
            {soloEfectivo ? (
              <>
                <Card className="border-border p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Detalle de tu reserva
                  </p>
                  <div className="flex gap-4 mb-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={cancha.images[0]}
                        alt={cancha.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground line-clamp-1">
                        {cancha.name}
                      </p>
                      <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                        <p className="flex items-center gap-1.5 capitalize">
                          <Calendar className="h-3.5 w-3.5" />
                          {fechaLabel}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {hora} – {horaFin}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Separator className="mb-4" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {horas > 1
                          ? `Precio (${horas} horas × S/ ${precioRaw})`
                          : "Precio por hora"}
                      </span>
                      <span className="text-foreground">
                        S/ {precioRaw * horas}
                      </span>
                    </div>
                    {conBalon && cancha?.balonPrecio != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          ⚽ Balón
                        </span>
                        <span className="text-foreground">
                          {extraBalon > 0 ? `S/ ${extraBalon}` : "Gratis"}
                        </span>
                      </div>
                    )}
                    {conChalecos && cancha?.chalecosPrecio != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          🎽 Chalecos
                        </span>
                        <span className="text-foreground">
                          {extraChalecos > 0 ? `S/ ${extraChalecos}` : "Gratis"}
                        </span>
                      </div>
                    )}
                    {descuento > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Descuento cupón</span>
                        <span>− S/ {descuento}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span className="text-foreground">
                        Total a pagar en cancha
                      </span>
                      <span className="text-primary">S/ {total}</span>
                    </div>
                  </div>
                </Card>
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <span className="text-xl shrink-0 mt-0.5">💵</span>
                  <div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      Pago en efectivo en cancha
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                      Esta cancha no acepta Yape ni Plin. Paga directamente en
                      la cancha el día de tu partido.
                    </p>
                  </div>
                </div>
                {submitError && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {submitError}
                  </div>
                )}
                <div className="space-y-3">
                  <LoadingButton
                    size="lg"
                    className="w-full"
                    onClick={handleEnviar}
                    isLoading={enviando}
                    loadingText="Confirmando..."
                    loadingVariant="spinner"
                  >
                    Confirmar reserva (pago en cancha)
                  </LoadingButton>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => setPaso("pago")}
                  >
                    Volver
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Selecciona tu método de pago.
                </p>
                <Card className="border-border p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Detalle del pago
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {horas > 1
                          ? `Precio (${horas} horas × S/ ${precioRaw})`
                          : "Precio por hora"}
                      </span>
                      <span className="text-foreground">
                        S/ {precioRaw * horas}
                      </span>
                    </div>
                    {conBalon && cancha?.balonPrecio != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">⚽ Balón</span>
                        <span className="text-foreground">
                          {extraBalon > 0 ? `S/ ${extraBalon}` : "Gratis"}
                        </span>
                      </div>
                    )}
                    {conChalecos && cancha?.chalecosPrecio != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          🎽 Chalecos
                        </span>
                        <span className="text-foreground">
                          {extraChalecos > 0 ? `S/ ${extraChalecos}` : "Gratis"}
                        </span>
                      </div>
                    )}
                    {descuento > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Descuento cupón</span>
                        <span>− S/ {descuento}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span className="text-foreground">Total a pagar</span>
                      <span className="text-primary">S/ {total}</span>
                    </div>
                    {modoPago === "parcial" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-primary font-medium">
                          Pagas ahora (adelanto 20%)
                        </span>
                        <span className="text-primary font-semibold">
                          S/ {montoAdelanto}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
                <div className="space-y-3">
                  {(["yape", "plin"] as MetodoPago[])
                    .filter((m) =>
                      m === "yape" ? yapeDisponible : plinDisponible,
                    )
                    .map((m) => (
                      <button
                        key={m}
                        onClick={() => setMetodo(m)}
                        className={cn(
                          "w-full flex items-center gap-4 rounded-xl border-2 p-4 transition-all text-left",
                          metodo === m
                            ? m === "yape"
                              ? "border-[#6C1FC6] bg-[#6C1FC6]/5 shadow-sm"
                              : "border-[#00C2CB] bg-[#00C2CB]/5 shadow-sm"
                            : "border-border hover:border-muted-foreground/40",
                        )}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white border border-border">
                          <Image
                            src={
                              m === "yape"
                                ? "/images/yape.png"
                                : "/images/plin.png"
                            }
                            alt={m}
                            width={48}
                            height={48}
                            className="object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">
                            {m === "yape" ? "Yape" : "Plin"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pago móvil instantáneo
                          </p>
                        </div>
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                            metodo === m
                              ? m === "yape"
                                ? "border-[#6C1FC6] bg-[#6C1FC6]"
                                : "border-[#00C2CB] bg-[#00C2CB]"
                              : "border-muted-foreground/40",
                          )}
                        >
                          {metodo === m && (
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => setPaso("confirmar")}
                  >
                    Ir a pagar
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => setPaso("pago")}
                  >
                    Volver
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* PASO 4: CONFIRMAR PAGO */}
        {paso === "confirmar" && !soloEfectivo && confirmarPagoJSX}
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP: layout tipo checkout — 4 pasos
      ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block bg-gray-50 dark:bg-background">
        <div className="container mx-auto px-8 lg:px-12 py-10 space-y-8">
          {/* Stepper */}
          <div className="bg-white dark:bg-card rounded-xl border border-border px-10 py-5">
            {stepperJSX}
          </div>

          {/* Grid: siempre 3 columnas en desktop */}
          <div className="grid grid-cols-[240px_1fr_300px] xl:grid-cols-[340px_1fr_360px] gap-6 xl:gap-8 items-start">
            {/* ── Columna izquierda: todos los pasos siempre visibles ── */}
            <div className="space-y-3 sticky top-20">
              {/* Card 1: Identificación */}
              {(() => {
                const done = paso !== "datos";
                return (
                  <div className={cn(
                    "rounded-xl border p-5 transition-all",
                    done ? "bg-white dark:bg-card border-border" : "bg-white dark:bg-card border-primary shadow-sm ring-1 ring-primary/20"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                          done ? "bg-primary" : "bg-primary ring-4 ring-primary/20"
                        )}>
                          {done ? (
                            <svg className="h-3.5 w-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : <span className="text-xs font-bold text-primary-foreground">1</span>}
                        </div>
                        <span className="text-sm font-semibold text-foreground">Identificación</span>
                      </div>
                      {done && (
                        <button onClick={() => setPaso("datos")} className="text-xs font-medium text-primary hover:underline">Editar</button>
                      )}
                    </div>
                    {done ? (
                      <div className="space-y-0.5 text-sm text-muted-foreground ml-8">
                        <p className="truncate">{esInvitado ? emailInvitado || "—" : emailRegistrado || "—"}</p>
                        <p>+51 {esInvitado ? telefonoInvitado || "—" : telefonoRegistrado || "—"}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground ml-8">Ingresa tu correo y teléfono</p>
                    )}
                  </div>
                );
              })()}

              {/* Card 2: Tipo de pago + Método */}
              {(() => {
                const done = paso === "confirmar";
                const pending = paso === "datos";
                return (
                  <div className={cn(
                    "rounded-xl border p-5 transition-all",
                    done ? "bg-white dark:bg-card border-border"
                         : paso === "pago" ? "bg-white dark:bg-card border-primary shadow-sm ring-1 ring-primary/20"
                         : "bg-muted/30 dark:bg-muted/10 border-border opacity-60"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          done ? "bg-primary"
                               : paso === "pago" ? "bg-primary ring-4 ring-primary/20"
                               : "bg-muted text-muted-foreground"
                        )}>
                          {done ? (
                            <svg className="h-3.5 w-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : <span className={paso === "pago" ? "text-primary-foreground" : ""}>2</span>}
                        </div>
                        <span className={cn("text-sm font-semibold", pending ? "text-muted-foreground" : "text-foreground")}>
                          Pago
                        </span>
                      </div>
                      {done && (
                        <button onClick={() => setPaso("pago")} className="text-xs font-medium text-primary hover:underline">Editar</button>
                      )}
                    </div>
                    {done ? (
                      <div className="space-y-1 ml-8">
                        <p className="text-sm font-medium text-foreground">{modoPago === "completo" ? "Pago completo" : "Adelanto 20%"}</p>
                        {!soloEfectivo && (
                          <div className="flex items-center gap-1.5">
                            <Image src={metodo === "yape" ? "/images/yape.png" : "/images/plin.png"} alt={metodo} width={14} height={14} className="rounded object-contain shrink-0" />
                            <span className="text-xs text-muted-foreground capitalize">{metodo} · S/ {montoAdelanto}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground ml-8">{paso === "pago" ? "Elige monto y método" : "Pendiente"}</p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ── Columna central: paso activo ── */}
            <div key={paso} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* PASO 1: Tipo de pago */}
              {paso === "pago" && (
                <>
                  {fromCard &&
                    cancha &&
                    (cancha.balonPrecio != null ||
                      cancha.chalecosPrecio != null) && (
                      <div className="bg-white dark:bg-card rounded-xl border border-border p-6">
                        <h2 className="text-base font-semibold text-foreground mb-4">
                          ¿Necesitas extras?
                        </h2>
                        <div className="space-y-3">
                          {cancha.balonPrecio != null && (
                            <label className="flex items-center justify-between gap-3 cursor-pointer">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">⚽</span>
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    Balón
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    + S/ {cancha.balonPrecio} por reserva
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setConBalon((v) => !v)}
                                className={cn(
                                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                                  conBalon
                                    ? "bg-primary"
                                    : "bg-muted-foreground/30",
                                )}
                              >
                                <span
                                  className={cn(
                                    "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                                    conBalon
                                      ? "translate-x-5.5"
                                      : "translate-x-0.5",
                                  )}
                                />
                              </button>
                            </label>
                          )}
                          {cancha.chalecosPrecio != null && (
                            <label className="flex items-center justify-between gap-3 cursor-pointer">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">🎽</span>
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    Chalecos
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    + S/ {cancha.chalecosPrecio} por reserva
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setConChalecos((v) => !v)}
                                className={cn(
                                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                                  conChalecos
                                    ? "bg-primary"
                                    : "bg-muted-foreground/30",
                                )}
                              >
                                <span
                                  className={cn(
                                    "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                                    conChalecos
                                      ? "translate-x-5.5"
                                      : "translate-x-0.5",
                                  )}
                                />
                              </button>
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  <div className="bg-white dark:bg-card rounded-xl border border-border p-6 space-y-6">
                    <div>
                      <h2 className="text-base font-semibold text-foreground mb-4">
                        ¿Cómo quieres pagar?
                      </h2>
                      {soloEfectivo ? (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                          <span className="text-xl shrink-0 mt-0.5">💵</span>
                          <div>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                              Esta cancha solo acepta pago en efectivo
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                              El pago se realiza directamente en la cancha el día
                              de tu partido.
                            </p>
                          </div>
                        </div>
                      ) : (
                        modoPagoOpcionesJSX
                      )}
                    </div>
                    {!soloEfectivo && (
                      <div>
                        <h2 className="text-base font-semibold text-foreground mb-4">
                          Método de pago
                        </h2>
                        <div className="space-y-3">
                          {(["yape", "plin"] as MetodoPago[])
                            .filter((m) => m === "yape" ? yapeDisponible : plinDisponible)
                            .map((m) => (
                              <button
                                key={m}
                                onClick={() => setMetodo(m)}
                                className={cn(
                                  "w-full flex items-center gap-4 rounded-xl border-2 p-4 transition-all text-left",
                                  metodo === m
                                    ? m === "yape" ? "border-[#6C1FC6] bg-[#6C1FC6]/5" : "border-[#00C2CB] bg-[#00C2CB]/5"
                                    : "border-border hover:border-muted-foreground/40",
                                )}
                              >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white border border-border">
                                  <Image src={m === "yape" ? "/images/yape.png" : "/images/plin.png"} alt={m} width={48} height={48} className="object-contain" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-foreground">{m === "yape" ? "Yape" : "Plin"}</p>
                                  <p className="text-xs text-muted-foreground">Pago móvil instantáneo</p>
                                </div>
                                <div className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                                  metodo === m
                                    ? m === "yape" ? "border-[#6C1FC6] bg-[#6C1FC6]" : "border-[#00C2CB] bg-[#00C2CB]"
                                    : "border-muted-foreground/40",
                                )}>
                                  {metodo === m && (
                                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* SELLOS CONGELADOS — cambiar false por (!esInvitado && cupones.length > 0) para reactivar */}
                  {false && (
                    <div className="bg-white dark:bg-card rounded-xl border border-border p-6">
                      <h2 className="text-base font-semibold text-foreground mb-4">
                        Cupones disponibles
                      </h2>
                      <div className="space-y-2">
                        {cupones.map((c) => (
                          <button
                            key={c.id}
                            onClick={() =>
                              setCuponSeleccionado(
                                cuponSeleccionado === c.id ? null : c.id,
                              )
                            }
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left transition-all",
                              cuponSeleccionado === c.id
                                ? "border-primary bg-primary/5"
                                : "border-muted-foreground/20 hover:border-primary/40",
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold",
                                cuponSeleccionado === c.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              <span>S/5</span>
                              <span className="text-[10px] font-normal">OFF</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">
                                Descuento de S/ 5
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {cuponSeleccionado === c.id
                                  ? "✓ Aplicado"
                                  : "Clic para aplicar"}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "h-5 w-5 rounded-full border-2",
                                cuponSeleccionado === c.id
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {cuponSeleccionado === c.id && (
                                <svg
                                  className="h-full w-full text-primary-foreground p-0.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => soloEfectivo ? setPaso("metodo") : setPaso("confirmar")}
                    >
                      {soloEfectivo ? "Continuar" : "Ir a pagar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={() => setPaso("datos")}
                    >
                      Volver
                    </Button>
                  </div>
                </>
              )}

              {/* PASO 2: Identificación */}
              {paso === "datos" && (
                <>
                  <div className="bg-white dark:bg-card rounded-xl border border-border p-6">
                    <h2 className="text-base font-semibold text-foreground mb-4">
                      Identificación
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                          Correo electrónico
                        </label>
                        {esInvitado ? (
                          <>
                            <Input
                              type="email"
                              placeholder="tu@correo.com"
                              value={emailInvitado}
                              onChange={(e) => {
                                setEmailInvitado(e.target.value);
                                setEmailError("");
                              }}
                              className={cn(
                                "bg-background",
                                emailError && "border-destructive",
                              )}
                            />
                            {emailError && (
                              <p className="text-xs text-destructive">
                                {emailError}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="relative">
                              <Input
                                type="email"
                                value={emailRegistrado}
                                disabled
                                className="bg-muted pr-9 cursor-not-allowed"
                              />
                              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Este es el correo de tu cuenta
                            </p>
                          </>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                          {esInvitado ? "WhatsApp *" : "Número de celular"}
                        </label>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground shrink-0">
                            +51
                          </div>
                          <Input
                            type="tel"
                            placeholder="987654321"
                            maxLength={9}
                            value={
                              esInvitado ? telefonoInvitado : telefonoRegistrado
                            }
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                              if (esInvitado) {
                                setTelefonoInvitado(val);
                                setTelefonoError("");
                              } else {
                                setTelefonoRegistrado(val);
                                setTelefonoError("");
                              }
                            }}
                            className={cn(
                              "bg-background flex-1",
                              telefonoError && "border-destructive",
                            )}
                          />
                        </div>
                        {telefonoError ? (
                          <p className="text-xs text-destructive">
                            {telefonoError}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Te enviaremos la confirmación por WhatsApp a este
                            número
                          </p>
                        )}
                      </div>
                    </div>
                    {esInvitado && (
                      <p className="mt-4 text-center text-sm text-muted-foreground">
                        ¿Ya tienes cuenta?{" "}
                        <button
                          type="button"
                          onClick={() => setLoginModalOpen(true)}
                          className="text-primary font-medium hover:underline"
                        >
                          Inicia sesión
                        </button>
                      </p>
                    )}
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      if (!validarDatos()) return;
                      setPaso("pago");
                    }}
                  >
                    Continuar
                  </Button>
                </>
              )}

              {/* PASO 3: Método de pago */}
              {paso === "metodo" && (
                <>
                  <div className="bg-white dark:bg-card rounded-xl border border-border p-6">
                    <h2 className="text-base font-semibold text-foreground mb-4">
                      Método de pago
                    </h2>
                    {soloEfectivo ? (
                      <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                        <span className="text-xl shrink-0 mt-0.5">💵</span>
                        <div>
                          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                            Esta cancha solo acepta pago en efectivo
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                            El pago se realiza directamente en la cancha el día
                            de tu partido.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(["yape", "plin"] as MetodoPago[])
                          .filter((m) =>
                            m === "yape" ? yapeDisponible : plinDisponible,
                          )
                          .map((m) => (
                            <button
                              key={m}
                              onClick={() => setMetodo(m)}
                              className={cn(
                                "w-full flex items-center gap-4 rounded-xl border-2 p-4 transition-all text-left",
                                metodo === m
                                  ? m === "yape"
                                    ? "border-[#6C1FC6] bg-[#6C1FC6]/5"
                                    : "border-[#00C2CB] bg-[#00C2CB]/5"
                                  : "border-border hover:border-muted-foreground/40",
                              )}
                            >
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white border border-border">
                                <Image
                                  src={
                                    m === "yape"
                                      ? "/images/yape.png"
                                      : "/images/plin.png"
                                  }
                                  alt={m}
                                  width={48}
                                  height={48}
                                  className="object-contain"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">
                                  {m === "yape" ? "Yape" : "Plin"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Pago móvil instantáneo
                                </p>
                              </div>
                              <div
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                                  metodo === m
                                    ? m === "yape"
                                      ? "border-[#6C1FC6] bg-[#6C1FC6]"
                                      : "border-[#00C2CB] bg-[#00C2CB]"
                                    : "border-muted-foreground/40",
                                )}
                              >
                                {metodo === m && (
                                  <svg
                                    className="h-3 w-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  {submitError && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                      {submitError}
                    </div>
                  )}
                  <div className="space-y-3">
                    {soloEfectivo ? (
                      <LoadingButton
                        size="lg"
                        className="w-full"
                        onClick={handleEnviar}
                        isLoading={enviando}
                        loadingText="Confirmando..."
                        loadingVariant="spinner"
                      >
                        Confirmar reserva (pago en cancha)
                      </LoadingButton>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={() => setPaso("confirmar")}
                      >
                        Continuar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={() => setPaso("pago")}
                    >
                      Volver
                    </Button>
                  </div>
                </>
              )}

              {/* PASO 4: Confirmar pago (QR + comprobante) */}
              {paso === "confirmar" && !soloEfectivo && confirmarPagoJSX}
            </div>

            {/* ── Columna derecha: resumen sticky ── */}
            <div className="sticky top-20">
              {resumenReserva}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de inicio de sesión ── */}
      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Iniciar sesión</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            Al iniciar sesión tus datos se completarán automáticamente.
          </p>
          <form onSubmit={handleLoginModal} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Correo electrónico
              </label>
              <Input
                type="email"
                placeholder="tu@correo.com"
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); setLoginError(""); }}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }}
                required
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <p className="text-sm text-destructive">{loginError}</p>
            )}
            <LoadingButton
              type="submit"
              size="lg"
              className="w-full"
              isLoading={loginLoading}
              loadingText="Iniciando sesión..."
              loadingVariant="spinner"
            >
              Iniciar sesión
            </LoadingButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PagoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      }
    >
      <PagoContent />
    </Suspense>
  );
}
