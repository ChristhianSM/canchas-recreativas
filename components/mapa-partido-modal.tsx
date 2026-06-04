'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Clock, Navigation } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { Coordenadas } from '@/lib/geolocation-utils';

interface MapaPartidoModalProps {
  open: boolean;
  onClose: () => void;
  canchaLat: number;
  canchaLng: number;
  canchaNombre: string;
  canchaDistrito: string;
  ubicacion: Coordenadas | null;
}

interface RouteInfo {
  distanciaKm: number;
  duracionMin: number;
}

async function fetchRutaOSRM(
  desde: Coordenadas,
  hasta: { lat: number; lng: number }
): Promise<{ coords: [number, number][]; info: RouteInfo } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${desde.lng},${desde.lat};${hasta.lng},${hasta.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.length) return null;

    const route = data.routes[0];
    // OSRM devuelve [lng, lat] — Leaflet necesita [lat, lng]
    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    return {
      coords,
      info: {
        distanciaKm: Math.round(route.legs[0].distance / 100) / 10,
        duracionMin: Math.round(route.legs[0].duration / 60),
      },
    };
  } catch {
    return null;
  }
}

export function MapaPartidoModal({
  open,
  onClose,
  canchaLat,
  canchaLng,
  canchaNombre,
  canchaDistrito,
  ubicacion,
}: MapaPartidoModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loadingRuta, setLoadingRuta] = useState(false);

  useEffect(() => {
    if (!open) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (mapRef.current) delete (mapRef.current as any)._leaflet_id;
      setRouteInfo(null);
      return;
    }

    const timer = setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      if ((mapRef.current as any)._leaflet_id) return;

      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.querySelector('style[data-mapa-partido]')) {
        const style = document.createElement('style');
        style.setAttribute('data-mapa-partido', '');
        style.textContent = `
          .leaflet-div-icon { background: none !important; border: none !important; }
          .partido-label {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            white-space: nowrap;
            text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white;
            padding: 0 !important;
          }
          .partido-label::before { display: none !important; }
          .partido-label-cancha { color: #15803d !important; }
          .partido-label-user  { color: #1d4ed8 !important; }
        `;
        document.head.appendChild(style);
      }

      import('leaflet').then(async (L) => {
        if (!mapRef.current || mapInstanceRef.current) return;

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const map = L.map(mapRef.current!, {
          center: [canchaLat, canchaLng],
          zoom: 15,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        // Marcador de la cancha — círculo fijo 16x16, anclado en su centro exacto
        const canchaIcon = L.divIcon({
          className: '',
          html: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="#16a34a" stroke="white" stroke-width="2"/></svg>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        L.marker([canchaLat, canchaLng], { icon: canchaIcon })
          .addTo(map)
          .bindTooltip('Cancha', {
            permanent: true,
            direction: 'top',
            offset: [0, -6],
            className: 'partido-label partido-label-cancha',
          })
          .bindPopup(
            `<div style="font-family:sans-serif;min-width:140px;">
              <p style="font-weight:700;font-size:13px;margin:0 0 2px">${canchaNombre}</p>
              <p style="font-size:11px;color:#6b7280;margin:0">${canchaDistrito}</p>
            </div>`,
            { maxWidth: 200 }
          );

        mapInstanceRef.current = map;
        setTimeout(() => map.invalidateSize(), 150);

        // Si hay ubicación, obtener la ruta real por calles
        if (ubicacion) {
          // Marcador del usuario — mismo tamaño fijo, anclado en su centro exacto
          const userIcon = L.divIcon({
            className: '',
            html: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="#2563eb" stroke="white" stroke-width="2"/></svg>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

          L.marker([ubicacion.lat, ubicacion.lng], { icon: userIcon })
            .addTo(map)
            .bindTooltip('Tú', {
              permanent: true,
              direction: 'top',
              offset: [0, -6],
              className: 'partido-label partido-label-user',
            })
            .bindPopup('<p style="font-family:sans-serif;font-weight:700;margin:0">Tu ubicación</p>');

          // Ajustar vista mientras carga la ruta
          map.fitBounds(
            [[ubicacion.lat, ubicacion.lng], [canchaLat, canchaLng]],
            { padding: [40, 40] }
          );

          // Obtener ruta real por calles desde OSRM
          setLoadingRuta(true);
          const resultado = await fetchRutaOSRM(ubicacion, { lat: canchaLat, lng: canchaLng });
          setLoadingRuta(false);

          if (resultado && mapInstanceRef.current) {
            // Dibujar ruta real por calles
            L.polyline(resultado.coords, {
              color: '#2563eb',
              weight: 5,
              opacity: 0.85,
            }).addTo(mapInstanceRef.current);

            // Ajustar zoom a la ruta completa
            mapInstanceRef.current.fitBounds(resultado.coords, { padding: [40, 40] });
            setRouteInfo(resultado.info);
          } else if (mapInstanceRef.current) {
            // Fallback: línea recta si OSRM falla
            L.polyline(
              [[ubicacion.lat, ubicacion.lng], [canchaLat, canchaLng]],
              { color: '#f59e0b', weight: 3, dashArray: '8 6', opacity: 0.8 }
            ).addTo(mapInstanceRef.current);
          }
        }
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [open, canchaLat, canchaLng, ubicacion, canchaNombre, canchaDistrito]);

  const urlGoogleMaps = ubicacion
    ? `https://www.google.com/maps/dir/?api=1&origin=${ubicacion.lat},${ubicacion.lng}&destination=${canchaLat},${canchaLng}&travelmode=driving`
    : `https://www.google.com/maps?q=${canchaLat},${canchaLng}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 gap-0 sm:max-w-lg w-full overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm font-bold text-foreground leading-tight">
            {canchaNombre}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{canchaDistrito}</p>
        </div>

        {/* Mapa */}
        <div className="relative">
          <div ref={mapRef} className="w-full" style={{ height: 360 }} />

          {/* Indicador de carga de ruta */}
          {loadingRuta && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow text-xs font-semibold text-foreground z-[9999]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Calculando ruta...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-background space-y-3">

          {/* Info de ruta */}
          {routeInfo && (
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <Navigation className="h-4 w-4 text-primary" />
                {routeInfo.distanciaKm} km
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <Clock className="h-4 w-4 text-primary" />
                ~{routeInfo.duracionMin} min en auto
              </div>
            </div>
          )}

          <a
            href={urlGoogleMaps}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            {ubicacion ? 'Navegar con Google Maps' : 'Ver en Google Maps'}
          </a>
        </div>

      </DialogContent>
    </Dialog>
  );
}
