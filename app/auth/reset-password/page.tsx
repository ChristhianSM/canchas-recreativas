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
    // Leer parámetros de query string y del hash (el hash nunca se envía al servidor,
    // así que los escáneres de email no pueden consumir los tokens)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    const allParams = Array.from(searchParams.entries());
    const debugMsg = `params: ${JSON.stringify(allParams)}, hash keys: ${Array.from(hashParams.keys()).join(',')}`;
    setDebugInfo(debugMsg);
    console.log(debugMsg);

    const code      = searchParams.get('code');
    const tokenHash = hashParams.get('token_hash');
    const accessToken  = searchParams.get('access_token') || hashParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');
    const error_code   = searchParams.get('error_code')   || hashParams.get('error_code');
    const error_description = searchParams.get('error_description') || hashParams.get('error_description');

    if (error_code) {
      console.error('Error from Supabase:', error_code, error_description);
      setError('El link expiró o ya fue usado. Solicita uno nuevo.');
      return;
    }

    if (code) {
      // Flujo PKCE: Supabase redirigió con ?code=
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        if (err) { setError('El link expiró o ya fue usado. Solicita uno nuevo.'); }
        else      { setSessionReady(true); }
      });
    } else if (tokenHash) {
      // Flujo token_hash (fragment): el más seguro contra escáneres de email
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error: err }) => {
        if (err) {
          console.error('Error verifying token_hash:', err);
          setError('El link expiró o ya fue usado. Solicita uno nuevo.');
        } else {
          setSessionReady(true);
        }
      });
    } else if (accessToken && refreshToken) {
      // Flujo legacy con tokens directos
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: err }) => {
          if (err) { setError('El link expiró o ya fue usado. Solicita uno nuevo.'); }
          else      { setSessionReady(true); }
        });
    } else {
      // Sin tokens: verificar sesión existente (ej. usuario ya autenticado)
      supabase.auth.getSession().then(({ data: { session }, error: err }) => {
        if (err || !session) {
          setError('El link expiró o ya fue usado. Solicita uno nuevo.');
        } else {
          setSessionReady(true);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (!/[A-Z]/.test(password)) { setError('La contraseña debe contener al menos una mayúscula'); return; }
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
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
