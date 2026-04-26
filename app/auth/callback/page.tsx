'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }

      const user = session.user;
      const token = session.access_token;

      // Guardar token en localStorage
      localStorage.setItem('cp_token', token);

      // Obtener nombre del proveedor OAuth
      const nombre =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.user_metadata?.nombre ??
        user.email?.split('@')[0] ??
        'Usuario';

      const email = user.email ?? '';
      const telefono = user.user_metadata?.phone ?? user.user_metadata?.telefono ?? '';

      // Guardar usuario en localStorage
      localStorage.setItem('cp_user', JSON.stringify({ name: nombre, email, phone: telefono }));

      // Sincronizar con tabla usuarios en Supabase (upsert)
      await fetch('/api/auth/sync-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre, email, telefono }),
      });

      // Notificar al header
      window.dispatchEvent(new Event('user-login'));

      router.replace('/');
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Iniciando sesión...</p>
      </div>
    </div>
  );
}
