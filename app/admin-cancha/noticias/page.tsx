'use client';

import { useCallback, useEffect, useState } from 'react';
import { Newspaper, Plus } from 'lucide-react';
import { CrearPublicacionDialog } from '@/components/publicaciones/crear-publicacion-dialog';
import { PublicacionCard } from '@/components/publicaciones/publicacion-card';
import { PublicacionDetalleModal } from '@/components/publicaciones/publicacion-detalle-modal';
import {
  PUBLICACION_DEPORTE_LABELS,
  PUBLICACION_TIPO_LABELS,
} from '@/components/publicaciones/publicacion-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiOwnerGetNoticiaPorSlug, apiOwnerGetNoticias } from '@/lib/api';
import {
  PUBLICACION_DEPORTES,
  PUBLICACION_TIPOS,
  type Publicacion,
  type PublicacionDeporte,
  type PublicacionEstado,
  type PublicacionTipo,
} from '@/lib/publicaciones';

export default function OwnerNoticiasPage() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [publicacionSeleccionada, setPublicacionSeleccionada] = useState<Publicacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState('');
  const [crearOpen, setCrearOpen] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<'todos' | PublicacionEstado>('todos');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | PublicacionTipo>('todos');
  const [deporteFiltro, setDeporteFiltro] = useState<'todos' | PublicacionDeporte>('todos');

  const loadPublicaciones = useCallback((showLoading = false) => {
    if (showLoading) setLoading(true);

    apiOwnerGetNoticias()
      .then(data => {
        if (Array.isArray(data)) {
          setPublicaciones(data);
          setError('');
          return;
        }

        setPublicaciones([]);
        setError(data?.error ?? 'No se pudieron cargar las publicaciones');
      })
      .catch(() => {
        setPublicaciones([]);
        setError('No se pudieron cargar las publicaciones');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPublicaciones(true);
  }, [loadPublicaciones]);

  const publicacionesFiltradas = publicaciones.filter(publicacion => {
    if (estadoFiltro !== 'todos' && publicacion.estado !== estadoFiltro) return false;
    if (tipoFiltro !== 'todos' && publicacion.tipo !== tipoFiltro) return false;
    if (deporteFiltro !== 'todos' && publicacion.deporte !== deporteFiltro) return false;
    return true;
  });

  const handleOpenDetalle = async (publicacion: Publicacion) => {
    setPublicacionSeleccionada(null);
    setDetalleError('');
    setDetalleOpen(true);
    setDetalleLoading(true);

    try {
      const data = await apiOwnerGetNoticiaPorSlug(publicacion.slug);

      if (data?.error) {
        setDetalleError(data.error ?? 'No se pudo cargar el detalle');
        return;
      }

      setPublicacionSeleccionada(data);
    } catch {
      setDetalleError('No se pudo cargar el detalle');
    } finally {
      setDetalleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publicaciones</h1>
          <p className="text-muted-foreground">Gestiona noticias, torneos, eventos y promociones de tus canchas</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(item => (
            <Card key={item} className="h-56 animate-pulse border-border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publicaciones</h1>
          <p className="text-muted-foreground">Gestiona noticias, torneos, eventos y promociones de tus canchas</p>
        </div>
        <Button onClick={() => setCrearOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Crear publicación
        </Button>
      </div>

      <Card className="border-border p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={estadoFiltro} onValueChange={value => setEstadoFiltro(value as 'todos' | PublicacionEstado)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="publicado">Publicadas</SelectItem>
              <SelectItem value="borrador">Borradores</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tipoFiltro} onValueChange={value => setTipoFiltro(value as 'todos' | PublicacionTipo)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {PUBLICACION_TIPOS.map(tipo => (
                <SelectItem key={tipo} value={tipo}>
                  {PUBLICACION_TIPO_LABELS[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={deporteFiltro} onValueChange={value => setDeporteFiltro(value as 'todos' | PublicacionDeporte)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Deporte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los deportes</SelectItem>
              {PUBLICACION_DEPORTES.map(deporte => (
                <SelectItem key={deporte} value={deporte}>
                  {PUBLICACION_DEPORTE_LABELS[deporte]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {error ? (
        <Card className="border-border p-8 text-center">
          <p className="text-destructive">{error}</p>
        </Card>
      ) : publicaciones.length === 0 ? (
        <Card className="border-border p-12 text-center">
          <Newspaper className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">Aún no tienes publicaciones</p>
          <p className="mt-1 text-sm text-muted-foreground">Cuando crees noticias o eventos aparecerán aquí.</p>
        </Card>
      ) : publicacionesFiltradas.length === 0 ? (
        <Card className="border-border p-10 text-center">
          <p className="font-medium text-foreground">No hay publicaciones con esos filtros</p>
          <p className="mt-1 text-sm text-muted-foreground">Prueba cambiando el estado, tipo o deporte.</p>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {publicacionesFiltradas.map(publicacion => (
            <PublicacionCard
              key={publicacion.id}
              publicacion={publicacion}
              variant="admin"
              onOpenDetail={handleOpenDetalle}
            />
          ))}
        </div>
      )}

      <PublicacionDetalleModal
        publicacion={publicacionSeleccionada}
        open={detalleOpen}
        onOpenChange={open => {
          setDetalleOpen(open);
          if (!open) {
            setPublicacionSeleccionada(null);
            setDetalleError('');
            setDetalleLoading(false);
          }
        }}
        variant="admin"
        loading={detalleLoading}
        error={detalleError}
      />
      <CrearPublicacionDialog
        open={crearOpen}
        onOpenChange={setCrearOpen}
        onCreated={() => loadPublicaciones()}
      />
    </div>
  );
}
