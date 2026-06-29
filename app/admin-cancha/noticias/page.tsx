'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AdminNoticiasPage } from '@/components/publicaciones/admin-noticias-page';
import { ownerFetch } from '@/lib/api';

function getOwnerToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_owner_token');
}

export default function OwnerNoticiasPage() {
  const [permisoLoading, setPermisoLoading] = useState(true);
  const [puedeGestionar, setPuedeGestionar] = useState(false);

  useEffect(() => {
    const token = getOwnerToken();
    if (!token) {
      setPermisoLoading(false);
      return;
    }

    ownerFetch('/api/admin-cancha/permisos')
      .then((res) => res.json())
      .then((data) => {
        setPuedeGestionar(Boolean(data?.puedeGestionarPublicaciones));
      })
      .catch(() => setPuedeGestionar(false))
      .finally(() => setPermisoLoading(false));
  }, []);

  if (permisoLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publicaciones</h1>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card
              key={item}
              className="h-56 animate-pulse border-border bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!puedeGestionar) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publicaciones</h1>
          <p className="text-muted-foreground">
            Gestiona noticias, torneos, eventos y promociones de tus canchas
          </p>
        </div>
        <Card className="border-border p-12 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">Acceso restringido</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Contacta al administrador de la plataforma para habilitar la
            gestión de publicaciones en tu cuenta.
          </p>
        </Card>
      </div>
    );
  }

  return <AdminNoticiasPage panel="owner" />;
}
