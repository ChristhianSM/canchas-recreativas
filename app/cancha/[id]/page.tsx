'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin, Star, Phone, Clock, CheckCircle2,
  Navigation, Share2, Heart, CalendarDays, ChevronRight, AlertTriangle, Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepButton } from '@/components/loading-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/header';
import { CanchaGallery } from '@/components/cancha-gallery';
import { TimeSlotPicker } from '@/components/time-slot-picker';
import CalificarCancha from '@/components/calificar-cancha';
import { sportLabels, TimeSlot } from '@/lib/types';
import { apiToggleFavorito, apiGetFavoritos, getToken } from '@/lib/api';
import { getLocalDateString } from '@/lib/date-utils';
import { Checkbox } from '@/components/ui/checkbox';

// Carga dinámica para evitar SSR con Leaflet
const MapView = dynamic(
  () => import('@/components/map-view').then(m => m.MapView),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse bg-muted" /> }
);

// Convertir formato 24h a 12h (AM/PM)
function formatTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

type CanchaDB = {
  id: string; nombre: string; tipo: keyof typeof sportLabels;
  direccion: string; distrito: string; descripcion: string;
  imagenes: string[]; rating: number; total_resenas: number;
  precio_por_hora: number; amenidades: string[];
  precios_por_hora: Record<string, number>;
  lat: number; lng: number; telefono: string; destacada: boolean;
  horariosRestringidos: string[];
  horariosOcupados: Record<string, 'reservado' | 'en_proceso'>;
  balon_disponible: boolean;
  balon_precio: number | null;
  chalecos_disponible: boolean;
  chalecos_precio: number | null;
  superficie: string | null;
  max_jugadores: number | null;
};

function buildSchedule(
  horariosRestringidos: string[],
  horariosOcupados: Record<string, 'reservado' | 'en_proceso'>,
  precioBase: number,
  preciosPorHora: Record<string, number> = {},
) {
  const schedule: Record<string, TimeSlot[]> = {};
  const today = new Date();
  const HORAS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'];

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    schedule[dateStr] = HORAS.map((time, idx) => {
      const key = `${dateStr}|${time}`;
      const ocupado = horariosOcupados[key];
      const bloqueado = horariosRestringidos.includes(time);
      const status = bloqueado || ocupado === 'reservado' ? 'reservado'
        : ocupado === 'en_proceso' ? 'en_proceso'
        : 'disponible';
      // Usar precio específico de la hora si existe, sino el precio base
      const precio = preciosPorHora[time] ?? precioBase;
      return {
        id: `${dateStr}-${idx}`,
        time,
        available: status === 'disponible',
        price: precio,
        status,
      };
    });
  }
  return schedule;
}

