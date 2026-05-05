'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft, Calendar, Clock, CheckCircle2, Copy,
  Smartphone, Shield, ChevronRight, Upload, ImageIcon, Timer, Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/loading-button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { type Cupon } from '@/lib/auth';
import { apiCrearReserva, apiGetLoyalty, getToken } from '@/lib/api';

type MetodoPago = 'yape' | 'plin';
type Paso = 'metodo' | 'instrucciones' | 'exito';

const NUMERO_YAPE = '987 654 321';
const NUMERO_Plin = '987 654 321';
const TIEMPO_LIMITE = 5 * 60; // 5 minutos

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
  // Extras seleccionados desde la página de detalle
  const conBalon    = params.get('balon') === '1';
  const conChalecos = params.get('chalecos') === '1';

  const [cancha, setCancha]                       = useState<any>(null);
  const [canchaLoading, setCanchaLoading]         = useState(true);

  const [metodo, setMetodo]                       = useState<MetodoPago>('yape');
  const [paso, setPaso]                           = useState<Paso>('metodo');
  const [copiado, setCopiado]                     = useState(false);
  const [cupones, setCupones]                     = useState<Cupon[]>([]);
  const [cuponSeleccionado, setCuponSeleccionado] = useState<string | null>(null);
  const [comprobante, setComprobante]             = useState<string | null>(null);
  const [enviando, setEnviando]                   = useState(false);
  const [segundos, setSegundos]                   = useState(TIEMPO_LIMITE);
  const [bloqueado, setBloqueado]                 = useState(false);

  const [modoPago, setModoPago]                       = useState<'completo' | 'parcial'>('completo');

  // Email y teléfono para usuarios invitados
  const [esInvitado, setEsInvitado]                   = useState(false);
  const [emailInvitado, setEmailInvitado]             = useState('');
  const [mismoNumero, setMismoNumero]                 = useState(true);
  const [telefonoInvitado, setTelefonoInvitado]       = useState('');
  const [metodoDevolucion, setMetodoDevolucion]       = useState<'yape' | 'plin'>('yape');
  const [emailError, setEmailError]                   = useState('');
  const [telefonoError, setTelefonoError]             = useState('');

  // Teléfono para usuarios registrados
  const [telefonoRegistrado, setTelefonoRegistrado]   = useState('');   // el que tiene en perfil
  const [usarOtroTelefono, setUsarOtroTelefono]       = useState(false); // checkbox "usar otro"
  const [otroTelefono, setOtroTelefono]               = useState('');    // número alternativo
  const [otroMetodo, setOtroMetodo]                   = useState<'yape' | 'plin'>('yape');
  const [actualizarPerfil, setActualizarPerfil]       = useState(false); // guardar en perfil
  const [otroTelefonoError, setOtroTelefonoError]     = useState('');

  // Cargar cancha desde API (soporta canchas de Supabase y hardcodeadas)
  useEffect(() => {
    if (!canchaId) return;
    fetch(`/api/canchas/detail?id=${canchaId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          // Cancha de Supabase — normalizar campos
          setCancha({
            id:              data.id,
            name:            data.nombre,
            images:          data.imagenes?.length ? data.imagenes : ['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop'],
            address:         data.direccion,
            phone:           data.telefono,
            balonPrecio:     data.balon_precio    ?? null,
            chalecosPrecio:  data.chalecos_precio ?? null,
            lat:             data.latitud         ?? null,
            lng:             data.longitud        ?? null,
          });
        } else {
          // Fallback a datos hardcodeados
          import('@/lib/data').then(({ getCanchaById }) => {
            const c = getCanchaById(canchaId);
            if (c) setCancha({ id: c.id, name: c.name, images: c.images, address: c.address, phone: c.phone, lat: c.coordinates?.lat ?? null, lng: c.coordinates?.lng ?? null });
          });
        }
      })
      .catch(() => {
        import('@/lib/data').then(({ getCanchaById }) => {
          const c = getCanchaById(canchaId);
          if (c) setCancha({ id: c.id, name: c.name, images: c.images, address: c.address, phone: c.phone, lat: c.coordinates?.lat ?? null, lng: c.coordinates?.lng ?? null });
        });
      })
      .finally(() => setCanchaLoading(false));
  }, [canchaId]);

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
      // Cargar datos directamente (sin validación previa)
      // Si el token es inválido, el servidor retornará 401
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) {
            // Token inválido — marcar como invitado
            console.warn('Token inválido, continuando como invitado');
            localStorage.removeItem('cp_token');
            localStorage.removeItem('cp_user');
            localStorage.removeItem('cp_token_time');
            setEsInvitado(true);
            return Promise.reject('Token inválido');
          }
          return r.json();
        })
        .then(perfil => {
          // Token válido — cargar datos
          apiGetLoyalty().then(data => {
            setCupones((data.cupones ?? []).filter((c: Cupon) => !c.usado));
          });
          const tel = perfil?.telefono || '';
          if (tel) setTelefonoRegistrado(tel);
        })
        .catch(err => {
          console.error('Error al obtener perfil:', err);
          setEsInvitado(true);
        });
    } else {
      setEsInvitado(true);
    }
  }, []);

  if (canchaLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!cancha) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Reserva no encontrada.</p>
    </div>
  );

  const descuento   = cuponSeleccionado ? 5 : 0;
  const extraBalon    = conBalon    && cancha?.balonPrecio    != null ? cancha.balonPrecio    : 0;
  const extraChalecos = conChalecos && cancha?.chalecosPrecio != null ? cancha.chalecosPrecio : 0;
  const total       = Math.max(0, precioRaw + extraBalon + extraChalecos - descuento);

  const montoAdelanto  = modoPago === 'parcial' ? Math.round(total * 0.20) : total;
  const saldoPendiente = modoPago === 'parcial' ? total - montoAdelanto : 0;

  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const copiarNumero = () => {
    const num = metodo === 'yape' ? NUMERO_YAPE : NUMERO_Plin;
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
    // Validar teléfono para usuarios registrados
    if (!esInvitado) {
      if (!telefonoRegistrado && !otroTelefono.trim()) {
        setOtroTelefonoError('Ingresa tu número de Yape/Plin para devoluciones');
        return;
      }
      if (usarOtroTelefono && !otroTelefono.trim()) {
        setOtroTelefonoError('Ingresa el número alternativo');
        return;
      }
      if (usarOtroTelefono && otroTelefono && !/^9\d{8}$/.test(otroTelefono)) {
        setOtroTelefonoError('Ingresa un número válido (9 dígitos, empieza con 9)');
        return;
      }
      setOtroTelefonoError('');
    }

    // Validar email y teléfono si es invitado
    if (esInvitado) {
      let valid = true;
      if (!emailInvitado.trim()) {
        setEmailError('Ingresa tu correo para recibir la confirmación');
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInvitado)) {
        setEmailError('Ingresa un correo válido');
        valid = false;
      } else {
        setEmailError('');
      }
      if (!mismoNumero) {
        if (!telefonoInvitado.trim()) {
          setTelefonoError('Ingresa el número para la devolución');
          valid = false;
        } else if (!/^9\d{8}$/.test(telefonoInvitado)) {
          setTelefonoError('Ingresa un número válido (9 dígitos, empieza con 9)');
          valid = false;
        } else {
          setTelefonoError('');
        }
      }
      if (!valid) return;
    }

    setEnviando(true);

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
      balonIncluido:    conBalon,
      chalecosIncluido: conChalecos,
      modoPago,
      montoAdelanto,
      saldoPendiente,
      ...(esInvitado && emailInvitado ? { 
        emailInvitado, 
        telefonoInvitado: mismoNumero ? 'MISMO_NUMERO_PAGO' : telefonoInvitado,
        metodoDevolucion: mismoNumero ? metodo : metodoDevolucion,
      } : {}),
      // Para usuarios registrados, pasar el teléfono de devolución
      ...(!esInvitado ? {
        telefonoDevolucion: usarOtroTelefono && otroTelefono
          ? `${otroTelefono} (${otroMetodo})`
          : telefonoRegistrado
            ? `${telefonoRegistrado} (${metodo})`
            : otroTelefono
              ? `${otroTelefono} (${metodo})`
              : '',
        actualizarTelefono: actualizarPerfil && !!otroTelefono,
        nuevoTelefono: actualizarPerfil ? otroTelefono : '',
      } : {}),
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

        {esInvitado && emailInvitado ? (
          <div className="mb-8 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-primary font-medium">
                Te enviaremos la confirmación a <span className="font-bold">{emailInvitado}</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              Cuando el administrador verifique tu pago, recibirás un correo con el estado de tu reserva.
            </p>
          </div>
        ) : (
          <p className="mb-8 text-sm text-muted-foreground max-w-xs">
            El administrador verificará tu pago y recibirás una notificación cuando tu reserva sea confirmada.
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
          {/* Compartir por WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent([
              `⚽ *¡Acabo de reservar una cancha!*`,
              ``,
              `📍 *${cancha.name}*`,
              ...(cancha.address ? [`🗺 ${cancha.address}`] : []),
              ...(cancha.lat && cancha.lng
                ? [`📌 Cómo llegar: https://maps.google.com/?q=${cancha.lat},${cancha.lng}`]
                : cancha.address
                ? [`📌 Cómo llegar: https://maps.google.com/?q=${encodeURIComponent(cancha.address)}`]
                : []),
              ``,
              `📅 ${fechaLabel}`,
              `🕐 ${hora}`,
              `💰 S/ ${total}`,
              ``,
              `¡Están convocados! Confirmen asistencia 🙋‍♂️`,
            ].join('\n'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:bg-[#20bd5a] transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Compartir con tu equipo
          </a>
          {!esInvitado && (
            <Button size="lg" onClick={() => router.push('/mis-reservas')}>Ver mis reservas</Button>
          )}
          <Button variant={esInvitado ? 'default' : 'outline'} size="lg" onClick={() => router.push('/')}>
            Volver al inicio
          </Button>
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

        {/* Cupón — solo si el usuario tiene cupones disponibles */}
        {cupones.length > 0 && (
          <Card className="border-border p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cupones disponibles</p>
            <div className="space-y-2">
              {cupones.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCuponSeleccionado(cuponSeleccionado === c.id ? null : c.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left transition-all',
                    cuponSeleccionado === c.id
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/20 hover:border-primary/40'
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold',
                    cuponSeleccionado === c.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    <span>S/5</span>
                    <span className="text-[10px] font-normal">OFF</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Descuento de S/ 5</p>
                    <p className="text-xs text-muted-foreground">
                      {cuponSeleccionado === c.id ? '✓ Aplicado' : 'Toca para aplicar'}
                    </p>
                  </div>
                  <div className={cn(
                    'h-5 w-5 rounded-full border-2 transition-all',
                    cuponSeleccionado === c.id
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40'
                  )}>
                    {cuponSeleccionado === c.id && (
                      <svg className="h-full w-full text-primary-foreground p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Selector de modo de pago */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">¿Cómo quieres pagar?</p>
          <div className="space-y-3">
            {/* Pago completo */}
            <button
              onClick={() => setModoPago('completo')}
              className={cn(
                'w-full text-left rounded-2xl border-2 p-4 transition-all',
                modoPago === 'completo'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    modoPago === 'completo' ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  )}>
                    {modoPago === 'completo' && (
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="font-semibold text-foreground">Pago completo (100%)</span>
                </div>
                <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 text-xs">Recomendado</Badge>
              </div>
              <p className="mt-2 ml-7 text-sm font-bold text-primary">S/ {total} ahora</p>
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

            {/* Pago con adelanto */}
            <button
              onClick={() => total > 0 && setModoPago('parcial')}
              disabled={total === 0}
              className={cn(
                'w-full text-left rounded-2xl border-2 p-4 transition-all',
                total === 0 && 'opacity-50 cursor-not-allowed',
                modoPago === 'parcial' && total > 0
                  ? 'border-amber-500 bg-amber-500/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  modoPago === 'parcial' && total > 0 ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/40'
                )}>
                  {modoPago === 'parcial' && total > 0 && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="font-semibold text-foreground">Pago con adelanto (20%)</span>
              </div>
              {total > 0 ? (
                <p className="mt-2 ml-7 text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">S/ {Math.round(total * 0.20)}</span> ahora
                  {' · '}
                  <span className="font-medium">S/ {total - Math.round(total * 0.20)}</span> en cancha
                </p>
              ) : (
                <p className="mt-2 ml-7 text-xs text-muted-foreground">Agrega precio para habilitar esta opción</p>
              )}
              <div className="mt-2 ml-7 flex items-center gap-1.5">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠ Sin devolución al cancelar</span>
              </div>
            </button>
          </div>
        </div>

        {/* Precio */}
        <Card className="border-border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detalle del pago</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio por hora</span>
              <span className="text-foreground">S/ {precioRaw}</span>
            </div>
            {conBalon && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">⚽ Balón</span>
                <span className="text-foreground">
                  {extraBalon > 0 ? `S/ ${extraBalon}` : 'Gratis'}
                </span>
              </div>
            )}
            {conChalecos && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">🎽 Chalecos</span>
                <span className="text-foreground">
                  {extraChalecos > 0 ? `S/ ${extraChalecos}` : 'Gratis'}
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
            {modoPago === 'parcial' && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-primary font-medium">Pagas ahora (adelanto 20%)</span>
                  <span className="text-primary font-semibold">S/ {montoAdelanto}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pagas en cancha (80%)</span>
                  <span className="text-muted-foreground">S/ {saldoPendiente}</span>
                </div>
              </>
            )}
            {modoPago === 'completo' && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600 dark:text-green-400 font-medium">Reserva garantizada ✓</span>
              </div>
            )}
          </div>

          {/* Aviso si la cancha no tiene extras */}
          {!conBalon && !conChalecos && cancha && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5">
              <span className="text-sm leading-none mt-0.5">⚠️</span>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                Esta cancha <span className="font-bold">no ofrece balón ni chalecos</span>. Recuerda traer los tuyos al partido.
              </p>
            </div>
          )}
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
                      metodo === m
                        ? m === 'yape'
                          ? 'border-[#6C1FC6] bg-[#6C1FC6]/10 shadow-sm'
                          : 'border-[#00C2CB] bg-[#00C2CB]/10 shadow-sm'
                        : 'border-border hover:border-muted-foreground/40'
                    )}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden">
                      <Image
                        src={m === 'yape' ? '/images/yape.png' : '/images/plin.png'}
                        alt={m === 'yape' ? 'Yape' : 'plin'}
                        width={m === 'yape' ? 56 : 100}
                        height={m === 'yape' ? 56 : 100}
                        className="object-contain"
                      />
                    </div>
                    <span className="text-sm font-semibold capitalize text-foreground">{m === 'yape' ? 'Yape' : 'plin'}</span>
                    {metodo === m && (
                      <Badge className={cn(
                        'border-0 text-xs',
                        m === 'yape' ? 'bg-[#6C1FC6]/10 text-[#6C1FC6]' : 'bg-[#00C2CB]/10 text-[#00A0A8]'
                      )}>
                        Seleccionado
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <Button size="lg" className="w-full gap-2" onClick={() => setPaso('instrucciones')}>
              Continuar con {metodo === 'yape' ? 'Yape' : 'plin'} <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Instrucciones + comprobante */}
        {paso === 'instrucciones' && (
          <>
            <Card className="border-border overflow-hidden">
              <div className={cn('flex items-center gap-3 px-5 py-4', metodo === 'yape' ? 'bg-[#6C1FC6]' : 'bg-[#00B4D8]')}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white overflow-hidden">
                  <Image
                    src={metodo === 'yape' ? '/images/yape.png' : '/images/plin.png'}
                    alt={metodo === 'yape' ? 'Yape' : 'plin'}
                    width={40}
                    height={40}
                    className="object-contain w-full h-full"
                  />
                </div>
                <div>
                  <p className="font-bold text-white">{metodo === 'yape' ? 'Yape' : 'plin'}</p>
                  <p className="text-xs text-white/80">Pago móvil instantáneo</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Número a {metodo === 'yape' ? 'yapear' : 'Plinar'}</p>
                  <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <span className="text-xl font-bold tracking-widest text-foreground">
                        {metodo === 'yape' ? NUMERO_YAPE : NUMERO_Plin}
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
                    `Abre tu app de ${metodo === 'yape' ? 'Yape' : 'plin'}`,
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

            {/* Teléfono para usuarios registrados */}
            {!esInvitado && (
              <Card className="border-border p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <p className="font-medium text-foreground">Número para devoluciones</p>
                </div>

                {telefonoRegistrado ? (
                  /* Tiene teléfono — usar el mismo método con el que pagó */
                  <div className="space-y-3">
                    <div
                      className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 cursor-pointer"
                      onClick={() => { setUsarOtroTelefono(!usarOtroTelefono); setOtroTelefonoError(''); }}
                    >
                      <Checkbox
                        checked={!usarOtroTelefono}
                        onCheckedChange={(v) => { setUsarOtroTelefono(!v); setOtroTelefonoError(''); }}
                      />
                      <div>
                        <p className="text-sm text-foreground">
                          Devolver por{' '}
                          <span className="font-semibold capitalize">{metodo === 'yape' ? 'Yape' : 'plin'}</span>
                          {' '}al número registrado
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">{telefonoRegistrado}</p>
                      </div>
                    </div>

                    {usarOtroTelefono && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Ingresa el número y método alternativo:</p>
                        <div className="flex gap-2">
                          {(['yape', 'plin'] as const).map(m => (
                            <button key={m} type="button"
                              onClick={() => setOtroMetodo(m)}
                              className={cn(
                                'flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2 px-3 text-sm font-medium transition-all',
                                otroMetodo === m
                                  ? m === 'yape'
                                    ? 'border-[#6C1FC6] bg-[#6C1FC6]/10 text-[#6C1FC6]'
                                    : 'border-[#00C2CB] bg-[#00C2CB]/10 text-[#00A0A8]'
                                  : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                              )}
                            >
                              <Image src={m === 'yape' ? '/images/yape.png' : '/images/plin.png'} alt={m} width={18} height={18} className="object-contain rounded" />
                              {m === 'yape' ? 'Yape' : 'plin'}
                            </button>
                          ))}
                        </div>
                        <Input
                          type="tel"
                          placeholder="987654321"
                          value={otroTelefono}
                          onChange={e => { setOtroTelefono(e.target.value); setOtroTelefonoError(''); }}
                          className={cn('bg-background', otroTelefonoError && 'border-destructive')}
                        />
                        {otroTelefonoError && <p className="text-xs text-destructive">{otroTelefonoError}</p>}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActualizarPerfil(!actualizarPerfil)}>
                          <Checkbox checked={actualizarPerfil} onCheckedChange={(v) => setActualizarPerfil(!!v)} />
                          <p className="text-xs text-muted-foreground">Guardar este número en mi perfil</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Sin teléfono — campo obligatorio, usa el mismo método de pago */
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Ingresa tu número de{' '}
                      <span className="font-semibold capitalize">{metodo === 'yape' ? 'Yape' : 'plin'}</span>
                      {' '}para recibir la devolución si cancelas.
                    </p>
                    <Input
                      type="tel"
                      placeholder="987654321"
                      value={otroTelefono}
                      onChange={e => { setOtroTelefono(e.target.value); setOtroTelefonoError(''); }}
                      className={cn('bg-background', otroTelefonoError && 'border-destructive')}
                    />
                    {otroTelefonoError && <p className="text-xs text-destructive">{otroTelefonoError}</p>}
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActualizarPerfil(!actualizarPerfil)}>
                      <Checkbox checked={actualizarPerfil} onCheckedChange={(v) => setActualizarPerfil(!!v)} />
                      <p className="text-xs text-muted-foreground">Guardar este número en mi perfil</p>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Email y teléfono invitado */}
            {esInvitado && (
              <Card className="border-primary/30 bg-primary/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <p className="font-medium text-foreground">Tus datos de contacto</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Los necesitamos para enviarte la confirmación y procesar devoluciones si cancelas.
                </p>
                <div className="space-y-3">
                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Correo electrónico</label>
                    <Input
                      type="email"
                      placeholder="tu@correo.com"
                      value={emailInvitado}
                      onChange={e => { setEmailInvitado(e.target.value); setEmailError(''); }}
                      className={cn('bg-background', emailError && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                  </div>

                  {/* Checkbox número devolución */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Número para devolución</label>
                    <div
                      className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 cursor-pointer"
                      onClick={() => { setMismoNumero(!mismoNumero); setTelefonoError(''); }}
                    >
                      <Checkbox
                        checked={mismoNumero}
                        onCheckedChange={(v) => { setMismoNumero(!!v); setTelefonoError(''); }}
                      />
                      <p className="text-sm text-foreground">
                        Devolver al mismo número de{' '}
                        <span className="font-medium capitalize">{metodo || 'Yape/Plin'}</span>{' '}
                        con el que pagué
                      </p>
                    </div>

                    {/* Campo de teléfono — solo si NO marcó el checkbox */}
                    {!mismoNumero && (
                      <div className="space-y-2">
                        {/* Selector Yape / Plin */}
                        <div className="flex gap-2">
                          {(['yape', 'plin'] as const).map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMetodoDevolucion(m)}
                              className={cn(
                                'flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-2 px-3 text-sm font-medium transition-all',
                                metodoDevolucion === m
                                  ? m === 'yape'
                                    ? 'border-[#6C1FC6] bg-[#6C1FC6]/10 text-[#6C1FC6]'
                                    : 'border-[#00C2CB] bg-[#00C2CB]/10 text-[#00A0A8]'
                                  : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                              )}
                            >
                              <Image
                                src={m === 'yape' ? '/images/yape.png' : '/images/plin.png'}
                                alt={m === 'yape' ? 'Yape' : 'plin'}
                                width={20}
                                height={20}
                                className="object-contain rounded"
                              />
                              {m === 'yape' ? 'Yape' : 'plin'}
                            </button>
                          ))}
                        </div>
                        {/* Número */}
                        <Input
                          type="tel"
                          placeholder="987654321"
                          value={telefonoInvitado}
                          onChange={e => { setTelefonoInvitado(e.target.value); setTelefonoError(''); }}
                          className={cn('bg-background', telefonoError && 'border-destructive focus-visible:ring-destructive')}
                        />
                        {telefonoError && <p className="text-xs text-destructive">{telefonoError}</p>}
                        <p className="text-xs text-muted-foreground">
                          Número de {metodoDevolucion === 'yape' ? 'Yape' : 'plin'} donde recibirás la devolución
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setPaso('metodo')}>
                Cambiar método
              </Button>
              <LoadingButton
                size="lg"
                className="flex-1"
                onClick={handleEnviar}
                isLoading={enviando}
                loadingText="Enviando"
                loadingVariant="spinner"
              >
                Enviar reserva ✓
              </LoadingButton>
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
