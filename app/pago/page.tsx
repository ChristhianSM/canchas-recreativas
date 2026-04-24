'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft, Calendar, Clock, CheckCircle2, Copy,
  Smartphone, Shield, ChevronRight, Upload, ImageIcon, Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getCanchaById } from '@/lib/data';
import { type Cupon } from '@/lib/auth';
import { apiCrearReserva, apiGetLoyalty, getToken } from '@/lib/api';

type MetodoPago = 'yape' | 'plin';
type Paso = 'metodo' | 'instrucciones' | 'exito';

const NUMERO_YAPE = '987 654 321';
const NUMERO_PLIN = '987 654 321';
const TIEMPO_LIMITE = 30; // 30 segundos para pruebas

// Clave única por bloqueo en localStorage
function bloqueoKey(canchaId: string, fecha: string, hora: string) {
  return `cp_bloqueo_inicio_${canchaId}_${fecha}_${hora.replace(':', '-')}`;
}

function getSegundosRestantes(canchaId: string, fecha: string, hora: string): number {
  if (typeof window === 'undefined') return TIEMPO_LIMITE;
  const raw = localStorage.getItem(bloqueoKey(canchaId, fecha, hora));
  if (!raw) return TIEMPO_LIMITE;
  const inicio = Number(raw);
  const transcurrido = Math.floor((Date.now() - inicio) / 1000);
  return Math.max(0, TIEMPO_LIMITE - transcurrido);
}

function guardarInicioBloqueo(canchaId: string, fecha: string, hora: string) {
  localStorage.setItem(bloqueoKey(canchaId, fecha, hora), String(Date.now()));
}

function limpiarInicioBloqueo(canchaId: string, fecha: string, hora: string) {
  localStorage.removeItem(bloqueoKey(canchaId, fecha, hora));
}

