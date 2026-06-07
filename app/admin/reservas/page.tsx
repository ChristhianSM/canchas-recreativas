'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { CheckCircle2, XCircle, Clock, Eye, Search, X, CalendarDays, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Reserva } from '@/lib/store';
import { getAdminTokenFresh } from '@/lib/supabase-browser';

export default function AdminReservasPage() {
  const [reservas, setReservas]     = useState<Reserva[]>([]);
  const [selected, setSelected]     = useState<Reserva | null>(null);
  const [filtroModoPago, setFiltroModoPago] = useState<'todos' | 'completo' | 'parcial'>('todos');
  const [filtroFecha, setFiltroFecha]       = useState('');
  const [filtroEmail, setFiltroEmail]       = useState('');
  const [filtroCancha, setFiltroCancha]     = useState('');
  const [loading, setLoading]       = useState(true);
  const [accion, setAccion]         = useState<'confirmando' | 'rechazando' | 'cancelando' | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [counts, setCounts]         = useState<Record<string, number>>({});
  const LIMIT = 50;

  const cancharUnicas = useMemo(() =>
    [...new Set(reservas.map(r => r.canchaName).filter(Boolean))].sort(),
    [reservas],
  );

  const hayFiltrosActivos = filtroFecha || filtroEmail || filtroCancha || filtroModoPago !== 'todos';

  const aplicarFiltros = (lista: Reserva[]) => {
    return lista.filter(r => {
      if (filtroFecha   && r.fecha !== filtroFecha) return false;
      if (filtroEmail   && !r.usuarioEmail?.toLowerCase().includes(filtroEmail.toLowerCase())) return false;
      if (filtroCancha  && r.canchaName !== filtroCancha) return false;
      if (filtroModoPago !== 'todos' && (r.modoPago ?? 'completo') !== filtroModoPago) return false;
      return true;
    });
  };

  const limpiarFiltros = () => {
    setFiltroFecha('');
    setFiltroEmail('');
    setFiltroCancha('');
    setFiltroModoPago('todos');
  };

  const getAdminToken = getAdminTokenFresh;

  const mapRow = (r: any): Reserva => ({
    id: r.id, canchaId: r.cancha_id, canchaName: r.cancha_nombre,
    usuarioNombre: r.usuario_nombre, usuarioEmail: r.usuario_email,
    usuarioPhone: r.usuario_telefono, fecha: r.fecha, hora: r.hora,
    precio: r.precio, metodoPago: r.metodo_pago, comprobante: r.comprobante_url,
    estado: r.estado, creadaEn: r.creado_en, notificado: true,
    modoPago: r.modo_pago ?? 'completo',
    montoAdelanto: r.monto_adelanto,
    saldoPendiente: r.saldo_pendiente ?? 0,
    canceladoEn: r.cancelado_en ?? null,
    devolucionCalculada: r.devolucion_calculada ?? null,
    devolucionProcesada: r.devolucion_procesada ?? null,
    penalidadAplicada: r.penalidad_aplicada ?? null,
  });

  const reload = async (showLoading = false, targetPage = page) => {
    if (showLoading) setLoading(true);
    const token = await getAdminToken();
    const r = await fetch(
      `/api/reservas/all?page=${targetPage}&limit=${LIMIT}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await r.json();
    if (json?.data) {
      setReservas(json.data.map(mapRow));
      setTotal(json.total ?? 0);
      setCounts(json.counts ?? {});
    }
    setLoading(false);
  };

  useEffect(() => { reload(true, 1); }, []);

  const goToPage = (p: number) => {
    setPage(p);
    reload(false, p);
  };

  const confirmar = async (id: string) => {
    setAccion('confirmando');
    const token = await getAdminToken();
    const res = await fetch(`/api/admin/reservas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ estado: 'confirmada' }),
    });
    if (res.ok) {
      setReservas(prev => prev.map(r => r.id === id ? { ...r, estado: 'confirmada' as const } : r));
      setSelected(null);
    }
    setAccion(null);
    reload(false, page);
  };

  const rechazar = async (id: string) => {
    setAccion('rechazando');
    const token = await getAdminToken();
    const res = await fetch(`/api/admin/reservas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ estado: 'rechazada' }),
    });
    if (res.ok) {
      setReservas(prev => prev.map(r => r.id === id ? { ...r, estado: 'rechazada' as const } : r));
      setSelected(null);
    }
    setAccion(null);
    reload(false, page);
  };

  const cancelar = async (id: string) => {
    if (!confirm('¿Cancelar esta reserva? El usuario recibirá una notificación.')) return;
    setAccion('cancelando');
    const token = await getAdminToken();
    const res = await fetch('/api/admin/reservas/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reservaId: id }),
    });
    if (res.ok) {
      setReservas(prev => prev.map(r => r.id === id ? { ...r, estado: 'cancelada' as const } : r));
      setSelected(null);
    }
    setAccion(null);
    reload(false, page);
  };

  // Contenido de la tab: filtro local sobre la página actual
  const byEstado = (estado: Reserva['estado']) =>
    aplicarFiltros(reservas.filter(r => r.estado === estado));

  // Badge de la tab: conteo global del servidor (preciso aunque haya más páginas)
  const countEstado = (estado: string) => counts[estado] ?? 0;

  const allFiltered = () => aplicarFiltros(reservas);

  const totalPages = Math.ceil(total / LIMIT);

  const devolucionesPendientes = reservas.filter(
    r => r.estado === 'cancelada' && (r.devolucionCalculada ?? 0) > 0 && !r.devolucionProcesada
  );

  const marcarDevolucion = async (id: string) => {
    setProcesando(true);
    const token = await getAdminToken();
    const res = await fetch(`/api/admin/reservas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ devolucion_procesada: true }),
    });
    if (res.ok) {
      setReservas(prev => prev.map(r => r.id === id ? { ...r, devolucionProcesada: true } : r));
      setSelected(null);
    }
    setProcesando(false);
    reload(false, page);
  };

  const modoPagoBadge = (modoPago: 'completo' | 'parcial') => {
    if (modoPago === 'parcial') {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Parcial</Badge>;
    }
    return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Completo</Badge>;
  };

  const estadoBadge = (estado: Reserva['estado']) => {
    const map = {
      pendiente:  'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      confirmada: 'bg-primary/10 text-primary border-primary/20',
      rechazada:  'bg-destructive/10 text-destructive border-destructive/20',
      cancelada:  'bg-muted text-muted-foreground',
    };
    const labels = { pendiente: 'Pendiente', confirmada: 'Confirmada', rechazada: 'Rechazada', cancelada: 'Cancelada' };
    return <Badge variant="outline" className={map[estado]}>{labels[estado]}</Badge>;
  };

  const ReservaRow = ({ r }: { r: Reserva }) => (
    <tr className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(r)}>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{r.usuarioNombre}</p>
        <p className="text-xs text-muted-foreground">{r.usuarioEmail}</p>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{r.canchaName}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{r.hora}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {new Date(r.creadaEn).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
        <span className="block text-xs">{new Date(r.creadaEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-primary">S/ {r.precio}</td>
      <td className="px-4 py-3">{modoPagoBadge(r.modoPago ?? 'completo')}</td>
      <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{r.metodoPago}</td>
      <td className="px-4 py-3">{estadoBadge(r.estado)}</td>
      <td className="px-4 py-3">
        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setSelected(r); }}>
          <Eye className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );

  const EmptyTab = () => (
    <div className="py-12 text-center text-muted-foreground">
      <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
      <p>No hay reservas en esta categoría</p>
    </div>
  );

  const Table = ({ list }: { list: Reserva[] }) => (
    list.length === 0 ? <EmptyTab /> : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              {['Usuario', 'Cancha', 'Fecha juego', 'Hora', 'Reservado', 'Monto', 'Modo', 'Método', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map(r => <ReservaRow key={r.id} r={r} />)}
          </tbody>
        </table>
      </div>
    )
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        <Card className="border-border overflow-hidden">
          <div className="border-b border-border px-4 pt-4 pb-3">
            <div className="h-9 w-80 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservas</h1>
          <p className="text-muted-foreground">Gestiona y confirma los pagos de tus clientes</p>
        </div>
        <div className="flex gap-2">
          {byEstado('pendiente').length > 0 && (
            <Badge className="bg-yellow-500 text-white text-sm px-3 py-1">
              {byEstado('pendiente').length} pendiente{byEstado('pendiente').length > 1 ? 's' : ''}
            </Badge>
          )}
          {devolucionesPendientes.length > 0 && (
            <Badge className="bg-orange-500 text-white text-sm px-3 py-1">
              {devolucionesPendientes.length} devolución{devolucionesPendientes.length > 1 ? 'es' : ''} pendiente{devolucionesPendientes.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {devolucionesPendientes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-orange-800">
                {devolucionesPendientes.length} devolución{devolucionesPendientes.length > 1 ? 'es' : ''} pendiente{devolucionesPendientes.length > 1 ? 's' : ''} de procesar
              </p>
              <div className="mt-2 space-y-2">
                {devolucionesPendientes.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3">
                    <p className="text-sm text-orange-700">
                      • <span className="font-medium">{r.usuarioNombre}</span> — devolver{' '}
                      <span className="font-bold">S/ {r.devolucionCalculada}</span> · {r.canchaName}
                    </p>
                    <button
                      className="shrink-0 text-xs font-medium text-orange-700 underline hover:text-orange-900"
                      onClick={() => setSelected(r)}
                    >
                      Ver detalle
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filtros */}
      <Card className="border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Filtros</p>
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <X className="h-3 w-3" />
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Fecha */}
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* Correo */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por correo..."
              value={filtroEmail}
              onChange={e => setFiltroEmail(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Cancha */}
          <select
            value={filtroCancha}
            onChange={e => setFiltroCancha(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todas las canchas</option>
            {cancharUnicas.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {/* Modo de pago */}
          <select
            value={filtroModoPago}
            onChange={e => setFiltroModoPago(e.target.value as 'todos' | 'completo' | 'parcial')}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="todos">Modo de pago</option>
            <option value="completo">Completo</option>
            <option value="parcial">Parcial</option>
          </select>
        </div>
      </Card>

      <Card className="border-border overflow-hidden">
        <Tabs defaultValue="pendiente">
          <div className="border-b border-border px-4 pt-4">
            <div className="overflow-x-auto mb-3">
              <TabsList className="w-max">
                <TabsTrigger value="pendiente">
                  Pendientes
                  {countEstado('pendiente') > 0 && (
                    <span className="ml-1.5 rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {countEstado('pendiente')}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="confirmada">Confirmadas ({countEstado('confirmada')})</TabsTrigger>
                <TabsTrigger value="rechazada">Rechazadas ({countEstado('rechazada')})</TabsTrigger>
                <TabsTrigger value="cancelada">
                  Canceladas ({countEstado('cancelada')})
                  {devolucionesPendientes.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {devolucionesPendientes.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="todas">Todas ({total})</TabsTrigger>
              </TabsList>
            </div>
          </div>
          <TabsContent value="pendiente"  className="mt-0"><Table list={byEstado('pendiente')} /></TabsContent>
          <TabsContent value="confirmada" className="mt-0"><Table list={byEstado('confirmada')} /></TabsContent>
          <TabsContent value="rechazada"  className="mt-0"><Table list={byEstado('rechazada')} /></TabsContent>
          <TabsContent value="cancelada"  className="mt-0"><Table list={byEstado('cancelada')} /></TabsContent>
          <TabsContent value="todas"      className="mt-0"><Table list={allFiltered()} /></TabsContent>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages} · {total} reservas en total
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1
                    : page <= 3 ? i + 1
                    : page >= totalPages - 2 ? totalPages - 4 + i
                    : page - 2 + i;
                  return (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      className="h-8 w-8 text-xs"
                      size="icon"
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline" size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Tabs>
      </Card>

      {/* Modal detalle */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de reserva</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Usuario</p>
                  <p className="font-medium text-foreground">{selected.usuarioNombre}</p>
                  <p className="text-xs text-muted-foreground">{selected.usuarioPhone}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Cancha</p>
                  <p className="font-medium text-foreground">{selected.canchaName}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Fecha y hora</p>
                  <p className="font-medium text-foreground">
                    {new Date(selected.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-muted-foreground">{selected.hora}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <p className="font-bold text-primary">S/ {selected.precio}</p>
                  <p className="text-xs capitalize text-muted-foreground">{selected.metodoPago}</p>
                </div>
              </div>

              {/* Desglose de pago parcial */}
              {selected.modoPago === 'parcial' && (
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {modoPagoBadge('parcial')}
                    <p className="text-sm font-medium text-foreground">Desglose de pago</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adelanto cobrado online:</span>
                      <span className="font-semibold text-green-600">S/ {selected.montoAdelanto}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo pendiente en cancha:</span>
                      <span className="font-semibold text-orange-600">S/ {selected.saldoPendiente}</span>
                    </div>
                    <div className="border-t border-orange-500/20 pt-2 flex justify-between">
                      <span className="font-medium text-foreground">Pago total:</span>
                      <span className="font-bold text-primary">S/ {selected.precio}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Comprobante */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Comprobante de pago</p>
                {selected.comprobante ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border">
                    <Image src={selected.comprobante} alt="Comprobante" fill className="object-contain" />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                    <p className="text-sm text-muted-foreground">Sin comprobante adjunto</p>
                  </div>
                )}
              </div>

              {/* Acciones */}
              {selected.estado === 'pendiente' && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => rechazar(selected.id)}
                    disabled={accion !== null}
                  >
                    {accion === 'rechazando'
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <XCircle className="mr-2 h-4 w-4" />}
                    {accion === 'rechazando' ? 'Rechazando...' : 'Rechazar'}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => confirmar(selected.id)}
                    disabled={accion !== null}
                  >
                    {accion === 'confirmando'
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {accion === 'confirmando' ? 'Confirmando...' : 'Confirmar'}
                  </Button>
                </div>
              )}
              {selected.estado === 'confirmada' && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex justify-center">{estadoBadge(selected.estado)}</div>
                  {new Date(`${selected.fecha}T${selected.hora}`) > new Date() && (
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => cancelar(selected.id)}
                      disabled={accion !== null}
                    >
                      {accion === 'cancelando'
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <XCircle className="mr-2 h-4 w-4" />}
                      {accion === 'cancelando' ? 'Cancelando...' : 'Cancelar reserva'}
                    </Button>
                  )}
                </div>
              )}
              {selected.estado === 'rechazada' && (
                <div className="flex justify-center">
                  {estadoBadge(selected.estado)}
                </div>
              )}

              {selected.estado === 'cancelada' && (selected.devolucionCalculada ?? 0) > 0 && (
                <div className={`rounded-lg border p-4 space-y-3 ${selected.devolucionProcesada ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Devolución al cliente</p>
                    {selected.devolucionProcesada
                      ? <Badge className="bg-green-100 text-green-700 border-green-300">✓ Realizada</Badge>
                      : <Badge className="bg-orange-100 text-orange-700 border-orange-300">Pendiente</Badge>
                    }
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Pagado</p>
                      <p className="font-bold text-foreground">S/ {selected.precio}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">A devolver</p>
                      <p className={`font-bold ${selected.devolucionProcesada ? 'text-green-600' : 'text-orange-600'}`}>
                        S/ {selected.devolucionCalculada}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Penalidad</p>
                      <p className="font-bold text-foreground">S/ {selected.penalidadAplicada ?? 0}</p>
                    </div>
                  </div>
                  {!selected.devolucionProcesada ? (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => marcarDevolucion(selected.id)}
                      disabled={procesando}
                    >
                      {procesando
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                        : <><CheckCircle2 className="mr-2 h-4 w-4" />✅ Marcar devolución como realizada</>
                      }
                    </Button>
                  ) : (
                    <p className="text-xs text-green-700">✓ Devolución de S/ {selected.devolucionCalculada} marcada como realizada.</p>
                  )}
                </div>
              )}

              {selected.estado === 'cancelada' && (selected.devolucionCalculada ?? 0) === 0 && selected.devolucionCalculada !== null && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground">Sin devolución — cancelación tardía.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
