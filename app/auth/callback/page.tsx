'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function AuthCallbackPage() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleSession = async (session: any) => {
      if (handled.current) return;
      handled.current = true;

      const user  = session.user;
      const token = session.access_token;

      const nombre =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.user_metadata?.nombre ??
        user.email?.split('@')[0] ??
        'Usuario';

      const email    = user.email ?? '';
      const telefono = user.user_metadata?.phone ?? user.user_metadata?.telefono ?? '';

      localStorage.setItem('cp_token', token);
      localStorage.setItem('cp_user', JSON.stringify({ name: nombre, email, phone: telefono }));

      await fetch('/api/auth/sync-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre, email, telefono }),
      });

      window.dispatchEvent(new Event('user-login'));
      router.replace('/');
    };

    // INITIAL_SESSION se dispara cuando la sesión ya existe en cookies (flujo PKCE normal).
    // SIGNED_IN se dispara en reintento o cuando no hay sesión previa.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        await handleSession(session);
      }
    });

    // Fallback: por si onAuthStateChange no disparó (edge case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession(session);
    });

    // Timeout de seguridad: si en 8s no llegó nada, redirigir al login
    const timeout = setTimeout(() => {
      if (!handled.current) router.replace('/login');
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
      // Reset para React Strict Mode (double-invoke en desarrollo)
      handled.current = false;
    };
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
