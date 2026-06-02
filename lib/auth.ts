'use client';

// Solo maneja la sesión del usuario en localStorage.
// Todos los datos (favoritos, loyalty, reservas) van a Supabase via API.

export interface User {
  id?: string;
  name: string;
  email: string;
  phone: string;
}

export interface HistorialItem {
  id: string;
  cantidad: number;
  motivo: 'reserva' | 'partido' | 'resena';
  creado_en: string;
}

export interface LoyaltyData {
  sellos: number;
  totalReservas: number;
  cupones: Cupon[];
  historial: HistorialItem[];
}

export interface Cupon {
  id: string;
  descuento: number;
  generadoEn: string;
  usado: boolean;
  usadoEn?: string;
}

const USER_KEY = 'cp_user'; // unificado con lib/api.ts

export function saveUser(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('cp_token');
    // Limpiar claves legacy
    localStorage.removeItem('cancha_piura_user');
    localStorage.removeItem('cancha_piura_favorites');
    localStorage.removeItem('cancha_piura_loyalty');
    localStorage.removeItem('cp_reservas');
    localStorage.removeItem('cp_notificaciones');
  }
}
