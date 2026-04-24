'use client';

// Dueños de cancha — en producción esto vendría de una BD
// Cada dueño tiene asignadas una o más canchas

export interface DuenoCancha {
  id: string;
  nombre: string;
  email: string;
  password: string;
  canchaIds: string[]; // IDs de las canchas que administra
}

const OWNER_SESSION_KEY = 'cp_owner_session';

export const DUENOS: DuenoCancha[] = [
  {
    id: 'owner-1',
    nombre: 'Carlos Mendoza',
    email: 'carlos@algarrobos.com',
    password: 'cancha123',
    canchaIds: ['1', '7'],
  },
  {
    id: 'owner-2',
    nombre: 'María Torres',
    email: 'maria@arenasport.com',
    password: 'cancha123',
    canchaIds: ['2', '6'],
  },
  {
    id: 'owner-3',
    nombre: 'Pedro Sánchez',
    email: 'pedro@clubvoley.com',
    password: 'cancha123',
    canchaIds: ['3', '8'],
  },
  {
    id: 'owner-4',
    nombre: 'Ana Flores',
    email: 'ana@piurabasket.com',
    password: 'cancha123',
    canchaIds: ['4', '5'],
  },
];

export function loginOwner(email: string, password: string): DuenoCancha | null {
  const dueno = DUENOS.find(d => d.email === email && d.password === password);
  if (dueno) {
    localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify(dueno));
    return dueno;
  }
  return null;
}

export function getOwnerSession(): DuenoCancha | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(OWNER_SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

export function isOwner(): boolean {
  return getOwnerSession() !== null;
}

export function logoutOwner(): void {
  localStorage.removeItem(OWNER_SESSION_KEY);
}
