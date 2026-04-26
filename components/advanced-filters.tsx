'use client';

import { useState } from 'react';
import {
  Filter, X, ChevronDown, Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
}

const HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export function AdvancedFiltersComponent({
  filters,
  onFiltersChange,
  allAmenities,
  allDistricts,
  priceRange,
  sports,
  activeFilterCount,
  onRefresh,
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

  const handleHourToggle = (hour: string) => {
    const newHours = filters.availableHours.includes(hour)
      ? filters.availableHours.filter(h => h !== hour)
      : [...filters.availableHours, hour];
    onFiltersChange({ ...filters, availableHours: newHours });
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
      availableHours: [],
      onlyFeatured: false,
      searchQuery: '',
    });
  };

  const filterContent = (
    <div className="space-y-6">
      {/* Búsqueda */}
      <div>
        <label className="text-sm font-semibold text-foreground">Buscar</label>
        <Input
          placeholder="Nombre, dirección, distrito..."
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
          className="mt-2"
        />
      </div>

      {/* Deportes */}
      <div>
        <label className="text-sm font-semibold text-foreground">Tipo de deporte</label>
        <div className="mt-3 space-y-2">
          {sports.map(sport => (
            <div key={sport} className="flex items-center gap-2">
              <Checkbox
                id={`sport-${sport}`}
                checked={filters.sports.includes(sport)}
                onCheckedChange={() => handleSportToggle(sport)}
              />
              <label htmlFor={`sport-${sport}`} className="text-sm cursor-pointer">
                {sportLabels[sport]}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Precio */}
      <div>
        <label className="text-sm font-semibold text-foreground">
          Rango de precio: S/ {filters.priceRange[0]} - S/ {filters.priceRange[1]}
        </label>
        <Slider
          min={priceRange[0]}
          max={priceRange[1]}
          step={5}
          value={filters.priceRange}
          onValueChange={handlePriceChange}
          className="mt-3"
        />
      </div>

      {/* Rating */}
      <div>
        <label className="text-sm font-semibold text-foreground">Rating mínimo</label>
        <Select value={filters.minRating.toString()}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Cualquier rating</SelectItem>
            <SelectItem value="3">3+ ⭐</SelectItem>
            <SelectItem value="3.5">3.5+ ⭐</SelectItem>
            <SelectItem value="4">4+ ⭐</SelectItem>
            <SelectItem value="4.5">4.5+ ⭐</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Distritos */}
      {allDistricts.length > 0 && (
        <div>
          <label className="text-sm font-semibold text-foreground">Distritos</label>
          <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
            {allDistricts.map(district => (
              <div key={district} className="flex items-center gap-2">
                <Checkbox
                  id={`district-${district}`}
                  checked={filters.districts.includes(district)}
                  onCheckedChange={() => handleDistrictToggle(district)}
                />
                <label htmlFor={`district-${district}`} className="text-sm cursor-pointer">
                  {district}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amenidades */}
      {allAmenities.length > 0 && (
        <div>
          <label className="text-sm font-semibold text-foreground">Amenidades</label>
          <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
            {allAmenities.map(amenity => (
              <div key={amenity} className="flex items-center gap-2">
                <Checkbox
                  id={`amenity-${amenity}`}
                  checked={filters.amenities.includes(amenity)}
                  onCheckedChange={() => handleAmenityToggle(amenity)}
                />
                <label htmlFor={`amenity-${amenity}`} className="text-sm cursor-pointer">
                  {amenity}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Horas disponibles */}
      <div>
        <label className="text-sm font-semibold text-foreground">Horas disponibles</label>
        <div className="mt-3 grid grid-cols-3 gap-2">
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

      {/* Destacadas */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="featured"
          checked={filters.onlyFeatured}
          onCheckedChange={(checked) =>
            onFiltersChange({ ...filters, onlyFeatured: checked as boolean })
          }
        />
        <label htmlFor="featured" className="text-sm cursor-pointer">
          Solo canchas destacadas
        </label>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleClearFilters}
        >
          Limpiar filtros
        </Button>
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            title="Recargar datos"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );

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
            <SheetHeader className="mb-6">
              <SheetTitle>Filtros avanzados</SheetTitle>
            </SheetHeader>
            <div className="mt-6 pr-4">
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
      </div>
    </div>
  );
}
