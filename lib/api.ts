'use client';

import { getAdminTokenFresh } from '@/lib/supabase-browser';
import type {
  CrearPublicacionBody,
  NoticiasQueryParams,
  PublicacionEstado,
} from '@/lib/publicaciones';

// ── Helper para obtener el token guardado ──────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_token');
}

export function getOwnerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_owner_token');
}

export function saveToken(token: string) {
  localStorage.setItem('cp_token', token);
  // Guardar timestamp de cuando se guardó el token
  localStorage.setItem('cp_token_time', Date.now().toString());
}

export function removeToken() {
  localStorage.removeItem('cp_token');
  localStorage.removeItem('cp_user');
  localStorage.removeItem('cp_token_time');
}

export function signalUnauthorized() {
  removeToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-login'));
  }
}

/**
 * Verifica si el token probablemente expiró basándose en el tiempo
 * Supabase tokens expiran en 1 hora por defecto
 * Retorna true si probablemente expiró (sin hacer consulta a BD)
 */
export function isTokenLikelyExpired(): boolean {
  if (typeof window === 'undefined') return false;
  
  const tokenTime = localStorage.getItem('cp_token_time');
  if (!tokenTime) return false;
  
  const elapsed = Date.now() - Number(tokenTime);
  const oneHour = 60 * 60 * 1000; // 1 hora en milisegundos
  
  // Si pasó más de 55 minutos, considerarlo expirado (margen de seguridad)
  return elapsed > (oneHour - 5 * 60 * 1000);
}

/**
 * Valida si el token actual es válido
 * SOLO USAR cuando realmente necesites validar (ej: después de un error 401)
 * NO usar en cada carga de página
 */
export async function validateToken(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  // Primero verificar si probablemente expiró (sin consulta)
  if (isTokenLikelyExpired()) {
    removeToken();
    return false;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      // Token inválido — limpiar
      removeToken();
      return false;
    }

    // Token válido — actualizar timestamp
    localStorage.setItem('cp_token_time', Date.now().toString());
    return true;
  } catch (error) {
    console.error('Error validando token:', error);
    return false;
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function ownerAuthHeaders(): Record<string, string> {
  const token = getOwnerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function removeOwnerToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cp_owner_token');
  localStorage.removeItem('cp_owner_user');
}

export function handleOwnerUnauthorized() {
  removeOwnerToken();
  if (typeof window !== 'undefined') {
    window.location.replace('/admin-cancha/login');
  }
}

/** Fetch autenticado del panel dueño; redirige al login si el token expiró (401). */
export async function ownerFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...ownerAuthHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (res.status === 401) {
    handleOwnerUnauthorized();
    throw new Error('SESSION_EXPIRED');
  }
  return res;
}

async function adminAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAdminTokenFresh();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
// ── Auth ───────────────────────────────────────────────────────

export async function apiRegistro(data: {
  nombre: string; email: string; password: string; telefono: string;
}) {
  const res = await fetch('/api/auth/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.token) {
    saveToken(data.token);
    localStorage.setItem('cp_user', JSON.stringify(data.user));
  }
  return data;
}

export function apiLogout() {
  removeToken();
}

export async function apiLoginWithOAuth(provider: 'google' | 'facebook') {
  const { createBrowserClient } = await import('@supabase/ssr');
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
    },
  });
  if (error) console.error('[oauth]', error.message);
  return data;
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const d = localStorage.getItem('cp_user');
  return d ? JSON.parse(d) : null;
}

// ── Reservas ───────────────────────────────────────────────────

