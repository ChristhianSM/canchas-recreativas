"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sliders,
  MapPin,
  Loader2,
  Zap,
  ShieldCheck,
  Users,
  DollarSign,
  Star,
  Package,
  ChevronDown,
  LocateFixed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AdvancedFilters,
  sportLabels,
  SportType,
  superficieLabels,
  SuperficieType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Coordenadas } from "@/lib/geolocation-utils";

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
  isOpen?: boolean; // Estado controlado del sheet
  onOpenChange?: (open: boolean) => void; // Callback para cambiar el estado del sheet
}

export function AdvancedFiltersComponent({
  filters,
  onFiltersChange,
  allAmenities,
  allDistricts,
  priceRange,
  sports,
  activeFilterCount,
  isSidebar = false,
  resultCount,
  ubicacion,
  triggerRef,
  onUbicacionObtenida,
  onUbicacionLimpiada,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: AdvancedFiltersProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [loadingUbicacion, setLoadingUbicacion] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  // Usar estado controlado si se proporciona, sino usar estado interno
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen =
    controlledOnOpenChange !== undefined
      ? controlledOnOpenChange
      : setInternalIsOpen;

  // Guardar referencia al contenedor de scroll y bloquear scroll automático
  useEffect(() => {
    const container = document.querySelector(".overflow-y-auto") as HTMLElement;
    if (container) {
      scrollContainerRef.current = container;

      // Interceptar y bloquear scroll automático
      const handleScroll = (e: Event) => {
        if (isUpdatingRef.current) {
          e.preventDefault();
          e.stopPropagation();
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollPositionRef.current;
          }
        }
      };

      container.addEventListener("scroll", handleScroll, {
        passive: false,
        capture: true,
      });

      return () => {
        container.removeEventListener("scroll", handleScroll, {
          capture: true,
        });
      };
    }
  }, [isOpen]);

  // Restaurar posición de scroll después de cualquier cambio en filters
  useEffect(() => {
    if (isUpdatingRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  }, [filters]);

  // Estados para controlar qué secciones están expandidas
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    ubicacion: true, // Expandido por defecto
    deportes: true, // Expandido por defecto
    extras: true, // Expandido por defecto
    superficie: false,
    jugadores: false,
    precio: false,
    rating: false,
    servicios: false,
    distritos: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Helper para prevenir scroll al hacer click en controles
  const preventScrollOnClick = (callback: () => void) => {
    return (e?: any) => {
      // Activar flag de actualización
      isUpdatingRef.current = true;

      // Guardar posición actual del scroll
      if (scrollContainerRef.current) {
        scrollPositionRef.current = scrollContainerRef.current.scrollTop;
      }

      // Quitar focus del elemento que disparó el evento
      if (e?.target) {
        e.target.blur();
      }

      // Ejecutar el callback original
      callback();
    };
  };

  const handleSportToggle = (sport: SportType) => {
    const newSports = filters.sports.includes(sport)
      ? filters.sports.filter((s) => s !== sport)
      : [...filters.sports, sport];
    onFiltersChange({ ...filters, sports: newSports });
  };

  const handleAmenityToggle = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    onFiltersChange({ ...filters, amenities: newAmenities });
  };

  const handleDistrictToggle = (district: string) => {
    const newDistricts = filters.districts.includes(district)
      ? filters.districts.filter((d) => d !== district)
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
      searchQuery: "",
      conBalon: false,
      conChalecos: false,
      superficies: [],
      minJugadores: 0,
    });
  };

  // Helper para renderizar el header de cada sección acordeón
  const AccordionSection = ({
    id,
    icon,
    iconBg,
    title,
    badge,
    children,
  }: {
    id: string;
    icon: React.ReactNode;
    iconBg?: string;
    title: string;
    badge?: number;
    children: React.ReactNode;
  }) =>
    isSidebar ? (
      // Sidebar: tarjeta individual por sección con ícono circular
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-2">
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.blur();
            toggleSection(id);
          }}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-3">
            {iconBg && (
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconBg}`}
              >
                {icon}
              </div>
            )}
            <span className="text-sm font-semibold text-gray-800">{title}</span>
            {badge !== undefined && badge > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#16a34a] text-[9px] font-bold text-white">
                {badge}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ${expandedSections[id] ? "rotate-180" : ""}`}
          />
        </button>
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSections[id] ? "max-h-500 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="px-4 pb-4 pt-1 border-t border-gray-100">
            {children}
          </div>
        </div>
      </div>
    ) : (
      // Sheet: misma tarjeta con emoji
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.blur();
            toggleSection(id);
          }}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              {icon}
              <span>{title}</span>
            </span>
            {badge !== undefined && badge > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16a34a] text-[10px] font-bold text-white shrink-0">
                {badge}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${expandedSections[id] ? "rotate-180" : ""}`}
          />
        </button>
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSections[id] ? "max-h-500 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="px-4 pb-4 pt-1 border-t border-gray-100">
            {children}
          </div>
        </div>
      </div>
    );

  const filterContent = (
    <div className={cn("space-y-2", isSidebar && "space-y-0")}>
      {/* Ubicación */}
      <AccordionSection
        id="ubicacion"
        icon={<MapPin className="h-3.5 w-3.5" />}
        iconBg="bg-green-100 text-green-600"
        title="Ubicación"
      >
        {!ubicacion ? (
          <button
            disabled={loadingUbicacion}
            onClick={() => {
              if (!navigator.geolocation) {
                alert("Tu navegador no soporta geolocalización");
                return;
              }
              setLoadingUbicacion(true);
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                  };
                  localStorage.setItem("user_location", JSON.stringify(coords));
                  setLoadingUbicacion(false);
                  if (onUbicacionObtenida) onUbicacionObtenida(coords);
                },
                () => {
                  setLoadingUbicacion(false);
                  alert(
                    "No se pudo obtener tu ubicación. Por favor, verifica los permisos.",
                  );
                },
              );
            }}
            className="w-full flex items-center justify-center gap-2 px-2.5 py-2.5 bg-[#16a34a] text-white rounded-md hover:bg-[#15803d] disabled:opacity-70 disabled:cursor-not-allowed transition-colors text-sm font-medium mt-2"
          >
            {loadingUbicacion ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Activando...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                Activar "Cerca de mí"
              </>
            )}
          </button>
        ) : (
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-md border border-green-200">
              <span className="text-sm text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#16a34a]" />
                Ubicación activada
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("user_location");
                  if (onUbicacionLimpiada) onUbicacionLimpiada();
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Desactivar
              </button>
            </div>
            {/* Radio */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Radio de búsqueda</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { value: undefined, label: "Todas" },
                  { value: 1, label: "1 km" },
                  { value: 3, label: "3 km" },
                  { value: 5, label: "5 km" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() =>
                      onFiltersChange({ ...filters, radioKm: opt.value })
                    }
                    className={cn(
                      "px-2 py-1.5 text-xs font-medium rounded-md transition-colors border",
                      filters.radioKm === opt.value
                        ? "bg-[#16a34a] text-white border-[#16a34a]"
                        : "bg-white text-foreground border-gray-200 hover:border-[#16a34a]",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </AccordionSection>

      {/* Deportes */}
      <AccordionSection
        id="deportes"
        icon={<Zap className="h-3.5 w-3.5" />}
        iconBg="bg-yellow-100 text-yellow-600"
        title="Deportes"
        badge={filters.sports.length}
      >
        <div className="mt-2 space-y-2">
          {sports.map((sport) => (
            <div key={sport} className="flex items-center gap-2">
              <Checkbox
                id={`sport-${sport}`}
                checked={filters.sports.includes(sport)}
                onCheckedChange={preventScrollOnClick(() =>
                  handleSportToggle(sport),
                )}
                className="h-4 w-4"
              />
              <label
                onClick={preventScrollOnClick(() => handleSportToggle(sport))}
                className="text-sm cursor-pointer"
              >
                {sportLabels[sport]}
              </label>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Extras disponibles */}
      <AccordionSection
        id="extras"
        icon={<Package className="h-3.5 w-3.5" />}
        iconBg="bg-blue-100 text-blue-600"
        title="Ext. disponibles"
        badge={(filters.conBalon ? 1 : 0) + (filters.conChalecos ? 1 : 0)}
      >
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="con-balon"
              checked={filters.conBalon}
              onCheckedChange={preventScrollOnClick(() =>
                onFiltersChange({ ...filters, conBalon: !filters.conBalon }),
              )}
              className="h-4 w-4"
            />
            <label
              onClick={preventScrollOnClick(() =>
                onFiltersChange({ ...filters, conBalon: !filters.conBalon }),
              )}
              className="text-sm cursor-pointer"
            >
              ⚽ Con balón
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="con-chalecos"
              checked={filters.conChalecos}
              onCheckedChange={preventScrollOnClick(() =>
                onFiltersChange({
                  ...filters,
                  conChalecos: !filters.conChalecos,
                }),
              )}
              className="h-4 w-4"
            />
            <label
              onClick={preventScrollOnClick(() =>
                onFiltersChange({
                  ...filters,
                  conChalecos: !filters.conChalecos,
                }),
              )}
              className="text-sm cursor-pointer"
            >
              🎽 Con chalecos
            </label>
          </div>
        </div>
      </AccordionSection>

      {/* Superficie */}
      <AccordionSection
        id="superficie"
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        iconBg="bg-green-100 text-green-600"
        title="Superficie"
        badge={filters.superficies.length}
      >
        <div className="mt-2 space-y-2">
          {(Object.keys(superficieLabels) as SuperficieType[]).map((sup) => (
            <div key={sup} className="flex items-center gap-2">
              <Checkbox
                id={`sup-${sup}`}
                checked={filters.superficies.includes(sup)}
                onCheckedChange={preventScrollOnClick(() => {
                  const next = filters.superficies.includes(sup)
                    ? filters.superficies.filter((s) => s !== sup)
                    : [...filters.superficies, sup];
                  onFiltersChange({ ...filters, superficies: next });
                })}
                className="h-4 w-4"
              />
              <label
                onClick={preventScrollOnClick(() => {
                  const next = filters.superficies.includes(sup)
                    ? filters.superficies.filter((s) => s !== sup)
                    : [...filters.superficies, sup];
                  onFiltersChange({ ...filters, superficies: next });
                })}
                className="text-sm cursor-pointer"
              >
                {superficieLabels[sup]}
              </label>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Mínimo de jugadores */}
      <AccordionSection
        id="jugadores"
        icon={<Users className="h-3.5 w-3.5" />}
        iconBg="bg-purple-100 text-purple-600"
        title="Min de jugadores"
        badge={filters.minJugadores > 0 ? 1 : 0}
      >
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {[0, 8, 10, 12, 14, 16, 20, 22].map((n) => (
            <button
              key={n}
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.blur();
                preventScrollOnClick(() =>
                  onFiltersChange({ ...filters, minJugadores: n }),
                )();
              }}
              className={cn(
                "rounded-lg border px-2 py-2 text-xs font-medium transition-all focus:outline-none",
                filters.minJugadores === n
                  ? "border-[#16a34a] bg-[#16a34a] text-white"
                  : "border-gray-200 bg-white text-foreground hover:border-[#16a34a]",
              )}
            >
              {n === 0 ? "Todos" : `${n}+`}
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* Precio */}
      <AccordionSection
        id="precio"
        icon={<DollarSign className="h-3.5 w-3.5" />}
        iconBg="bg-orange-100 text-orange-600"
        title="Precio por hora"
      >
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-3">
            <span>S/ {filters.priceRange[0]}</span>
            <span>S/ {filters.priceRange[1]}</span>
          </div>
          <Slider
            min={priceRange[0]}
            max={priceRange[1]}
            step={5}
            value={filters.priceRange}
            onValueChange={(value) => {
              // Guardar posición y aplicar cambio sin scroll
              if (scrollContainerRef.current) {
                scrollPositionRef.current =
                  scrollContainerRef.current.scrollTop;
              }
              handlePriceChange(value);
              requestAnimationFrame(() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop =
                    scrollPositionRef.current;
                }
              });
            }}
            className="py-1"
          />
        </div>
      </AccordionSection>

      {/* Rating */}
      <AccordionSection
        id="rating"
        icon={<Star className="h-3.5 w-3.5" />}
        iconBg="bg-yellow-100 text-yellow-600"
        title="Calificación"
        badge={filters.minRating > 0 ? 1 : 0}
      >
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {[
            { value: 0, label: "Todas" },
            { value: 3, label: "3+⭐" },
            { value: 4, label: "4+⭐" },
            { value: 4.5, label: "4.5+⭐" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.blur();
                preventScrollOnClick(() =>
                  onFiltersChange({ ...filters, minRating: opt.value }),
                )();
              }}
              className={cn(
                "rounded-lg border px-2 py-2 text-xs font-medium transition-all text-center focus:outline-none",
                filters.minRating === opt.value
                  ? "border-[#16a34a] bg-[#16a34a] text-white"
                  : "border-gray-200 bg-white text-foreground hover:border-[#16a34a]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* Servicios */}
      {allAmenities.length > 0 && (
        <AccordionSection
          id="servicios"
          icon={<Zap className="h-3.5 w-3.5" />}
          iconBg="bg-green-100 text-green-600"
          title="Servicios"
          badge={filters.amenities.length}
        >
          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
            {allAmenities.map((amenity) => (
              <div key={amenity} className="flex items-center gap-2">
                <Checkbox
                  id={`amenity-${amenity}`}
                  checked={filters.amenities.includes(amenity)}
                  onCheckedChange={preventScrollOnClick(() =>
                    handleAmenityToggle(amenity),
                  )}
                  className="h-4 w-4"
                />
                <label
                  onClick={preventScrollOnClick(() =>
                    handleAmenityToggle(amenity),
                  )}
                  className="text-sm cursor-pointer"
                >
                  {amenity}
                </label>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}
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
            <Button
              ref={triggerRef}
              variant="outline"
              size="sm"
              className="gap-2 w-full justify-center"
            >
              <Sliders className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="p-0 flex flex-col sm:max-w-md w-full"
          >
            {/* Header fijo con título y botón de cerrar */}
            <div className="sticky top-0 z-10 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">Filtros</SheetTitle>
              {/* El botón de cerrar ya viene por defecto en SheetContent */}
            </div>

            {/* Botón Limpiar todo */}
            <div className="px-6 pb-3 border-b border-border flex justify-end">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 text-[#16a34a] hover:text-[#15803d] text-sm font-medium transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Limpiar todo
              </button>
            </div>

            {/* Contenido scrolleable con filtros */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filterContent}
            </div>

            {/* Footer sticky con botón de ver resultados */}
            {resultCount !== undefined && (
              <div className="sticky bottom-0 z-10 bg-white border-t border-border px-6 py-4">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Ver {resultCount} {resultCount === 1 ? "cancha" : "canchas"}
                </button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
