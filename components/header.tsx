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
  CircleUser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
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

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
    const protectedRoutes = ["/perfil", "/mis-reservas"];
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
    { href: "/noticias", label: "Noticias", icon: Newspaper },
    { href: "/contacto", label: "Contáctanos", icon: Phone },
    ...(user
      ? [{ href: "/mis-reservas", label: "Mis Reservas", icon: CalendarCheck }]
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
            .filter((i) => i.href !== "/mis-reservas")
            .map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>

        {/* Tablet Auth (768–1023px) — solo ícono circular */}
        <div className="hidden md:flex lg:hidden items-center shrink-0">
          {!hydrated ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user?.name ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href="/mis-reservas"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar className="h-4 w-4" />
                    Mis Reservas
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/perfil"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    Mi Perfil
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors">
                  <CircleUser className="h-6 w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href="/login" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Iniciar Sesión
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/registro" className="flex items-center gap-2 cursor-pointer">
                    <CircleUser className="h-4 w-4" />
                    Registrarse
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Desktop Auth (≥1024px) — botones de texto */}
        <div className="hidden items-center gap-3 lg:flex shrink-0">
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
                  <span className="max-w-30 truncate">{user.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href="/mis-reservas"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar className="h-4 w-4" />
                    Mis Reservas
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/perfil"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    Mi Perfil
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
                href="/login"
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Button size="sm" asChild>
                <Link href="/registro">Registrarse</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center gap-1 md:hidden">
          {/* Icono circular login/usuario */}
          {hydrated &&
            (user?.name ? (
              <Link
                href="/perfil"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
              >
                {user.name.charAt(0).toUpperCase()}
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
              >
                <CircleUser className="h-6 w-6" />
              </Link>
            ))}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-card p-0">
              {/* Título oculto para accesibilidad */}
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <div className="h-16 border-b border-border" />
              <nav className="flex flex-col gap-1 p-4 pt-0">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="h-5 w-5 text-primary" />
                      {item.label}
                    </Link>
                  );
                })}
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
                          <p className="text-sm font-medium text-foreground">
                            {user.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        asChild
                      >
                        <Link href="/perfil" onClick={() => setOpen(false)}>
                          <User className="mr-2 h-4 w-4" />
                          Mi Perfil
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-destructive hover:text-destructive"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                      </Button>
                    </>
                  ) : (
                    <Button className="w-full justify-center" asChild>
                      <Link href="/registro" onClick={() => setOpen(false)}>
                        Registrarse
                      </Link>
                    </Button>
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
