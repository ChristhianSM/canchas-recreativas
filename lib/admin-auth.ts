'use client';

// Credenciales de admin hardcodeadas para el MVP
// En producción esto sería un JWT con backend
const ADMIN_KEY = 'cp_admin_session';

export const ADMIN_CREDENTIALS = {
  email: 'admin@canchapiura.com',
  password: 'admin123',
};

export function loginAdmin(email: string, password: string): boolean {
  if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
    localStorage.setItem(ADMIN_KEY, 'true');
    return true;
  }
  return false;
}

export function isAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_KEY) === 'true';
}

export function logoutAdmin(): void {
  localStorage.removeItem(ADMIN_KEY);
}
