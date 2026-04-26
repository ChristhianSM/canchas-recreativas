'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, XCircle, Clock, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ReservaEstado = 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada';

type Reserva = {
  id: string;
  cancha_id: string;
  cancha_nombre: string;
  usuario_nombre: string;
  usuario_email: string;
  usuario_telefono: string;
  fecha: string;
  hora: string;
  precio: number;
  metodo_pago: string;
  comprobante_url: string | null;
  estado: ReservaEstado;
  creado_en: string;
  cancelado_en: string | null;
  devolucion_calculada: number | null;
  penalidad_aplicada: number | null;
  porcentaje_devolucion: number | null;
  devolucion_procesada: boolean | null;
};

function getOwnerToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_owner_token');
}

// Extrae el método de devolución desde el campo usuario_telefono
// Formatos posibles: "959686193 (plin)", "Mismo número de yape", "959686193 (yape)"
function getMetodoDevolucion(telefono: string | null, metodoPago: string): { metodo: string; label: string; esDiferente: boolean } {
  const tel = (telefono ?? '').toLowerCase();
  let metodo = metodoPago; // por defecto, el mismo método de pago

  // Buscar si el teléfono indica un método específico
  if (tel.includes('(plin)') || tel.includes('de plin') || tel.includes('mismo número de plin')) {
    metodo = 'plin';
  } else if (tel.includes('(yape)') || tel.includes('de yape') || tel.includes('mismo número de yape')) {
    metodo = 'yape';
  }

  const label = metodo === 'plin' ? 'Plin' : 'Yape';
  const esDiferente = metodo !== metodoPago;
  return { metodo, label, esDiferente };
}

// Extrae solo el número del campo usuario_telefono (sin el método entre paréntesis)
function getNumeroLimpio(telefono: string | null): string {
  if (!telefono) return '';
  // Quitar "(plin)", "(yape)", "Mismo número de X"
  return telefono.replace(/\s*\(.*?\)/g, '').replace(/mismo número de \w+/gi, '').trim();
}

