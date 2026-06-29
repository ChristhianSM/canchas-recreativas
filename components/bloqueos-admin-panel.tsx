'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Ban, Calendar, RefreshCw, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  BloqueoAdmin,
  DIAS_SEMANA,
  HORAS_APP,
  labelBloqueo,
  getHorasOperacion,
} from '@/lib/bloqueos-utils';
import { ownerFetch } from '@/lib/api';

function isOwnerEndpoint(url: string) {
  return url.includes('/api/admin-cancha/');
}

async function panelFetch(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  if (isOwnerEndpoint(url)) {
    return ownerFetch(url, init);
  }
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  });
}

// ── Tipos ────────────────────────────────────────────────────────────────────

type Modo = 'permanente' | 'fecha_especifica' | 'recurrente_semanal';

type Conflicto = {
  id: string;
  fecha: string;
  hora: string;
  usuario_nombre: string | null;
};

type BloqueoParams = {
  modo: Modo;
  horas: string[];
  fecha: string;
  diaSemana: number;
  fechaDesde: string;
  fechaHasta: string;
  motivo: string;
};

interface Props {
  canchaId: string;
  token: string;
  cancelEndpoint?: string;
  endpoint?: string;
  horasOperacion?: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function badgeModo(tipo: Modo) {
  switch (tipo) {
    case 'permanente':
      return <Badge variant="destructive" className="text-xs">Permanente</Badge>;
    case 'fecha_especifica':
      return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 text-xs">Fecha específica</Badge>;
    case 'recurrente_semanal':
      return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-xs">Recurrente</Badge>;
  }
}

// ── Modal de conflictos ──────────────────────────────────────────────────────

function ConflictosModal({
  conflictos,
  token,
  cancelEndpoint,
  onResuelto,
  onClose,
  onRetry,
  reintentando,
}: {
  conflictos: Conflicto[];
  token: string;
  cancelEndpoint: string;
  onResuelto: (id: string) => void;
  onClose: () => void;
  onRetry: () => void;
  reintentando: boolean;
}) {
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [cancelados, setCancelados] = useState<Set<string>>(new Set());

  const handleCancelar = async (c: Conflicto) => {
    if (!confirm(`¿Cancelar la reserva de ${c.usuario_nombre?.split(' ')[0] ?? 'este cliente'} el ${new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })} a las ${c.hora}?`)) return;

    setCancelando(c.id);
    const res = await panelFetch(cancelEndpoint, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservaId: c.id }),
    });

    if (res.ok) {
      setCancelados(prev => new Set(prev).add(c.id));
      onResuelto(c.id);
    }
    setCancelando(null);
  };

  const pendientes = conflictos.filter(c => !cancelados.has(c.id));
  const todosResueltos = pendientes.length === 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Reservas en conflicto
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {todosResueltos
            ? 'Todos los conflictos están resueltos. Ya puedes crear el bloqueo.'
            : `Hay ${pendientes.length} reserva${pendientes.length > 1 ? 's' : ''} activa${pendientes.length > 1 ? 's' : ''} en ese horario. Cancélalas para continuar.`}
        </p>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {conflictos.map(c => {
            const resuelta = cancelados.has(c.id);
            const fechaLabel = new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-PE', {
              weekday: 'short', day: 'numeric', month: 'short',
            });
            return (
              <div
                key={c.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all',
                  resuelta
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                    : 'border-border bg-card'
                )}
              >
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium truncate', resuelta && 'line-through text-muted-foreground')}>
                    {c.usuario_nombre ?? 'Cliente'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fechaLabel} · {c.hora}
                  </p>
                </div>
                {resuelta ? (
                  <span className="text-xs font-medium text-green-600 shrink-0">Cancelada ✓</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    disabled={cancelando === c.id}
                    onClick={() => handleCancelar(c)}
                  >
                    {cancelando === c.id
                      ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                      : <XCircle className="h-3.5 w-3.5" />}
                    <span className="ml-1.5">Cancelar</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            className="flex-1"
            disabled={!todosResueltos || reintentando}
            onClick={onRetry}
          >
            {reintentando
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
              : null}
            {reintentando ? 'Creando...' : 'Crear bloqueo ahora'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Selector de horas múltiple ───────────────────────────────────────────────

function HorasSelector({
  selected,
  onChange,
  bloqueadas = [],
  horas = HORAS_APP,
}: {
  selected: string[];
  onChange: (horas: string[]) => void;
  bloqueadas?: string[];
  horas?: string[];
}) {
  const toggle = (h: string) => {
    if (bloqueadas.includes(h)) return;
    onChange(selected.includes(h) ? selected.filter(x => x !== h) : [...selected, h]);
  };

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
      {horas.map(hora => {
        const activo = selected.includes(hora);
        const yaBloqueada = bloqueadas.includes(hora);
        return (
          <button
            key={hora}
            type="button"
            onClick={() => toggle(hora)}
            disabled={yaBloqueada}
            className={cn(
              'flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all relative',
              activo
                ? 'border-destructive bg-destructive/10 text-destructive'
                : yaBloqueada
                ? 'border-orange-500/40 bg-orange-500/5 text-orange-600 cursor-not-allowed opacity-60'
                : 'border-border bg-card text-foreground hover:border-primary/40'
            )}
          >
            {activo && <Ban className="h-3 w-3 shrink-0" />}
            {yaBloqueada && !activo && <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-orange-500" />}
            {hora}
          </button>
        );
      })}
    </div>
  );
}

// ── Formulario de nuevo bloqueo ──────────────────────────────────────────────

function FormNuevoBloqueo({
  canchaId,
  token,
  cancelEndpoint,
  endpoint,
  onCreado,
  bloqueosExistentes,
  horasOperacion = HORAS_APP,
}: {
  canchaId: string;
  token: string;
  cancelEndpoint: string;
  endpoint: string;
  onCreado: () => void;
  bloqueosExistentes: BloqueoAdmin[];
  horasOperacion?: string[];
}) {
  const [modo, setModo]             = useState<Modo>('fecha_especifica');
  const [horas, setHoras]           = useState<string[]>([]);
  const [fecha, setFecha]           = useState('');
  const [diaSemana, setDiaSemana]   = useState<number>(1);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [motivo, setMotivo]         = useState('');
  const [guardando, setGuardando]   = useState(false);
  const [error, setError]           = useState('');
  const [conflictos, setConflictos] = useState<Conflicto[]>([]);
  const [pendingParams, setPendingParams] = useState<BloqueoParams | null>(null);
  const [reintentando, setReintentando]   = useState(false);

  const horasBloqueadas = bloqueosExistentes
    .filter(b => {
      if (modo === 'permanente') return b.tipo === 'permanente';
      if (modo === 'fecha_especifica' && fecha) return b.tipo === 'fecha_especifica' && b.fecha === fecha;
      if (modo === 'recurrente_semanal') return b.tipo === 'recurrente_semanal' && b.dia_semana === diaSemana;
      return false;
    })
    .map(b => b.hora_inicio.length > 5 ? b.hora_inicio.substring(0, 5) : b.hora_inicio);

  const crearBloqueos = async (params: BloqueoParams) => {
    const promesas = params.horas.map(hora =>
      panelFetch(endpoint, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canchaId,
          tipo:        params.modo,
          fecha:       params.modo === 'fecha_especifica' ? params.fecha : undefined,
          dia_semana:  params.modo === 'recurrente_semanal' ? params.diaSemana : undefined,
          fecha_desde: params.modo === 'recurrente_semanal' && params.fechaDesde ? params.fechaDesde : undefined,
          fecha_hasta: params.modo === 'recurrente_semanal' && params.fechaHasta ? params.fechaHasta : undefined,
          hora_inicio: hora,
          motivo:      params.motivo || undefined,
        }),
      }).then(r => r.json())
    );

    const resultados = await Promise.all(promesas);
    const errores = resultados.filter(r => r.error);

    if (errores.length > 0) {
      // Recopilar todos los conflictos únicos con sus IDs
      const todos: Conflicto[] = [];
      const vistos = new Set<string>();
      for (const r of errores) {
        if (Array.isArray(r.conflictos)) {
          for (const c of r.conflictos) {
            if (!vistos.has(c.id)) {
              vistos.add(c.id);
              todos.push(c);
            }
          }
        }
      }

      if (todos.length > 0) {
        setConflictos(todos);
        setPendingParams(params);
      } else {
        setError(errores[0].error);
      }
      return false;
    }

    return true;
  };

  const handleGuardar = async () => {
    if (horas.length === 0) { setError('Selecciona al menos una hora'); return; }
    if (modo === 'fecha_especifica' && !fecha) { setError('Selecciona una fecha'); return; }

    setGuardando(true);
    setError('');

    const params: BloqueoParams = { modo, horas, fecha, diaSemana, fechaDesde, fechaHasta, motivo };
    const ok = await crearBloqueos(params);
    setGuardando(false);

    if (ok) {
      setHoras([]);
      setFecha('');
      setFechaDesde('');
      setFechaHasta('');
      setMotivo('');
      onCreado();
    }
  };

  const handleRetry = async () => {
    if (!pendingParams) return;
    setReintentando(true);
    const ok = await crearBloqueos(pendingParams);
    setReintentando(false);
    if (ok) {
      setConflictos([]);
      setPendingParams(null);
      setHoras([]);
      setFecha('');
      setFechaDesde('');
      setFechaHasta('');
      setMotivo('');
      onCreado();
    }
  };

  return (
    <>
      {conflictos.length > 0 && pendingParams && (
        <ConflictosModal
          conflictos={conflictos}
          token={token}
          cancelEndpoint={cancelEndpoint}
          onResuelto={id => setConflictos(prev => prev.filter(c => c.id !== id))}
          onClose={() => { setConflictos([]); setPendingParams(null); }}
          onRetry={handleRetry}
          reintentando={reintentando}
        />
      )}

      <Card className="border-border p-5 space-y-5">
        <div>
          <p className="font-medium text-foreground">Nuevo bloqueo</p>
          <p className="text-sm text-muted-foreground">Elige el tipo y las horas a bloquear.</p>
        </div>

        {/* Selector de modo */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'permanente',         label: 'Permanente',   icon: Ban,       desc: 'Todos los días' },
            { value: 'fecha_especifica',   label: 'Fecha exacta', icon: Calendar,  desc: 'Un día puntual' },
            { value: 'recurrente_semanal', label: 'Recurrente',   icon: RefreshCw, desc: 'Cada semana' },
          ] as const).map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setModo(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all',
                modo === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-semibold leading-tight">{label}</span>
              <span className="text-[10px] leading-tight opacity-70">{desc}</span>
            </button>
          ))}
        </div>

        {modo === 'fecha_especifica' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Fecha a bloquear</label>
            <Input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}

        {modo === 'recurrente_semanal' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Día de la semana</label>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {DIAS_SEMANA.map((dia, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDiaSemana(idx)}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                      diaSemana === idx
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    )}
                  >
                    {dia.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Desde <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Hasta <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} min={fechaDesde || undefined} />
              </div>
            </div>
          </div>
        )}

        {modo === 'permanente' && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive font-medium">⚠️ Bloqueo permanente</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Estas horas quedarán bloqueadas todos los días hasta que las elimines manualmente.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Horas a bloquear
            {horas.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">({horas.length} seleccionada{horas.length > 1 ? 's' : ''})</span>
            )}
          </label>
          <HorasSelector selected={horas} onChange={setHoras} bloqueadas={horasBloqueadas} horas={horasOperacion} />
          {horasBloqueadas.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-orange-500/5 border border-orange-500/20 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
              <p className="text-xs text-orange-600">
                Las horas con punto naranja ya están bloqueadas para este {modo === 'permanente' ? 'tipo' : modo === 'fecha_especifica' ? 'día' : 'día de la semana'}.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Motivo <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <Input
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: Mantenimiento, evento privado..."
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleGuardar}
          disabled={guardando || horas.length === 0}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          {guardando ? 'Guardando...' : `Crear ${horas.length > 0 ? horas.length : ''} bloqueo${horas.length !== 1 ? 's' : ''}`}
        </Button>
      </Card>
    </>
  );
}

