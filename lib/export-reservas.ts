import * as XLSX from 'xlsx';

export type FilaReservaExcel = Record<string, string | number>;

export type ResumenExcel = {
  total: number;
  ingresos: number;
  confirmadas: number;
  canceladas: number;
};

export function exportarReservasExcel(
  filas: FilaReservaExcel[],
  nombre: string,
  resumen?: ResumenExcel,
) {
  if (filas.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(filas);

  const keys = Object.keys(filas[0]);
  ws['!cols'] = keys.map(k => ({
    wch: Math.max(k.length, ...filas.map(f => String(f[k] ?? '').length)) + 2,
  }));

  if (resumen) {
    // Fila en blanco + bloque de resumen debajo de los datos
    const origenFila = filas.length + 2; // +1 header, +1 fila en blanco
    XLSX.utils.sheet_add_aoa(ws, [
      ['RESUMEN'],
      ['Total de reservas',              resumen.total],
      ['Confirmadas',                    resumen.confirmadas],
      ['Canceladas',                     resumen.canceladas],
      ['Ingresos confirmados (S/)',       resumen.ingresos],
    ], { origin: { r: origenFila, c: 0 } });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reservas');
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}
