export type DiaSemanaKey =
  | "domingo"
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado";

// Índice = Date.getDay() (0 = domingo … 6 = sábado)
const DIAS_SEMANA_KEYS: DiaSemanaKey[] = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

/**
 * Día de la semana (español, sin tildes, minúsculas) para una fecha "YYYY-MM-DD".
 * Parseo LOCAL (no UTC) — mismo patrón que addDaysToDateString en date-utils.ts,
 * necesario porque un string sin hora interpretado como UTC puede correr el día
 * en zonas con offset negativo (Perú es UTC-5).
 */
export function getDiaSemana(fecha: string): DiaSemanaKey {
  return DIAS_SEMANA_KEYS[new Date(fecha + "T00:00:00").getDay()];
}

export type PrecioDiaConfig = {
  base?: number;
  precios_por_hora?: Record<string, number>;
};

export type PreciosPorDia = Partial<Record<DiaSemanaKey, PrecioDiaConfig>>;

/** Forma común a `canchas` y `cancha_secciones` — usable para ambas. */
export type PrecioConfigurable = {
  precio_por_hora: number;
  precios_por_hora?: Record<string, number> | null;
  precios_por_dia?: PreciosPorDia | null;
};

/**
 * Resuelve el precio efectivo para (fecha, hora), en orden de prioridad:
 * 1. precio de esa hora en el día de semana de `fecha`
 * 2. precio base de ese día de semana
 * 3. precio de esa hora "de siempre" (todos los días)
 * 4. precio base "de siempre"
 */
export function resolverPrecio(
  config: PrecioConfigurable,
  fecha: string,
  hora: string,
): number {
  const dia = getDiaSemana(fecha);
  const cfgDia = config.precios_por_dia?.[dia];
  return (
    cfgDia?.precios_por_hora?.[hora] ??
    cfgDia?.base ??
    config.precios_por_hora?.[hora] ??
    config.precio_por_hora
  );
}
