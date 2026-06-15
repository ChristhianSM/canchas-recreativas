'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Newspaper } from 'lucide-react';
import { PublicacionCard } from '@/components/publicaciones/publicacion-card';
import { PublicacionDetalleModal } from '@/components/publicaciones/publicacion-detalle-modal';
import { PUBLICACION_TIPO_EMOJIS } from '@/components/publicaciones/publicacion-ui';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { apiGetNoticiaPorSlug, apiGetNoticias } from '@/lib/api';
import {
  type Publicacion,
  type PublicacionDeporte,
  type PublicacionTipo,
} from '@/lib/publicaciones';
import { Header } from '@/components/header';

type TipoFiltro = 'todos' | PublicacionTipo;
type DeporteFiltro = 'todos' | PublicacionDeporte;

const FILTROS_TIPO: Array<{ key: TipoFiltro; label: string; emoji: string | null }> = [
  { key: 'todos', label: 'Todos', emoji: null },
  { key: 'torneo', label: 'Torneos', emoji: PUBLICACION_TIPO_EMOJIS.torneo },
  { key: 'escuela', label: 'Escuelas', emoji: PUBLICACION_TIPO_EMOJIS.escuela },
  { key: 'evento', label: 'Eventos', emoji: PUBLICACION_TIPO_EMOJIS.evento },
  { key: 'promocion', label: 'Promos', emoji: PUBLICACION_TIPO_EMOJIS.promocion },
  { key: 'noticia', label: 'Noticias', emoji: PUBLICACION_TIPO_EMOJIS.noticia },
  { key: 'mantenimiento', label: 'Mantenimiento', emoji: PUBLICACION_TIPO_EMOJIS.mantenimiento },
  { key: 'novedad', label: 'Novedades', emoji: PUBLICACION_TIPO_EMOJIS.novedad },
];

const FILTROS_DEPORTE: Array<{ key: DeporteFiltro; label: string; emoji: string | null }> = [
  { key: 'todos', label: 'Todos', emoji: null },
  { key: 'futbol', label: 'Fútbol', emoji: '⚽' },
  { key: 'futsal', label: 'Futsal', emoji: '🥅' },
  { key: 'basquet', label: 'Básquet', emoji: '🏀' },
  { key: 'voley', label: 'Voley', emoji: '🏐' },
  { key: 'tenis', label: 'Tenis', emoji: '🎾' },
];

function PublicacionCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden border-border">
      <div className="relative aspect-[16/6] overflow-hidden bg-muted">
        <div className="absolute left-3 top-3 h-6 w-24 animate-pulse rounded-full bg-background/80" />
        <div className="absolute bottom-3 right-3 flex gap-2">
          <div className="h-10 w-10 animate-pulse rounded-full bg-background/80" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-background/80" />
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-44 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </Card>
  );
}

function NoticiasPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedSlugRef = useRef<string | null>(null);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [publicacionSeleccionada, setPublicacionSeleccionada] = useState<Publicacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');
  const [deporteFiltro, setDeporteFiltro] = useState<DeporteFiltro>('todos');

  useEffect(() => {
    apiGetNoticias()
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

  const publicacionesFiltradas = publicaciones.filter(publicacion => {
    if (tipoFiltro !== 'todos' && publicacion.tipo !== tipoFiltro) return false;
    if (deporteFiltro !== 'todos' && publicacion.deporte !== deporteFiltro) return false;
    return true;
  });

  const canchasUnicas = useMemo(() => {
    const ids = new Set<string>();
    publicaciones.forEach(publicacion => {
      publicacion.canchas?.forEach(cancha => ids.add(cancha.id));
    });
    return ids.size;
  }, [publicaciones]);

  const openDetalleBySlug = useCallback(async (slug: string) => {
    setPublicacionSeleccionada(null);
    setDetalleError('');
    setDetalleOpen(true);
    setDetalleLoading(true);

    try {
      const data = await apiGetNoticiaPorSlug(slug);

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
  }, []);

  useEffect(() => {
    const slug = searchParams.get('slug');
    if (!slug || processedSlugRef.current === slug) return;

    processedSlugRef.current = slug;
    void openDetalleBySlug(slug);
  }, [openDetalleBySlug, searchParams]);

  const handleOpenDetalle = (publicacion: Publicacion) => {
    processedSlugRef.current = publicacion.slug;
    router.replace(`/noticias?slug=${encodeURIComponent(publicacion.slug)}`);
    void openDetalleBySlug(publicacion.slug);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <section className="bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 text-white">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 p-12">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Noticias de canchas
            </h1>
            <p className="mt-3 text-sm text-white/90 sm:text-base">
              Torneos, escuelas deportivas, promociones y novedades publicadas por los administradores de cada cancha.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Badge className="bg-white/15 text-white hover:bg-white/20">
                {publicaciones.length} publicaciones
              </Badge>
              <Badge className="bg-white/15 text-white hover:bg-white/20">
                {canchasUnicas} canchas
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 md:px-8 lg:px-12 p-12">
          <div className="space-y-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {FILTROS_TIPO.map(filtro => (
                <button
                  key={filtro.key}
                  type="button"
                  onClick={() => setTipoFiltro(filtro.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    tipoFiltro === filtro.key
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                      : 'bg-background border-border text-foreground hover:border-primary/40 hover:bg-primary/5'
                  }`}
                >
                  {filtro.emoji ? <span>{filtro.emoji}</span> : null}
                  {filtro.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTROS_DEPORTE.map(filtro => (
                <button
                  key={filtro.key}
                  type="button"
                  onClick={() => setDeporteFiltro(filtro.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    deporteFiltro === filtro.key
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                      : 'bg-background border-border text-foreground hover:border-primary/40 hover:bg-primary/5'
                  }`}
                >
                  {filtro.emoji ? <span>{filtro.emoji}</span> : null}
                  {filtro.label}
                </button>
              ))}
            </div>
          </div>
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[1, 2, 3, 4].map(item => (
              <PublicacionCardSkeleton key={item} />
            ))}
          </div>
        ) : error ? (
          <Card className="border-border p-10 text-center">
            <p className="text-destructive">{error}</p>
          </Card>
        ) : publicaciones.length === 0 ? (
          <Card className="border-border p-12 text-center">
            <Newspaper className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">Aún no hay publicaciones</p>
            <p className="mt-1 text-sm text-muted-foreground">Pronto verás torneos, eventos y novedades aquí.</p>
          </Card>
        ) : publicacionesFiltradas.length === 0 ? (
          <Card className="border-border p-10 text-center">
            <p className="font-medium text-foreground">No hay publicaciones con esos filtros</p>
            <p className="mt-1 text-sm text-muted-foreground">Prueba cambiando el tipo o deporte.</p>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {publicacionesFiltradas.map(publicacion => (
              <PublicacionCard
                key={publicacion.id}
                publicacion={publicacion}
                variant="public"
                onOpenDetail={handleOpenDetalle}
              />
            ))}
          </div>
        )}
      </main>

      <PublicacionDetalleModal
        publicacion={publicacionSeleccionada}
        open={detalleOpen}
        onOpenChange={open => {
          setDetalleOpen(open);
          if (!open) {
            setPublicacionSeleccionada(null);
            setDetalleError('');
            setDetalleLoading(false);
            processedSlugRef.current = null;
            if (searchParams.get('slug')) router.replace('/noticias');
          }
        }}
        variant="public"
        loading={detalleLoading}
        error={detalleError}
      />
    </div>
  );
}

export default function NoticiasPage() {
  return (
    <Suspense>
      <NoticiasPageInner />
    </Suspense>
  );
}
