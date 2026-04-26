'use client';

import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────
interface RawReserva {
  id: string;
  fecha: string;       // YYYY-MM-DD
  hora: string;        // HH:MM
  precio: number;
  estado: 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada';
  creado_en: string;   // ISO timestamp
}

interface Props {
  reservas: RawReserva[];
}

type Periodo = '7d' | '30d' | '3m' | '6m' | '12m';

const PERIODO_LABELS: Record<Periodo, string> = {
  '7d':  'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '3m':  'Últimos 3 meses',
  '6m':  'Últimos 6 meses',
  '12m': 'Últimos 12 meses',
};

const ESTADO_COLORS = {
  confirmada: '#16a34a',
  pendiente:  '#ca8a04',
  rechazada:  '#dc2626',
  cancelada:  '#6b7280',
};

const CHART_COLORS = ['#16a34a', '#2563eb', '#ca8a04', '#dc2626', '#7c3aed', '#0891b2'];

// ── Helpers ────────────────────────────────────────────────────
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDay(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

function formatMonth(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
}

// ── Componente principal ───────────────────────────────────────
export default function ReservasAnalytics({ reservas }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>('30d');

  // Filtrar reservas según el periodo seleccionado
  const reservasFiltradas = useMemo(() => {
    const ahora = new Date();
    const diasMap: Record<Periodo, number> = {
      '7d': 7, '30d': 30, '3m': 90, '6m': 180, '12m': 365,
    };
    const desde = new Date(ahora);
    desde.setDate(ahora.getDate() - diasMap[periodo]);
    return reservas.filter(r => new Date(r.creado_en) >= desde);
  }, [reservas, periodo]);

  // ── 1. Reservas por día ──────────────────────────────────────
  const reservasPorDia = useMemo(() => {
    if (periodo === '3m' || periodo === '6m' || periodo === '12m') return null;

    const diasMap: Record<Periodo, number> = { '7d': 7, '30d': 30, '3m': 90, '6m': 180, '12m': 365 };
    const dias = diasMap[periodo];
    const ahora = new Date();
    const mapa: Record<string, number> = {};

    for (let i = dias - 1; i >= 0; i--) {
      const d = addDays(ahora, -i);
      const key = d.toISOString().split('T')[0];
      mapa[key] = 0;
    }

    reservasFiltradas.forEach(r => {
      const key = r.creado_en.split('T')[0];
      if (key in mapa) mapa[key]++;
    });

    return Object.entries(mapa).map(([fecha, total]) => ({
      fecha: formatDay(fecha),
      total,
    }));
  }, [reservasFiltradas, periodo]);

  // ── 2. Reservas por mes ──────────────────────────────────────
  const reservasPorMes = useMemo(() => {
    const mapa: Record<string, { total: number; ingresos: number; confirmadas: number; canceladas: number }> = {};

    reservasFiltradas.forEach(r => {
      const d = new Date(r.creado_en);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!mapa[key]) mapa[key] = { total: 0, ingresos: 0, confirmadas: 0, canceladas: 0 };
      mapa[key].total++;
      if (r.estado === 'confirmada') { mapa[key].ingresos += r.precio; mapa[key].confirmadas++; }
      if (r.estado === 'cancelada')  mapa[key].canceladas++;
    });

    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ mes: formatMonth(key), ...v }));
  }, [reservasFiltradas]);

  // ── 3. Reservas por hora ─────────────────────────────────────
  const reservasPorHora = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (let h = 6; h <= 23; h++) {
      mapa[`${String(h).padStart(2, '0')}:00`] = 0;
    }
    reservasFiltradas.forEach(r => {
      const hora = r.hora?.substring(0, 5);
      if (hora in mapa) mapa[hora]++;
    });
    return Object.entries(mapa).map(([hora, total]) => ({ hora, total }));
  }, [reservasFiltradas]);

  // ── 4. Reservas por día de semana ────────────────────────────
  const reservasPorDiaSemana = useMemo(() => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const mapa: Record<string, number> = {};
    dias.forEach(d => { mapa[d] = 0; });
    reservasFiltradas.forEach(r => {
      const d = new Date(r.creado_en);
      mapa[dias[d.getDay()]]++;
    });
    return dias.map(dia => ({ dia, total: mapa[dia] }));
  }, [reservasFiltradas]);

  // ── 5. Distribución de estados ───────────────────────────────
  const distribucionEstados = useMemo(() => {
    const mapa = { confirmada: 0, pendiente: 0, rechazada: 0, cancelada: 0 };
    reservasFiltradas.forEach(r => { mapa[r.estado]++; });
    return Object.entries(mapa)
      .filter(([, v]) => v > 0)
      .map(([estado, value]) => ({
        name: estado.charAt(0).toUpperCase() + estado.slice(1),
        value,
        color: ESTADO_COLORS[estado as keyof typeof ESTADO_COLORS],
      }));
  }, [reservasFiltradas]);

  // ── 6. Ingresos por mes ──────────────────────────────────────
  const ingresosPorMes = useMemo(() => reservasPorMes.map(m => ({
    mes: m.mes,
    ingresos: m.ingresos,
  })), [reservasPorMes]);

  // ── Métricas de crecimiento ──────────────────────────────────
  const crecimiento = useMemo(() => {
    if (reservasPorMes.length < 2) return null;
    const ultimo    = reservasPorMes[reservasPorMes.length - 1];
    const penultimo = reservasPorMes[reservasPorMes.length - 2];
    if (!penultimo.total) return null;
    const pct = ((ultimo.total - penultimo.total) / penultimo.total) * 100;
    return { pct: Math.round(pct), ultimo: ultimo.total, penultimo: penultimo.total };
  }, [reservasPorMes]);

  const totalFiltrado   = reservasFiltradas.length;
  const ingresosFiltrado = reservasFiltradas
    .filter(r => r.estado === 'confirmada')
    .reduce((s, r) => s + r.precio, 0);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header + selector de periodo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Análisis de Reservas</h2>
          <p className="text-sm text-muted-foreground">
            {totalFiltrado} reservas · S/ {ingresosFiltrado.toLocaleString()} en ingresos confirmados
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(PERIODO_LABELS) as Periodo[]).map(p => (
            <Button
              key={p}
              size="sm"
              variant={periodo === p ? 'default' : 'outline'}
              onClick={() => setPeriodo(p)}
              className="text-xs"
            >
              {p === '7d' ? '7D' : p === '30d' ? '30D' : p === '3m' ? '3M' : p === '6m' ? '6M' : '12M'}
            </Button>
          ))}
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total reservas</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalFiltrado}</p>
          {crecimiento && (
            <div className={`mt-1 flex items-center gap-1 text-xs ${crecimiento.pct > 0 ? 'text-green-600' : crecimiento.pct < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {crecimiento.pct > 0 ? <TrendingUp className="h-3 w-3" /> : crecimiento.pct < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {crecimiento.pct > 0 ? '+' : ''}{crecimiento.pct}% vs mes anterior
            </div>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Confirmadas</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {reservasFiltradas.filter(r => r.estado === 'confirmada').length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalFiltrado > 0 ? Math.round((reservasFiltradas.filter(r => r.estado === 'confirmada').length / totalFiltrado) * 100) : 0}% del total
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Canceladas</p>
          <p className="mt-1 text-2xl font-bold text-red-500">
            {reservasFiltradas.filter(r => r.estado === 'cancelada').length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalFiltrado > 0 ? Math.round((reservasFiltradas.filter(r => r.estado === 'cancelada').length / totalFiltrado) * 100) : 0}% del total
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Ingresos confirmados</p>
          <p className="mt-1 text-2xl font-bold text-primary">S/ {ingresosFiltrado.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Prom. S/ {totalFiltrado > 0 ? Math.round(ingresosFiltrado / Math.max(1, reservasFiltradas.filter(r => r.estado === 'confirmada').length)) : 0} / reserva
          </p>
        </Card>
      </div>

      {/* Gráfico 1: Reservas por día (solo para 7d y 30d) */}
      {reservasPorDia && reservasPorDia.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-4 font-semibold text-foreground">Reservas por día</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={reservasPorDia}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v: number) => [v, 'Reservas']}
              />
              <Area type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={2} fill="url(#colorTotal)" dot={{ r: 3, fill: '#16a34a' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Gráfico 2: Reservas e ingresos por mes */}
      {reservasPorMes.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-4 font-semibold text-foreground">Reservas por mes</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={reservasPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v: number, name: string) => [v, name === 'total' ? 'Total' : name === 'confirmadas' ? 'Confirmadas' : 'Canceladas']}
                />
                <Legend formatter={(v) => v === 'total' ? 'Total' : v === 'confirmadas' ? 'Confirmadas' : 'Canceladas'} />
                <Bar dataKey="total"       fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="confirmadas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="canceladas"  fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-semibold text-foreground">Ingresos por mes (S/)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ingresosPorMes}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `S/${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v: number) => [`S/ ${v.toLocaleString()}`, 'Ingresos']}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#2563eb" strokeWidth={2} fill="url(#colorIngresos)" dot={{ r: 3, fill: '#2563eb' }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Gráfico 3: Por hora y por día de semana */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-1 font-semibold text-foreground">Reservas por horario</h3>
          <p className="mb-4 text-xs text-muted-foreground">Identifica los horarios más populares</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reservasPorHora}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} tickLine={false} interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v: number) => [v, 'Reservas']}
              />
              <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 font-semibold text-foreground">Reservas por día de semana</h3>
          <p className="mb-4 text-xs text-muted-foreground">¿Qué días hay más demanda?</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reservasPorDiaSemana}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v: number) => [v, 'Reservas']}
              />
              <Bar dataKey="total" fill="#0891b2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Gráfico 4: Distribución de estados */}
      {distribucionEstados.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-1 font-semibold text-foreground">Distribución de estados</h3>
          <p className="mb-4 text-xs text-muted-foreground">Proporción de reservas por estado</p>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={distribucionEstados}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {distribucionEstados.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v: number, name: string) => [v, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3">
              {distribucionEstados.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: e.color }} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.value} reservas · {Math.round((e.value / totalFiltrado) * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Mensaje si no hay datos */}
      {totalFiltrado === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No hay reservas en el período seleccionado.</p>
        </Card>
      )}
    </div>
  );
}
