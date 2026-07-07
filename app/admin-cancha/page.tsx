'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CalendarCheck, Clock, CheckCircle2, TrendingUp,
  ChevronRight, ChevronLeft, Star,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ReservasAnalytics from '@/components/reservas-analytics';
import { ownerFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  estaBloquedoPor, HORAS_APP, getHorasOperacion, type BloqueoAdmin,
} from '@/lib/bloqueos-utils';

type Reserva = {
  id: string; cancha_id: string; cancha_nombre: string;
  usuario_nombre: string; fecha: string; hora: string;
  precio: number; estado: 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada';
  seccion_id?: string | null;
  seccion?: { nombre: string } | null;
  grupo_reserva_id?: string | null;
};

type Cancha = {
  id: string; nombre: string; tipo: string; direccion: string;
  imagenes: string[]; rating: number; precio_por_hora: number;
  hora_apertura: string; hora_cierre: string;
};

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getLunes(base = new Date()): Date {
  const d = new Date(base);
  const dia = d.getDay();
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia));
  d.setHours(0, 0, 0, 0);
  return d;
}

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
  const [reservas,    setReservas]    = useState<Reserva[]>([]);
  const [rawReservas, setRawReservas] = useState<any[]>([]);
  const [canchas,     setCanchas]     = useState<Cancha[]>([]);
  const [ownerName,   setOwnerName]   = useState('');
  const [loading,     setLoading]     = useState(true);

  // ── Calendario ──────────────────────────────────────────────────
  const [canchaActiva,     setCanchaActiva]     = useState<string | null>(null);
  const [bloqueos,         setBloqueos]         = useState<BloqueoAdmin[]>([]);
  const [secciones,        setSecciones]        = useState<{ id: string; nombre: string }[]>([]);
  const [seccionActiva,    setSeccionActiva]    = useState<string | null>(null);
  const [semana,           setSemana]           = useState<Date>(getLunes);
  const [loadingCalendar,  setLoadingCalendar]  = useState(false);

  // Carga inicial
  useEffect(() => {
    const user = getOwnerUser();
    if (user) setOwnerName(user.nombre?.split(' ')[0] ?? '');

    Promise.all([
      ownerFetch('/api/admin-cancha/reservas').then(r => r.json()),
      ownerFetch('/api/admin-cancha/canchas').then(r => r.json()),
    ]).then(([res, can]) => {
      const resArr = Array.isArray(res) ? res : [];
      const canArr = Array.isArray(can) ? can : [];
      setRawReservas(resArr);
      setReservas(resArr);
      setCanchas(canArr);
      if (canArr.length > 0) setCanchaActiva(canArr[0].id);
      setLoading(false);
    });
  }, []);

  // Recarga bloqueos y secciones al cambiar de cancha activa
  useEffect(() => {
    if (!canchaActiva) return;
    setLoadingCalendar(true);
    setSeccionActiva(null);
    Promise.all([
      ownerFetch(`/api/admin-cancha/bloqueos?canchaId=${canchaActiva}`).then(r => r.json()),
      ownerFetch(`/api/admin-cancha/secciones?canchaId=${canchaActiva}`).then(r => r.json()),
    ]).then(([bloq, sec]) => {
      setBloqueos(Array.isArray(bloq) ? bloq : []);
      setSecciones(Array.isArray(sec) ? sec.filter((s: any) => s.activa) : []);
      setLoadingCalendar(false);
    }).catch(() => setLoadingCalendar(false));
  }, [canchaActiva]);

  // ── Deduplicar reservas multi-hora ─────────────────────────────
  // Una reserva de 3 horas crea 3 filas vinculadas por grupo_reserva_id.
  // Solo contamos/mostramos el principal (id === grupo_reserva_id) o las de 1 hora.
  const reservasUnicas = useMemo(() => {
    return reservas.filter(r =>
      !r.grupo_reserva_id || r.id === r.grupo_reserva_id
    );
  }, [reservas]);

  // ── Stats ───────────────────────────────────────────────────────
  const pendientes  = reservasUnicas.filter(r => r.estado === 'pendiente').length;
  const confirmadas = reservasUnicas.filter(r => r.estado === 'confirmada').length;
  const ingresos    = reservasUnicas.filter(r => r.estado === 'confirmada').reduce((s, r) => s + r.precio, 0);
  const recientes   = reservasUnicas.slice(0, 4);

  // Hora fin para reservas multi-hora (grupo_reserva_id → "HH:00")
  const horaFinPorGrupo = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reservas) {
      if (!r.grupo_reserva_id) continue;
      if (map.has(r.grupo_reserva_id)) continue;
      const slots = reservas.filter(x => x.grupo_reserva_id === r.grupo_reserva_id);
      const horas = slots.map(x => x.hora).sort();
      const h = parseInt(horas[horas.length - 1].split(':')[0]) + 1;
      map.set(r.grupo_reserva_id, `${String(h).padStart(2, '0')}:00`);
    }
    return map;
  }, [reservas]);

  // ── Calendario helpers ──────────────────────────────────────────
  const canchaActivaData = useMemo(
    () => canchas.find(c => c.id === canchaActiva),
    [canchas, canchaActiva],
  );

  const horasOperacion = useMemo(
    () => canchaActivaData
      ? getHorasOperacion(canchaActivaData.hora_apertura ?? '06:00', canchaActivaData.hora_cierre ?? '22:00')
      : HORAS_APP,
    [canchaActivaData],
  );

  const reservasCancha = useMemo(
    () => reservas.filter(r => r.cancha_id === canchaActiva),
    [reservas, canchaActiva],
  );

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(semana);
      d.setDate(semana.getDate() + i);
      return d;
    }),
    [semana],
  );

  const toFecha = (d: Date) => d.toISOString().split('T')[0];
  const hoy = toFecha(new Date());

  const getReserva = (dia: Date, hora: string) => {
    const fecha = toFecha(dia);
    if (seccionActiva === null) {
      return reservasCancha.find(r =>
        r.fecha === fecha && r.hora === hora &&
        r.estado !== 'cancelada' && r.estado !== 'rechazada',
      );
    }
    return reservasCancha.find(r =>
      r.fecha === fecha && r.hora === hora &&
      r.estado !== 'cancelada' && r.estado !== 'rechazada' &&
      (r.seccion_id === seccionActiva || r.seccion_id == null),
    );
  };

  const esBloqueado = (dia: Date, hora: string) =>
    bloqueos.some(b => estaBloquedoPor(b, toFecha(dia), hora));

  const navSemana = (dir: -1 | 1) => {
    const s = new Date(semana);
    s.setDate(s.getDate() + dir * 7);
    setSemana(s);
  };

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

      {/* ── Horario semanal ── */}
      {!loading && canchas.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Horario semanal</h2>
            {canchaActivaData && (
              <Link
                href={`/admin-cancha/canchas/${canchaActiva}`}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Editar cancha <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          <Card className="border-border p-4 space-y-4">
            {/* Tabs de cancha (solo si hay más de una) */}
            {canchas.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {canchas.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCanchaActiva(c.id)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                      canchaActiva === c.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            )}

            {/* Tabs de sección (solo si la cancha tiene secciones) */}
            {secciones.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSeccionActiva(null)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                    seccionActiva === null
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  Cancha completa
                </button>
                {secciones.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSeccionActiva(s.id)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                      seccionActiva === s.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    Sección {s.nombre}
                  </button>
                ))}
              </div>
            )}

            {/* Navegación de semana */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navSemana(-1)}
                className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-foreground">
                {dias[0].toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
                {' – '}
                {dias[6].toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <button
                onClick={() => navSemana(1)}
                className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {[
                { cls: 'bg-green-100 border-green-300 dark:bg-green-950/40 dark:border-green-800', label: 'Libre' },
                { cls: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-950/40 dark:border-yellow-700', label: 'Pendiente' },
                { cls: 'bg-primary/20 border-primary/40', label: 'Confirmada' },
                { cls: 'bg-muted border-border', label: 'Bloqueado' },
              ].map(({ cls, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={cn('h-3 w-3 rounded-sm border', cls)} />
                  {label}
                </span>
              ))}
            </div>

            {/* Grilla */}
            {loadingCalendar ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm">Cargando...</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="sticky left-0 z-10 bg-muted/50 w-14 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Hora
                      </th>
                      {dias.map((d, i) => (
                        <th
                          key={i}
                          className={cn(
                            'min-w-20 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide',
                            toFecha(d) === hoy ? 'text-primary' : 'text-muted-foreground',
                          )}
                        >
                          {DIAS[i]}
                          <p className="mt-0.5 text-[10px] font-normal">
                            {d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                          </p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {horasOperacion.map(hora => (
                      <tr key={hora} className="border-t border-border">
                        <td className="sticky left-0 z-10 bg-background px-3 py-2 font-mono text-[11px] text-muted-foreground">
                          {hora}
                        </td>
                        {dias.map((d, i) => {
                          const reserva = getReserva(d, hora);
                          const bloqueado = !reserva && esBloqueado(d, hora);

                          if (bloqueado)
                            return (
                              <td key={i} className="px-2 py-2 text-center bg-muted/60">
                                <span className="text-[9px] text-muted-foreground">Bloq.</span>
                              </td>
                            );

                          if (reserva) {
                            const bloqueadaPorCompleta = seccionActiva !== null && reserva.seccion_id == null;
                            const bloqueadaPorSeccion  = seccionActiva === null  && reserva.seccion_id != null;

                            if (bloqueadaPorCompleta || bloqueadaPorSeccion) {
                              return (
                                <td key={i} className="px-2 py-2 text-center bg-muted/60">
                                  <span className="text-[9px] text-muted-foreground">Bloq.</span>
                                  <span className="block text-[8px] text-muted-foreground/60">
                                    {bloqueadaPorCompleta ? 'completa' : `sec. ${reserva.seccion?.nombre ?? ''}`}
                                  </span>
                                </td>
                              );
                            }

                            const isPendiente = reserva.estado === 'pendiente';
                            return (
                              <td
                                key={i}
                                className={cn(
                                  'px-1 py-1.5 text-center',
                                  isPendiente ? 'bg-yellow-50 dark:bg-yellow-950/30' : 'bg-primary/10',
                                )}
                              >
                                <p className={cn(
                                  'truncate text-[10px] font-semibold',
                                  isPendiente ? 'text-yellow-700 dark:text-yellow-400' : 'text-primary',
                                )}>
                                  {(reserva.usuario_nombre ?? 'Cliente').split(' ')[0]}
                                </p>
                                <p className={cn(
                                  'text-[9px]',
                                  isPendiente ? 'text-yellow-600 dark:text-yellow-500' : 'text-primary/70',
                                )}>
                                  {isPendiente ? 'Pendiente' : 'Confirmada'}
                                </p>
                              </td>
                            );
                          }

                          return (
                            <td key={i} className="px-2 py-2 bg-green-50/60 dark:bg-green-950/10" />
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

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
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.grupo_reserva_id
                          ? `${r.hora} - ${horaFinPorGrupo.get(r.grupo_reserva_id) ?? ''}`
                          : r.hora}
                      </td>
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
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {c.imagenes?.[0] && (
                      <Image src={c.imagenes[0]} alt={c.nombre} fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-foreground">{c.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          <span className="text-xs text-muted-foreground">{c.rating}</span>
                        </div>
                      )}
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

      {/* Analytics */}
      <ReservasAnalytics reservas={rawReservas} />
    </div>
  );
}
