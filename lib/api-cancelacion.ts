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
  
  const response = await fetch(`/api/reservas/${reservaId}/cancelar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al cancelar reserva');
  }

  return response.json();
}