export async function apiGetReservas() {
  const res = await fetch('/api/reservas', { headers: authHeaders() });
  if (res.status === 401) { signalUnauthorized(); return []; }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function apiGetHistorial(page = 0, limit = 10) {
  const res = await fetch(`/api/reservas?tipo=historial&page=${page}&limit=${limit}`, { headers: authHeaders() });
  if (res.status === 401) { signalUnauthorized(); return { items: [], total: 0 }; }
  const data = await res.json();
  return { items: data.items ?? [], total: data.total ?? 0 };
}

export async function apiCrearReserva(data: {
  canchaId: string; canchaNombre: string; fecha: string; hora: string; horas?: number;
  precio: number; precioOriginal?: number; canchaCuponId?: string | null;
  accesoriosIncluidos?: { id: string; nombre: string; icono: string; precio: number | null }[];
  metodoPago: string; comprobanteUrl?: string | null;
  emailInvitado?: string; telefonoInvitado?: string;
  whatsappInvitado?: string;
  metodoDevolucion?: string;
  telefonoDevolucion?: string;
  actualizarTelefono?: boolean;
  nuevoTelefono?: string;
  balonIncluido?: boolean;
  chalecosIncluido?: boolean;
  modoPago?: 'completo' | 'parcial';
  montoAdelanto?: number;
  saldoPendiente?: number;
}) {
  const { modoPago, montoAdelanto, saldoPendiente, ...rest } = data;
  const body: Record<string, unknown> = { ...rest };
  if (modoPago !== undefined)    body.modo_pago       = modoPago;
  if (montoAdelanto !== undefined) body.monto_adelanto = montoAdelanto;
  if (saldoPendiente !== undefined) body.saldo_pendiente = saldoPendiente;

  const res = await fetch('/api/reservas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiActualizarReserva(id: string, estado: string) {
  const res = await fetch(`/api/reservas/update?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ estado }),
  });
  return res.json();
}

// ── Notificaciones ─────────────────────────────────────────────

export async function apiGetNotificaciones() {
  const res = await fetch('/api/notificaciones', { headers: authHeaders() });
  return res.json();
}

export async function apiMarcarNotifLeida(id: string) {
  await fetch('/api/notificaciones', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ id }),
  });
}

// ── Loyalty ────────────────────────────────────────────────────

export async function apiGetLoyalty() {
  const res = await fetch('/api/loyalty', { headers: authHeaders() });
  return res.json();
}

// ── Favoritos ──────────────────────────────────────────────────

export async function apiGetFavoritos() {
  const res = await fetch('/api/favoritos', { headers: authHeaders() });
  return res.json();
}

export async function apiToggleFavorito(canchaId: string) {
  const res = await fetch('/api/favoritos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ canchaId }),
  });
  const data = await res.json();
  if (res.ok && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('notifications-update'));
  }
  return data;
}

// ── Partidos ───────────────────────────────────────────────────

export async function apiGetMisPartidos() {
  const res = await fetch('/api/partidos/mis-partidos', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function apiGetMisPartidosHistorial(page = 0, limit = 10) {
  const res = await fetch(`/api/partidos/mis-partidos?tipo=historial&page=${page}&limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) return { items: [], total: 0 };
  const data = await res.json();
  return { items: data.items ?? [], total: data.total ?? 0 };
}

// ── Admin cancha ───────────────────────────────────────────────

export async function apiOwnerGetReservas() {
  const res = await fetch('/api/admin-cancha/reservas', { headers: authHeaders() });
  return res.json();
}

export async function apiOwnerGetCanchas() {
  const res = await fetch('/api/admin-cancha/canchas', { headers: authHeaders() });
  return res.json();
}

export async function apiOwnerEditarCancha(id: string, data: object) {
  const res = await fetch(`/api/admin-cancha/canchas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiOwnerGetNoticias() {
  const res = await ownerFetch('/api/admin-cancha/noticias');
  return res.json();
}

export async function apiOwnerGetNoticiaPorSlug(slug: string) {
  const res = await ownerFetch(`/api/admin-cancha/noticias/${slug}`);
  return res.json();
}

export async function apiOwnerCrearNoticia(data: CrearPublicacionBody) {
  const res = await ownerFetch('/api/admin-cancha/noticias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiOwnerActualizarEstadoNoticia(
  slug: string,
  estado: PublicacionEstado
) {
  const res = await ownerFetch(`/api/admin-cancha/noticias/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });
  return res.json();
}

export async function apiOwnerEliminarNoticia(slug: string) {
  const res = await ownerFetch(`/api/admin-cancha/noticias/${slug}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function apiOwnerEditarNoticia(slug: string, data: CrearPublicacionBody) {
  const res = await ownerFetch(`/api/admin-cancha/noticias/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiOwnerUploadPublicacionImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await ownerFetch('/api/admin-cancha/noticias/upload', {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// ── Super admin ───────────────────────────────────────────────

export async function apiAdminGetNoticias() {
  const res = await fetch('/api/admin/noticias', {
    headers: await adminAuthHeaders(),
  });
  return res.json();
}

export async function apiAdminGetNoticiaPorSlug(slug: string) {
  const res = await fetch(`/api/admin/noticias/${slug}`, {
    headers: await adminAuthHeaders(),
  });
  return res.json();
}

export async function apiAdminCrearNoticia(data: CrearPublicacionBody) {
  const res = await fetch('/api/admin/noticias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await adminAuthHeaders()) },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiAdminActualizarEstadoNoticia(
  slug: string,
  estado: PublicacionEstado
) {
  const res = await fetch(`/api/admin/noticias/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await adminAuthHeaders()) },
    body: JSON.stringify({ estado }),
  });
  return res.json();
}

export async function apiAdminEliminarNoticia(slug: string) {
  const res = await fetch(`/api/admin/noticias/${slug}`, {
    method: 'DELETE',
    headers: await adminAuthHeaders(),
  });
  return res.json();
}

export async function apiAdminEditarNoticia(slug: string, data: CrearPublicacionBody) {
  const res = await fetch(`/api/admin/noticias/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await adminAuthHeaders()) },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiAdminUploadPublicacionImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/admin/noticias/upload', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: formData,
  });
  return res.json();
}

// ── Noticias públicas ───────────────────────────────────────────

export async function apiGetNoticias(params: NoticiasQueryParams = {}) {
  const search = new URLSearchParams();
  if (params.tipo) search.set('tipo', params.tipo);
  if (params.deporte) search.set('deporte', params.deporte);

  const query = search.toString();
  const res = await fetch(`/api/noticias${query ? `?${query}` : ''}`);
  return res.json();
}

export async function apiGetNoticiaPorSlug(slug: string) {
  const res = await fetch(`/api/noticias/${slug}`);
  return res.json();
}
