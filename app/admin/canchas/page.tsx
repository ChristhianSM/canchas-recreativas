'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Pencil, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { canchas } from '@/lib/data';
import { sportLabels } from '@/lib/types';

export default function AdminCanchasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Canchas</h1>
        <p className="text-muted-foreground">Edita la información, fotos y horarios de tus canchas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canchas.map(cancha => (
          <Card key={cancha.id} className="overflow-hidden border-border">
            <div className="relative aspect-video">
              <Image src={cancha.images[0]} alt={cancha.name} fill className="object-cover" />
              <div className="absolute left-2 top-2">
                <Badge className="bg-primary text-primary-foreground text-xs">
                  {sportLabels[cancha.type]}
                </Badge>
              </div>
            </div>
            <div className="p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground line-clamp-1">{cancha.name}</h3>
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  <span className="text-sm font-medium">{cancha.rating}</span>
                </div>
              </div>
              <p className="mb-3 text-sm text-muted-foreground line-clamp-1">{cancha.address}</p>
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">S/ {cancha.pricePerHour}/h</span>
                <Button size="sm" asChild>
                  <Link href={`/admin/canchas/${cancha.id}`}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Editar
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
