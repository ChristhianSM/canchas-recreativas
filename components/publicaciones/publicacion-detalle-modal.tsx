'use client';

import { CalendarDays, Clock, DollarSign, Heart, MapPin, Newspaper, Share2, Tag, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Publicacion } from '@/lib/publicaciones';
import {
  PUBLICACION_DEPORTE_LABELS,
  PUBLICACION_ESTADO_LABELS,
  PUBLICACION_ESTADO_STYLES,
  PUBLICACION_TIPO_EMOJIS,
  PUBLICACION_TIPO_LABELS,
  PUBLICACION_TIPO_STYLES,
  formatPublicacionDate,
} from './publicacion-ui';

type PublicacionDetalleModalProps = {
  publicacion: Publicacion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: 'admin' | 'public';
  loading?: boolean;
  error?: string;
};

async function compartirPublicacion(slug: string) {
  if (typeof window === 'undefined') return;

  const url = `${window.location.origin}/noticias?slug=${encodeURIComponent(slug)}`;

  try {
    if (navigator.share) {
      await navigator.share({ url });
      return;
    }

    await navigator.clipboard?.writeText(url);
  } catch {
    // Compartir/copy puede fallar si el navegador bloquea permisos.
  }
}

export function PublicacionDetalleModal({
  publicacion,
  open,
  onOpenChange,
  variant,
  loading = false,
  error = '',
}: PublicacionDetalleModalProps) {
  if (!open) {
    return null;
  }

  const fechaInicio = publicacion ? formatPublicacionDate(publicacion.fecha_inicio) : null;
  const fechaFin = publicacion ? formatPublicacionDate(publicacion.fecha_fin) : null;
  const fechaCreacion = publicacion ? formatPublicacionDate(publicacion.creado_en) : null;
  const fechaActualizacion =
    publicacion?.actualizado_en && publicacion.actualizado_en !== publicacion.creado_en
      ? formatPublicacionDate(publicacion.actualizado_en)
      : null;
  const canchaPrincipal = publicacion?.canchas?.[0];
  const ubicacion = canchaPrincipal?.nombre ?? canchaPrincipal?.direccion ?? canchaPrincipal?.distrito ?? null;
  const botonFinal = variant === 'admin' ? 'Editar' : 'Inscribirme';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={event => event.preventDefault()}
        className="max-h-[90vh] overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">
          {publicacion?.titulo ?? 'Detalle de publicacion'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {publicacion?.resumen ?? 'Cargando detalle de publicacion'}
        </DialogDescription>

        <div className="max-h-[90vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-6 p-6">
              <div className="h-96 animate-pulse rounded-xl bg-muted" />
              <div className="space-y-3">
                <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <Newspaper className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">No se pudo cargar el detalle</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : publicacion ? (
            <>
          <div className="relative aspect-[16/5.5] overflow-hidden bg-muted">
            {publicacion.imagen_url ? (
              <img
                src={publicacion.imagen_url}
                alt={publicacion.titulo}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Newspaper className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            <div className="absolute left-4 top-4">
              <Badge variant="outline" className={`gap-1 ${PUBLICACION_TIPO_STYLES[publicacion.tipo]}`}>
                <span>{PUBLICACION_TIPO_EMOJIS[publicacion.tipo]}</span>
                {PUBLICACION_TIPO_LABELS[publicacion.tipo]}
              </Badge>
            </div>

            <DialogClose asChild>
              <button
                type="button"
                aria-label="Cerrar detalle"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm backdrop-blur transition hover:bg-card focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>

            {variant === 'admin' ? (
              <div className="absolute bottom-4 left-4">
                <Badge variant="outline" className={PUBLICACION_ESTADO_STYLES[publicacion.estado]}>
                  {PUBLICACION_ESTADO_LABELS[publicacion.estado]}
                </Badge>
              </div>
            ) : null}

            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                type="button"
                aria-label="Marcar como favorito"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm backdrop-blur transition hover:bg-card focus:outline-none"
              >
                <Heart className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Compartir publicacion"
                onClick={() => compartirPublicacion(publicacion.slug)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm backdrop-blur transition hover:bg-card focus:outline-none"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div>
              {publicacion.deporte ? (
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
                  <Tag className="h-4 w-4" />
                  {PUBLICACION_DEPORTE_LABELS[publicacion.deporte] ?? publicacion.deporte}
                </div>
              ) : null}
              <h2 className="text-2xl font-bold text-foreground">{publicacion.titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{publicacion.resumen}</p>
            </div>

            <div className="grid gap-4 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
              {fechaInicio ? (
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de inicio</p>
                    <p className="text-sm font-medium text-foreground">{fechaInicio}</p>
                  </div>
                </div>
              ) : null}
              {fechaFin ? (
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de fin</p>
                    <p className="text-sm font-medium text-foreground">{fechaFin}</p>
                  </div>
                </div>
              ) : null}
              {publicacion.hora ? (
                <div className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hora</p>
                    <p className="text-sm font-medium text-foreground">{publicacion.hora}</p>
                  </div>
                </div>
              ) : null}
              {ubicacion ? (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ubicacion</p>
                    <p className="text-sm font-medium text-foreground">{ubicacion}</p>
                  </div>
                </div>
              ) : null}
              {publicacion.precio ? (
                <div className="flex gap-3">
                  <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Precio</p>
                    <p className="text-sm font-medium text-foreground">{publicacion.precio}</p>
                  </div>
                </div>
              ) : null}
              {fechaCreacion ? (
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Publicación</p>
                    <p className="text-sm font-medium text-foreground">
                      Creado: {fechaCreacion}
                      {fechaActualizacion ? ` · Actualizado: ${fechaActualizacion}` : ''}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <h3 className="font-semibold text-foreground">Descripcion</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {publicacion.contenido}
              </p>
            </div>

            {publicacion.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {publicacion.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            <Button className="w-full" disabled>
              {botonFinal}
            </Button>
          </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
