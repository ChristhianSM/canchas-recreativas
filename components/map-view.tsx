'use client';

import { useEffect, useRef, useState } from 'react';

interface MapViewProps {
  lat: number;
  lng: number;
  nombre: string;
  className?: string;
}

export function MapView({ lat, lng, nombre, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const [moved, setMoved] = useState(false);
  const [mapActive, setMapActive] = useState(false);
  const movedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    // Verificar si el contenedor ya está inicializado por Leaflet
    if ((containerRef.current as any)._leaflet_id) {
      // Si ya está inicializado, limpiar primero
      const container = containerRef.current;
      container.innerHTML = '';
      delete (container as any)._leaflet_id;
    }

    import('leaflet').then(L => {
      // Verificar nuevamente después del import dinámico
      if (!containerRef.current || mapRef.current) return;
      
      // Fix íconos con Next.js
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      try {
        const map = L.map(containerRef.current!, { 
          zoomControl: true,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
        }).setView([lat, lng], 17);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        // Marcador con popup
        L.marker([lat, lng])
          .addTo(map)
          .bindPopup(`<strong>${nombre}</strong>`);

        // Botón "Volver a la cancha" como Leaflet Control (vive dentro del mapa)
        const RecentrarControl = L.Control.extend({
          options: { position: 'bottomleft' },
          onAdd() {
            const btn = L.DomUtil.create('button', '');
            btn.innerHTML = '📍 Volver a la cancha';
            btn.style.cssText = `
              display: none;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 9999px;
              padding: 6px 16px;
              font-size: 13px;
              font-weight: 500;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              white-space: nowrap;
            `;
            btn.id = 'recentrar-btn';
            L.DomEvent.on(btn, 'click', (e) => {
              L.DomEvent.stopPropagation(e);
              map.flyTo(L.latLng(lat, lng), 17, { duration: 1 });
              btn.style.display = 'none';
              movedRef.current = false;
              setMoved(false);
            });
            return btn;
          },
        });

        new RecentrarControl().addTo(map);

        // Mostrar/ocultar botón según distancia
        map.on('moveend', () => {
          const center = map.getCenter();
          const dist = center.distanceTo(L.latLng(lat, lng));
          const btn = document.getElementById('recentrar-btn');
          if (btn) {
            btn.style.display = dist > 100 ? 'block' : 'none';
          }
          setMoved(dist > 100);
        });
      } catch (error) {
        console.error('Error inicializando mapa:', error);
        // Si hay error, limpiar el contenedor para el próximo intento
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          delete (containerRef.current as any)._leaflet_id;
        }
      }
    });

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.error('Error removiendo mapa:', error);
        }
        mapRef.current = null;
      }
      // Limpiar el contenedor al desmontar
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        delete (containerRef.current as any)._leaflet_id;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar posición cuando cambian coords desde fuera
  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then(L => {
      mapRef.current.setView(L.latLng(lat, lng), 17);
    });
  }, [lat, lng]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      {/* El wrapper con z-index:0 crea un stacking context que contiene todo Leaflet */}
      <div style={{ position: 'relative', zIndex: 0 }}>
        <div
          ref={containerRef}
          className={className ?? 'h-64 w-full'}
          style={{ minHeight: className ? undefined : '256px' }}
        />
        
        {/* Overlay para activar el mapa en mobile */}
        {!mapActive && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] cursor-pointer md:hidden z-10"
            onClick={() => {
              setMapActive(true);
              if (mapRef.current) {
                mapRef.current.dragging.enable();
                mapRef.current.scrollWheelZoom.enable();
                mapRef.current.doubleClickZoom.enable();
                mapRef.current.touchZoom.enable();
              }
            }}
          >
            <div className="bg-white rounded-xl shadow-xl px-5 py-3.5 flex items-center gap-3 border-2 border-primary/20 animate-pulse">
              <svg className="h-6 w-6 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-sm">Toca para interactuar</span>
                <span className="text-xs text-muted-foreground">Mueve y explora el mapa</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
