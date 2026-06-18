'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Gift, Users, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getAdminTokenFresh } from '@/lib/supabase-browser';

type LoyaltyRow = {
  id: string;
  cancha_id: string;
  activo: boolean;
  umbral: number;
  premio_tipo: 'descuento_fijo' | 'descuento_porcentaje' | 'hora_gratis' | 'personalizado';
  premio_valor: number | null;
  premio_descripcion: string;
  actualizado_en: string;
  canchas: { id: string; nombre: string; imagenes: string[] } | null;
  stats: {
    total_usuarios: number;
    total_cupones_emitidos: number;
    total_cupones_usados: number;
  };
};

function premioLabel(row: LoyaltyRow) {
  if (row.premio_tipo === 'descuento_fijo')       return `S/ ${row.premio_valor} de descuento`;
  if (row.premio_tipo === 'descuento_porcentaje') return `${row.premio_valor}% de descuento`;
  if (row.premio_tipo === 'hora_gratis')          return '1 hora gratis';
  return row.premio_descripcion || 'Premio personalizado';
}

export default function AdminLoyaltyPage() {
  const [rows, setRows]       = useState<LoyaltyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAdminTokenFresh();
      const res = await fetch('/api/admin/loyalty', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  const handleToggle = async (row: LoyaltyRow) => {
    setToggling(row.cancha_id);
    const token = await getAdminTokenFresh();
    const res = await fetch('/api/admin/loyalty', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ canchaId: row.cancha_id, activo: !row.activo }),
    });
    if (res.ok) {
      setRows(prev =>
        prev.map(r => r.cancha_id === row.cancha_id ? { ...r, activo: !r.activo } : r)
      );
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fidelización</h1>
          <p className="text-muted-foreground">Programas de sellos por cancha</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border p-5">
              <div className="space-y-3">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-8 w-full animate-pulse rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activos   = rows.filter(r => r.activo).length;
  const inactivos = rows.filter(r => !r.activo).length;
  const totalUsuarios  = rows.reduce((s, r) => s + r.stats.total_usuarios, 0);
  const totalCupones   = rows.reduce((s, r) => s + r.stats.total_cupones_emitidos, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fidelización</h1>
        <p className="text-muted-foreground">Programas de sellos configurados por cada cancha</p>
      </div>

      {/* Stats resumen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Programas activos',    value: activos,        color: 'text-primary',    bg: 'bg-primary/10' },
          { label: 'Programas inactivos',  value: inactivos,      color: 'text-muted-foreground', bg: 'bg-muted' },
          { label: 'Usuarios con sellos',  value: totalUsuarios,  color: 'text-blue-600',   bg: 'bg-blue-500/10' },
          { label: 'Cupones emitidos',     value: totalCupones,   color: 'text-orange-600', bg: 'bg-orange-500/10' },
        ].map(s => (
          <Card key={s.label} className="border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn("text-2xl font-bold mt-0.5", s.color)}>{s.value}</p>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.bg)}>
                <Gift className={cn("h-5 w-5", s.color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed border-border p-12 text-center">
          <Gift className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            Ninguna cancha tiene configurado un programa de fidelización todavía.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Los dueños pueden activarlo desde el panel admin-cancha → Fidelización.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(row => {
            const imagen = row.canchas?.imagenes?.[0] ?? null;
            const nombre = row.canchas?.nombre ?? row.cancha_id;
            return (
              <Card key={row.cancha_id} className="border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/30">
                  {imagen ? (
                    <Image
                      src={imagen}
                      alt={nombre}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{nombre}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs mt-0.5",
                        row.activo
                          ? "border-primary/30 bg-primary/5 text-primary"
                          : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {row.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <button
                    onClick={() => handleToggle(row)}
                    disabled={toggling === row.cancha_id}
                    className="focus:outline-none disabled:opacity-50"
                    title={row.activo ? 'Desactivar programa' : 'Activar programa'}
                  >
                    {row.activo
                      ? <ToggleRight className="h-8 w-8 text-primary" />
                      : <ToggleLeft  className="h-8 w-8 text-muted-foreground" />}
                  </button>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg bg-muted/30 py-2">
                      <p className="text-lg font-bold text-foreground">{row.umbral}</p>
                      <p className="text-xs text-muted-foreground">sellos requeridos</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 py-2">
                      <p className="text-lg font-bold text-foreground truncate px-1">{premioLabel(row)}</p>
                      <p className="text-xs text-muted-foreground">premio</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {row.stats.total_usuarios} usuario{row.stats.total_usuarios !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Gift className="h-3.5 w-3.5" />
                      {row.stats.total_cupones_emitidos} emitido{row.stats.total_cupones_emitidos !== 1 ? 's' : ''}
                      {' · '}
                      {row.stats.total_cupones_usados} usado{row.stats.total_cupones_usados !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {row.premio_descripcion && (
                    <p className="text-xs text-muted-foreground italic truncate">
                      "{row.premio_descripcion}"
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
