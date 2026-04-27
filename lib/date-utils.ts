/**
 * Obtiene la fecha actual en formato YYYY-MM-DD usando la zona horaria local
 * (sin conversión a UTC que causaría desfase)
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Suma días a una fecha y retorna en formato YYYY-MM-DD
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}
