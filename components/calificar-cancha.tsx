'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import StarRating from '@/components/star-rating';
import { getToken } from '@/lib/api';

interface Props {
  canchaId: string;
}

interface ResenaData {
  total: number;
  promedio: number;
  distribucion: Record<number, number>;
}

export default function CalificarCancha({ canchaId }: Props) {
  const [data, setData]           = useState<ResenaData>({ total: 0, promedio: 0, distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [seleccion, setSeleccion] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [enviado, setEnviado]     = useState(false);
  const [error, setError]         = useState('');
  const [usuario, setUsuario]     = useState(false);

  useEffect(() => {
    const token = getToken();
    setUsuario(!!token);

    fetch(`/api/resenas?cancha_id=${canchaId}`)
      .then(r => r.json())
      .then(d => {
        if (d.total !== undefined) {
          setData({ 
            total: d.total, 
            promedio: d.promedio,
            distribucion: d.distribucion ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          });
        }
      });
  }, [canchaId]);

  const handleCalificar = async () => {
    if (!seleccion) return;
    setLoading(true);
    setError('');

    const token = getToken();
    const res = await fetch('/api/resenas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ canchaId, estrellas: seleccion }),
    });

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error || 'Error al enviar calificación');
      return;
    }

    setEnviado(true);
    setData(prev => {
      const nuevaDistribucion = { ...prev.distribucion, [seleccion]: (prev.distribucion[seleccion] || 0) + 1 };
      return {
        total: prev.total + 1,
        promedio: Math.round(((prev.promedio * prev.total + seleccion) / (prev.total + 1)) * 10) / 10,
        distribucion: nuevaDistribucion,
      };
    });
  };

  return (
    <Card className="p-5 space-y-4">
      {/* Resumen con gráfico — siempre visible */}
      <div className="flex items-center gap-4">
        <div className="text-center min-w-[60px]">
          <p className="text-4xl font-bold text-foreground">
            {data.total > 0 ? data.promedio : '—'}
          </p>
          <StarRating value={data.promedio} readonly size="sm" />
          <p className="mt-1 text-xs text-muted-foreground">
            {data.total} {data.total === 1 ? 'calificación' : 'calificaciones'}
          </p>
        </div>

        {/* Distribución visual — siempre visible */}
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map(n => {
            const cantidad = data.distribucion[n] || 0;
            const pct = data.total > 0 ? (cantidad / data.total) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-2 text-muted-foreground">{n}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-yellow-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {data.total > 0 && cantidad > 0 && (
                  <span className="text-muted-foreground w-4">{cantidad}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulario */}
      {!usuario ? (
        <p className="text-sm text-muted-foreground text-center">
          <a href="/login" className="text-primary hover:underline font-medium">Inicia sesión</a> para calificar esta cancha
        </p>
      ) : enviado ? (
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-green-600">✅ ¡Gracias por tu calificación!</p>
          <StarRating value={seleccion} readonly size="md" />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">¿Cómo calificarías esta cancha?</p>
          <StarRating value={seleccion} onChange={setSeleccion} size="lg" />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            size="sm"
            onClick={handleCalificar}
            disabled={!seleccion || loading}
            className="w-full"
          >
            {loading ? 'Enviando...' : seleccion ? `Calificar con ${seleccion} estrella${seleccion > 1 ? 's' : ''}` : 'Selecciona una calificación'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Solo disponible para usuarios con reservas confirmadas
          </p>
        </div>
      )}
    </Card>
  );
}
