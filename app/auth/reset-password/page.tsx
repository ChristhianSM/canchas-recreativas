'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createBrowserClient } from '@supabase/ssr';

function ResetPasswordContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [listo, setListo]             = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [debugInfo, setDebugInfo]     = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Debug: mostrar todos los parámetros de la URL
    const allParams = Array.from(searchParams.entries());
    const debugMsg = `URL params: ${JSON.stringify(allParams)}`;
    setDebugInfo(debugMsg);
    console.log(debugMsg);

    // Nuevo flujo PKCE: el code viene como query param ?code=xxx
    const code = searchParams.get('code');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const error_code = searchParams.get('error_code');
    const error_description = searchParams.get('error_description');

    // Verificar si hay error en los parámetros
    if (error_code) {
      console.error('Error from Supabase:', error_code, error_description);
      let errorMsg = 'El link expiró o ya fue usado. Solicita uno nuevo.';
      
      if (error_code === 'invalid_code') {
        errorMsg = 'El código es inválido. Solicita un nuevo link.';
      } else if (error_code === 'expired_code') {
        errorMsg = 'El link expiró. Solicita uno nuevo.';
      } else if (error_code === 'access_denied') {
        errorMsg = 'Acceso denegado. Solicita un nuevo link.';
      }
      
      setError(errorMsg);
      return;
    }

    if (code) {
      console.log('Using PKCE flow with code:', code.substring(0, 10) + '...');
      // Intercambiar el code por una sesión válida
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        if (err) {
          console.error('Error exchanging code:', err);
          let errorMsg = 'El link expiró o ya fue usado. Solicita uno nuevo.';
          
          if (err.message.includes('invalid')) {
            errorMsg = 'El código es inválido. Solicita un nuevo link.';
          } else if (err.message.includes('expired')) {
            errorMsg = 'El link expiró. Solicita uno nuevo.';
          }
          
          setError(errorMsg);
        } else {
          console.log('Session established successfully');
          setSessionReady(true);
        }
      });
    } else if (accessToken && refreshToken) {
      console.log('Using legacy flow with tokens');
      // Flujo legacy con tokens en URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ error: err }) => {
        if (err) {
          console.error('Error setting session:', err);
          setError('El link expiró o ya fue usado. Solicita uno nuevo.');
        } else {
          console.log('Legacy session established successfully');
          setSessionReady(true);
        }
      });
    } else {
      console.log('No code or tokens found, checking existing session');
      // Verificar si ya hay una sesión activa
      supabase.auth.getSession().then(({ data: { session }, error: err }) => {
        if (err) {
          console.error('Error getting session:', err);
          setError('El link expiró o ya fue usado. Solicita uno nuevo.');
        } else if (session) {
          console.log('Found existing session');
          setSessionReady(true);
        } else {
          console.log('No existing session, listening for auth changes');
          // Escuchar cambios de autenticación como fallback
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            console.log('Auth state change:', event);
            if (event === 'PASSWORD_RECOVERY') setSessionReady(true);
          });
          
          // Si no hay sesión después de 3 segundos, mostrar error
          setTimeout(() => {
            if (!sessionReady) {
              setError('El link expiró o ya fue usado. Solicita uno nuevo.');
            }
          }, 3000);
          
          return () => subscription.unsubscribe();
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }

    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) { setError('No se pudo actualizar la contraseña. Intenta solicitar un nuevo link.'); return; }
    setListo(true);
    setTimeout(() => router.push('/login'), 3000);
  };

  if (listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">¡Contraseña actualizada!</h1>
          <p className="text-muted-foreground">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  if (error && !sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-2xl">❌</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Link inválido</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          {debugInfo && (
            <details className="text-xs text-muted-foreground text-left">
              <summary className="cursor-pointer">Ver información técnica</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">{debugInfo}</pre>
            </details>
          )}
          <Button className="w-full" onClick={() => router.push('/recuperar-contrasena')}>
            Solicitar nuevo link
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Verificando link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">CP</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Nueva contraseña</h1>
          <p className="mt-2 text-muted-foreground">Ingresa tu nueva contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nueva contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input type={showPass ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                className="pl-10 pr-10" value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirmar contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input type={showConfirm ? 'text' : 'password'} placeholder="Repite tu contraseña"
                className="pl-10 pr-10" value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
