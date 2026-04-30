'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Mail, Phone, Save, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getToken, getStoredUser } from '@/lib/api';

interface Perfil {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: string;
}

export default function PerfilPage() {
  const [perfil, setPerfil]       = useState<Perfil | null>(null);
  const [nombre, setNombre]       = useState('');
  const [telefono, setTelefono]   = useState('');
  const [loading, setLoading]     = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);
  const [errores, setErrores]     = useState<{ nombre?: string; telefono?: string }>({});

  // Verificar si hay cambios
  const hayChanges = perfil && (
    nombre.trim() !== (perfil.nombre || '') ||
    telefono.trim() !== (perfil.telefono || '')
  );

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Usar el token actual sin refrescar con Supabase
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) { window.location.href = '/login'; return; }
        setPerfil(data);
        setNombre(data.nombre || '');
        setTelefono(data.telefono || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const validar = () => {
    const e: { nombre?: string; telefono?: string } = {};
    if (!nombre.trim()) e.nombre = 'El nombre es requerido';
    if (telefono && !/^9\d{8}$/.test(telefono)) e.telefono = 'Ingresa un número válido (9 dígitos)';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    // Verificar si hay cambios
    if (!hayChanges) {
      setErrores({ nombre: 'No hay cambios para guardar' });
      return;
    }

    if (!validar()) return;
    setGuardando(true);

    try {
      const token = getToken();
      const res = await fetch('/api/auth/perfil', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ nombre: nombre.trim(), telefono: telefono.trim() }),
      });

      if (!res.ok) throw new Error('Error al guardar');

      // Actualizar localStorage con el nuevo nombre
      const storedUser = getStoredUser();
      if (storedUser) {
        localStorage.setItem('cp_user', JSON.stringify({ ...storedUser, name: nombre.trim(), phone: telefono.trim() }));
        window.dispatchEvent(new Event('user-login')); // actualizar header
      }

      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch {
      setErrores({ nombre: 'Error al guardar. Intenta de nuevo.' });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-lg">
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-lg">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
          <p className="text-sm text-muted-foreground">Actualiza tu información personal</p>
        </div>

        <div className="space-y-5">
          {/* Avatar / inicial */}
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {nombre.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-semibold text-foreground">{nombre || 'Sin nombre'}</p>
                <p className="text-sm text-muted-foreground">{perfil?.email}</p>
                <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                  {perfil?.rol === 'superadmin' ? 'Administrador' : perfil?.rol === 'dueno' ? 'Dueño de cancha' : 'Usuario'}
                </span>
              </div>
            </div>
          </Card>

          {/* Formulario */}
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold text-foreground">Información personal</h2>

            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tu nombre completo"
                  value={nombre}
                  onChange={e => { setNombre(e.target.value); setErrores(prev => ({ ...prev, nombre: undefined })); }}
                  className={cn('pl-9', errores.nombre && 'border-destructive')}
                />
              </div>
              {errores.nombre && <p className="text-xs text-destructive">{errores.nombre}</p>}
            </div>

            {/* Email — solo lectura */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={perfil?.email || ''}
                  disabled
                  className="pl-9 bg-muted/50 text-muted-foreground cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground">El correo no se puede cambiar</p>
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Número de Yape/Plin</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="987654321"
                  value={telefono}
                  onChange={e => { setTelefono(e.target.value); setErrores(prev => ({ ...prev, telefono: undefined })); }}
                  className={cn('pl-9', errores.telefono && 'border-destructive')}
                />
              </div>
              {errores.telefono
                ? <p className="text-xs text-destructive">{errores.telefono}</p>
                : <p className="text-xs text-muted-foreground">Se usa para devoluciones si cancelas una reserva</p>
              }
            </div>

            <Separator />

            <Button
              onClick={handleGuardar}
              disabled={guardando || guardado || !hayChanges}
              className="w-full"
            >
              {guardado ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  ¡Guardado!
                </>
              ) : guardando ? (
                'Guardando...'
              ) : !hayChanges ? (
                'Sin cambios'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
