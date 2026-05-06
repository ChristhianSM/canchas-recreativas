'use client';

import { useState } from 'react';
import {
  Sliders, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AdvancedFilters, sportLabels, SportType, superficieLabels, SuperficieType } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { Coordenadas } from '@/lib/geolocation-utils';

interface AdvancedFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  allAmenities: string[];
  allDistricts: string[];
  priceRange: [number, number];
  sports: SportType[];
  activeFilterCount: number;
  onRefresh?: () => void;
  isSidebar?: boolean; // Nueva prop para determinar si es sidebar o sheet
  resultCount?: number; // Contador de resultados filtrados
  ubicacion?: Coordenadas | null; // Ubicación del usuario
  triggerRef?: React.RefObject<HTMLButtonElement | null>; // Ref para el botón trigger
  onUbicacionObtenida?: (coords: Coordenadas) => void; // Callback cuando se obtiene ubicación
  onUbicacionLimpiada?: () => void; // Callback cuando se limpia ubicación
}

export function AdvancedFiltersComponent({
  filters,
  onFiltersChange,
  allAmenities,
  allDistricts,
  priceRange,
  sports,
  activeFilterCount,
  onRefresh,
  isSidebar = false,
  resultCount,
  ubicacion,
  triggerRef,
  onUbicacionObtenida,
  onUbicacionLimpiada,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSportToggle = (sport: SportType) => {
    const newSports = filters.sports.includes(sport)
      ? filters.sports.filter(s => s !== sport)
      : [...filters.sports, sport];
    onFiltersChange({ ...filters, sports: newSports });
  };

  const handleAmenityToggle = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    onFiltersChange({ ...filters, amenities: newAmenities });
  };

  const handleDistrictToggle = (district: string) => {
    const newDistricts = filters.districts.includes(district)
      ? filters.districts.filter(d => d !== district)
      : [...filters.districts, district];
    onFiltersChange({ ...filters, districts: newDistricts });
  };

  const handlePriceChange = (value: number[]) => {
    onFiltersChange({ ...filters, priceRange: [value[0], value[1]] });
  };

  const handleRatingChange = (value: string) => {
    onFiltersChange({ ...filters, minRating: parseFloat(value) });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      sports: [],
      priceRange,
      minRating: 0,
      amenities: [],
      districts: [],
      selectedDate: filters.selectedDate, // Mantener la fecha del home
      availableHours: filters.availableHours, // Mantener las horas del home
      onlyFeatured: false,
      searchQuery: '',
      conBalon: false,
      conChalecos: false,
      superficies: [],
      minJugadores: 0,
    });
  };

  const filterContent = (
    <div className={cn("space-y-4", isSidebar && "space-y-5")}>
      {/* Ubicación - Cerca de mí */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
          <span className="text-sm">📍</span>
          Ubicación
        </label>
        {!ubicacion ? (
          <button
            onClick={() => {
              // Solicitar ubicación del usuario
              if (!navigator.geolocation) {
                alert('Tu navegador no soporta geolocalización');
                return;
              }
              
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                  };
                  // Guardar en localStorage
                  localStorage.setItem('user_location', JSON.stringify(coords));
                  // Notificar al componente padre usando el callback
                  if (onUbicacionObtenida) {
                    onUbicacionObtenida(coords);
                  }
                },
                (error) => {
                  console.error('Error getting location:', error);
                  alert('No se pudo obtener tu ubicación. Por favor, verifica los permisos.');
                }
              );
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <MapPin className="h-4 w-4" />
            Activar "Cerca de mí"
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-3 py-2 bg-primary/10 rounded-md">
              <span className="text-sm text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Ubicación activada
              </span>
              <button
                onClick={() => {
                  // Limpiar ubicación
                  localStorage.removeItem('user_location');
                  // Notificar al componente padre usando el callback
                  if (onUbicacionLimpiada) {
                    onUbicacionLimpiada();
                  }
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Desactivar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Radio de distancia - Solo si hay ubicación */}
      {ubicacion && (
        <div>
          <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
            <span className="text-sm">📏</span>
            Radio de búsqueda
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { value: undefined, label: 'Todas' },
              { value: 1, label: '1 km' },
              { value: 3, label: '3 km' },
              { value: 5, label: '5 km' },
            ].map((option) => (
              <button
                key={option.label}
                onClick={() => onFiltersChange({ ...filters, radioKm: option.value })}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  filters.radioKm === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Extras disponibles */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
          <span className="text-sm">🎽</span>
          Extras disponibles
        </label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="con-balon"
              checked={filters.conBalon}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, conBalon: checked as boolean })
              }
              className="h-4 w-4"
            />
            <label htmlFor="con-balon" className="text-sm cursor-pointer">
              ⚽ Con balón
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="con-chalecos"
              checked={filters.conChalecos}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, conChalecos: checked as boolean })
              }
              className="h-4 w-4"
            />
            <label htmlFor="con-chalecos" className="text-sm cursor-pointer">
              🎽 Con chalecos
            </label>
          </div>
        </div>
      </div>

      {/* Superficie */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
          <span className="text-sm">🏟️</span>
          Superficie
        </label>
        <div className="space-y-2">
          {(Object.keys(superficieLabels) as SuperficieType[]).map(sup => (
            <div key={sup} className="flex items-center gap-2">
              <Checkbox
                id={`sup-${sup}`}
                checked={filters.superficies.includes(sup)}
                onCheckedChange={checked => {
                  const next = checked
                    ? [...filters.superficies, sup]
                    : filters.superficies.filter(s => s !== sup);
                  onFiltersChange({ ...filters, superficies: next });
                }}
                className="h-4 w-4"
              />
              <label htmlFor={`sup-${sup}`} className="text-sm cursor-pointer">
                {superficieLabels[sup]}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Jugadores */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
          <span className="text-sm">👥</span>
          Mínimo de jugadores
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 8, 10, 12, 14, 16, 20, 22].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onFiltersChange({ ...filters, minJugadores: n })}
              className={cn(
                'rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                filters.minJugadores === n
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:border-primary/40'
              )}
            >
              {n === 0 ? 'Todos' : `${n}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Deportes - Compacto */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
          <span className="text-sm">⚽</span>
          Deporte
        </label>        <div className="space-y-2">
          {sports.map(sport => (
            <div key={sport} className="flex items-center gap-2">
              <Checkbox
                id={`sport-${sport}`}
                checked={filters.sports.includes(sport)}
                onCheckedChange={() => handleSportToggle(sport)}
                className="h-4 w-4"
              />
              <label htmlFor={`sport-${sport}`} className="text-sm cursor-pointer">
                {sportLabels[sport]}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Precio - Compacto */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
          <span className="text-sm">💰</span>
          S/ {filters.priceRange[0]} - S/ {filters.priceRange[1]}
        </label>
        <Slider
          min={priceRange[0]}
          max={priceRange[1]}
          step={5}
          value={filters.priceRange}
          onValueChange={handlePriceChange}
          className="py-2"
        />
      </div>

      {/* Rating - Compacto */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
          <span className="text-sm">⭐</span>
          Rating
        </label>
        <Select value={filters.minRating.toString()} onValueChange={handleRatingChange}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Cualquiera</SelectItem>
            <SelectItem value="3">3+ ⭐</SelectItem>
            <SelectItem value="4">4+ ⭐</SelectItem>
            <SelectItem value="4.5">4.5+ ⭐</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Distritos - Compacto */}
      {allDistricts.length > 0 && (
        <div>
          <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
            <span className="text-sm">📍</span>
            Distritos
          </label>
          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2">
            <div className="space-y-2">
              {allDistricts.map(district => (
                <div key={district} className="flex items-center gap-2">
                  <Checkbox
                    id={`district-${district}`}
                    checked={filters.districts.includes(district)}
                    onCheckedChange={() => handleDistrictToggle(district)}
                    className="h-4 w-4"
                  />
                  <label htmlFor={`district-${district}`} className="text-sm cursor-pointer">
                    {district}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Amenidades - Compacto */}
      {allAmenities.length > 0 && (
        <div>
          <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
            <span className="text-sm">⚡</span>
            Servicios
          </label>
          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2">
            <div className="space-y-2">
              {allAmenities.map(amenity => (
                <div key={amenity} className="flex items-center gap-2">
                  <Checkbox
                    id={`amenity-${amenity}`}
                    checked={filters.amenities.includes(amenity)}
                    onCheckedChange={() => handleAmenityToggle(amenity)}
                    className="h-4 w-4"
                  />
                  <label htmlFor={`amenity-${amenity}`} className="text-sm cursor-pointer">
                    {amenity}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Destacadas */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="featured"
          checked={filters.onlyFeatured}
          onCheckedChange={(checked) =>
            onFiltersChange({ ...filters, onlyFeatured: checked as boolean })
          }
          className="h-4 w-4"
        />
        <label htmlFor="featured" className="text-sm cursor-pointer">
          Solo destacadas
        </label>
      </div>

      {/* Botones de acción - Compactos */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8"
          onClick={handleClearFilters}
          disabled={activeFilterCount === 0}
        >
          Limpiar
        </Button>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onRefresh}
            title="Recargar"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );

  // Si es sidebar, renderizar directamente el contenido
  if (isSidebar) {
    return filterContent;
  }

  // Si no es sidebar, usar el Sheet (mobile)
  return (
    <div className="w-full">
      {/* Barra de filtros rápidos */}
      <div className="flex items-center gap-2">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button ref={triggerRef} variant="outline" size="sm" className="gap-2 w-full justify-center">
              <Sliders className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 flex flex-col sm:max-w-md">
            {/* Header fijo con botón de cerrar */}
            <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
              <SheetHeader>
                <SheetTitle>Filtros avanzados</SheetTitle>
                {resultCount !== undefined && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {resultCount} {resultCount === 1 ? 'cancha encontrada' : 'canchas encontradas'}
                  </p>
                )}
              </SheetHeader>
            </div>
            
            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 pt-0">
              {filterContent}
            </div>

            {/* Footer sticky con contador de resultados */}
            {resultCount !== undefined && (
              <div className="sticky bottom-0 z-10 bg-background border-t border-border px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
                    </p>
                    {activeFilterCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {activeFilterCount} {activeFilterCount === 1 ? 'filtro activo' : 'filtros activos'}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="shrink-0"
                  >
                    Ver resultados
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