export default function OwnerReservasPage() {
  const [reservas, setReservas]         = useState<Reserva[]>([]);
  const [selected, setSelected]         = useState<Reserva | null>(null);
  const [loading, setLoading]           = useState(true);
  const [procesando, setProcesando]     = useState(false);

  const reload = async () => {
    const token = getOwnerToken();
    if (!token) return;
    const res = await fetch('/api/admin-cancha/reservas', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setReservas(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const confirmar = async (id: string) => {
    const token = getOwnerToken();
    await fetch(`/api/reservas/update?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: 'confirmada' }),
    });
    setSelected(null);
    reload();
  };

  const rechazar = async (id: string) => {
    const token = getOwnerToken();
    await fetch(`/api/reservas/update?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: 'rechazada' }),
    });
    setSelected(null);
    reload();
  };

  const marcarDevolucionRealizada = async (id: string) => {
    setProcesando(true);
    const token = getOwnerToken();
    await fetch(`/api/reservas/update?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ devolucion_procesada: true }),
    });
    setProcesando(false);
    setSelected(null);
    reload();
  };

  const byEstado = (e: ReservaEstado) => reservas.filter(r => r.estado === e);

  // Solo las canceladas con devolución pendiente (monto > 0 y aún no procesada)
  const devolucionesPendientes = byEstado('cancelada').filter(
    r => (r.devolucion_calculada ?? 0) > 0 && !r.devolucion_procesada
  );

  const estadoBadge = (estado: ReservaEstado) => {
    const map = {
      pendiente:  { label: 'Pendiente',  cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      confirmada: { label: 'Confirmada', cls: 'bg-primary/10 text-primary border-primary/20' },
      rechazada:  { label: 'Rechazada',  cls: 'bg-destructive/10 text-destructive border-destructive/20' },
      cancelada:  { label: 'Cancelada',  cls: 'bg-muted text-muted-foreground' },
    };
    const s = map[estado];
    return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
  };

  const Row = ({ r }: { r: Reserva }) => (
    <tr className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(r)}>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{r.usuario_nombre}</p>
        <p className="text-xs text-muted-foreground">{r.usuario_telefono}</p>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{r.cancha_nombre}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{r.hora}</td>
      <td className="px-4 py-3 text-sm font-semibold text-primary">S/ {r.precio}</td>
      <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{r.metodo_pago}</td>
      <td className="px-4 py-3">{estadoBadge(r.estado)}</td>
      <td className="px-4 py-3">
        {r.estado === 'cancelada' && (r.devolucion_calculada ?? 0) > 0 && !r.devolucion_procesada && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
            Devolver S/ {r.devolucion_calculada}
          </span>
        )}
        {r.estado === 'cancelada' && (r.devolucion_calculada ?? 0) > 0 && r.devolucion_procesada && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            ✓ Devuelto
          </span>
        )}
        {r.estado === 'cancelada' && (r.devolucion_calculada ?? 0) === 0 && r.devolucion_calculada !== null && (
          <span className="text-xs text-muted-foreground">Sin devolución</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setSelected(r); }}>
          <Eye className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );

  const Empty = () => (
    <div className="py-12 text-center text-muted-foreground">
      <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
      <p>No hay reservas en esta categoría</p>
    </div>
  );

  const Table = ({ list }: { list: Reserva[] }) =>
    list.length === 0 ? <Empty /> : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              {['Cliente', 'Cancha', 'Fecha', 'Hora', 'Monto', 'Método', 'Estado', 'Devolución', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map(r => <Row key={r.id} r={r} />)}
          </tbody>
        </table>
      </div>
    );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservas</h1>
          <p className="text-muted-foreground">Solo las reservas de tus canchas</p>
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

      {/* Alerta de devoluciones pendientes */}
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
                      • <span className="font-medium">{r.usuario_nombre}</span> — devolver{' '}
                      <span className="font-bold">S/ {r.devolucion_calculada}</span> por{' '}
                      {(() => {
                        const { label, esDiferente } = getMetodoDevolucion(r.usuario_telefono, r.metodo_pago);
                        const numero = getNumeroLimpio(r.usuario_telefono);
                        return (
                          <>
                            <span className={esDiferente ? 'font-bold text-red-600 underline' : 'font-medium'}>
                              {label}
                            </span>
                            {esDiferente && <span className="text-red-600 text-xs ml-1">(⚠️ pagó con {r.metodo_pago})</span>}
                            {numero && <span className="text-orange-600"> al {numero}</span>}
                          </>
                        );
                      })()}
                    </p>
                    {r.cancelado_en && (
                      <p className="text-xs text-orange-500 mt-0.5 ml-3">
                        Canceló el {new Date(r.cancelado_en).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })} a las {new Date(r.cancelado_en).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-orange-400 text-orange-700 hover:bg-orange-100 text-xs"
                      onClick={() => setSelected(r)}
                    >
                      Ver detalle
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="border-border overflow-hidden">
        <Tabs defaultValue="pendiente">
          <div className="border-b border-border px-4 pt-4 pb-4">
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
              <TabsTrigger value="cancelada">
                Canceladas ({byEstado('cancelada').length})
                {devolucionesPendientes.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {devolucionesPendientes.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="todas">Todas ({reservas.length})</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="pendiente"  className="mt-0"><Table list={byEstado('pendiente')} /></TabsContent>
          <TabsContent value="confirmada" className="mt-0"><Table list={byEstado('confirmada')} /></TabsContent>
          <TabsContent value="rechazada"  className="mt-0"><Table list={byEstado('rechazada')} /></TabsContent>
          <TabsContent value="cancelada"  className="mt-0"><Table list={byEstado('cancelada')} /></TabsContent>
          <TabsContent value="todas"      className="mt-0"><Table list={reservas} /></TabsContent>
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
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium text-foreground">{selected.usuario_nombre}</p>
                  <p className="text-xs text-muted-foreground">{selected.usuario_telefono}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Cancha</p>
                  <p className="font-medium text-foreground">{selected.cancha_nombre}</p>
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
                  <p className="text-xs capitalize text-muted-foreground">{selected.metodo_pago}</p>
                </div>
              </div>

              {/* Bloque devolución — solo si está cancelada */}
              {selected.estado === 'cancelada' && (selected.devolucion_calculada ?? 0) > 0 && (
                <div className={`rounded-lg border p-4 space-y-3 ${
                  selected.devolucion_procesada
                    ? 'border-green-200 bg-green-50'
                    : 'border-orange-200 bg-orange-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Devolución al cliente</p>
                    {selected.devolucion_procesada
                      ? <Badge className="bg-green-100 text-green-700 border-green-300">✓ Realizada</Badge>
                      : <Badge className="bg-orange-100 text-orange-700 border-orange-300">Pendiente</Badge>
                    }
                  </div>

                  {selected.cancelado_en && (
                    <p className="text-xs text-muted-foreground">
                      Cancelado el {new Date(selected.cancelado_en).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })} a las {new Date(selected.cancelado_en).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {/* Resumen montos */}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Pagado</p>
                      <p className="font-bold text-foreground">S/ {selected.precio}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">A devolver</p>
                      <p className={`font-bold ${selected.devolucion_procesada ? 'text-green-600' : 'text-orange-600'}`}>
                        S/ {selected.devolucion_calculada}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Penalidad</p>
                      <p className="font-bold text-green-600">S/ {selected.penalidad_aplicada ?? selected.precio}</p>
                    </div>
                  </div>

                  {/* Instrucción o confirmación */}
                  {!selected.devolucion_procesada ? (
                    <>
                      <p className="text-xs text-orange-700 font-medium">
                        {(() => {
                          const { label, esDiferente } = getMetodoDevolucion(selected.usuario_telefono, selected.metodo_pago);
                          const numero = getNumeroLimpio(selected.usuario_telefono);
                          return (
                            <>
                              Transfiere S/ {selected.devolucion_calculada} a{' '}
                              <span className="font-bold">{selected.usuario_nombre}</span> por{' '}
                              <span className={esDiferente ? 'font-bold text-red-600 underline' : 'font-bold'}>
                                {label}
                              </span>
                              {esDiferente && (
                                <span className="ml-1 text-red-600">(⚠️ pagó con {selected.metodo_pago}, devolver por {label})</span>
                              )}
                              {numero && ` al número ${numero}`}
                            </>
                          );
                        })()}
                      </p>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => marcarDevolucionRealizada(selected.id)}
                        disabled={procesando}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {procesando ? 'Guardando...' : '✅ Ya devolví el dinero'}
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-green-700">
                      ✓ Devolución de S/ {selected.devolucion_calculada} marcada como realizada.
                    </p>
                  )}
                </div>
              )}

              {/* Sin devolución */}
              {selected.estado === 'cancelada' && (selected.devolucion_calculada ?? 0) === 0 && selected.devolucion_calculada !== null && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground">
                    Sin devolución — cancelación tardía (menos de 1 hora de anticipación)
                  </p>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Comprobante de pago</p>
                {selected.comprobante_url ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border">
                    <Image src={selected.comprobante_url} alt="Comprobante" fill className="object-contain" />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                    <p className="text-sm text-muted-foreground">Sin comprobante adjunto</p>
                  </div>
                )}
              </div>

              {selected.estado === 'pendiente' ? (
                <div className="flex gap-3">
                  <Button variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => rechazar(selected.id)}>
                    <XCircle className="mr-2 h-4 w-4" />Rechazar
                  </Button>
                  <Button className="flex-1" onClick={() => confirmar(selected.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />Confirmar
                  </Button>
                </div>
              ) : (
                selected.estado !== 'cancelada' && (
                  <div className="flex justify-center">{estadoBadge(selected.estado)}</div>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
