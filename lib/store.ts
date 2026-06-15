'use client';

// Tipos compartidos — los datos van a Supabase via API, no a localStorage.

export type ReservaEstado = 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada';
export type MetodoPago = 'yape' | 'Plin';

export interface Reserva {
  id: string;
  canchaId: string;
  canchaName: string;
  usuarioNombre: string;
  usuarioEmail: string;
  usuarioPhone: string;
  fecha: string;
  hora: string;
  precio: number;
  metodoPago: MetodoPago;
  comprobante: string | null;
  estado: ReservaEstado;
  creadaEn: string;
  notificado: boolean;
  modoPago?: 'completo' | 'parcial';
  montoAdelanto?: number;
  saldoPendiente?: number;
  saldoCobrado?: boolean;
  saldoCobradoEn?: string | null;
  canceladoEn?: string | null;
  devolucionCalculada?: number | null;
  devolucionProcesada?: boolean | null;
  penalidadAplicada?: number | null;
  grupoReservaId?: string | null;
}

export interface Notificacion {
  id: string;
  reservaId: string;
  mensaje: string;
  tipo: 'confirmada' | 'rechazada' | 'cancelada' | 'favorito' | 'nueva_reserva';
  leida: boolean;
  creadaEn: string;
}
