// Función simple para cancelar reservas

export interface CancelacionResponse {
  success: boolean;
  devolucion: number;
  penalidad: number;
  porcentaje_devolucion: number;
  motivo: string;
  mensaje: string;
  warning?: string;
}

export async function apiCancelarReserva(reservaId: string): Promise<CancelacionResponse> {
  const token = localStorage.getItem('cp_token');
  
  console.log('🚀 Iniciando cancelación de reserva:', reservaId);
  
  const response = await fetch(`/api/reservas/${reservaId}/cancelar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  console.log('📡 Respuesta del servidor:', response.status, response.statusText);

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Error del servidor:', error);
    
    // Si hay información de debug, mostrarla
    if (error.debug) {
      console.log('🐛 Información de debug:', error.debug);
    }
    
    throw new Error(error.error || 'Error al cancelar reserva');
  }

  const result = await response.json();
  console.log('✅ Cancelación exitosa:', result);
  return result;
}