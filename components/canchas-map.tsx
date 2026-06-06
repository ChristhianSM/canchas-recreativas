'use client';

import { useEffect, useRef } from 'react';

interface CanchaMapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
}

interface CanchaGroup {
  lat: number;
  lng: number;
  canchas: CanchaMapPin[];
}

interface CanchasMapProps {
  canchas: CanchaMapPin[];
  selectedId?: string;
  onSelectCancha?: (id: string) => void;
  centerLocation?: string;
  userCoords?: { lat: number; lng: number };
}

function groupByLocation(canchas: CanchaMapPin[]): CanchaGroup[] {
  const map = new Map<string, CanchaGroup>();
  for (const cancha of canchas) {
    const key = `${cancha.lat.toFixed(6)},${cancha.lng.toFixed(6)}`;
    if (!map.has(key)) {
      map.set(key, { lat: cancha.lat, lng: cancha.lng, canchas: [] });
    }
    map.get(key)!.canchas.push(cancha);
  }
  return Array.from(map.values());
}

function buildMarkerHtml(group: CanchaGroup, isSelected: boolean): string {
  const { canchas } = group;
  if (canchas.length === 1) {
    return `
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
      ">S/ ${canchas[0].price}</div>`;
  }

  const minPrice = Math.min(...canchas.map(c => c.price));
  return `
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
      display: flex;
      align-items: center;
      gap: 4px;
    ">
      S/ ${minPrice}
      <span style="
        background: rgba(255,255,255,0.3);
        border-radius: 10px;
        padding: 0px 5px;
        font-size: 10px;
        font-weight: 800;
      ">+${canchas.length - 1}</span>
    </div>`;
}

function buildPopupHtml(group: CanchaGroup): string {
  const { canchas } = group;

  if (canchas.length === 1) {
    const c = canchas[0];
    return `
      <div style="min-width:160px; font-family: sans-serif;">
        <p style="font-weight:700; font-size:13px; margin:0 0 4px">${c.name}</p>
        <p style="font-size:12px; color:#6b7280; margin:0 0 6px">${c.type}</p>
        <p style="font-size:14px; font-weight:700; color:#16a34a; margin:0">S/ ${c.price}/h</p>
        <a href="/cancha/${c.id}" style="display:block; margin-top:8px; background:#16a34a; color:white; text-align:center; padding:6px; border-radius:6px; font-size:12px; font-weight:600; text-decoration:none;">
          Ver cancha
        </a>
      </div>`;
  }

  const rows = canchas.map(c => `
    <div style="padding: 7px 0; border-top: 1px solid #f0f0f0;">
      <p style="font-weight:700; font-size:12px; margin:0 0 2px; color:#111;">${c.name}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-size:11px; color:#6b7280;">${c.type}</span>
        <span style="font-size:13px; font-weight:700; color:#16a34a;">S/ ${c.price}/h</span>
      </div>
      <a href="/cancha/${c.id}" style="display:block; background:#16a34a; color:white; text-align:center; padding:4px 8px; border-radius:5px; font-size:11px; font-weight:600; text-decoration:none;">
        Ver →
      </a>
    </div>
  `).join('');

  return `
    <div style="min-width:180px; font-family: sans-serif;">
      <p style="font-weight:700; font-size:13px; margin:0 0 2px; color:#111;">${canchas.length} canchas en este lugar</p>
      ${rows}
    </div>`;
}

