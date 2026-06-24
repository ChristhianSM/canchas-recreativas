'use client';

import {
  Archive,
  CalendarDays,
  Clock,
  Eye,
  MapPin,
  Newspaper,
  Pencil,
  Send,
  Share2,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { PublicacionTags } from './publicacion-tags';

type PublicacionCardProps = {
  publicacion: Publicacion;
  variant: 'admin' | 'public';
  onOpenDetail: (publicacion: Publicacion) => void;
  onToggleEstado?: (publicacion: Publicacion) => void;
  onEliminar?: (publicacion: Publicacion) => void;
  onEditar?: (publicacion: Publicacion) => void;
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

export function PublicacionCard({
  publicacion,
  variant,
  onOpenDetail,
  onToggleEstado,
  onEliminar,
  onEditar,
}: PublicacionCardProps) {
  const fechaInicio = formatPublicacionDate(publicacion.fecha_inicio);
  const fechaFin = formatPublicacionDate(publicacion.fecha_fin);
  const fechaCreacion = formatPublicacionDate(publicacion.creado_en);
  const rangoFechas =
    fechaInicio && fechaFin && fechaFin !== fechaInicio
      ? `${fechaInicio} - ${fechaFin}`
      : fechaInicio;
  const accionEstado =
    publicacion.estado === 'publicado'
      ? { label: 'Archivar', icon: Archive }
      : { label: 'Publicar', icon: Send };
  const AccionEstadoIcon = accionEstado.icon;
  const esPublicada = publicacion.estado === 'publicado';

  return (
    <Card className="flex flex-col overflow-hidden border-border">
      <div className="relative aspect-[16/6] overflow-hidden bg-muted">
        {publicacion.imagen_url ? (
          <img
            src={publicacion.imagen_url}
            alt={publicacion.titulo}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Newspaper className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        <div className="absolute left-3 top-3">
          <Badge
            variant="outline"
            className={`gap-1 ${PUBLICACION_TIPO_STYLES[publicacion.tipo]}`}
          >
            <span>{PUBLICACION_TIPO_EMOJIS[publicacion.tipo]}</span>
            {PUBLICACION_TIPO_LABELS[publicacion.tipo]}
          </Badge>
        </div>

        {variant === 'admin' ? (
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={PUBLICACION_ESTADO_STYLES[publicacion.estado]}
            >
              {PUBLICACION_ESTADO_LABELS[publicacion.estado]}
            </Badge>
          </div>
        ) : null}

        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            type="button"
            aria-label="Compartir publicacion"
            onClick={(event) => {
              event.stopPropagation();
              void compartirPublicacion(publicacion.slug);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm backdrop-blur transition hover:bg-card"
          >
            <Share2 className="h-5 w-5" />
          </button>
          {variant === 'admin' && onEditar ? (
            <button
              type="button"
              aria-label="Editar publicacion"
              onClick={() => onEditar(publicacion)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm backdrop-blur transition hover:bg-card"
            >
              <Pencil className="h-5 w-5" />
            </button>
          ) : null}
          {variant === 'admin' && onEliminar ? (
            <button
              type="button"
              aria-label="Eliminar publicacion"
              onClick={(event) => {
                event.stopPropagation();
                onEliminar(publicacion);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card/95 text-destructive shadow-sm backdrop-blur transition hover:bg-destructive/10"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            {publicacion.deporte ? (
              <Badge variant="outline">
                {PUBLICACION_DEPORTE_LABELS[publicacion.deporte] ??
                  publicacion.deporte}
              </Badge>
            ) : (
              <span />
            )}
            {fechaCreacion ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {fechaCreacion}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <h2 className="line-clamp-2 text-lg font-semibold text-foreground">
              {publicacion.titulo}
            </h2>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {publicacion.resumen}
            </p>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {rangoFechas ? (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>{rangoFechas}</span>
              </div>
            ) : null}
            {publicacion.hora ? (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{publicacion.hora}</span>
              </div>
            ) : null}
            {publicacion.canchas?.length ? (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="line-clamp-1">
                  {publicacion.canchas
                    .map((cancha) => cancha.nombre ?? 'Cancha')
                    .join(', ')}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-4 min-w-0">
            {publicacion.precio ? (
              <p className="truncate text-sm font-medium text-primary">
                {publicacion.precio}
              </p>
            ) : null}
          </div>

          <PublicacionTags tags={publicacion.tags} className="mt-4" />
        </div>

        <div
          className={
            variant === 'admin'
              ? 'mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4'
              : 'mt-5'
          }
        >
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onOpenDetail(publicacion)}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            {variant === 'public' ? 'Ver detalles' : 'Ver detalle'}
          </Button>
          {variant === 'admin' ? (
            <Button
              size="sm"
              variant={esPublicada ? 'outline' : 'default'}
              disabled={!onToggleEstado}
              className={
                esPublicada
                  ? 'w-full border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800'
                  : 'w-full'
              }
              onClick={() => onToggleEstado?.(publicacion)}
            >
              <AccionEstadoIcon className="mr-1.5 h-4 w-4" />
              {accionEstado.label}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
