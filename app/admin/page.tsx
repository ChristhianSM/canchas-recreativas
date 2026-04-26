'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReservasAnalytics from '@/components/reservas-analytics';
import { type Reserva } from '@/lib/store';
import { canchas } from '@/lib/data';

export default function AdminDashboard() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [rawReservas, setRawReservas] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/reservas/all').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setRawReservas(data);
        setReservas(data.map((r: any) => ({
          id: r.id, canchaId: r.cancha_id, canchaName: r.cancha_nombre,
          usuarioNombre: r.usuario_nombre, usuarioEmail: r.usuario_email,
          usuarioPhone: r.usuario_telefono, fecha: r.fecha, hora: r.hora,
          precio: r.precio, metodoPago: r.metodo_pago, comprobante: r.comprobante_url,
          estado: r.estado, creadaEn: r.creado_en, notificado: true,
        })));
      }
    });
  }, []);

  const pendientes  = reservas.filter(r => r.estado === 'pendiente').length;
  const confirmadas = reservas.filter(r => r.estado === 'confirmada').length;
  const rechazadas  = reservas.filter(r => r.estado === 'rechazada').length;
  const ingresos    = reservas.filter(r => r.estado === 'confirmada').reduce((s, r) => s + r.precio, 0);

  const stats = [
    { label: 'Pendientes',  value: pendientes,  icon: Clock,         color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'Confirmadas', value: confirmadas, icon: CheckCircle2,  color: 'text-primary',    bg: 'bg-primary/10' },
    { label: 'Rechazadas',  value: rechazadas,  icon: XCircle,       color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Ingresos',    value: `S/ ${ingresos}`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  const recientes = reservas.slice(0, 5);

  const estadoBadge = (estado: Reserva['estado']) => {
    const map = {
      pendiente:  { label: 'Pendiente',  class: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      confirmada: { label: 'Confirmada', class: 'bg-primary/10 text-primary border-primary/20' },
      rechazada:  { label: 'Rechazada',  class: 'bg-destructive/10 text-destructive border-destructive/20' },
      cancelada:  { label: 'Cancelada',  class: 'bg-muted text-muted-foreground' },
    };
    const s = map[estado];
    return <Badge variant="outline" className={s.class}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general de tu negocio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label} className="border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Canchas */}
      <div>
        <h2 className="mb-3 font-semibold text-foreground">Tus canchas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {canchas.slice(0, 3).map(c => (
            <Card key={c.id} className="flex items-center gap-3 border-border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl">
                {c.type === 'futbol' ? '⚽' : c.type === 'voley' ? '🏐' : c.type === 'basquet' ? '🏀' : c.type === 'tenis' ? '🎾' : '⚽'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.district} · S/ {c.pricePerHour}/h</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Reservas recientes */}
      <div>
        <h2 className="mb-3 font-semibold text-foreground">Reservas recientes</h2>
        {recientes.length === 0 ? (
          <Card className="border-border p-8 text-center">
            <CalendarCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Aún no hay reservas. Comparte el link de pago con tus clientes.</p>
          </Card>
        ) : (
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    {['Usuario', 'Cancha', 'Fecha', 'Hora', 'Monto', 'Estado'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recientes.map(r => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{r.usuarioNombre}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.canchaName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.hora}</td>
                      <td className="px-4 py-3 font-semibold text-primary">S/ {r.precio}</td>
                      <td className="px-4 py-3">{estadoBadge(r.estado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Analytics */}
      <ReservasAnalytics reservas={rawReservas} />
    </div>
  );
}
