'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createBrowserClient } from '@supabase/ssr';

export default function RecuperarContrasenaPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Ingresa tu correo electrónico'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Ingresa un correo válido'); return; }

    setLoading(true);
    setError('');

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      setLoading(false);
      
      if (err) {
        console.error('Error de reset:', err);
        
        // Mostrar error específico
        if (err.message.includes('not found')) {
          setError('Este correo no está registrado en nuestro sistema.');
        } else if (err.message.includes('rate limit')) {
          setError('Demasiados intentos. Intenta más tarde.');
        } else {
          setError('No se pudo enviar el correo. Verifica el email ingresado.');
        }
        return;
      }
      
      setEnviado(true);
    } catch (err) {
      console.error('Error inesperado:', err);
      setLoading(false);
      setError('Error inesperado. Intenta más tarde.');
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Revisa tu correo</h1>
            <p className="mt-2 text-muted-foreground">
              Enviamos un link de recuperación a <span className="font-medium text-foreground">{email}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Si no lo ves, revisa tu carpeta de spam.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Volver al inicio de sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Link href="/login" className="flex cursor-pointer items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Recuperar contraseña</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <span className="text-2xl font-bold text-primary-foreground">CP</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">¿Olvidaste tu contraseña?</h2>
            <p className="mt-2 text-muted-foreground">
              Ingresa tu correo y te enviaremos un link para restablecerla.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  className={`pl-10 ${error ? 'border-destructive' : ''}`}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de recuperación'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Recordaste tu contraseña?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
