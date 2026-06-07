/**
 * Utilidades para evaluar bloqueos administrativos.
 * Se usa tanto en los endpoints de disponibilidad como en la UI.
 */

export type BloqueoAdmin = {
  id: string;
  cancha_id: string;
  tipo: 'permanente' | 'fecha_especifica' | 'recurrente_semanal';
  fecha?: string | null;          // 'YYYY-MM-DD'
  dia_semana?: number | null;     // 0=Dom … 6=Sáb
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  hora_inicio: string;            // 'HH:MM'
  hora_fin?: string | null;       // 'HH:MM' o null
  motivo?: string | null;
  creado_en?: string;
};

/** Días de la semana en español (índice 0 = Domingo) */
export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Horas disponibles en la app */
export const HORAS_APP = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00','23:00',
];

/** Filtra HORAS_APP según el horario de operación de la cancha */
export function getHorasOperacion(horaApertura = '06:00', horaCierre = '23:00'): string[] {
  return HORAS_APP.filter(h => h >= horaApertura && h <= horaCierre);
}

/**
 * Dado un bloqueo y una fecha+hora, determina si ese slot está bloqueado.
 * @param bloqueo  Registro de bloqueo_admin
 * @param fecha    'YYYY-MM-DD'
 * @param hora     'HH:MM'
 */
export function estaBloquedoPor(bloqueo: BloqueoAdmin, fecha: string, hora: string): boolean {
  // Verificar si la hora cae dentro del rango del bloqueo
  if (!horaEnRango(hora, bloqueo.hora_inicio, bloqueo.hora_fin)) return false;

  switch (bloqueo.tipo) {
    case 'permanente':
      return true;

    case 'fecha_especifica':
      return bloqueo.fecha === fecha;

    case 'recurrente_semanal': {
      // Verificar día de semana
      const diaSemanaFecha = new Date(fecha + 'T00:00:00').getDay(); // 0=Dom
      if (bloqueo.dia_semana !== diaSemanaFecha) return false;

      // Verificar rango de fechas
      if (bloqueo.fecha_desde && fecha < bloqueo.fecha_desde) return false;
      if (bloqueo.fecha_hasta && fecha > bloqueo.fecha_hasta) return false;

      return true;
    }

    default:
      return false;
  }
}

/**
 * Verifica si una hora cae dentro del rango [inicio, fin).
 * Si fin es null, solo verifica igualdad con inicio.
 */
function horaEnRango(hora: string, inicio: string, fin?: string | null): boolean {
  // Normalizar a 'HH:MM' (quitar segundos si los hay)
  const normalizar = (h: string) => h.substring(0, 5);
  const h = normalizar(hora);
  const i = normalizar(inicio);

  if (!fin) return h === i;

  const f = normalizar(fin);
  return h >= i && h < f;
}

/**
 * Dado un array de bloqueos y una fecha, retorna las horas bloqueadas.
 */
export function horasBloqueadasEnFecha(bloqueos: BloqueoAdmin[], fecha: string): string[] {
  return HORAS_APP.filter(hora =>
    bloqueos.some(b => estaBloquedoPor(b, fecha, hora))
  );
}

/**
 * Etiqueta legible para un bloqueo.
 */
export function labelBloqueo(b: BloqueoAdmin): string {
  const rango = b.hora_fin ? `${b.hora_inicio} – ${b.hora_fin}` : b.hora_inicio;

  switch (b.tipo) {
    case 'permanente':
      return `Permanente · ${rango}`;
    case 'fecha_especifica': {
      const d = new Date((b.fecha ?? '') + 'T00:00:00');
      const label = d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
      return `${label} · ${rango}`;
    }
    case 'recurrente_semanal': {
      const dia = DIAS_SEMANA[b.dia_semana ?? 0];
      const desde = b.fecha_desde ? ` desde ${b.fecha_desde}` : '';
      const hasta = b.fecha_hasta ? ` hasta ${b.fecha_hasta}` : '';
      return `Cada ${dia}${desde}${hasta} · ${rango}`;
    }
  }
}
