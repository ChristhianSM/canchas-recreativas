'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

interface CanchaMapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
}

interface CanchasMapProps {
  canchas: CanchaMapPin[];
  selectedId?: string;
  onSelectCancha?: (id: string) => void;
}

export function CanchasMap({ canchas, selectedId, onSelectCancha }: CanchasMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (typeof window === 'undefined') return;

    // Importar Leaflet dinámicamente (solo client-side)
    import('leaflet').then((L) => {
      // Fix para los iconos de Leaflet con Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Calcular centro del mapa
      const validCanchas = canchas.filter(c => c.lat && c.lng);
      const center: [number, number] = validCanchas.length > 0
        ? [
            validCanchas.reduce((s, c) => s + c.lat, 0) / validCanchas.length,
            validCanchas.reduce((s, c) => s + c.lng, 0) / validCanchas.length,
          ]
        : [-5.1945, -80.6328]; // Piura por defecto

      const map = L.map(mapRef.current!, {
        center,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Agregar marcadores
      validCanchas.forEach((cancha) => {
        const isSelected = cancha.id === selectedId;

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              background: ${isSelected ? '#15803d' : '#16a34a'};
              color: white;
              padding: 4px 8px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 700;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.25);
              border: 2px solid ${isSelected ? '#fff' : 'transparent'};
              transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
              transition: all 0.2s;
              cursor: pointer;
            ">
              S/ ${cancha.price}
            </div>
          `,
          iconAnchor: [30, 16],
        });

        const marker = L.marker([cancha.lat, cancha.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px; font-family: sans-serif;">
              <p style="font-weight:700; font-size:13px; margin:0 0 4px">${cancha.name}</p>
              <p style="font-size:12px; color:#6b7280; margin:0 0 6px">${cancha.type}</p>
              <p style="font-size:14px; font-weight:700; color:#16a34a; margin:0">S/ ${cancha.price}/h</p>
              <a href="/cancha/${cancha.id}" style="display:block; margin-top:8px; background:#16a34a; color:white; text-align:center; padding:6px; border-radius:6px; font-size:12px; font-weight:600; text-decoration:none;">
                Ver cancha
              </a>
            </div>
          `, { maxWidth: 200 });

        marker.on('click', () => {
          onSelectCancha?.(cancha.id);
        });

        markersRef.current.push(marker);
      });
    });

    // Importar CSS de Leaflet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
  }, []); // Solo montar una vez

  // Actualizar marcadores cuando cambia selectedId
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      markersRef.current.forEach((marker, i) => {
        const cancha = canchas.filter(c => c.lat && c.lng)[i];
        if (!cancha) return;
        const isSelected = cancha.id === selectedId;
        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              background: ${isSelected ? '#15803d' : '#16a34a'};
              color: white;
              padding: 4px 8px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 700;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.25);
              border: 2px solid ${isSelected ? '#fff' : 'transparent'};
              transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
              cursor: pointer;
            ">
              S/ ${cancha.price}
            </div>
          `,
          iconAnchor: [30, 16],
        });
        marker.setIcon(icon);
        if (isSelected) {
          mapInstanceRef.current?.panTo([cancha.lat, cancha.lng]);
          marker.openPopup();
        }
      });
    });
  }, [selectedId, canchas]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: '300px' }}
    />
  );
}
