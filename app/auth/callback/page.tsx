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

    const handleCallback = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get('code');
        console.log('[callback] code:', code ? 'presente' : 'ausente');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('[callback] exchangeCodeForSession error:', exchangeError.message);
          } else {
            console.log('[callback] exchangeCodeForSession OK');
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('[callback] session:', session ? 'encontrada' : 'null', sessionError?.message ?? '');

        if (!session) {
          router.replace('/login');
          return;
        }

        const user = session.user;
        const token = session.access_token;

        localStorage.setItem('cp_token', token);

        const nombre =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.user_metadata?.nombre ??
          user.email?.split('@')[0] ??
          'Usuario';

        const email = user.email ?? '';
        const telefono = user.user_metadata?.phone ?? user.user_metadata?.telefono ?? '';

        localStorage.setItem('cp_user', JSON.stringify({ name: nombre, email, phone: telefono }));

        console.log('[callback] sincronizando usuario...');
        const syncRes = await fetch('/api/auth/sync-oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nombre, email, telefono }),
        });
        console.log('[callback] sync-oauth status:', syncRes.status);

        window.dispatchEvent(new Event('user-login'));
        console.log('[callback] redirigiendo a home');
        router.replace('/');
      } catch (err: any) {
        console.error('[callback] error inesperado:', err?.message ?? err);
        router.replace('/login');
      }
    };

    handleCallback();
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