export function CanchasMap({ canchas, selectedId, onSelectCancha, centerLocation, userCoords }: CanchasMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ marker: any; group: CanchaGroup }[]>([]);
  const userMarkerRef = useRef<any>(null);
  const userCoordsRef = useRef(userCoords);
  userCoordsRef.current = userCoords;
  const prevCanchaIdsRef = useRef<string>('');

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (typeof window === 'undefined') return;
    if ((mapRef.current as any)._leaflet_id) return;

    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;
      if ((mapRef.current as any)._leaflet_id) return;

      try {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const currentUserCoords = userCoordsRef.current;
        const validCanchas = canchas.filter(c => c.lat && c.lng);
        const center: [number, number] = currentUserCoords
          ? [currentUserCoords.lat, currentUserCoords.lng]
          : validCanchas.length > 0
            ? [
                validCanchas.reduce((s, c) => s + c.lat, 0) / validCanchas.length,
                validCanchas.reduce((s, c) => s + c.lng, 0) / validCanchas.length,
              ]
            : [-5.1945, -80.6328];

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

        if (currentUserCoords) {
          const userIcon = L.divIcon({
            className: '',
            html: `<div style="width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(37,99,235,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          userMarkerRef.current = L.marker([currentUserCoords.lat, currentUserCoords.lng], { icon: userIcon })
            .addTo(map)
            .bindPopup('Tu ubicación');
        }

        const groups = groupByLocation(validCanchas);
        groups.forEach((group) => {
          const isSelected = group.canchas.some(c => c.id === selectedId);
          const icon = L.divIcon({
            className: '',
            html: buildMarkerHtml(group, isSelected),
            iconSize: [70, 28],
            iconAnchor: [35, 14],
          });

          const marker = L.marker([group.lat, group.lng], { icon })
            .addTo(map)
            .bindPopup(buildPopupHtml(group), { maxWidth: 220 });

          marker.on('click', () => {
            onSelectCancha?.(group.canchas[0].id);
          });

          markersRef.current.push({ marker, group });
        });
      } catch (e) {
        console.warn('Leaflet map init skipped:', e);
      }
    });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
        userMarkerRef.current = null;
      }
      if (mapRef.current) {
        delete (mapRef.current as any)._leaflet_id;
      }
    };
  }, []);

  // Actualizar marcador del usuario
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (!userCoords) return;

      const userIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(37,99,235,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup('Tu ubicación');

      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 13);
    });
  }, [userCoords]);

  // Actualizar marcadores cuando cambia la lista de canchas
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const currentIds = canchas.map(c => c.id).join(',');
    const listChanged = currentIds !== prevCanchaIdsRef.current;
    prevCanchaIdsRef.current = currentIds;

    import('leaflet').then((L) => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];

      const validCanchas = canchas.filter(c => c.lat && c.lng);

      if (listChanged && validCanchas.length > 0 && !userCoords) {
        const centerLat = validCanchas.reduce((s, c) => s + c.lat, 0) / validCanchas.length;
        const centerLng = validCanchas.reduce((s, c) => s + c.lng, 0) / validCanchas.length;
        mapInstanceRef.current.setView([centerLat, centerLng], 13);
      }

      const groups = groupByLocation(validCanchas);
      groups.forEach((group) => {
        const isSelected = group.canchas.some(c => c.id === selectedId);
        const icon = L.divIcon({
          className: '',
          html: buildMarkerHtml(group, isSelected),
          iconSize: [70, 28],
          iconAnchor: [35, 14],
        });

        const marker = L.marker([group.lat, group.lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(buildPopupHtml(group), { maxWidth: 220 });

        marker.on('click', () => {
          onSelectCancha?.(group.canchas[0].id);
        });

        markersRef.current.push({ marker, group });
      });
    });
  }, [canchas]);

  // Centrar en ubicación por nombre cuando no hay coordenadas
  useEffect(() => {
    if (!centerLocation || !mapInstanceRef.current) return;
    if (userCoords) return;
    const validCanchas = canchas.filter(c => c.lat && c.lng);
    if (validCanchas.length > 0) return;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(centerLocation + ', Piura, Peru')}&limit=1&accept-language=es`)
      .then(r => r.json())
      .then(data => {
        if (data?.[0]) {
          mapInstanceRef.current?.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 13);
        }
      })
      .catch(() => {});
  }, [centerLocation, canchas, userCoords]);

  // Resaltar marcador cuando cambia selectedId
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      markersRef.current.forEach(({ marker, group }) => {
        const isSelected = group.canchas.some(c => c.id === selectedId);
        const icon = L.divIcon({
          className: '',
          html: buildMarkerHtml(group, isSelected),
          iconSize: [70, 28],
          iconAnchor: [35, 14],
        });
        marker.setIcon(icon);
        if (isSelected) {
          mapInstanceRef.current?.panTo([group.lat, group.lng]);
          marker.openPopup();
        }
      });
    });
  }, [selectedId]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: '300px' }}
    />
  );
}
