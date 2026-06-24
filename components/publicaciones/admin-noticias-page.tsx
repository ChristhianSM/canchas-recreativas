'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  Loader2,
  Newspaper,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  apiAdminActualizarEstadoNoticia,
  apiAdminEliminarNoticia,
  apiAdminGetNoticiaPorSlug,
  apiAdminGetNoticias,
  apiOwnerActualizarEstadoNoticia,
  apiOwnerEliminarNoticia,
  apiOwnerGetNoticiaPorSlug,
  apiOwnerGetNoticias,
} from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import {
  PUBLICACION_DEPORTES,
  PUBLICACION_TIPOS,
  type Publicacion,
  type PublicacionDeporte,
  type PublicacionEstado,
  type PublicacionTipo,
} from '@/lib/publicaciones';

import type { AdminNoticiasPanel } from '@/lib/publicaciones-panel';

type AdminNoticiasPageProps = {
  panel: AdminNoticiasPanel;
};

function AdminNoticiasPageInner({ panel }: AdminNoticiasPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedSlugRef = useRef<string | null>(null);

  const config = useMemo(() => {
    const basePath =
      panel === 'owner' ? '/admin-cancha/noticias' : '/admin/noticias';
    const subtitle =
      panel === 'owner'
        ? 'Gestiona noticias, torneos, eventos y promociones de tus canchas'
        : 'Gestiona publicaciones de todas las canchas de la plataforma';

    if (panel === 'owner') {
      return {
        basePath,
        subtitle,
        getNoticias: apiOwnerGetNoticias,
        getNoticiaPorSlug: apiOwnerGetNoticiaPorSlug,
        actualizarEstado: apiOwnerActualizarEstadoNoticia,
        eliminarNoticia: apiOwnerEliminarNoticia,
      };
    }

    return {
      basePath,
      subtitle,
      getNoticias: apiAdminGetNoticias,
      getNoticiaPorSlug: apiAdminGetNoticiaPorSlug,
      actualizarEstado: apiAdminActualizarEstadoNoticia,
      eliminarNoticia: apiAdminEliminarNoticia,
    };
  }, [panel]);

  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [publicacionSeleccionada, setPublicacionSeleccionada] =
    useState<Publicacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [publicacionAEditar, setPublicacionAEditar] =
    useState<Publicacion | null>(null);
  const [actualizandoEstadoSlug, setActualizandoEstadoSlug] = useState<
    string | null
  >(null);
  const [publicacionCambioEstado, setPublicacionCambioEstado] =
    useState<Publicacion | null>(null);
  const [publicacionAEliminar, setPublicacionAEliminar] =
    useState<Publicacion | null>(null);
  const [eliminandoSlug, setEliminandoSlug] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<'todos' | PublicacionEstado>(
    'todos'
  );
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | PublicacionTipo>(
    'todos'
  );
  const [deporteFiltro, setDeporteFiltro] = useState<
    'todos' | PublicacionDeporte
  >('todos');

  const loadPublicaciones = useCallback(
    (showLoading = false) => {
      if (showLoading) setLoading(true);

      config
        .getNoticias()
        .then((data) => {
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
    },
    [config]
  );

  useEffect(() => {
    loadPublicaciones(true);
  }, [loadPublicaciones]);

  const publicacionesFiltradas = publicaciones.filter((publicacion) => {
    if (estadoFiltro !== 'todos' && publicacion.estado !== estadoFiltro)
      return false;
    if (tipoFiltro !== 'todos' && publicacion.tipo !== tipoFiltro) return false;
    if (deporteFiltro !== 'todos' && publicacion.deporte !== deporteFiltro)
      return false;
    return true;
  });

  const openDetalleBySlug = useCallback(
    async (slug: string) => {
      setPublicacionSeleccionada(null);
      setDetalleError('');
      setDetalleOpen(true);
      setDetalleLoading(true);

      try {
        const data = await config.getNoticiaPorSlug(slug);

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
    },
    [config]
  );

  useEffect(() => {
    const slug = searchParams.get('slug');
    if (!slug || processedSlugRef.current === slug) return;

    processedSlugRef.current = slug;
    void openDetalleBySlug(slug);
  }, [openDetalleBySlug, searchParams]);

  const handleOpenDetalle = (publicacion: Publicacion) => {
    processedSlugRef.current = publicacion.slug;
    router.replace(
      `${config.basePath}?slug=${encodeURIComponent(publicacion.slug)}`
    );
    void openDetalleBySlug(publicacion.slug);
  };

  const handleToggleEstado = async (publicacion: Publicacion) => {
    if (actualizandoEstadoSlug) return;

    const nuevoEstado: PublicacionEstado =
      publicacion.estado === 'publicado' ? 'borrador' : 'publicado';

    setActualizandoEstadoSlug(publicacion.slug);
    setError('');

    try {
      const data = await config.actualizarEstado(publicacion.slug, nuevoEstado);

      if (data?.error || !data?.publicacion) {
        const mensaje = data?.error ?? 'No se pudo actualizar el estado';
        setError(mensaje);
        toast({
          title: 'No se pudo actualizar la publicación',
          description: mensaje,
          variant: 'destructive',
          duration: 4000,
        });
        return;
      }

      setPublicaciones((prev) =>
        prev.map((item) =>
          item.id === data.publicacion.id ? data.publicacion : item
        )
      );

      setPublicacionSeleccionada((prev) =>
        prev?.id === data.publicacion.id ? data.publicacion : prev
      );

      setPublicacionCambioEstado(null);

      toast({
        title:
          nuevoEstado === 'publicado'
            ? 'Publicación publicada'
            : 'Publicación archivada',
        description: data.publicacion.titulo,
        duration: 3000,
      });
    } catch {
      setError('No se pudo actualizar el estado');
      toast({
        title: 'No se pudo actualizar la publicación',
        description: 'Intenta de nuevo.',
        variant: 'destructive',
        duration: 4000,
      });
    } finally {
      setActualizandoEstadoSlug(null);
    }
  };

  const handleSolicitarCambioEstado = (publicacion: Publicacion) => {
    setError('');
    setPublicacionCambioEstado(publicacion);
  };

  const handleSolicitarEliminar = (publicacion: Publicacion) => {
    setError('');
    setPublicacionAEliminar(publicacion);
  };

  const handleAbrirCrear = () => {
    setPublicacionAEditar(null);
    setFormOpen(true);
  };

  const handleEditar = (publicacion: Publicacion) => {
    setError('');
    setPublicacionAEditar(publicacion);
    setFormOpen(true);
  };

  const handlePublicacionActualizada = (publicacion: Publicacion) => {
    setPublicaciones((prev) =>
      prev.map((item) => (item.id === publicacion.id ? publicacion : item))
    );
    setPublicacionSeleccionada((prev) =>
      prev?.id === publicacion.id ? publicacion : prev
    );
  };

  const handleEliminar = async (publicacion: Publicacion) => {
    if (eliminandoSlug) return;

    setEliminandoSlug(publicacion.slug);
    setError('');

    try {
      const data = await config.eliminarNoticia(publicacion.slug);

      if (data?.error) {
        const mensaje = data.error ?? 'No se pudo eliminar la publicación';
        setError(mensaje);
        toast({
          title: 'No se pudo eliminar la publicación',
          description: mensaje,
          variant: 'destructive',
          duration: 4000,
        });
        return;
      }

      setPublicaciones((prev) =>
        prev.filter((item) => item.id !== publicacion.id)
      );

      if (publicacionSeleccionada?.id === publicacion.id) {
        setDetalleOpen(false);
        setPublicacionSeleccionada(null);
        setDetalleError('');
        processedSlugRef.current = null;
        if (searchParams.get('slug')) router.replace(config.basePath);
      }

      setPublicacionAEliminar(null);

      toast({
        title: 'Publicación eliminada',
        description: publicacion.titulo,
        duration: 3000,
      });
    } catch {
      setError('No se pudo eliminar la publicación');
      toast({
        title: 'No se pudo eliminar la publicación',
        description: 'Intenta de nuevo.',
        variant: 'destructive',
        duration: 4000,
      });
    } finally {
      setEliminandoSlug(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publicaciones</h1>
          <p className="text-muted-foreground">{config.subtitle}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card
              key={item}
              className="h-56 animate-pulse border-border bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  const esArchivando = publicacionCambioEstado?.estado === 'publicado';
  const ConfirmacionEstadoIcon = esArchivando ? Archive : Send;
  const confirmacionEstadoLabel = esArchivando ? 'Archivar' : 'Publicar';
  const confirmacionLoading =
    actualizandoEstadoSlug === publicacionCambioEstado?.slug;
  const eliminacionLoading = eliminandoSlug === publicacionAEliminar?.slug;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publicaciones</h1>
          <p className="text-muted-foreground">{config.subtitle}</p>
        </div>
        <Button onClick={handleAbrirCrear} className="gap-2">
          <Plus className="h-4 w-4" />
          Crear publicación
        </Button>
      </div>

      <Card className="border-border p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            value={estadoFiltro}
            onValueChange={(value) =>
              setEstadoFiltro(value as 'todos' | PublicacionEstado)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="publicado">Publicadas</SelectItem>
              <SelectItem value="borrador">Borradores</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={tipoFiltro}
            onValueChange={(value) =>
              setTipoFiltro(value as 'todos' | PublicacionTipo)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {PUBLICACION_TIPOS.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {PUBLICACION_TIPO_LABELS[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={deporteFiltro}
            onValueChange={(value) =>
              setDeporteFiltro(value as 'todos' | PublicacionDeporte)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Deporte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los deportes</SelectItem>
              {PUBLICACION_DEPORTES.map((deporte) => (
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
          <p className="font-medium text-foreground">
            {panel === 'owner'
              ? 'Aún no tienes publicaciones'
              : 'Aún no hay publicaciones'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando crees noticias o eventos aparecerán aquí.
          </p>
        </Card>
      ) : publicacionesFiltradas.length === 0 ? (
        <Card className="border-border p-10 text-center">
          <p className="font-medium text-foreground">
            No hay publicaciones con esos filtros
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prueba cambiando el estado, tipo o deporte.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {publicacionesFiltradas.map((publicacion) => (
            <PublicacionCard
              key={publicacion.id}
              publicacion={publicacion}
              variant="admin"
              onOpenDetail={handleOpenDetalle}
              onToggleEstado={handleSolicitarCambioEstado}
              onEliminar={handleSolicitarEliminar}
              onEditar={handleEditar}
            />
          ))}
        </div>
      )}

      <Dialog
        open={!!publicacionCambioEstado}
        onOpenChange={(open) => {
          if (!open && !actualizandoEstadoSlug) {
            setPublicacionCambioEstado(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ConfirmacionEstadoIcon className="h-5 w-5 text-primary" />¿
              {confirmacionEstadoLabel} publicación?
            </DialogTitle>
            <DialogDescription>
              {esArchivando
                ? 'Esta publicación dejará de mostrarse en la página pública de noticias.'
                : 'Esta publicación será visible en la página pública de noticias.'}
            </DialogDescription>
          </DialogHeader>

          {publicacionCambioEstado ? (
            <div className="space-y-4">
              <div className="space-y-1 rounded-xl bg-muted/50 p-4 text-sm">
                <p className="font-medium text-foreground">
                  {publicacionCambioEstado.titulo}
                </p>
                <p className="line-clamp-2 text-muted-foreground">
                  {publicacionCambioEstado.resumen}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={confirmacionLoading}
                  onClick={() => setPublicacionCambioEstado(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleToggleEstado(publicacionCambioEstado)}
                  disabled={confirmacionLoading}
                >
                  {confirmacionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ConfirmacionEstadoIcon className="mr-2 h-4 w-4" />
                  )}
                  {confirmacionLoading
                    ? 'Actualizando...'
                    : confirmacionEstadoLabel}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!publicacionAEliminar}
        onOpenChange={(open) => {
          if (!open && !eliminandoSlug) {
            setPublicacionAEliminar(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Eliminar publicación?
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La publicación dejará de existir
              en el panel y en la página pública de noticias.
            </DialogDescription>
          </DialogHeader>

          {publicacionAEliminar ? (
            <div className="space-y-4">
              <div className="space-y-1 rounded-xl bg-muted/50 p-4 text-sm">
                <p className="font-medium text-foreground">
                  {publicacionAEliminar.titulo}
                </p>
                <p className="line-clamp-2 text-muted-foreground">
                  {publicacionAEliminar.resumen}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={eliminacionLoading}
                  onClick={() => setPublicacionAEliminar(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleEliminar(publicacionAEliminar)}
                  disabled={eliminacionLoading}
                >
                  {eliminacionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {eliminacionLoading ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <PublicacionDetalleModal
        publicacion={publicacionSeleccionada}
        open={detalleOpen}
        onOpenChange={(open) => {
          setDetalleOpen(open);
          if (!open) {
            setPublicacionSeleccionada(null);
            setDetalleError('');
            setDetalleLoading(false);
            processedSlugRef.current = null;
            if (searchParams.get('slug')) router.replace(config.basePath);
          }
        }}
        variant="admin"
        loading={detalleLoading}
        error={detalleError}
      />
      <CrearPublicacionDialog
        panel={panel}
        open={formOpen}
        publicacion={publicacionAEditar}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setPublicacionAEditar(null);
        }}
        onCreated={() => loadPublicaciones()}
        onUpdated={handlePublicacionActualizada}
      />
    </div>
  );
}

export function AdminNoticiasPage({ panel }: AdminNoticiasPageProps) {
  return (
    <Suspense>
      <AdminNoticiasPageInner panel={panel} />
    </Suspense>
  );
}
