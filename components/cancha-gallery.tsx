'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanchaGalleryProps {
  images: string[];
  alt: string;
}

export function CanchaGallery({ images, alt }: CanchaGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative group">
      <div ref={emblaRef} className="overflow-hidden rounded-xl">
        <div className="flex gap-2 px-0">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative flex-[0_0_100%] min-w-0 aspect-video sm:flex-[0_0_calc(33.333%-6px)] sm:aspect-4/3"
            >
              <Image
                src={image}
                alt={`${alt} - Imagen ${index + 1}`}
                fill
                className="object-cover rounded-lg"
                sizes="(max-width: 640px) 100vw, 33vw"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Flechas */}
      {images.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 hover:bg-black/70"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 hover:bg-black/70"
            aria-label="Siguiente imagen"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Contador */}
      <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
        {selectedIndex + 1} / {images.length}
      </div>
    </div>
  );
}
