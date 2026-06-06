"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  Home,
  Calendar,
  User,
  LogOut,
  ChevronDown,
  CalendarCheck,
  Users,
  Newspaper,
  Phone,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout, type User as AuthUser } from "@/lib/auth";
import {
  getStoredUser,
  apiLogout,
  getToken,
  isTokenLikelyExpired,
} from "@/lib/api";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const AUTH_PAGES = ['/login', '/registro', '/recuperar-contrasena', '/auth/callback'];
  const loginHref = AUTH_PAGES.includes(pathname)
    ? '/login'
    : `/login?redirect=${encodeURIComponent(pathname)}`;
  const registroHref = AUTH_PAGES.includes(pathname)
    ? '/registro'
    : `/registro?redirect=${encodeURIComponent(pathname)}`;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Cargar usuario sin validar token (optimización)
  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getToken();

    // Si no hay token pero hay usuario, limpiar
    if (!token && storedUser) {
      logout();
      apiLogout();
      setUser(null);
    }
    // Si hay token, verificar si probablemente expiró (sin consulta a BD)
    else if (token) {
      if (isTokenLikelyExpired()) {
        // Token probablemente expirado — limpiar
        console.warn("Token expirado (basado en tiempo), cerrando sesión...");
        logout();
        apiLogout();
        setUser(null);
      } else {
        // Token probablemente válido — mostrar usuario
        setUser(storedUser);
      }
    }

    setHydrated(true);

    const handleUpdate = () => {
      const storedUser = getStoredUser();
      const token = getToken();

      // Si no hay token, limpiar usuario
      if (!token) {
        setUser(null);
      } else if (isTokenLikelyExpired()) {
        // Token expirado
        logout();
        apiLogout();
        setUser(null);
      } else {
        setUser(storedUser);
      }
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("user-login", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("user-login", handleUpdate);
    };
  }, []);

  const handleLogout = () => {
    logout(); // borra cancha_piura_user (legacy)
    apiLogout(); // borra cp_token y cp_user
    setUser(null);
    window.dispatchEvent(new Event("user-login"));

    // Solo redirigir si está en páginas protegidas
    const currentPath = window.location.pathname;
    const protectedRoutes = ["/mi-cuenta"];
    const isProtectedRoute = protectedRoutes.some((route) =>
      currentPath.startsWith(route),
    );

    if (isProtectedRoute) {
      router.push("/");
    }
    // Si no está en ruta protegida, se queda en la página actual

    setOpen(false);
  };

  const navItems = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/nosotros", label: "Nosotros", icon: Users },
    { href: "/canchas", label: "Canchas", icon: Calendar },
    { href: "/partidos", label: "Partidos", icon: Trophy },
    { href: "/noticias", label: "Noticias", icon: Newspaper },
    { href: "/contacto", label: "Contacto", icon: Phone },
    ...(user
      ? [{ href: "/mi-cuenta", label: "Mi Cuenta", icon: CalendarCheck }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-8 lg:px-12 md:gap-8">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/images/logo-new.svg"
            alt="CanchaPiura"
            width={280}
            height={80}
            priority
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
          {navItems
            .filter((i) => i.href !== "/mi-cuenta")
            .map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm transition-all ${
                    isActive
                      ? "font-semibold text-primary"
                      : "font-medium text-foreground hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>

        {/* Auth (tablet + desktop) — un solo DropdownMenu desde md+ */}
        <div className="hidden md:flex items-center shrink-0">
          <div className="w-px h-5 bg-border mx-4" />
          <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          {!hydrated ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted lg:w-32 lg:rounded-lg" />
          ) : user?.name ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden lg:inline max-w-30 truncate">{user.name}</span>
                  <ChevronDown className="hidden lg:inline h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href="/mi-cuenta"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    Mi Cuenta
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href={loginHref}
                className="hidden lg:block text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Button size="sm" asChild>
                <Link href={registroHref}>Registrarse</Link>
              </Button>
            </>
          )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <NotificationBell />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-70 bg-card p-0" showCloseButton={false}>
              {/* Header del sheet con logo y botón cerrar */}
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                <Link href="/" onClick={() => setOpen(false)}>
                  <Image
                    src="/images/logo-new.svg"
                    alt="CanchaGo"
                    width={120}
                    height={40}
                    className="h-8 w-auto object-contain"
                  />
                </Link>
                <SheetClose className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Cerrar</span>
                </SheetClose>
              </div>

              <nav className="flex flex-col gap-0.5 p-3">
                {navItems
                  .filter((i) => i.href !== "/mi-cuenta")
                  .map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "font-semibold text-primary"
                            : "font-medium text-foreground hover:bg-secondary"
                        }`}
                      >
                        <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        {item.label}
                      </Link>
                    );
                  })}

                <div className="mt-2 border-t border-border pt-2">
                  {!hydrated ? (
                    <div className="space-y-1 px-1">
                      <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                      <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                    </div>
                  ) : user?.name ? (
                    <>
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <Link
                        href="/mi-cuenta"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                      >
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        Mi Cuenta
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        Cerrar Sesión
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1.5 px-1 pt-1">
                      <Link
                        href={loginHref}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium text-foreground border border-border hover:bg-secondary transition-colors"
                      >
                        Iniciar Sesión
                      </Link>
                      <Link
                        href={registroHref}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Registrarse
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
