'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Suspense } from 'react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleSession = async (session: any, source: string) => {
      console.log(`[auth-callback] handleSession desde: ${source}`);
      if (handled.current) {
        console.log(`[auth-callback] YA MANEJADO — ignorando (source: ${source})`);
        return;
      }
      handled.current = true;

      const user  = session.user;
      const token = session.access_token;

      console.log(`[auth-callback] user.id: ${user?.id}, token: ${!!token}`);

      if (!token) {
        console.warn('[auth-callback] ⚠️ access_token vacío — redirigiendo a /login');
        router.replace('/login');
        return;
      }

      const nombre =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.user_metadata?.nombre ??
        user.email?.split('@')[0] ??
        'Usuario';

      const email    = user.email ?? '';
      const telefono = user.user_metadata?.phone ?? user.user_metadata?.telefono ?? '';

      localStorage.setItem('cp_token', token);
      localStorage.setItem('cp_token_time', Date.now().toString());
      localStorage.setItem('cp_user', JSON.stringify({ name: nombre, email, phone: telefono }));
      console.log('[auth-callback] ✅ localStorage guardado');

      fetch('/api/auth/sync-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre, email, telefono }),
      }).catch((err) => console.error('[auth-callback] sync-oauth falló:', err));

      const returnUrl = sessionStorage.getItem('oauth_return_url');
      sessionStorage.removeItem('oauth_return_url');
      window.dispatchEvent(new Event('user-login'));
      console.log('[auth-callback] ✅ Redirigiendo a', returnUrl ?? '/');
      router.replace(returnUrl ?? '/');
    };

    const code = searchParams.get('code');
    console.log(`[auth-callback] 🚀 Montado. code en URL: ${!!code}`);

    if (code) {
      // Guard sincrónico: previene doble exchange en React Strict Mode (doble invoke del effect)
      if (handled.current) return;
      handled.current = true;

      console.log('[auth-callback] Intercambiando code por sesión (cliente)...');
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        console.log(`[auth-callback] exchangeCodeForSession → error: ${error?.message ?? 'none'}, session: ${!!data.session}`);
        if (data.session) {
          handleSession(data.session, 'exchangeCodeForSession');
        } else {
          console.error('[auth-callback] Sin sesión tras exchange:', error?.message);
          router.replace('/login');
        }
      });
      return;
    }

    // Sin ?code= — puede ser redirect desde el server-side route o sesión en cookies
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[auth-callback] onAuthStateChange → ${event}, session: ${!!session}`);
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        await handleSession(session, `onAuthStateChange(${event})`);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log(`[auth-callback] getSession() → session: ${!!session}, error: ${error?.message ?? 'none'}`);
      if (session) handleSession(session, 'getSession()');
    });

    const timeout = setTimeout(() => {
      if (!handled.current) {
        console.warn('[auth-callback] ⏱️ TIMEOUT 8s — sin sesión. Limpiando y redirigiendo a /login');
        localStorage.removeItem('cp_token');
        localStorage.removeItem('cp_token_time');
        localStorage.removeItem('cp_user');
        router.replace('/login');
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
      // Reset para React Strict Mode (double-invoke en desarrollo)
      handled.current = false;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Iniciando sesión...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