function PagoContent() {
  const router = useRouter();
  const params = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const canchaId  = params.get('canchaId') ?? '';
  const fecha     = params.get('fecha') ?? '';
  const hora      = params.get('hora') ?? '';
  const precioRaw = Number(params.get('precio') ?? 0);
  const cancha    = getCanchaById(canchaId);

  const [metodo, setMetodo]                     = useState<MetodoPago>('yape');
  const [paso, setPaso]                         = useState<Paso>('metodo');
  const [copiado, setCopiado]                   = useState(false);
  const [cupones, setCupones]                   = useState<Cupon[]>([]);
  const [cuponSeleccionado, setCuponSeleccionado] = useState<string | null>(null);
  const [comprobante, setComprobante]           = useState<string | null>(null);
  const [enviando, setEnviando]                 = useState(false);
  const [segundos, setSegundos]                 = useState(TIEMPO_LIMITE);
  const [bloqueado, setBloqueado]               = useState(false);

  // Crear bloqueo temporal al entrar y countdown
  useEffect(() => {
    if (!canchaId || !fecha || !hora) return;

    let activo = true;
    const token = getToken();

    // ¿Ya hay un bloqueo activo guardado en localStorage?
    const yaExiste = !!localStorage.getItem(bloqueoKey(canchaId, fecha, hora));
    const restantes = getSegundosRestantes(canchaId, fecha, hora);

    // Si el tiempo ya venció (recargó tarde), liberar y redirigir
    if (yaExiste && restantes <= 0) {
      limpiarInicioBloqueo(canchaId, fecha, hora);
      fetch('/api/bloqueos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canchaId, fecha, hora }),
      });
      router.replace('/');
      return;
    }

    const crearBloqueo = async () => {
      // Si ya existe el bloqueo en localStorage, no volver a crearlo en el servidor
      if (yaExiste) {
        setBloqueado(true);
        return;
      }

      const res = await fetch('/api/bloqueos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ canchaId, fecha, hora }),
      });
      const data = await res.json();

      if (!activo) return;

      if (res.status === 409) {
        // Horario ocupado por otro usuario — redirigir al detalle
        router.replace(`/cancha/${canchaId}`);
        return;
      }

      if (data.ok) {
        guardarInicioBloqueo(canchaId, fecha, hora);
        setBloqueado(true);
      }
    };

    crearBloqueo();

    // Sincronizar segundos con localStorage (evita hydration mismatch)
    const restantesActuales = getSegundosRestantes(canchaId, fecha, hora);
    setSegundos(restantesActuales);

    // Countdown arrancando desde el tiempo restante real
    const interval = setInterval(() => {
      const restante = getSegundosRestantes(canchaId, fecha, hora);
      setSegundos(restante);
      if (restante <= 0) clearInterval(interval);
    }, 1000);

    // Redirigir cuando llegue a 0
    const timeout = setTimeout(() => {
      limpiarInicioBloqueo(canchaId, fecha, hora);
      fetch('/api/bloqueos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canchaId, fecha, hora }),
      });
      router.push('/');
    }, restantes * 1000);

    const liberarBloqueo = () => {
      navigator.sendBeacon('/api/bloqueos', JSON.stringify({ canchaId, fecha, hora }));
    };
    window.addEventListener('beforeunload', liberarBloqueo);

    return () => {
      activo = false;
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener('beforeunload', liberarBloqueo);
      // Liberar bloqueo al desmontar (navegación hacia atrás)
      fetch('/api/bloqueos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canchaId, fecha, hora }),
      });
    };
  }, [canchaId, fecha, hora]);

  useEffect(() => {
    const token = getToken();
    if (token) {
      apiGetLoyalty().then(data => {
        setCupones((data.cupones ?? []).filter((c: Cupon) => !c.usado));
      });
    }
    // Sin token: no hay cupones disponibles (requiere cuenta)
  }, []);

  if (!cancha) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Reserva no encontrada.</p>
    </div>
  );

  const descuento = cuponSeleccionado ? 5 : 0;
  const total     = Math.max(0, precioRaw - descuento);

  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const copiarNumero = () => {
    const num = metodo === 'yape' ? NUMERO_YAPE : NUMERO_PLIN;
    navigator.clipboard.writeText(num.replace(/\s/g, ''));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setComprobante(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleEnviar = async () => {
    setEnviando(true);
    const token = getToken();

    await apiCrearReserva({
      canchaId:       canchaId,
      canchaNombre:   cancha.name,
      fecha,
      hora,
      precio:         total,
      precioOriginal: precioRaw,
      cuponId:        cuponSeleccionado,
      metodoPago:     metodo,
      comprobanteUrl: comprobante,
    });

    await new Promise(r => setTimeout(r, 800));
    // Liberar bloqueo al completar el pago
    limpiarInicioBloqueo(canchaId, fecha, hora);
    fetch('/api/bloqueos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canchaId, fecha, hora }),
    });
    setEnviando(false);
    setPaso('exito');
  };

  // ── Éxito ──────────────────────────────────────────────────────
  if (paso === 'exito') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-500/10">
          <Clock className="h-12 w-12 text-yellow-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">¡Reserva enviada!</h1>
        <p className="mb-1 text-muted-foreground">Tu comprobante fue recibido correctamente.</p>
        <p className="mb-8 text-sm text-muted-foreground max-w-xs">
          El administrador verificará tu pago y recibirás una notificación cuando tu reserva sea confirmada.
        </p>

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
              <span className="text-foreground">{hora}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total pagado</span>
              <span className="font-bold text-primary">S/ {total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20" variant="outline">
                Pendiente de confirmación
              </Badge>
            </div>
          </div>
        </Card>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button size="lg" onClick={() => router.push('/mis-reservas')}>Ver mis reservas</Button>
          <Button variant="outline" size="lg" onClick={() => router.push('/')}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground">Confirmar pago</h1>
        <div className={cn(
          'ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
          segundos > 60 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive animate-pulse'
        )}>
          <Timer className="h-4 w-4" />
          {String(Math.floor(segundos / 60)).padStart(2, '0')}:{String(segundos % 60).padStart(2, '0')}
        </div>
      </header>

      <div className="container mx-auto max-w-lg px-4 py-6 space-y-5">

        {/* Resumen */}
        <Card className="border-border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumen de reserva</p>
          <div className="flex gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
              <Image src={cancha.images[0]} alt={cancha.name} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground line-clamp-1">{cancha.name}</p>
              <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5 capitalize"><Calendar className="h-3.5 w-3.5" />{fechaLabel}</p>
                <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{hora}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Cupón */}
        {cupones.length > 0 && (
          <Card className="border-border p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cupones disponibles</p>
            <div className="space-y-2">
              {cupones.map(c => (
                <button key={c.id} onClick={() => setCuponSeleccionado(cuponSeleccionado === c.id ? null : c.id)}
                  className={cn('flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left transition-all',
                    cuponSeleccionado === c.id ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/40'
                  )}>
                  <div className={cn('flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold',
                    cuponSeleccionado === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    <span>S/5</span><span className="text-[10px] font-normal">OFF</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Descuento de S/ 5</p>
                  </div>
                  <div className={cn('h-5 w-5 rounded-full border-2 transition-all', cuponSeleccionado === c.id ? 'border-primary bg-primary' : 'border-muted-foreground/40')}>
                    {cuponSeleccionado === c.id && <CheckCircle2 className="h-full w-full text-primary-foreground p-0.5" />}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Precio */}
        <Card className="border-border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detalle del pago</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio por hora</span>
              <span className="text-foreground">S/ {precioRaw}</span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-primary">
                <span>Descuento cupón</span><span>− S/ {descuento}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span className="text-foreground">Total a pagar</span>
              <span className="text-primary">S/ {total}</span>
            </div>
          </div>
        </Card>

        {/* Método */}
        {paso === 'metodo' && (
          <>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Método de pago</p>
              <div className="grid grid-cols-2 gap-3">
                {(['yape', 'plin'] as MetodoPago[]).map(m => (
                  <button key={m} onClick={() => setMetodo(m)}
                    className={cn('flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all',
                      metodo === m ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40'
                    )}>
                    <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-white',
                      m === 'yape' ? 'bg-[#6C1FC6]' : 'bg-[#00B4D8]'
                    )}>
                      {m === 'yape' ? 'Y' : 'P'}
                    </div>
                    <span className="text-sm font-semibold capitalize text-foreground">{m === 'yape' ? 'Yape' : 'Plin'}</span>
                    {metodo === m && <Badge className="bg-primary/10 text-primary border-0 text-xs">Seleccionado</Badge>}
                  </button>
                ))}
              </div>
            </div>
            <Button size="lg" className="w-full gap-2" onClick={() => setPaso('instrucciones')}>
              Continuar con {metodo === 'yape' ? 'Yape' : 'Plin'} <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Instrucciones + comprobante */}
        {paso === 'instrucciones' && (
          <>
            <Card className="border-border overflow-hidden">
              <div className={cn('flex items-center gap-3 px-5 py-4', metodo === 'yape' ? 'bg-[#6C1FC6]' : 'bg-[#00B4D8]')}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl font-black text-white">
                  {metodo === 'yape' ? 'Y' : 'P'}
                </div>
                <div>
                  <p className="font-bold text-white">{metodo === 'yape' ? 'Yape' : 'Plin'}</p>
                  <p className="text-xs text-white/80">Pago móvil instantáneo</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Número a {metodo === 'yape' ? 'yapear' : 'plinar'}</p>
                  <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <span className="text-xl font-bold tracking-widest text-foreground">
                        {metodo === 'yape' ? NUMERO_YAPE : NUMERO_PLIN}
                      </span>
                    </div>
                    <button onClick={copiarNumero}
                      className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                      <Copy className="h-3.5 w-3.5" />{copiado ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Monto exacto</p>
                  <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold text-primary">S/ {total}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pasos</p>
                  {[
                    `Abre tu app de ${metodo === 'yape' ? 'Yape' : 'Plin'}`,
                    `Envía S/ ${total} al número de arriba`,
                    'Toma captura de pantalla del comprobante',
                    'Súbela abajo y envía tu reserva',
                  ].map((p, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</div>
                      <p className="text-sm text-foreground pt-0.5">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Subir comprobante */}
            <Card className="border-border p-5 space-y-3">
              <p className="font-medium text-foreground">Sube tu comprobante de pago</p>
              <p className="text-sm text-muted-foreground">
                El administrador revisará la captura y confirmará tu reserva en minutos.
              </p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {comprobante ? (
                <div className="space-y-3">
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border">
                    <Image src={comprobante} alt="Comprobante" fill className="object-contain" />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
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
                    <p className="text-sm font-medium text-foreground">Toca para subir captura</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG hasta 10MB</p>
                  </div>
                </button>
              )}

              <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  También puedes enviar sin comprobante. El admin podrá pedírtelo después.
                </p>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setPaso('metodo')}>
                Cambiar método
              </Button>
              <Button size="lg" className="flex-1" onClick={handleEnviar} disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar reserva ✓'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PagoPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>}>
      <PagoContent />
    </Suspense>
  );
}
