'use client';

import Link from 'next/link';
import { MapPin, Star, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageSlider } from '@/components/image-slider';
import { Cancha, sportLabels } from '@/lib/types';

interface CanchaCardProps {
  cancha: Cancha;
}

export function CanchaCard({ cancha }: CanchaCardProps) {
  return (
    <Card className="group overflow-hidden border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <div className="relative">
        <Link href={`/cancha/${cancha.id}`}>
          <div className="px-3 pt-3">
            <ImageSlider images={cancha.images} alt={cancha.name} aspectRatio="wide" />
          </div>
        </Link>
        <div className="absolute left-6 top-6 z-10">
          <Badge className="bg-primary text-primary-foreground">
            {sportLabels[cancha.type]}
          </Badge>
        </div>
        {cancha.featured && (
          <div className="absolute right-6 top-6 z-10">
            <Badge className="bg-accent text-accent-foreground">
              Destacado
            </Badge>
          </div>
        )}
      </div>

      <Link href={`/cancha/${cancha.id}`}>
        <div className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {cancha.name}
            </h3>
            {(cancha.rating > 0) && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="text-sm font-medium text-foreground">{cancha.rating}</span>
                {cancha.reviewCount > 0 && (
                  <span className="text-sm text-muted-foreground">({cancha.reviewCount})</span>
                )}
              </div>
            )}
          </div>

          <div className="mb-3 flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="text-sm line-clamp-1">{cancha.address}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">6:00 AM - 10:00 PM</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-primary">S/ {cancha.pricePerHour}</span>
              <span className="text-sm text-muted-foreground">/hora</span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
