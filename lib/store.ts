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
}

export interface Notificacion {
  id: string;
  reservaId: string;
  mensaje: string;
  tipo: 'confirmada' | 'rechazada' | 'cancelada' | 'favorito';
  leida: boolean;
  creadaEn: string;
}
