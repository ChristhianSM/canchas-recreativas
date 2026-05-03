'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Ban, Calendar, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BloqueoAdmin,
  DIAS_SEMANA,
  HORAS_APP,
  labelBloqueo,
} from '@/lib/bloqueos-utils';

// ── Tipos ────────────────────────────────────────────────────────────────────

type Modo = 'permanente' | 'fecha_especifica' | 'recurrente_semanal';

interface Props {
  canchaId: string;
  token: string;
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

// ── Selector de horas múltiple ───────────────────────────────────────────────

function HorasSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (horas: string[]) => void;
}) {
  const toggle = (h: string) =>
    onChange(selected.includes(h) ? selected.filter(x => x !== h) : [...selected, h]);

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
      {HORAS_APP.map(hora => {
        const activo = selected.includes(hora);
        return (
          <button
            key={hora}
            type="button"
            onClick={() => toggle(hora)}
            className={cn(
              'flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all',
              activo
                ? 'border-destructive bg-destructive/10 text-destructive'
                : 'border-border bg-card text-foreground hover:border-primary/40'
            )}
          >
            {activo && <Ban className="h-3 w-3 shrink-0" />}
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
  onCreado,
}: {
  canchaId: string;
  token: string;
  onCreado: () => void;
}) {
  const [modo, setModo]             = useState<Modo>('fecha_especifica');
  const [horas, setHoras]           = useState<string[]>([]);
  const [fecha, setFecha]           = useState('');
  const [diaSemana, setDiaSemana]   = useState<number>(1); // Lunes por defecto
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [motivo, setMotivo]         = useState('');
  const [guardando, setGuardando]   = useState(false);
  const [error, setError]           = useState('');

  const handleGuardar = async () => {
    if (horas.length === 0) {
      setError('Selecciona al menos una hora');
      return;
    }
    if (modo === 'fecha_especifica' && !fecha) {
      setError('Selecciona una fecha');
      return;
    }

    setGuardando(true);
    setError('');

    // Crear un bloqueo por cada hora seleccionada
    const promesas = horas.map(hora =>
      fetch('/api/admin-cancha/bloqueos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          canchaId,
          tipo: modo,
          fecha:       modo === 'fecha_especifica' ? fecha : undefined,
          dia_semana:  modo === 'recurrente_semanal' ? diaSemana : undefined,
          fecha_desde: modo === 'recurrente_semanal' && fechaDesde ? fechaDesde : undefined,
          fecha_hasta: modo === 'recurrente_semanal' && fechaHasta ? fechaHasta : undefined,
          hora_inicio: hora,
          motivo:      motivo || undefined,
        }),
      }).then(r => r.json())
    );

    const resultados = await Promise.all(promesas);
    setGuardando(false);

    const errores = resultados.filter(r => r.error);
    if (errores.length > 0) {
      setError(errores[0].error);
      return;
    }

    // Limpiar formulario
    setHoras([]);
    setFecha('');
    setFechaDesde('');
    setFechaHasta('');
    setMotivo('');
    onCreado();
  };

  return (
    <Card className="border-border p-5 space-y-5">
      <div>
        <p className="font-medium text-foreground">Nuevo bloqueo</p>
        <p className="text-sm text-muted-foreground">Elige el tipo y las horas a bloquear.</p>
      </div>

      {/* Selector de modo */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { value: 'permanente',         label: 'Permanente',   icon: Ban,         desc: 'Todos los días' },
          { value: 'fecha_especifica',   label: 'Fecha exacta', icon: Calendar,    desc: 'Un día puntual' },
          { value: 'recurrente_semanal', label: 'Recurrente',   icon: RefreshCw,   desc: 'Cada semana' },
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

      {/* Opciones según modo */}
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
              <Input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                placeholder="Sin límite de inicio"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Hasta <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                min={fechaDesde || undefined}
                placeholder="Sin límite de fin"
              />
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

      {/* Selector de horas */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Horas a bloquear
          {horas.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">({horas.length} seleccionada{horas.length > 1 ? 's' : ''})</span>
          )}
        </label>
        <HorasSelector selected={horas} onChange={setHoras} />
      </div>

      {/* Motivo */}
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

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        onClick={handleGuardar}
        disabled={guardando || horas.length === 0}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        {guardando ? 'Guardando...' : `Crear ${horas.length > 0 ? horas.length : ''} bloqueo${horas.length !== 1 ? 's' : ''}`}
      </Button>
    </Card>
  );
}

// ── Lista de bloqueos existentes ─────────────────────────────────────────────

function ListaBloqueos({
  bloqueos,
  canchaId,
  token,
  onEliminado,
}: {
  bloqueos: BloqueoAdmin[];
  canchaId: string;
  token: string;
  onEliminado: () => void;
}) {
  const [eliminando, setEliminando] = useState<string | null>(null);

  const handleEliminar = async (id: string) => {
    setEliminando(id);
    await fetch(`/api/admin-cancha/bloqueos?id=${id}&canchaId=${canchaId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setEliminando(null);
    onEliminado();
  };

  // Agrupar por tipo para mejor visualización
  const permanentes  = bloqueos.filter(b => b.tipo === 'permanente');
  const porFecha     = bloqueos.filter(b => b.tipo === 'fecha_especifica');
  const recurrentes  = bloqueos.filter(b => b.tipo === 'recurrente_semanal');

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
          <div
            key={b.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {badgeModo(b.tipo)}
                <span className="text-sm font-medium text-foreground truncate">
                  {labelBloqueo(b)}
                </span>
              </div>
              {b.motivo && (
                <p className="text-xs text-muted-foreground">{b.motivo}</p>
              )}
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
                : <Trash2 className="h-4 w-4" />
              }
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <GrupoBloqueos titulo="Permanentes" items={permanentes} />
      <GrupoBloqueos titulo="Fechas específicas" items={porFecha} />
      <GrupoBloqueos titulo="Recurrentes semanales" items={recurrentes} />
    </div>
  );
}

// ── Panel principal ──────────────────────────────────────────────────────────

export function BloqueosAdminPanel({ canchaId, token }: Props) {
  const [bloqueos, setBloqueos] = useState<BloqueoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/admin-cancha/bloqueos?canchaId=${canchaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setBloqueos(Array.isArray(data) ? data : []);
    setCargando(false);
  }, [canchaId, token]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-6">
      <FormNuevoBloqueo canchaId={canchaId} token={token} onCreado={cargar} />

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
          <ListaBloqueos
            bloqueos={bloqueos}
            canchaId={canchaId}
            token={token}
            onEliminado={cargar}
          />
        )}
      </div>
    </div>
  );
}
