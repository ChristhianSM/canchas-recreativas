'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import StarRating from '@/components/star-rating';
import { getToken } from '@/lib/api';

interface Props {
  canchaId: string;
}

interface Resena {
  id: string;
  estrellas: number;
  comentario: string | null;
  creado_en: string;
  usuario_id: string;
  usuario_nombre: string | null;
}

interface ResenaData {
  total: number;
  promedio: number;
  distribucion: Record<number, number>;
  miCalificacion: number | null;
  miComentario: string | null;
  resenas: Resena[];
}

export default function CalificarCancha({ canchaId }: Props) {
  const [data, setData] = useState<ResenaData>({
    total: 0, promedio: 0,
    distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    miCalificacion: null, miComentario: null, resenas: [],
  });
  const [seleccion, setSeleccion]   = useState(0);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading]       = useState(false);
  const [enviado, setEnviado]       = useState(false);
  const [error, setError]           = useState('');
  const [usuario, setUsuario]       = useState(false);
  const [selloGanado, setSelloGanado] = useState(false);

  useEffect(() => {
    const token = getToken();
    setUsuario(!!token);

    fetch(`/api/resenas?cancha_id=${canchaId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => {
        if (d.total !== undefined) {
          setData({
            total: d.total,
            promedio: d.promedio,
            distribucion: d.distribucion ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            miCalificacion: d.miCalificacion ?? null,
            miComentario: d.miComentario ?? null,
            resenas: d.resenas ?? [],
          });
          if (d.miCalificacion) {
            setSeleccion(d.miCalificacion);
            setEnviado(true);
          }
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
      body: JSON.stringify({ canchaId, estrellas: seleccion, comentario: comentario.trim() || null }),
    });

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error || 'Error al enviar calificación');
      return;
    }

    setEnviado(true);
    if (result.selloGanado) setSelloGanado(true);
    setData(prev => {
      const nuevaDistribucion = { ...prev.distribucion, [seleccion]: (prev.distribucion[seleccion] || 0) + 1 };
      return {
        ...prev,
        total: prev.total + 1,
        promedio: Math.round(((prev.promedio * prev.total + seleccion) / (prev.total + 1)) * 10) / 10,
        distribucion: nuevaDistribucion,
        miCalificacion: seleccion,
        miComentario: comentario.trim() || null,
      };
    });
  };

  const resenasConComentario = data.resenas.filter(r => r.comentario);
  const [verTodos, setVerTodos] = useState(false);
  const LIMITE = 3;

  return (
    <Card className="p-5 space-y-4">
      {/* Resumen */}
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

        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map(n => {
            const cantidad = data.distribucion[n] || 0;
            const pct = data.total > 0 ? (cantidad / data.total) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-2 text-muted-foreground">{n}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                {data.total > 0 && cantidad > 0 && (
                  <span className="text-muted-foreground w-4">{cantidad}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulario / estado */}
      {!usuario ? (
        <p className="text-sm text-muted-foreground text-center">
          <a href="/login" className="text-primary hover:underline font-medium">Inicia sesión</a> para calificar esta cancha
        </p>
      ) : enviado ? (
        <div className="rounded-lg bg-muted/40 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <StarRating value={seleccion} readonly size="md" />
            <span className="text-sm font-medium text-green-600">Tu calificación</span>
          </div>
          {data.miComentario && (
            <p className="text-sm text-foreground italic">"{data.miComentario}"</p>
          )}
          <p className="text-xs text-muted-foreground">No es posible cambiar la calificación.</p>
          {selloGanado && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2">
              <span className="text-lg">🏅</span>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">¡Ganaste 1 sello por tu reseña!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">¿Cómo calificarías esta cancha?</p>
          <StarRating value={seleccion} onChange={setSeleccion} size="lg" />
          <textarea
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Deja un comentario (opcional)..."
            rows={3}
            maxLength={300}
            value={comentario}
            onChange={e => setComentario(e.target.value)}
          />
          {comentario.length > 0 && (
            <p className="text-xs text-muted-foreground text-right">{comentario.length}/300</p>
          )}
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
            Solo disponible si ya jugaste aquí (reserva o partido)
          </p>
        </div>
      )}

      {/* Lista de comentarios */}
      {resenasConComentario.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">
            Comentarios ({resenasConComentario.length})
          </p>
          {resenasConComentario.slice(0, verTodos ? undefined : LIMITE).map(r => (
            <div key={r.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <StarRating value={r.estrellas} readonly size="sm" />
                <span className="text-xs font-medium text-foreground">
                  {r.usuario_nombre
                    ? (() => {
                        const partes = r.usuario_nombre.trim().split(' ');
                        return partes.length > 1
                          ? `${partes[0]} ${partes[1][0]}.`
                          : partes[0];
                      })()
                    : 'Usuario'}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(r.creado_en).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{r.comentario}</p>
            </div>
          ))}
          {resenasConComentario.length > LIMITE && (
            <button
              onClick={() => setVerTodos(v => !v)}
              className="text-xs text-primary hover:underline w-full text-center pt-1"
            >
              {verTodos ? 'Ver menos' : `Ver ${resenasConComentario.length - LIMITE} comentarios más`}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
