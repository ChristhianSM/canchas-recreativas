'use client';

import { useEffect, useRef, useState } from 'react';

interface MapViewProps {
  lat: number;
  lng: number;
  nombre: string;
}

export function MapView({ lat, lng, nombre }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const [moved, setMoved] = useState(false);
  const movedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Leaflet marca el div con _leaflet_id cuando ya está inicializado
    if ((containerRef.current as any)._leaflet_id) return;

    import('leaflet').then(L => {
      // Fix íconos con Next.js
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, { zoomControl: true }).setView([lat, lng], 17);
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
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
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
          className="h-64 w-full"
          style={{ minHeight: '256px' }}
        />
      </div>
    </>
  );
}
