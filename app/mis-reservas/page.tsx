'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar, Clock, MapPin, CalendarPlus, Heart, Star, Stamp,
  User, LogIn, CheckCircle2, XCircle, Phone, AlertTriangle,
} from 'lucide-react';
import { Header } from '@/components/header';
import CancelarReservaSimple from '@/components/cancelar-reserva-simple';
import { apiCancelarReserva } from '@/lib/api-cancelacion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { canchas } from '@/lib/data';
import { sportLabels } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getUser, type LoyaltyData } from '@/lib/auth';
import { LoyaltyCard } from '@/components/loyalty-card';
import { type Notificacion, type Reserva } from '@/lib/store';
import {
  apiGetReservas, apiGetNotificaciones, apiMarcarNotifLeida,
  apiActualizarReserva, apiGetFavoritos, apiToggleFavorito,
  apiGetLoyalty, getToken, getStoredUser,
} from '@/lib/api';

// Genera el link de WhatsApp con el mensaje de la reserva
function generarLinkWhatsApp(canchaNombre: string, fecha: string, hora: string, precio: number, address?: string, lat?: number, lng?: number): string {
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const ubicacionLine = lat && lng
    ? `📌 Cómo llegar: https://maps.google.com/?q=${lat},${lng}`
    : address
    ? `📌 Cómo llegar: https://maps.google.com/?q=${encodeURIComponent(address)}`
    : null;
  const mensaje = [
    `⚽ *¡Reserva confirmada!*`,
    ``,
    `📍 *${canchaNombre}*`,
    ...(address ? [`🗺 ${address}`] : []),
    ...(ubicacionLine ? [ubicacionLine] : []),
    ``,
    `📅 ${fechaLabel}`,
    `🕐 ${hora}`,
    `💰 S/ ${precio}`,
    ``,
    `¡Están convocados! Confirmen asistencia 🙋‍♂️`,
  ].join('\n');
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

const estadoLabel: Record<Reserva['estado'], string> = {
  pendiente:  'Pendiente',
  confirmada: 'Confirmada',
  rechazada:  'Rechazada',
  cancelada:  'Cancelada',
};

const estadoClass: Record<Reserva['estado'], string> = {
  pendiente:  'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  confirmada: 'bg-primary/10 text-primary border-primary/20',
  rechazada:  'bg-destructive/10 text-destructive border-destructive/20',
  cancelada:  'bg-muted text-muted-foreground',
};

// ── Tarjeta de reserva ──────────────────────────────────────────
function ReservaCard({
  r,
  onDetalle,
  onCancelar,
}: {
  r: Reserva;
  onDetalle: (r: Reserva) => void;
  onCancelar: (r: Reserva) => void;
}) {
  const canchaLocal = canchas.find(c => c.id === r.canchaId);
  const imagen = canchaLocal?.images[0] ?? 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop';
  const direccion = canchaLocal?.address ?? null;

  // Verificar si la fecha y hora ya pasaron
  const fechaHoraPasada = (() => {
    const [year, month, day] = r.fecha.split('-').map(Number);
    const [horaNum, minNum] = r.hora.split(':').map(Number);
    
    const fechaReserva = new Date(year, month - 1, day, horaNum, minNum, 0);
    const ahora = new Date();
    
    return fechaReserva < ahora;
  })();

  return (
    <Card className="overflow-hidden border-border">
      <div className="flex flex-col sm:flex-row">
        <Link href={`/cancha/${r.canchaId}`} className="relative aspect-video w-full sm:aspect-square sm:w-40 shrink-0 overflow-hidden group">
          <Image src={imagen} alt={r.canchaName} fill className="object-cover transition-transform group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </Link>
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={estadoClass[r.estado]}>
                  {estadoLabel[r.estado]}
                </Badge>
                {fechaHoraPasada && r.estado === 'confirmada' && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                    Finalizada
                  </Badge>
                )}
                {r.modoPago === 'parcial' && r.estado === 'confirmada' && !fechaHoraPasada && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                    Saldo pendiente en cancha: S/ {r.saldoPendiente}
                  </Badge>
                )}
                {r.modoPago === 'parcial' && r.estado === 'pendiente' && (
                  <span className="text-xs text-amber-700 font-medium">
                    Adelanto enviado — pendiente de confirmación
                  </span>
                )}
                {(!r.modoPago || r.modoPago === 'completo') && (r.estado === 'confirmada' || r.estado === 'pendiente') && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                    Pago completo ✓
                  </Badge>
                )}
              </div>
              <Link href={`/cancha/${r.canchaId}`} className="mt-2 block font-semibold text-foreground hover:text-primary transition-colors">
                {r.canchaName}
              </Link>
              {canchaLocal && (
                <p className="text-sm text-muted-foreground">{sportLabels[canchaLocal.type]}</p>
              )}
            </div>
            <p className="text-lg font-bold text-primary shrink-0">S/ {r.precio}</p>
          </div>

          <div className="mt-auto space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="capitalize">{formatDate(r.fecha)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{r.hora} - {`${String((parseInt(r.hora.split(':')[0]) + 1) % 24).padStart(2, '0')}:00`}</span>
            </div>
            {direccion && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{direccion}</span>
              </div>
            )}
          </div>

          {/* Solo mostrar botones de acción si no ha pasado la fecha */}
          {(r.estado === 'pendiente' || (r.estado === 'confirmada' && !fechaHoraPasada)) && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => onDetalle(r)}>
                Detalles de la reservación
              </Button>
              {r.estado === 'confirmada' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-auto border-green-500 text-green-600 hover:bg-green-50"
                  asChild
                >
                  <a
                    href={generarLinkWhatsApp(r.canchaName, r.fecha, r.hora, r.precio, canchaLocal?.address, canchaLocal?.coordinates?.lat, canchaLocal?.coordinates?.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>
                </Button>
              )}
              <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={() => onCancelar(r)}>
                Cancelar reservación
              </Button>
            </div>
          )}
          
          {/* Mostrar botón de reservar de nuevo para reservas finalizadas o canceladas */}
          {(r.estado === 'rechazada' || r.estado === 'cancelada' || (r.estado === 'confirmada' && fechaHoraPasada)) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/cancha/${r.canchaId}`}>Reservar de nuevo</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Empty state ─────────────────────────────────────────────────
function EmptyState({ type }: { type: 'proximas' | 'historial' | 'favorites' }) {
  const cfg = {
    proximas:  { 
      icon: <CalendarPlus className="h-10 w-10 text-muted-foreground" />, 
      title: 'No tienes reservas próximas',    
      desc: 'Explora nuestras canchas y haz tu primera reserva', 
      action: true,
      bgColor: 'bg-primary/5',
      iconBg: 'bg-primary/10'
    },
    historial: { 
      icon: <Clock className="h-10 w-10 text-muted-foreground" />, 
      title: 'No tienes reservas en historial', 
      desc: 'Aquí aparecerán tus reservas pasadas y canceladas', 
      action: false,
      bgColor: 'bg-muted/30',
      iconBg: 'bg-muted'
    },
    favorites: { 
      icon: <Heart className="h-10 w-10 text-muted-foreground" />, 
      title: 'No tienes canchas favoritas',     
      desc: 'Toca el corazón ❤️ en cualquier cancha para guardarla aquí', 
      action: true,
      bgColor: 'bg-destructive/5',
      iconBg: 'bg-destructive/10'
    },
  }[type];
  
  return (
    <Card className={`${cfg.bgColor} border-dashed`}>
      <div className="py-12 text-center px-4">
        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${cfg.iconBg}`}>
          {cfg.icon}
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{cfg.title}</h3>
        <p className="mb-6 text-sm text-muted-foreground max-w-md mx-auto">{cfg.desc}</p>
        {cfg.action && (
          <Button asChild size="lg">
            <Link href="/canchas">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Explorar canchas
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function MisReservasPage() {
  const [reservas, setReservas]       = useState<Reserva[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loyalty, setLoyalty]         = useState<LoyaltyData>({ sellos: 0, totalReservas: 0, cupones: [] });
  const [user, setUser]               = useState<ReturnType<typeof getUser>>(null);
  const [notifs, setNotifs]           = useState<Notificacion[]>([]);
  const [hydrated, setHydrated]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [reservaDetalle, setReservaDetalle]   = useState<Reserva | null>(null);
  const [reservaCancelar, setReservaCancelar] = useState<Reserva | null>(null);

  const reload = async () => {
    const data = await apiGetReservas();
    setReservas(Array.isArray(data) ? data.map((r: any) => ({
      id: r.id, canchaId: r.cancha_id, canchaName: r.cancha_nombre,
      usuarioNombre: r.usuario_nombre, usuarioEmail: r.usuario_email,
      usuarioPhone: r.usuario_telefono, fecha: r.fecha, hora: r.hora,
      precio: r.precio, metodoPago: r.metodo_pago, comprobante: r.comprobante_url,
      estado: r.estado, creadaEn: r.creado_en, notificado: true,
      modoPago: r.modo_pago ?? 'completo',
      montoAdelanto: r.monto_adelanto,
      saldoPendiente: r.saldo_pendiente ?? 0,
      saldoCobrado: r.saldo_cobrado ?? false,
    })) : []);
    setLoading(false);
  };

  useEffect(() => {
    const storedUser = getStoredUser();
    setUser(storedUser);
    setHydrated(true);

    reload();

    const token = getToken();
    if (token) {
      apiGetFavoritos().then(setFavoriteIds);
      apiGetLoyalty().then(data => setLoyalty({
        sellos: data.sellos ?? 0,
        totalReservas: data.total_reservas ?? 0,
        cupones: (data.cupones ?? []).map((c: any) => ({
          id: c.id, descuento: c.descuento, generadoEn: c.generado_en,
          usado: c.usado, usadoEn: c.usado_en,
        })),
      }));
      apiGetNotificaciones().then(data => setNotifs(Array.isArray(data) ? data.map((n: any) => ({
        id: n.id, reservaId: n.reserva_id, mensaje: n.mensaje,
        tipo: n.tipo, leida: n.leida, creadaEn: n.creado_en,
      })) : []));
    }
  }, []);

  const refreshLoyalty = async () => {
    const data = await apiGetLoyalty();
    setLoyalty({
      sellos: data.sellos ?? 0,
      totalReservas: data.total_reservas ?? 0,
      cupones: (data.cupones ?? []).map((c: any) => ({
        id: c.id, descuento: c.descuento, generadoEn: c.generado_en,
        usado: c.usado, usadoEn: c.usado_en,
      })),
    });
  };

  const handleLeerNotif = async (id: string) => {
    await apiMarcarNotifLeida(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const handleCancelar = async (reservaId: string) => {
    try {
      const resultado = await apiCancelarReserva(reservaId);
      alert(resultado.mensaje);
      setReservaCancelar(null);
      setReservas(prev => prev.filter(r => r.id !== reservaId));
      reload();
    } catch (error: any) {
      alert(`Error al cancelar: ${error.message}`);
    }
  };

  const handleRemoveFavorite = async (canchaId: string) => {
    await apiToggleFavorito(canchaId);
    setFavoriteIds(prev => prev.filter(id => id !== canchaId));
  };

  const favoriteCanchas = canchas.filter(c => favoriteIds.includes(c.id));

  // Función para verificar si una fecha y hora ya pasaron
  const fechaHoraPasada = (fecha: string, hora: string): boolean => {
    // Convertir fecha (YYYY-MM-DD) y hora (HH:MM) a un objeto Date
    const [year, month, day] = fecha.split('-').map(Number);
    const [horaNum, minNum] = hora.split(':').map(Number);
    
    const fechaReserva = new Date(year, month - 1, day, horaNum, minNum, 0);
    const ahora = new Date();
    
    return fechaReserva < ahora;
  };

  // Reservas filtradas por estado Y fecha/hora
  const proximas = reservas.filter(r => {
    // Solo pendientes y confirmadas que NO hayan pasado
    if (r.estado !== 'pendiente' && r.estado !== 'confirmada') return false;
    return !fechaHoraPasada(r.fecha, r.hora);
  });

  const historial = reservas.filter(r => {
    // Rechazadas, canceladas, O confirmadas que ya pasaron
    return r.estado === 'rechazada' || 
           r.estado === 'cancelada' || 
           (r.estado === 'confirmada' && fechaHoraPasada(r.fecha, r.hora));
  });

  // Mientras se lee localStorage o cargan las reservas, mostrar skeleton
  if (!hydrated || loading) {
    return (
      <div className="flex flex-col flex-1 bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-6 space-y-2">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
          </div>
          {/* Tabs skeleton */}
          <div className="mb-6 flex gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          {/* Cards skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex overflow-hidden rounded-xl border border-border">
                <div className="h-36 w-40 shrink-0 animate-pulse bg-muted" />
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {user?.name ? `Hola, ${user.name.split(' ')[0]} 👋` : 'Mi Cuenta'}
          </h1>
          {user && (
            <p className="text-muted-foreground">
              Gestiona tus reservas, favoritas y recompensas
            </p>
          )}
        </div>

        {/* Notificaciones */}
        {notifs.filter(n => !n.leida).length > 0 && (
          <div className="mb-6 space-y-2">
            {notifs.filter(n => !n.leida).map(n => (
              <div key={n.id} className={cn(
                'flex items-start gap-3 rounded-xl border p-4',
                n.tipo === 'confirmada' ? 'border-primary/20 bg-primary/5'
                : n.tipo === 'favorito'  ? 'border-pink-500/20 bg-pink-500/5'
                : 'border-destructive/20 bg-destructive/5'
              )}>
                {n.tipo === 'confirmada'
                  ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  : n.tipo === 'favorito'
                  ? <Heart className="mt-0.5 h-5 w-5 shrink-0 fill-pink-500 text-pink-500" />
                  : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                }
                <div className="flex-1">
                  <p className="text-sm text-foreground">{n.mensaje}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(n.creadaEn).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => handleLeerNotif(n.id)} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
                  Marcar leída
                </button>
              </div>
            ))}
          </div>
        )}

        {user ? (
          /* ── Logueado: perfil completo ── */
          <Tabs defaultValue="proximas" className="w-full">
            <div className="mb-6 overflow-x-auto">
              <TabsList className="w-max min-w-full sm:w-auto">
                <TabsTrigger value="proximas" className="gap-1.5">
                  <CalendarPlus className="h-4 w-4" />
                  <span>Próximas</span>
                  {proximas.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                      {proximas.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="historial" className="gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>Historial</span>
                  {historial.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                      {historial.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="favorites" className="gap-1.5">
                  <Heart className="h-4 w-4" />
                  <span>Favoritas</span>
                  {favoriteCanchas.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                      {favoriteCanchas.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="loyalty" className="gap-1.5">
                  <Stamp className="h-4 w-4" />
                  <span>Recompensas</span>
                  {loyalty && loyalty.sellos > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                      {loyalty.sellos}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="proximas" className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarPlus className="h-4 w-4" />
                <p>Tus reservas confirmadas y pendientes</p>
              </div>
              {proximas.length > 0
                ? <div className="space-y-4">{proximas.map(r => <ReservaCard key={r.id} r={r} onDetalle={setReservaDetalle} onCancelar={setReservaCancelar} />)}</div>
                : <EmptyState type="proximas" />}
            </TabsContent>

            <TabsContent value="historial" className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <p>Historial de todas tus reservas pasadas</p>
              </div>
              {historial.length > 0
                ? <div className="space-y-4">{historial.map(r => <ReservaCard key={r.id} r={r} onDetalle={setReservaDetalle} onCancelar={setReservaCancelar} />)}</div>
                : <EmptyState type="historial" />}
            </TabsContent>

            <TabsContent value="favorites" className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Heart className="h-4 w-4" />
                <p>Tus canchas favoritas para reservar más rápido</p>
              </div>
              {favoriteCanchas.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {favoriteCanchas.map(cancha => (
                    <Card key={cancha.id} className="overflow-hidden border-border group hover:shadow-md transition-shadow">
                      <div className="relative aspect-video">
                        <Image src={cancha.images[0]} alt={cancha.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        <button onClick={() => handleRemoveFavorite(cancha.id)}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm text-destructive shadow hover:bg-card transition-colors">
                          <Heart className="h-4 w-4 fill-destructive" />
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground line-clamp-1">{cancha.name}</h3>
                          {cancha.rating > 0 && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Star className="h-4 w-4 fill-accent text-accent" />
                              <span className="text-sm font-medium">{cancha.rating}</span>
                            </div>
                          )}
                        </div>
                        <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="line-clamp-1">{cancha.address}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{sportLabels[cancha.type]}</span>
                          <span className="font-bold text-primary">S/ {cancha.pricePerHour}/h</span>
                        </div>
                        <Button className="mt-3 w-full" size="sm" asChild>
                          <Link href={`/cancha/${cancha.id}`}>Ver cancha</Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : <EmptyState type="favorites" />}
            </TabsContent>

            <TabsContent value="loyalty" className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Stamp className="h-4 w-4" />
                <p>Acumula sellos y canjea cupones de descuento</p>
              </div>
              <div className="max-w-lg">
                <LoyaltyCard loyalty={loyalty} onUpdate={refreshLoyalty} />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* ── Sin sesión: mensaje informativo ── */
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              {/* Mensaje informativo para usuarios no logueados */}
              <Card className="border-border p-6 sm:p-8">
                <div className="text-center space-y-5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Inicia sesión para ver tus reservas
                    </h3>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                      Crea una cuenta o inicia sesión para gestionar tus reservas, guardar canchas favoritas y acumular sellos para obtener descuentos.
                    </p>
                  </div>
                  <div className="pt-2">
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button size="lg" asChild>
                        <Link href="/registro">Crear cuenta</Link>
                      </Button>
                      <Button size="lg" variant="outline" asChild>
                        <Link href="/login">
                          <LogIn className="mr-2 h-4 w-4" />
                          Iniciar sesión
                        </Link>
                      </Button>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  {/* Nota para usuarios invitados que ya reservaron */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 text-left">
                      <svg className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          ¿Hiciste una reserva como invitado?
                        </p>
                        <p className="text-sm text-blue-700">
                          Revisa tu correo electrónico. Te enviamos los detalles de tu reserva con un enlace para ver el estado y cancelar si lo necesitas.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button variant="outline" asChild>
                      <Link href="/canchas">
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Explorar canchas
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <Image
              src="/images/logo.png"
              alt="CanchaPiura"
              width={320}
              height={100}
              className="h-24 w-auto object-contain"
            />
            <p className="text-sm text-muted-foreground">&copy; 2026 CanchaGo. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* ── Modal: Ver detalles ── */}
      <Dialog open={!!reservaDetalle} onOpenChange={() => setReservaDetalle(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalle de reserva</DialogTitle></DialogHeader>
          {reservaDetalle && (() => {
            const canchaLocal = canchas.find(c => c.id === reservaDetalle.canchaId);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Cancha',          value: reservaDetalle.canchaName },
                    { label: 'Estado',          value: estadoLabel[reservaDetalle.estado], cls: estadoClass[reservaDetalle.estado].split(' ').find(c => c.startsWith('text-')) },
                    { label: 'Fecha',           value: new Date(reservaDetalle.fecha + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }), capitalize: true },
                    { label: 'Hora',            value: reservaDetalle.hora },
                    { label: 'Método de pago',  value: reservaDetalle.metodoPago, capitalize: true },
                    { label: 'Total pagado',    value: `S/ ${reservaDetalle.precio}`, bold: true },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={cn('font-medium text-foreground', item.cls, item.capitalize && 'capitalize', item.bold && 'font-bold text-primary')}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
                {reservaDetalle.modoPago === 'parcial' && (
                  <>
                    <Separator />
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2 text-sm">
                      <p className="font-semibold text-amber-800">Desglose de pago</p>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Adelanto pagado online:</span>
                        <span className="font-medium text-foreground">S/ {reservaDetalle.montoAdelanto}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Saldo a pagar en cancha:</span>
                        <span className="font-medium text-amber-700">S/ {reservaDetalle.saldoPendiente}</span>
                      </div>
                      <Separator className="border-amber-200" />
                      <div className="flex justify-between font-semibold">
                        <span>Precio total:</span>
                        <span className="text-primary">S/ {reservaDetalle.precio}</span>
                      </div>
                    </div>
                  </>
                )}
                {canchaLocal && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" /><span>{canchaLocal.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 shrink-0 text-primary" />
                      <a href={`tel:${canchaLocal.phone}`} className="text-primary hover:underline">{canchaLocal.phone}</a>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog de cancelación simple */}
      <CancelarReservaSimple
        reserva={reservaCancelar}
        onClose={() => setReservaCancelar(null)}
        onConfirm={handleCancelar}
      />
    </div>
  );
}
