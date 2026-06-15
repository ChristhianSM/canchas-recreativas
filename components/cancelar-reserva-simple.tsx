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
  modoPago?: 'completo' | 'parcial';
  montoAdelanto?: number;
}

interface CancelarReservaSimpleProps {
  reserva: Reserva | null;
  onClose: () => void;
  onConfirm: (reservaId: string) => Promise<void>;
}

function calcularDevolucionEstimada(reserva: Reserva): { porcentaje: number; monto: number; descripcion: string; color: string } {
  if (!reserva) return { porcentaje: 0, monto: 0, descripcion: '', color: '' };

  const horaInicio = reserva.hora.includes(' - ') ? reserva.hora.split(' - ')[0] : reserva.hora;
  const fechaReserva = new Date(`${reserva.fecha}T${horaInicio}`);
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
  const esParcial = reserva.modoPago === 'parcial';
  const [fYear, fMonth, fDay] = reserva.fecha.split('-').map(Number);
  const fechaLabel = new Date(fYear, fMonth - 1, fDay).toLocaleDateString('es-PE', {
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
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-6">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 shrink-0" />
            <span className="break-words">Cancelar Reserva</span>
          </DialogTitle>
          <DialogDescription className="break-words text-xs sm:text-sm">
            Revisa la política de devolución antes de cancelar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Información de la reserva */}
          <div className="rounded-lg border p-2.5 sm:p-3 space-y-2">
            <h4 className="font-medium break-words text-sm sm:text-base">{reserva.canchaName}</h4>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="break-words">{fechaLabel} a las {reserva.hora}</span>
            </div>
            <div className="text-xs sm:text-sm">
              <span className="font-medium">Total pagado: S/ {reserva.precio}</span>
            </div>
          </div>

          {/* Aviso pago parcial / Cálculo de devolución */}
          {esParcial ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-2.5 sm:p-3 space-y-2">
              <h4 className="font-medium flex items-center gap-2 text-sm sm:text-base text-orange-800">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>Sin devolución</span>
              </h4>
              <p className="text-xs sm:text-sm text-orange-700 break-words">
                Al cancelar una reserva con adelanto, perderás el monto abonado (S/ {reserva.montoAdelanto ?? reserva.precio}). No hay devolución.
              </p>
            </div>
          ) : (
            /* Cálculo de devolución estándar */
            <div className="rounded-lg border p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-sm sm:text-base">
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="break-words">Devolución Estimada</span>
              </h4>
              
              <div className={`text-xs sm:text-sm break-words ${devolucion.color}`}>
                {devolucion.descripcion}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div className="text-center p-1.5 sm:p-2 rounded bg-green-50 min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Devolución</p>
                  <p className="font-bold text-green-600 break-words text-sm sm:text-base">S/ {devolucion.monto}</p>
                  <p className="text-[10px] sm:text-xs text-green-600">({devolucion.porcentaje}%)</p>
                </div>
                <div className="text-center p-1.5 sm:p-2 rounded bg-red-50 min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Penalidad</p>
                  <p className="font-bold text-red-600 break-words text-sm sm:text-base">S/ {reserva.precio - devolucion.monto}</p>
                  <p className="text-[10px] sm:text-xs text-red-600">({100 - devolucion.porcentaje}%)</p>
                </div>
              </div>

              {devolucion.monto > 0 && (
                <div className="text-[10px] sm:text-xs text-muted-foreground bg-blue-50 p-2 rounded break-words">
                  💰 La devolución se procesará por {reserva.metodoPago === 'yape' ? 'Yape' : 'Plin'} en 24-48 horas
                </div>
              )}
            </div>
          )}

          {/* Política general — solo aplica a pago completo */}
          {!esParcial && (
            <div className="rounded-lg bg-muted/50 p-2.5 sm:p-3 text-[10px] sm:text-xs text-muted-foreground">
              <p className="font-medium mb-1">Política de Cancelación:</p>
              <ul className="space-y-0.5">
                <li className="break-words">• +4 horas: 85% devolución</li>
                <li className="break-words">• 2-4 horas: 60% devolución</li>
                <li className="break-words">• 1-2 horas: 30% devolución</li>
                <li className="break-words">• -1 hora: Sin devolución</li>
              </ul>
            </div>
          )}

          {/* Casos especiales */}
          <div className="rounded-lg bg-blue-50 p-2.5 sm:p-3 text-[10px] sm:text-xs">
            <div className="flex items-start gap-2">
              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-blue-900 break-words">¿Emergencia o caso especial?</p>
                <p className="text-blue-700 break-words">
                  Contacta directamente al administrador para reprogramar sin costo o evaluar tu caso.
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 text-xs sm:text-sm h-9 sm:h-10">
              Mantener
            </Button>
            <Button 
              onClick={handleConfirm} 
              className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
              disabled={loading}
            >
              {loading ? 'Cancelando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
