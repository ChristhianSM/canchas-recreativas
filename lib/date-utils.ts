/**
 * Obtiene la fecha en formato YYYY-MM-DD usando la zona horaria de Perú (America/Lima, UTC-5).
 * Necesario porque Vercel corre en UTC y sin esto las queries de "hoy" fallan después de las 7 PM hora peruana.
 */
export function getLocalDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

/**
 * Suma días a una fecha y retorna en formato YYYY-MM-DD
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}
