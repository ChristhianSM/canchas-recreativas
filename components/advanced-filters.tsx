'use client';

import { useState, useMemo } from 'react';
import {
  X, Sliders, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AdvancedFilters, sportLabels, SportType } from '@/lib/types';
import { cn } from '@/lib/utils';

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
}

const HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

// Generar próximos 6 días incluyendo hoy
function getNext6Days(): string[] {
  const days: string[] = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    days.push(date.toISOString().split('T')[0]);
  }
  return days;
}

// Formatear fecha para mostrar
function formatDateDisplay(dateStr: string): { day: string; date: number; isToday: boolean } {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date().toISOString().split('T')[0];
  const dayName = date.toLocaleDateString('es-PE', { weekday: 'short' });
  
  return {
    day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
    date: date.getDate(),
    isToday: dateStr === today,
  };
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
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateStartIndex, setDateStartIndex] = useState(0);
  const next6Days = useMemo(() => getNext6Days(), []);

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

  const handleHourToggle = (hour: string) => {
    const newHours = filters.availableHours.includes(hour)
      ? filters.availableHours.filter(h => h !== hour)
      : [...filters.availableHours, hour];
    onFiltersChange({ ...filters, availableHours: newHours });
  };

  const handleDateChange = (date: string) => {
    onFiltersChange({ ...filters, selectedDate: date, availableHours: [] });
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
      selectedDate: new Date().toISOString().split('T')[0],
      availableHours: [],
      onlyFeatured: false,
      searchQuery: '',
    });
  };

  const filterContent = (
    <div className={cn("space-y-4", isSidebar && "space-y-5")}>
      {/* Búsqueda */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
          <span className="text-sm">🔍</span>
          Buscar
        </label>
        <Input
          placeholder="Nombre, dirección..."
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
          className="h-9"
        />
      </div>

      {/* Selector de Fecha y Horarios - Compacto para sidebar */}
      {isSidebar ? (
        <div>
          <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <span className="text-sm">📅</span>
            Fecha y horarios
          </label>
          
          {/* Días con slider mejorado */}
          <div className="relative mb-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 z-10 h-8 w-8 rounded-full bg-background shadow-md border"
                onClick={() => {
                  setDateStartIndex(Math.max(0, dateStartIndex - 1));
                }}
                disabled={dateStartIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="mx-10 overflow-hidden">
                <div className="flex gap-1.5">
                  {next6Days.slice(dateStartIndex, dateStartIndex + 4).map(date => {
                    const { day, date: dateNum, isToday } = formatDateDisplay(date);
                    const isSelected = filters.selectedDate === date;

                    return (
                      <Button
                        key={date}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleDateChange(date)}
                        className="flex-1 h-16 flex flex-col gap-1 px-4 py-2 rounded-xl"
                      >
                        <span className="font-medium text-sm">{isToday ? 'Hoy' : day}</span>
                        <span className="font-bold text-xl">{dateNum}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 z-10 h-8 w-8 rounded-full bg-background shadow-md border"
                onClick={() => {
                  setDateStartIndex(Math.min(next6Days.length - 4, dateStartIndex + 1));
                }}
                disabled={dateStartIndex >= next6Days.length - 4}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Horarios - Mostrar todos */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Horarios para el {new Date(filters.selectedDate + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long' })} {formatDateDisplay(filters.selectedDate).date}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {HOURS.map(hour => (
                <Button
                  key={hour}
                  variant={filters.availableHours.includes(hour) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleHourToggle(hour)}
                  className="h-8 text-xs p-1"
                >
                  {hour}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Versión completa para mobile */
        <div>
          <label className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="text-base">📅</span>
            Selecciona fecha y horarios
          </label>
          
          <div className="space-y-4">
            {/* Días con slider */}
            <div className="relative">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 z-10 h-8 w-8 rounded-full bg-background shadow-md"
                  onClick={() => {
                    const currentIndex = next6Days.findIndex(d => d === filters.selectedDate);
                    if (currentIndex > 0) {
                      handleDateChange(next6Days[currentIndex - 1]);
                    }
                  }}
                  disabled={next6Days.findIndex(d => d === filters.selectedDate) === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="mx-10 overflow-hidden">
                  <div className="flex gap-1.5 justify-center">
                    {next6Days.slice(0, 4).map(date => {
                      const { day, date: dateNum, isToday } = formatDateDisplay(date);
                      const isSelected = filters.selectedDate === date;

                      return (
                        <Button
                          key={date}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleDateChange(date)}
                          className="text-xs h-16 px-1.5 py-1.5 flex flex-col items-center justify-center gap-0.5 shrink-0 w-14"
                        >
                          <span className="font-semibold text-xs">{isToday ? 'Hoy' : day}</span>
                          <span className="text-xs font-bold">{dateNum}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 z-10 h-8 w-8 rounded-full bg-background shadow-md"
                  onClick={() => {
                    const currentIndex = next6Days.findIndex(d => d === filters.selectedDate);
                    if (currentIndex < next6Days.length - 1) {
                      handleDateChange(next6Days[currentIndex + 1]);
                    }
                  }}
                  disabled={next6Days.findIndex(d => d === filters.selectedDate) === next6Days.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2">
                Horarios para el {new Date(filters.selectedDate + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long' })} {formatDateDisplay(filters.selectedDate).date}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {HOURS.map(hour => (
                  <Button
                    key={hour}
                    variant={filters.availableHours.includes(hour) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleHourToggle(hour)}
                    className="text-xs"
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deportes - Compacto */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
          <span className="text-sm">⚽</span>
          Deporte
        </label>
        <div className="space-y-2">
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
          <div className="space-y-2">
            {allDistricts.slice(0, isSidebar ? 5 : allDistricts.length).map(district => (
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
            {isSidebar && allDistricts.length > 5 && (
              <div className="text-xs text-muted-foreground">
                +{allDistricts.length - 5} más
              </div>
            )}
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
          <div className="space-y-2">
            {allAmenities.slice(0, isSidebar ? 5 : allAmenities.length).map(amenity => (
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
            {isSidebar && allAmenities.length > 5 && (
              <div className="text-xs text-muted-foreground">
                +{allAmenities.length - 5} más
              </div>
            )}
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
    <div className="space-y-4">
      {/* Barra de filtros rápidos */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 shrink-0">
              <Sliders className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-6">
            <SheetHeader>
              <SheetTitle>Filtros avanzados</SheetTitle>
            </SheetHeader>
            <div className="pr-4">
              {filterContent}
            </div>
          </SheetContent>
        </Sheet>

        {/* Badges de filtros activos */}
        {filters.sports.length > 0 && (
          <div className="flex gap-1 shrink-0">
            {filters.sports.map(sport => (
              <Badge
                key={sport}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleSportToggle(sport)}
              >
                {sportLabels[sport]}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}

        {filters.districts.length > 0 && (
          <div className="flex gap-1 shrink-0">
            {filters.districts.map(district => (
              <Badge
                key={district}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleDistrictToggle(district)}
              >
                {district}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}

        {filters.amenities.length > 0 && (
          <Badge variant="secondary" className="shrink-0">
            {filters.amenities.length} amenidades
          </Badge>
        )}

        {filters.availableHours.length > 0 && (
          <Badge variant="secondary" className="shrink-0">
            {filters.availableHours.length} horas
          </Badge>
        )}
      </div>
    </div>
  );
}