// ── Lista de bloqueos existentes ─────────────────────────────────────────────

function ListaBloqueos({
  bloqueos,
  canchaId,
  token,
  endpoint,
  onEliminado,
}: {
  bloqueos: BloqueoAdmin[];
  canchaId: string;
  token: string;
  endpoint: string;
  onEliminado: () => void;
}) {
  const [eliminando, setEliminando] = useState<string | null>(null);

  const handleEliminar = async (id: string) => {
    setEliminando(id);
    await panelFetch(`${endpoint}?id=${id}&canchaId=${canchaId}`, token, {
      method: 'DELETE',
    });
    setEliminando(null);
    onEliminado();
  };

  const permanentes = bloqueos.filter(b => b.tipo === 'permanente');
  const porFecha    = bloqueos.filter(b => b.tipo === 'fecha_especifica');
  const recurrentes = bloqueos.filter(b => b.tipo === 'recurrente_semanal');

  if (bloqueos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
        <Clock className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground">Sin bloqueos activos</p>
        <p className="text-xs text-muted-foreground mt-1">Crea un bloqueo usando el formulario de arriba.</p>
      </div>
    );
  }

  const GrupoBloqueos = ({ titulo, items }: { titulo: string; items: BloqueoAdmin[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
        {items.map(b => (
          <div key={b.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {badgeModo(b.tipo)}
                <span className="text-sm font-medium text-foreground truncate">{labelBloqueo(b)}</span>
              </div>
              {b.motivo && <p className="text-xs text-muted-foreground">{b.motivo}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              disabled={eliminando === b.id}
              onClick={() => handleEliminar(b.id)}
            >
              {eliminando === b.id
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <GrupoBloqueos titulo="Permanentes"           items={permanentes} />
      <GrupoBloqueos titulo="Fechas específicas"    items={porFecha} />
      <GrupoBloqueos titulo="Recurrentes semanales" items={recurrentes} />
    </div>
  );
}

// ── Panel principal ──────────────────────────────────────────────────────────

export function BloqueosAdminPanel({ canchaId, token, cancelEndpoint = '/api/admin-cancha/reservas/cancelar', endpoint = '/api/admin-cancha/bloqueos', horasOperacion }: Props) {
  const [bloqueos, setBloqueos] = useState<BloqueoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await panelFetch(`${endpoint}?canchaId=${canchaId}`, token);
    const data = await res.json();
    setBloqueos(Array.isArray(data) ? data : []);
    setCargando(false);
  }, [canchaId, token, endpoint]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-6">
      <FormNuevoBloqueo canchaId={canchaId} token={token} cancelEndpoint={cancelEndpoint} endpoint={endpoint} onCreado={cargar} bloqueosExistentes={bloqueos} horasOperacion={horasOperacion} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">
            Bloqueos activos
            {bloqueos.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({bloqueos.length})</span>
            )}
          </p>
          <Button variant="ghost" size="sm" onClick={cargar} disabled={cargando} className="gap-1.5 text-xs">
            <RefreshCw className={cn('h-3.5 w-3.5', cargando && 'animate-spin')} />
            Actualizar
          </Button>
        </div>

        {cargando ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <ListaBloqueos bloqueos={bloqueos} canchaId={canchaId} token={token} endpoint={endpoint} onEliminado={cargar} />
        )}
      </div>
    </div>
  );
}
