'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Pencil, Star, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sportLabels } from '@/lib/types';
import { ownerFetch } from '@/lib/api';

type Cancha = {
  id: string; nombre: string; tipo: keyof typeof sportLabels;
  direccion: string; imagenes: string[]; rating: number;
  precio_por_hora: number; activa: boolean;
};

function getOwnerToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_owner_token');
}

export default function OwnerCanchasPage() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getOwnerToken();
    if (!token) return;

    ownerFetch('/api/admin-cancha/canchas')
      .then(r => r.json())
      .then(data => {
        setCanchas(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Canchas</h1>
          <p className="text-muted-foreground">Edita la información, fotos y horarios de tus canchas</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Card key={i} className="h-64 animate-pulse bg-muted border-border" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Canchas</h1>
        <p className="text-muted-foreground">Edita la información, fotos y horarios de tus canchas</p>
      </div>

      {canchas.length === 0 ? (
        <Card className="border-border p-12 text-center">
          <p className="text-muted-foreground">No tienes canchas asignadas.</p>
          <p className="mt-1 text-sm text-muted-foreground">Contacta al administrador para que te asigne canchas.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {canchas.map(c => (
            <Card key={c.id} className="overflow-hidden border-border">
              <div className="relative aspect-video">
                {c.imagenes?.[0] ? (
                  <Image src={c.imagenes[0]} alt={c.nombre} fill className="object-cover" />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
                <div className="absolute left-2 top-2 flex gap-1.5">
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    {sportLabels[c.tipo] ?? c.tipo}
                  </Badge>
                  {!c.activa && (
                    <Badge variant="outline" className="bg-card text-xs">Inactiva</Badge>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground line-clamp-1">{c.nombre}</h3>
                  {c.rating > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      <span className="text-sm font-medium">{c.rating}</span>
                    </div>
                  )}
                </div>
                <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-1">{c.direccion}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">S/ {c.precio_por_hora}/h</span>
                  <Button size="sm" asChild>
                    <Link href={`/admin-cancha/canchas/${c.id}`}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
