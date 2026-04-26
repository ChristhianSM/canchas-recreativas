'use client';

import { useEffect, useRef } from 'react';

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number, direccion?: string) => void;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    // Construir dirección legible: calle + número + ciudad
    const a = data.address ?? {};
    const partes = [
      a.road ?? a.pedestrian ?? a.footway,
      a.house_number,
      a.suburb ?? a.neighbourhood ?? a.quarter,
      a.city ?? a.town ?? a.village ?? a.county,
    ].filter(Boolean);
    return partes.length > 0 ? partes.join(', ') : data.display_name ?? '';
  } catch {
    return '';
  }
}

export function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markerRef    = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
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

      const map = L.map(containerRef.current!).setView([lat, lng], 17);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      // Arrastrar el marcador → geocoding inverso
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const direccion = await reverseGeocode(pos.lat, pos.lng);
        onChange(pos.lat, pos.lng, direccion);
      });

      // Clic en el mapa → mover marcador + geocoding inverso
      map.on('click', async (e: any) => {
        marker.setLatLng(e.latlng);
        const direccion = await reverseGeocode(e.latlng.lat, e.latlng.lng);
        onChange(e.latlng.lat, e.latlng.lng, direccion);
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

  // Actualizar posición cuando cambian coords desde fuera (búsqueda por dirección)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    import('leaflet').then(L => {
      const latlng = L.latLng(lat, lng);
      markerRef.current.setLatLng(latlng);
      mapRef.current.setView(latlng, 17);
    });
  }, [lat, lng]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={containerRef}
        className="h-72 w-full rounded-xl border border-border overflow-hidden"
      />
    </>
  );
}
