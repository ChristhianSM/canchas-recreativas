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

  return (
    <Card className="overflow-hidden border-border">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-video w-full sm:aspect-square sm:w-40 shrink-0">
          <Image src={imagen} alt={r.canchaName} fill className="object-cover" />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <Badge variant="outline" className={estadoClass[r.estado]}>
                {estadoLabel[r.estado]}
              </Badge>
              <h3 className="mt-2 font-semibold text-foreground">{r.canchaName}</h3>
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
              <span>{r.hora}</span>
            </div>
            {direccion && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{direccion}</span>
              </div>
            )}
          </div>

          {(r.estado === 'pendiente' || r.estado === 'confirmada') && (
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onDetalle(r)}>
                Ver detalles
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onCancelar(r)}>
                Cancelar
              </Button>
            </div>
          )}
          {(r.estado === 'rechazada' || r.estado === 'cancelada') && (
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
    proximas:  { icon: <Calendar className="h-8 w-8 text-muted-foreground" />, title: 'No tienes reservas próximas',    desc: 'Explora nuestras canchas y haz tu primera reserva', action: true },
    historial: { icon: <Calendar className="h-8 w-8 text-muted-foreground" />, title: 'No tienes reservas en historial', desc: 'Aquí aparecerán tus reservas canceladas o rechazadas', action: false },
    favorites: { icon: <Heart    className="h-8 w-8 text-muted-foreground" />, title: 'No tienes canchas favoritas',     desc: 'Toca el corazón en la página de cada cancha para guardarla', action: true },
  }[type];
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">{cfg.icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{cfg.title}</h3>
      <p className="mb-6 text-muted-foreground">{cfg.desc}</p>
      {cfg.action && (
        <Button asChild>
          <Link href="/canchas"><CalendarPlus className="mr-2 h-4 w-4" />Explorar canchas</Link>
        </Button>
      )}
    </div>
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

  // Reservas filtradas por estado
  const proximas   = reservas.filter(r => r.estado === 'pendiente' || r.estado === 'confirmada');
  const historial  = reservas.filter(r => r.estado === 'rechazada' || r.estado === 'cancelada');

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
            {user?.name ? `Hola, ${user.name.split(' ')[0]} 👋` : 'Mis Reservas'}
          </h1>
          <p className="text-muted-foreground">
            {user ? 'Gestiona tus reservas, favoritas y sellos' : 'Revisa tus reservas realizadas'}
          </p>
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
            <TabsList className="mb-6 w-full sm:w-auto">
              <TabsTrigger value="proximas"  className="flex-1 sm:flex-none">Próximas ({proximas.length})</TabsTrigger>
              <TabsTrigger value="historial" className="flex-1 sm:flex-none">Historial ({historial.length})</TabsTrigger>
              <TabsTrigger value="favorites" className="flex-1 sm:flex-none">Favoritas ({favoriteCanchas.length})</TabsTrigger>
              <TabsTrigger value="loyalty"   className="flex-1 sm:flex-none">
                <Stamp className="mr-1.5 h-4 w-4" />Mis Sellos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="proximas">
              {proximas.length > 0
                ? <div className="space-y-4">{proximas.map(r => <ReservaCard key={r.id} r={r} onDetalle={setReservaDetalle} onCancelar={setReservaCancelar} />)}</div>
                : <EmptyState type="proximas" />}
            </TabsContent>

            <TabsContent value="historial">
              {historial.length > 0
                ? <div className="space-y-4">{historial.map(r => <ReservaCard key={r.id} r={r} onDetalle={setReservaDetalle} onCancelar={setReservaCancelar} />)}</div>
                : <EmptyState type="historial" />}
            </TabsContent>

            <TabsContent value="favorites">
              {favoriteCanchas.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {favoriteCanchas.map(cancha => (
                    <Card key={cancha.id} className="overflow-hidden border-border">
                      <div className="relative aspect-video">
                        <Image src={cancha.images[0]} alt={cancha.name} fill className="object-cover" />
                        <button onClick={() => handleRemoveFavorite(cancha.id)}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-destructive shadow hover:bg-card">
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

            <TabsContent value="loyalty">
              <div className="max-w-lg">
                <LoyaltyCard loyalty={loyalty} onUpdate={refreshLoyalty} />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* ── Sin sesión: solo reservas ── */
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Crea una cuenta para más beneficios</p>
                  <p className="mt-1 text-sm text-muted-foreground">Guarda favoritas, acumula sellos y obtén descuentos.</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" asChild><Link href="/registro">Registrarse</Link></Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/login"><LogIn className="mr-1.5 h-4 w-4" />Iniciar sesión</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Tabs defaultValue="proximas" className="w-full">
              <TabsList className="mb-6 w-full sm:w-auto">
                <TabsTrigger value="proximas"  className="flex-1 sm:flex-none">Próximas ({proximas.length})</TabsTrigger>
                <TabsTrigger value="historial" className="flex-1 sm:flex-none">Historial ({historial.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="proximas">
                {proximas.length > 0
                  ? <div className="space-y-4">{proximas.map(r => <ReservaCard key={r.id} r={r} onDetalle={setReservaDetalle} onCancelar={setReservaCancelar} />)}</div>
                  : <EmptyState type="proximas" />}
              </TabsContent>
              <TabsContent value="historial">
                {historial.length > 0
                  ? <div className="space-y-4">{historial.map(r => <ReservaCard key={r.id} r={r} onDetalle={setReservaDetalle} onCancelar={setReservaCancelar} />)}</div>
                  : <EmptyState type="historial" />}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">CP</span>
              </div>
              <span className="font-semibold text-foreground">CanchaPiura</span>
            </div>
            <p className="text-sm text-muted-foreground">&copy; 2024 CanchaPiura. Todos los derechos reservados.</p>
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
