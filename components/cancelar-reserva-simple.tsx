'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, Info, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Reserva {
  id: string;
  canchaName: string;
  fecha: string;
  hora: string;
  precio: number;
  estado: 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada';
  metodoPago: string;
}

interface CancelarReservaSimpleProps {
  reserva: Reserva | null;
  onClose: () => void;
  onConfirm: (reservaId: string) => Promise<void>;
}

function calcularDevolucionEstimada(reserva: Reserva): { porcentaje: number; monto: number; descripcion: string; color: string } {
  if (!reserva) return { porcentaje: 0, monto: 0, descripcion: '', color: '' };

  const fechaReserva = new Date(`${reserva.fecha}T${reserva.hora}`);
  const ahora = new Date();
  const horasRestantes = (fechaReserva.getTime() - ahora.getTime()) / (1000 * 60 * 60);

  if (reserva.estado === 'pendiente') {
    return {
      porcentaje: 100,
      monto: reserva.precio,
      descripcion: 'Devolución completa - reserva no confirmada',
      color: 'text-green-600'
    };
  }

  if (reserva.estado === 'confirmada') {
    if (horasRestantes >= 4) {
      return {
        porcentaje: 85,
        monto: Math.round(reserva.precio * 0.85),
        descripcion: 'Más de 4 horas de anticipación',
        color: 'text-green-600'
      };
    } else if (horasRestantes >= 2) {
      return {
        porcentaje: 60,
        monto: Math.round(reserva.precio * 0.60),
        descripcion: 'Entre 2-4 horas de anticipación',
        color: 'text-yellow-600'
      };
    } else if (horasRestantes >= 1) {
      return {
        porcentaje: 30,
        monto: Math.round(reserva.precio * 0.30),
        descripcion: 'Entre 1-2 horas de anticipación',
        color: 'text-orange-600'
      };
    } else {
      return {
        porcentaje: 0,
        monto: 0,
        descripcion: 'Menos de 1 hora de anticipación',
        color: 'text-red-600'
      };
    }
  }

  return { porcentaje: 0, monto: 0, descripcion: 'No se puede cancelar', color: 'text-gray-500' };
}

export default function CancelarReservaSimple({ reserva, onClose, onConfirm }: CancelarReservaSimpleProps) {
  const [loading, setLoading] = useState(false);

  if (!reserva) return null;

  const devolucion = calcularDevolucionEstimada(reserva);
  const fechaLabel = new Date(reserva.fecha).toLocaleDateString('es-PE', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(reserva.id);
      onClose();
    } catch (error) {
      console.error('Error al cancelar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!reserva} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Cancelar Reserva
          </DialogTitle>
          <DialogDescription>
            Revisa la política de devolución antes de cancelar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la reserva */}
          <div className="rounded-lg border p-3 space-y-2">
            <h4 className="font-medium">{reserva.canchaName}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {fechaLabel} a las {reserva.hora}
            </div>
            <div className="text-sm">
              <span className="font-medium">Total pagado: S/ {reserva.precio}</span>
            </div>
          </div>

          {/* Cálculo de devolución */}
          <div className="rounded-lg border p-3 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Devolución Estimada
            </h4>
            
            <div className={`text-sm ${devolucion.color}`}>
              {devolucion.descripcion}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-2 rounded bg-green-50">
                <p className="text-xs text-muted-foreground">Devolución</p>
                <p className="font-bold text-green-600">S/ {devolucion.monto}</p>
                <p className="text-xs text-green-600">({devolucion.porcentaje}%)</p>
              </div>
              <div className="text-center p-2 rounded bg-red-50">
                <p className="text-xs text-muted-foreground">Penalidad</p>
                <p className="font-bold text-red-600">S/ {reserva.precio - devolucion.monto}</p>
                <p className="text-xs text-red-600">({100 - devolucion.porcentaje}%)</p>
              </div>
            </div>

            {devolucion.monto > 0 && (
              <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                💰 La devolución se procesará por {reserva.metodoPago === 'yape' ? 'Yape' : 'Plin'} en 24-48 horas
              </div>
            )}
          </div>

          {/* Política general */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Política de Cancelación:</p>
            <ul className="space-y-0.5">
              <li>• +4 horas: 85% devolución</li>
              <li>• 2-4 horas: 60% devolución</li>
              <li>• 1-2 horas: 30% devolución</li>
              <li>• -1 hora: Sin devolución</li>
            </ul>
          </div>

          {/* Casos especiales */}
          <div className="rounded-lg bg-blue-50 p-3 text-xs">
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-blue-900">¿Emergencia o caso especial?</p>
                <p className="text-blue-700">
                  Contacta directamente al administrador para reprogramar sin costo o evaluar tu caso.
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Mantener Reserva
            </Button>
            <Button 
              onClick={handleConfirm} 
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Cancelando...' : 'Confirmar Cancelación'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