export default function CanchaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const today = getLocalDateString();
  const [cancha, setCancha]           = useState<CanchaDB | null>(null);
  const [loading, setLoading]         = useState(true);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isFav, setIsFav]             = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [reservando, setReservando]   = useState(false);
  const [slotOcupado, setSlotOcupado] = useState(false);
  const [ocupadoModal, setOcupadoModal] = useState(false);
  const [countdown, setCountdown]     = useState(0);
  const [reservaStep, setReservaStep] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Extras seleccionados por el usuario
  const [quiereBalon, setQuiereBalon]       = useState(false);
  const [quiereChalecos, setQuiereChalecos] = useState(false);

  const sessionId = useRef(
    typeof window !== 'undefined'
      ? (sessionStorage.getItem('cp_session_id') ?? (() => {
          const id = crypto.randomUUID();
          sessionStorage.setItem('cp_session_id', id);
          return id;
        })())
      : ''
  );

  const startCountdown = (seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleReservar = async () => {
    if (!cancha || !selectedSlot) return;
    setReservando(true);
    setReservaStep(1); // Paso 1: Verificando
    setSlotOcupado(false);

    // Consultar si el horario está disponible
    const check = await fetch(
      `/api/bloqueos/check?canchaId=${cancha.id}&fecha=${selectedDate}&hora=${encodeURIComponent(selectedSlot.time)}`
    ).then(r => r.json());

    if (!check.disponible) {
      setReservando(false);
      setReservaStep(0);
      setSlotOcupado(true);
      setSelectedSlot(null);
      setSheetOpen(false);
      setOcupadoModal(true);
      startCountdown(5 * 60); // 5 minutos
      // Recargar horarios para mostrar el slot ocupado
      fetch(`/api/canchas/detail?id=${cancha.id}`)
        .then(r => r.json())
        .then(data => { if (!data.error) setCancha(data); });
      return;
    }

    // Disponible — ir a pago (el bloqueo se crea allí)
    setReservaStep(2); // Paso 2: Redirigiendo
    setTimeout(() => {
      setReservando(false);
      setReservaStep(0);
      const extrasParams = [
        quiereBalon && cancha.balon_disponible ? `balon=1` : '',
        quiereChalecos && cancha.chalecos_disponible ? `chalecos=1` : '',
      ].filter(Boolean).join('&');
      const extrasStr = extrasParams ? `&${extrasParams}` : '';
      router.push(`/pago?canchaId=${cancha.id}&fecha=${selectedDate}&hora=${selectedSlot.time}&precio=${selectedSlot.price}&sid=${sessionId.current}${extrasStr}`);
    }, 800);
  };

  // Limpiar interval al desmontar
  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  useEffect(() => {
    // Usar query param para evitar bug de Turbopack con rutas dinámicas
    fetch(`/api/canchas/detail?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setCancha(data);
        } else {
          // Fallback: buscar en el listado completo
          return fetch('/api/canchas/list')
            .then(r => r.json())
            .then(list => {
              const found = Array.isArray(list) ? list.find((c: any) => c.id === id) : null;
              if (found) setCancha({ ...found, horariosRestringidos: [], horariosOcupados: {} });
            });
        }
      })
      .finally(() => setLoading(false))
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!cancha) return;
    const token = getToken();
    if (token) {
      apiGetFavoritos().then((ids: string[]) => setIsFav(ids.includes(cancha.id)));
    }
  }, [cancha]);

  const handleToggleFavorite = async () => {
    if (!cancha || togglingFav) return;
    
    const token = getToken();
    if (!token) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para guardar favoritos",
        variant: "destructive",
      });
      return;
    }

    setTogglingFav(true);
    const wasFav = isFav;
    
    // Optimistic update - cambiar inmediatamente
    setIsFav(!wasFav);
    
    // Vibración háptica en mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(!wasFav ? [30, 20, 30] : 50); // Patrón diferente para agregar vs quitar
    }

    try {
      await apiToggleFavorito(cancha.id);
      
      // Toast de confirmación con mejor diseño
      if (!wasFav) {
        // Agregado a favoritos
        toast({
          title: (
            <div className="flex items-center gap-2">
              <span className="text-2xl">❤️</span>
              <span>Agregado a favoritos</span>
            </div>
          ) as any,
          description: `Ahora puedes encontrar "${cancha.nombre}" en tu lista de favoritos`,
          duration: 3000,
          className: "border-l-4 border-l-destructive",
        });
      } else {
        // Eliminado de favoritos
        toast({
          description: `"${cancha.nombre}" fue eliminado de tus favoritos`,
          duration: 2000,
        });
      }
    } catch (error) {
      // Revertir si falla
      setIsFav(wasFav);
      toast({
        title: "Error",
        description: "No se pudo actualizar favoritos. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setTogglingFav(false), 300); // Delay para que se vea la animación
    }
  };

  const handleShare = async () => {
    if (!cancha) return;
    
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/cancha/${cancha.id}`;
    const shareData = {
      title: cancha.nombre,
      text: `Mira esta cancha: ${cancha.nombre} - S/ ${cancha.precio_por_hora}/hora`,
      url: shareUrl,
    };

    // Usar Web Share API si está disponible (móviles)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        // Usuario canceló el compartir, no hacer nada
        if (err.name !== 'AbortError') console.error('Error al compartir:', err);
      }
    } else {
      // Fallback: copiar al portapapeles
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copiado al portapapeles');
      } catch (err) {
        console.error('Error al copiar:', err);
        alert('No se pudo copiar el link');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 space-y-4">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!cancha) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">Cancha no encontrada</h1>
          <p className="mb-6 text-muted-foreground">La cancha que buscas no existe o fue eliminada.</p>
          <Button onClick={() => router.push('/')}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const schedule = buildSchedule(
    cancha.horariosRestringidos ?? [],
    cancha.horariosOcupados ?? {},
    cancha.precio_por_hora,
    cancha.precios_por_hora ?? {},
  );
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${cancha.lat},${cancha.lng}`;
  const selectedDateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <Header />

      {/* Modal: horario ocupado */}
      <Dialog open={ocupadoModal} onOpenChange={open => { setOcupadoModal(open); if (!open) { if (countdownRef.current) clearInterval(countdownRef.current); } }}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Horario en proceso de reserva</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Otro usuario está completando el pago de este horario ahora mismo.
              </p>
            </div>

            {countdown > 0 ? (
              <div className="w-full rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Se liberará en máximo</p>
                <div className="flex items-center justify-center gap-2 text-yellow-600">
                  <Timer className="h-5 w-5" />
                  <span className="text-2xl font-bold tabular-nums">
                    {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Si el pago no se completa, el horario quedará disponible nuevamente.
                </p>
              </div>
            ) : (
              <div className="w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-sm font-medium text-primary">¡El tiempo venció! Intenta reservar de nuevo.</p>
              </div>
            )}

            <div className="flex w-full flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  setOcupadoModal(false);
                  if (countdownRef.current) clearInterval(countdownRef.current);
                }}
              >
                Elegir otro horario
              </Button>
              {countdown > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    // Reverificar disponibilidad
                    if (!cancha) return;
                    const check = await fetch(
                      `/api/canchas/detail?id=${cancha.id}`
                    ).then(r => r.json());
                    if (!check.error) setCancha(check);
                    setOcupadoModal(false);
                    if (countdownRef.current) clearInterval(countdownRef.current);
                  }}
                >
                  Actualizar horarios
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto flex items-center justify-between px-4 pt-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge className="bg-primary text-primary-foreground">{sportLabels[cancha.tipo]}</Badge>
            {cancha.destacada && <Badge className="bg-accent text-accent-foreground">Destacado</Badge>}
          </div>
          <h1 className="text-xl font-bold text-foreground line-clamp-1">{cancha.nombre}</h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleToggleFavorite}
            disabled={togglingFav}
            className={`relative group transition-all duration-300 ${
              isFav ? 'bg-destructive/10 hover:bg-destructive/20' : 'hover:bg-muted'
            }`}
          >
            <Heart 
              className={`h-5 w-5 transition-all duration-300 ${
                isFav 
                  ? 'fill-destructive text-destructive scale-110' 
                  : 'scale-100 group-hover:scale-110 group-hover:text-destructive/70'
              }`} 
            />
            
            {/* Spinner de loading */}
            {togglingFav && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-md backdrop-blur-sm">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4">
        <CanchaGallery images={cancha.imagenes} alt={cancha.nombre} />
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {cancha.rating > 0 && (
                <>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-accent text-accent" />
                    <span className="font-semibold text-foreground">{cancha.rating}</span>
                    {cancha.total_resenas > 0 && (
                      <span>({cancha.total_resenas} reseñas)</span>
                    )}
                  </div>
                  <span>•</span>
                </>
              )}
              <span>{cancha.distrito}, Piura</span>
              {cancha.superficie && (
                <>
                  <span>•</span>
                  <span className="capitalize">
                    {cancha.superficie === 'grass' ? '🌿 Grass natural'
                      : cancha.superficie === 'grass_sintetico' ? '🟩 Grass sintético'
                      : cancha.superficie === 'loza' ? '🏗️ Loza'
                      : '⬜ Cemento'}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 lg:hidden">
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">Precio</p>
                <p className="text-lg font-bold text-primary">S/ {cancha.precio_por_hora}<span className="text-xs font-normal text-muted-foreground">/h</span></p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">Horario</p>
                <p className="text-sm font-medium text-foreground">6am – 10pm</p>
              </div>
              {cancha.max_jugadores && (
                <>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="flex-1 text-center">
                    <p className="text-xs text-muted-foreground">Jugadores</p>
                    <p className="text-sm font-medium text-foreground">👥 {cancha.max_jugadores}</p>
                  </div>
                </>
              )}
              {cancha.rating > 0 && (
                <>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="flex-1 text-center">
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="text-sm font-medium text-foreground flex items-center justify-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />{cancha.rating}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Descripción</h2>
              <p className="leading-relaxed text-muted-foreground">{cancha.descripcion}</p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Servicios</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cancha.amenidades?.map(a => (
                  <div key={a} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-foreground">{a}</span>
                  </div>
                ))}
              </div>

              {/* Extras: balón y chalecos — 3 escenarios por cada uno */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Balón */}
                {cancha.balon_disponible ? (
                  <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    cancha.balon_precio != null
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-green-500/20 bg-green-500/5'
                  }`}>
                    <span className="text-2xl">⚽</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Balón disponible</p>
                      <p className="text-xs text-muted-foreground">
                        {cancha.balon_precio != null ? `S/ ${cancha.balon_precio} por reserva` : 'Incluido gratis'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 opacity-60">
                    <span className="text-2xl grayscale">⚽</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Sin balón</p>
                      <p className="text-xs text-muted-foreground">Debes traer el tuyo</p>
                    </div>
                  </div>
                )}

                {/* Chalecos */}
                {cancha.chalecos_disponible ? (
                  <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    cancha.chalecos_precio != null
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-green-500/20 bg-green-500/5'
                  }`}>
                    <span className="text-2xl">🎽</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Chalecos disponibles</p>
                      <p className="text-xs text-muted-foreground">
                        {cancha.chalecos_precio != null ? `S/ ${cancha.chalecos_precio} por reserva` : 'Incluidos gratis'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 opacity-60">
                    <span className="text-2xl grayscale">🎽</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Sin chalecos</p>
                      <p className="text-xs text-muted-foreground">Debes traer los tuyos</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Horarios - Ahora antes del mapa en desktop */}
            <div className="hidden lg:block">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Selecciona fecha y hora</h2>
              <Card className="border-border p-4">
                <TimeSlotPicker
                  schedule={schedule}
                  selectedDate={selectedDate}
                  selectedSlot={selectedSlot}
                  onDateChange={setSelectedDate}
                  onSlotSelect={setSelectedSlot}
                />
              </Card>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Ubicación</h2>
              <Card className="overflow-hidden border-border">
                <MapView lat={cancha.lat} lng={cancha.lng} nombre={cancha.nombre} />
                <div className="p-4">
                  <div className="mb-3 flex items-start gap-2">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-foreground">{cancha.direccion}</span>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                      <Navigation className="mr-2 h-4 w-4" />Abrir en Google Maps
                    </a>
                  </Button>
                </div>
              </Card>
            </div>

            {/* Calificaciones — al final */}
            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Calificaciones</h2>
              <CalificarCancha canchaId={cancha.id} />
            </div>
          </div>

          {/* Sidebar desktop */}
          <div className="hidden lg:block">
            <Card className="sticky top-20 border-border p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-bold text-foreground">S/ {cancha.precio_por_hora}</span>
                  <span className="text-muted-foreground"> /hora</span>
                </div>
                {cancha.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-medium text-foreground">{cancha.rating}</span>
                  </div>
                )}
              </div>
              <Separator className="my-4" />
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Horario: 6:00 AM - 10:00 PM</span>
                </div>
                {cancha.max_jugadores && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">👥</span>
                    <span className="text-foreground">Máx. {cancha.max_jugadores} jugadores</span>
                  </div>
                )}
                {cancha.telefono && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${cancha.telefono}`} className="text-primary hover:underline">{cancha.telefono}</a>
                  </div>
                )}
              </div>
              {selectedSlot ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-secondary p-3">
                    <p className="text-sm text-muted-foreground">Tu selección:</p>
                    <p className="font-semibold capitalize text-foreground">{selectedDateLabel}</p>
                    <p className="text-primary">{selectedSlot.time} — S/ {selectedSlot.price}</p>
                  </div>

                  {/* Extras desktop */}
                  {(cancha.balon_disponible || cancha.chalecos_disponible) ? (
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">¿Necesitas extras?</p>
                      {cancha.balon_disponible && (
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span>⚽</span>
                            <div>
                              <p className="text-sm font-medium text-foreground">Balón</p>
                              <p className="text-xs text-muted-foreground">
                                {cancha.balon_precio != null ? `+ S/ ${cancha.balon_precio}` : 'Gratis'}
                              </p>
                            </div>
                          </div>
                          <Checkbox checked={quiereBalon} onCheckedChange={v => setQuiereBalon(v as boolean)} />
                        </label>
                      )}
                      {cancha.chalecos_disponible && (
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span>🎽</span>
                            <div>
                              <p className="text-sm font-medium text-foreground">Chalecos</p>
                              <p className="text-xs text-muted-foreground">
                                {cancha.chalecos_precio != null ? `+ S/ ${cancha.chalecos_precio}` : 'Gratis'}
                              </p>
                            </div>
                          </div>
                          <Checkbox checked={quiereChalecos} onCheckedChange={v => setQuiereChalecos(v as boolean)} />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5 flex items-start gap-2">
                      <span className="text-base leading-none mt-0.5">⚠️</span>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                        Esta cancha <span className="font-bold">no ofrece balón ni chalecos</span>. Recuerda traer los tuyos.
                      </p>
                    </div>
                  )}

                  <StepButton
                    className="w-full"
                    size="lg"
                    isLoading={reservando}
                    steps={['Verificando disponibilidad', 'Redirigiendo al pago']}
                    currentStep={reservaStep - 1}
                    onClick={handleReservar}
                  >
                    Reservar ahora
                  </StepButton>
                </div>
              ) : (
                <Button className="w-full" size="lg" disabled>Selecciona un horario</Button>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile barra fija */}
      <div className="lg:hidden">
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-4 py-3 shadow-xl">
          <div className="container mx-auto flex items-center gap-3">
            <div className="flex-1">
              {selectedSlot ? (
                <>
                  <p className="text-xs text-muted-foreground capitalize">{selectedDateLabel} · {selectedSlot.time}</p>
                  <p className="text-xl font-bold text-foreground">S/ {selectedSlot.price}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Desde</p>
                  <p className="text-xl font-bold text-foreground">S/ {cancha.precio_por_hora}<span className="text-sm font-normal text-muted-foreground">/hora</span></p>
                </>
              )}
            </div>
            <Button size="lg" className="gap-2 px-6" onClick={() => setSheetOpen(true)}>
              <CalendarDays className="h-5 w-5" />
              {selectedSlot ? 'Confirmar reserva' : 'Ver horarios'}
            </Button>
          </div>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl px-4 pb-8">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-left">Selecciona fecha y hora</SheetTitle>
              <p className="text-sm text-muted-foreground text-left">{cancha.nombre}</p>
            </SheetHeader>
            <TimeSlotPicker
              schedule={schedule}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              onDateChange={setSelectedDate}
              onSlotSelect={(slot) => {
                setSelectedSlot(slot);
                // Vibración háptica si está disponible
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  navigator.vibrate(50);
                }
                // Scroll automático hacia el botón de pagar después de un pequeño delay
                setTimeout(() => {
                  const sheetContent = document.querySelector('[data-slot-summary]');
                  if (sheetContent) {
                    sheetContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }, 100);
              }}
            />
            <div className="mt-4 space-y-3" data-slot-summary>
              {selectedSlot && (
                <div className="rounded-xl bg-secondary p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-sm text-muted-foreground">Tu selección</p>
                  <p className="font-semibold capitalize text-foreground">{selectedDateLabel}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-primary font-medium">{formatTo12Hour(selectedSlot.time)}</span>
                    <span className="text-lg font-bold text-foreground">S/ {selectedSlot.price}</span>
                  </div>
                </div>
              )}

              {/* Extras — solo si la cancha los ofrece */}
              {selectedSlot && (cancha.balon_disponible || cancha.chalecos_disponible) ? (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">¿Necesitas extras?</p>
                  {cancha.balon_disponible && (
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚽</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">Balón</p>
                          <p className="text-xs text-muted-foreground">
                            {cancha.balon_precio != null ? `+ S/ ${cancha.balon_precio}` : 'Gratis'}
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={quiereBalon}
                        onCheckedChange={v => setQuiereBalon(v as boolean)}
                      />
                    </label>
                  )}
                  {cancha.chalecos_disponible && (
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎽</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">Chalecos</p>
                          <p className="text-xs text-muted-foreground">
                            {cancha.chalecos_precio != null ? `+ S/ ${cancha.chalecos_precio}` : 'Gratis'}
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={quiereChalecos}
                        onCheckedChange={v => setQuiereChalecos(v as boolean)}
                      />
                    </label>
                  )}
                </div>
              ) : selectedSlot ? (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">⚠️</span>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                    Esta cancha <span className="font-bold">no ofrece balón ni chalecos</span>. Recuerda traer los tuyos.
                  </p>
                </div>
              ) : null}

              <StepButton
                className="w-full gap-2 mb-4"
                size="lg"
                isLoading={reservando}
                steps={['Verificando disponibilidad', 'Redirigiendo al pago']}
                currentStep={reservaStep - 1}
                onClick={handleReservar}
                disabled={!selectedSlot}
              >
                {selectedSlot ? <>Continuar al pago <ChevronRight className="h-4 w-4" /></> : 'Selecciona un horario'}
              </StepButton>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}