'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CalendarCheck, Clock, CheckCircle2, TrendingUp, ChevronRight, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sportLabels } from '@/lib/types';

type Reserva = {
  id: string; cancha_id: string; cancha_nombre: string;
  usuario_nombre: string; fecha: string; hora: string;
  precio: number; estado: 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada';
};

type Cancha = {
  id: string; nombre: string; tipo: string; direccion: string;
  imagenes: string[]; rating: number; precio_por_hora: number;
};

function getOwnerToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_owner_token');
}
function getOwnerUser() {
  if (typeof window === 'undefined') return null;
  const d = localStorage.getItem('cp_owner_user');
  return d ? JSON.parse(d) : null;
}

const estadoBadge = (estado: Reserva['estado']) => {
  const map = {
    pendiente:  { label: 'Pendiente',  cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    confirmada: { label: 'Confirmada', cls: 'bg-primary/10 text-primary border-primary/20' },
    rechazada:  { label: 'Rechazada',  cls: 'bg-destructive/10 text-destructive border-destructive/20' },
    cancelada:  { label: 'Cancelada',  cls: 'bg-muted text-muted-foreground' },
  };
  const s = map[estado];
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
};

export default function OwnerDashboard() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [canchas, setCanchas]   = useState<Cancha[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const token = getOwnerToken();
    const user  = getOwnerUser();
    if (!token) return;
    if (user) setOwnerName(user.nombre?.split(' ')[0] ?? '');

    Promise.all([
      fetch('/api/admin-cancha/reservas', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/admin-cancha/canchas',  { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([res, can]) => {
      setReservas(Array.isArray(res) ? res : []);
      setCanchas(Array.isArray(can) ? can : []);
      setLoading(false);
    });
  }, []);

  const pendientes  = reservas.filter(r => r.estado === 'pendiente').length;
  const confirmadas = reservas.filter(r => r.estado === 'confirmada').length;
  const ingresos    = reservas.filter(r => r.estado === 'confirmada').reduce((s, r) => s + r.precio, 0);
  const recientes   = reservas.slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {ownerName ? `Hola, ${ownerName} 👋` : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground">Resumen de tus canchas hoy</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[
          { label: 'Pendientes de confirmar', value: pendientes,       icon: Clock,        color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { label: 'Reservas confirmadas',    value: confirmadas,      icon: CheckCircle2, color: 'text-primary',    bg: 'bg-primary/10'    },
          { label: 'Ingresos confirmados',    value: `S/ ${ingresos}`, icon: TrendingUp,   color: 'text-primary',    bg: 'bg-primary/10'    },
        ].map(s => (
          <Link key={s.label} href="/admin-cancha/reservas">
            <Card className="border-border p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Mis canchas */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Mis canchas</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin-cancha/canchas" className="gap-1 text-primary">
              Ver todas <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map(i => <Card key={i} className="h-24 animate-pulse bg-muted border-border" />)}
          </div>
        ) : canchas.length === 0 ? (
          <Card className="border-border p-8 text-center">
            <p className="text-muted-foreground">No tienes canchas asignadas.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {canchas.map(c => {
              const reservasCancha = reservas.filter(r => r.cancha_id === c.id);
              return (
                <Card key={c.id} className="flex items-center gap-4 border-border p-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                    {c.imagenes?.[0] && (
                      <Image src={c.imagenes[0]} alt={c.nombre} fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-foreground">{c.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        <span className="text-xs text-muted-foreground">{c.rating}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{reservasCancha.length} reservas</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin-cancha/canchas/${c.id}`}>Editar</Link>
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Reservas recientes */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Reservas recientes</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin-cancha/reservas" className="gap-1 text-primary">
              Ver todas <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {recientes.length === 0 ? (
          <Card className="border-border p-8 text-center">
            <CalendarCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Aún no tienes reservas.</p>
          </Card>
        ) : (
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    {['Cliente', 'Cancha', 'Fecha', 'Hora', 'Monto', 'Estado'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recientes.map(r => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{r.usuario_nombre}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.cancha_nombre}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                      </td>
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
    </div>
  );
}
