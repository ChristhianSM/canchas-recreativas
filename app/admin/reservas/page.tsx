'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, XCircle, Clock, Eye, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Reserva } from '@/lib/store';

export default function AdminReservasPage() {
  const [reservas, setReservas]     = useState<Reserva[]>([]);
  const [selected, setSelected]     = useState<Reserva | null>(null);
  const [filtroModoPago, setFiltroModoPago] = useState<'todos' | 'completo' | 'parcial'>('todos');

  const getAdminToken = () => localStorage.getItem('cp_admin_token');

  const reload = () => {
    fetch('/api/reservas/all').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setReservas(data.map((r: any) => ({
        id: r.id, canchaId: r.cancha_id, canchaName: r.cancha_nombre,
        usuarioNombre: r.usuario_nombre, usuarioEmail: r.usuario_email,
        usuarioPhone: r.usuario_telefono, fecha: r.fecha, hora: r.hora,
        precio: r.precio, metodoPago: r.metodo_pago, comprobante: r.comprobante_url,
        estado: r.estado, creadaEn: r.creado_en, notificado: true,
        modoPago: r.modo_pago ?? 'completo',
        montoAdelanto: r.monto_adelanto,
        saldoPendiente: r.saldo_pendiente ?? 0,
      })));
    });
  };
  useEffect(() => { reload(); }, []);

  const confirmar = async (id: string) => {
    await fetch(`/api/admin/reservas/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAdminToken()}`,
      },
      body: JSON.stringify({ estado: 'confirmada' }),
    });
    setSelected(null);
    reload();
  };

  const rechazar = async (id: string) => {
    await fetch(`/api/admin/reservas/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAdminToken()}`,
      },
      body: JSON.stringify({ estado: 'rechazada' }),
    });
    setSelected(null);
    reload();
  };

  const byEstado = (estado: Reserva['estado']) => {
    let filtered = reservas.filter(r => r.estado === estado);
    if (filtroModoPago !== 'todos') {
      filtered = filtered.filter(r => (r.modoPago ?? 'completo') === filtroModoPago);
    }
    return filtered;
  };

  const allFiltered = () => {
    if (filtroModoPago === 'todos') return reservas;
    return reservas.filter(r => (r.modoPago ?? 'completo') === filtroModoPago);
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
              {['Usuario', 'Cancha', 'Fecha', 'Hora', 'Monto', 'Modo', 'Método', 'Estado', ''].map(h => (
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservas</h1>
          <p className="text-muted-foreground">Gestiona y confirma los pagos de tus clientes</p>
        </div>
        {byEstado('pendiente').length > 0 && (
          <Badge className="bg-yellow-500 text-white text-sm px-3 py-1">
            {byEstado('pendiente').length} pendiente{byEstado('pendiente').length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <Card className="border-border overflow-hidden">
        <Tabs defaultValue="pendiente">
          <div className="border-b border-border px-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <TabsList>
                <TabsTrigger value="pendiente">
                  Pendientes
                  {byEstado('pendiente').length > 0 && (
                    <span className="ml-1.5 rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {byEstado('pendiente').length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="confirmada">Confirmadas ({byEstado('confirmada').length})</TabsTrigger>
                <TabsTrigger value="rechazada">Rechazadas ({byEstado('rechazada').length})</TabsTrigger>
                <TabsTrigger value="todas">Todas ({allFiltered().length})</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filtroModoPago}
                  onChange={(e) => setFiltroModoPago(e.target.value as 'todos' | 'completo' | 'parcial')}
                  className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="todos">Todos los pagos</option>
                  <option value="completo">Pago completo</option>
                  <option value="parcial">Pago parcial</option>
                </select>
              </div>
            </div>
          </div>
          <TabsContent value="pendiente"  className="mt-0"><Table list={byEstado('pendiente')} /></TabsContent>
          <TabsContent value="confirmada" className="mt-0"><Table list={byEstado('confirmada')} /></TabsContent>
          <TabsContent value="rechazada"  className="mt-0"><Table list={byEstado('rechazada')} /></TabsContent>
          <TabsContent value="todas"      className="mt-0"><Table list={allFiltered()} /></TabsContent>
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
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar
                  </Button>
                  <Button className="flex-1" onClick={() => confirmar(selected.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmar
                  </Button>
                </div>
              )}
              {selected.estado !== 'pendiente' && (
                <div className="flex justify-center">
                  {estadoBadge(selected.estado)}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
