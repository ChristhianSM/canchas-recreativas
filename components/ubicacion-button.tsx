'use client';

import { useState } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  obtenerUbicacionActual,
  guardarUbicacion,
  limpiarUbicacion,
  soportaGeolocalizacion,
  type Coordenadas,
} from '@/lib/geolocation-utils';
import { cn } from '@/lib/utils';

interface UbicacionButtonProps {
  onUbicacionObtenida: (coords: Coordenadas) => void;
  onUbicacionLimpiada: () => void;
  ubicacionActual: Coordenadas | null;
  className?: string;
}

export function UbicacionButton({
  onUbicacionObtenida,
  onUbicacionLimpiada,
  ubicacionActual,
  className,
}: UbicacionButtonProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleObtenerUbicacion = async () => {
    if (!soportaGeolocalizacion()) {
      setError('Tu navegador no soporta geolocalización');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const coords = await obtenerUbicacionActual();
      guardarUbicacion(coords);
      onUbicacionObtenida(coords);
    } catch (err: any) {
      setError(err.message || 'Error al obtener ubicación');
      console.error('Error de geolocalización:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleLimpiar = () => {
    limpiarUbicacion();
    onUbicacionLimpiada();
    setError(null);
  };

  if (ubicacionActual) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="gap-2 bg-primary/10 text-primary border-primary/20 pr-1"
        >
          <MapPin className="h-3.5 w-3.5 fill-primary" />
          <span className="text-xs font-medium">Cerca de ti</span>
          <button
            onClick={handleLimpiar}
            className="ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
            aria-label="Limpiar ubicación"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleObtenerUbicacion}
        disabled={cargando}
        className={cn('gap-2', className)}
      >
        {cargando ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Obteniendo ubicación...
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4" />
            Cerca de mí
          </>
        )}
      </Button>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
