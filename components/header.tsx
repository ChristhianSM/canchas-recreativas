'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, MapPin, Calendar, User, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getUser, logout, type User as AuthUser } from '@/lib/auth';
import { getStoredUser, apiLogout } from '@/lib/api';

export function Header() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setHydrated(true);

    const handleUpdate = () => setUser(getStoredUser());

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('user-login', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('user-login', handleUpdate);
    };
  }, []);

  const handleLogout = () => {
    logout();        // borra cancha_piura_user (legacy)
    apiLogout();     // borra cp_token y cp_user
    setUser(null);
    window.dispatchEvent(new Event('user-login'));
    
    // Solo redirigir si está en páginas protegidas
    const currentPath = window.location.pathname;
    const protectedRoutes = ['/perfil', '/mis-reservas'];
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
    
    if (isProtectedRoute) {
      router.push('/');
    }
    // Si no está en ruta protegida, se queda en la página actual
    
    setOpen(false);
  };

  const navItems = [
    { href: '/', label: 'Inicio', icon: MapPin },
    { href: '/canchas', label: 'Canchas', icon: Calendar },
    { href: '/mis-reservas', label: 'Mis Reservas', icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:gap-8">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/images/logo.png"
            alt="CanchaPiura"
            width={280}
            height={80}
            className="h-14 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-3 md:flex shrink-0">
          {!hydrated ? (
            /* Skeleton mientras se lee localStorage */
            <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
          ) : user?.name ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/mis-reservas" className="flex items-center gap-2 cursor-pointer">
                    <Calendar className="h-4 w-4" />
                    Mis Reservas
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/perfil" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Mi Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/registro">Registrarse</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] bg-card p-0">
            {/* Título oculto para accesibilidad */}
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            
            <div className="flex h-16 items-center border-b border-border px-4">
              <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <Image
                  src="/images/logo.png"
                  alt="CanchaPiura"
                  width={180}
                  height={45}
                  className="h-11 w-auto object-contain"
                />
              </Link>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  {item.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {!hydrated ? (
                  /* Skeleton mobile */
                  <div className="space-y-2 px-1">
                    <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
                    <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
                  </div>
                ) : user?.name ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/perfil" onClick={() => setOpen(false)}>
                        <User className="mr-2 h-4 w-4" />
                        Mi Perfil
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="w-full justify-center" asChild>
                      <Link href="/login" onClick={() => setOpen(false)}>Iniciar Sesión</Link>
                    </Button>
                    <Button className="w-full justify-center" asChild>
                      <Link href="/registro" onClick={() => setOpen(false)}>Registrarse</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
