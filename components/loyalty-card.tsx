'use client';

import { useState } from 'react';
import { Stamp, Gift, Ticket, CheckCircle2, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type LoyaltyData, type Cupon } from '@/lib/auth';

const TOTAL_SELLOS = 8;

interface LoyaltyCardProps {
  loyalty: LoyaltyData;
  onUpdate: () => void;
}

export function LoyaltyCard({ loyalty, onUpdate }: LoyaltyCardProps) {
  const [showCuponInfo, setShowCuponInfo] = useState<string | null>(null);
  const cuponesDisponibles = loyalty.cupones.filter(c => !c.usado);
  const cuponesUsados = loyalty.cupones.filter(c => c.usado);

  return (
    <div className="space-y-6">

      {/* Tarjeta de sellos */}
      <Card className="overflow-hidden border-border">
        <div className="bg-primary px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-foreground/80">Tu progreso</p>
              <h3 className="text-xl font-bold text-primary-foreground">Tarjeta de Fidelización</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20">
              <Stamp className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {loyalty.sellos} de {TOTAL_SELLOS} reservas
            </span>
            <span className="font-medium text-foreground">
              {TOTAL_SELLOS - loyalty.sellos} para tu próximo cupón
            </span>
          </div>

          {/* Sellos */}
          <div className="grid grid-cols-8 gap-2 mb-4">
            {Array.from({ length: TOTAL_SELLOS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-xl border-2 transition-all',
                  i < loyalty.sellos
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-dashed border-muted-foreground/30 bg-muted/30'
                )}
              >
                {i < loyalty.sellos ? (
                  <Stamp className="h-5 w-5" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground/40">{i + 1}</span>
                )}
              </div>
            ))}
          </div>

          {/* Barra de progreso */}
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(loyalty.sellos / TOTAL_SELLOS) * 100}%` }}
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Cada reserva completada suma un sello. Al completar {TOTAL_SELLOS} sellos recibes un cupón de <span className="font-semibold text-foreground">S/ 5 de descuento</span> en tu próxima reserva.
            </p>
          </div>
        </div>
      </Card>

      {/* Cupones disponibles */}
      {cuponesDisponibles.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <Gift className="h-5 w-5 text-primary" />
            Cupones disponibles
            <Badge className="bg-primary text-primary-foreground">{cuponesDisponibles.length}</Badge>
          </h3>
          <div className="space-y-3">
            {cuponesDisponibles.map(cupon => (
              <CuponCard key={cupon.id} cupon={cupon} disponible />
            ))}
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{loyalty.totalReservas}</p>
          <p className="text-sm text-muted-foreground">Reservas totales</p>
        </Card>
        <Card className="border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{loyalty.cupones.length}</p>
          <p className="text-sm text-muted-foreground">Cupones ganados</p>
        </Card>
      </div>

      {/* Cupones usados */}
      {cuponesUsados.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-muted-foreground">
            <Ticket className="h-5 w-5" />
            Cupones usados
          </h3>
          <div className="space-y-3">
            {cuponesUsados.map(cupon => (
              <CuponCard key={cupon.id} cupon={cupon} disponible={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CuponCard({ cupon, disponible }: { cupon: Cupon; disponible: boolean }) {
  const fecha = new Date(cupon.generadoEn).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border-2 border-dashed p-4',
        disponible
          ? 'border-primary/40 bg-primary/5'
          : 'border-muted bg-muted/30 opacity-60'
      )}
    >
      <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background border border-border" />
      <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background border border-border" />

      <div className="flex items-center gap-4 pl-2 pr-2">
        <div className={cn(
          'flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg',
          disponible ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}>
          <span className="text-xs font-medium">S/</span>
          <span className="text-2xl font-bold leading-none">{cupon.descuento}</span>
          <span className="text-xs">OFF</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-foreground">Descuento en reserva</p>
            {disponible ? (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Disponible</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Usado
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Generado el {fecha}</p>
        </div>
      </div>

      {disponible && (
        <p className="mt-3 pl-2 text-xs text-primary">
          ✓ Se aplicará automáticamente en tu próxima reserva
        </p>
      )}
    </div>
  );
}
