"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  CalendarCheck,
  Store,
  Newspaper,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin-cancha", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin-cancha/reservas", label: "Reservas", icon: CalendarCheck },
  { href: "/admin-cancha/canchas", label: "Mis Canchas", icon: Store },
  {
    href: "/admin-cancha/noticias",
    label: "Publicaciones",
    icon: Newspaper,
    requiresPublicaciones: true,
  },
  { href: "/admin-cancha/perfil", label: "Mi Perfil", icon: UserCircle },
];

function getOwnerToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cp_owner_token");
}

function getOwnerUser() {
  if (typeof window === "undefined") return null;
  const d = localStorage.getItem("cp_owner_user");
  return d ? JSON.parse(d) : null;
}

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [ownerName, setOwnerName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [puedeGestionarPublicaciones, setPuedeGestionarPublicaciones] =
    useState(false);

  const visibleNavItems = navItems.filter(
    (item) => !item.requiresPublicaciones || puedeGestionarPublicaciones
  );

  const isLoginPage = pathname === "/admin-cancha/login";

  // ── Verificar token en cada navegación (solo presencia en localStorage) ──
  useEffect(() => {
    if (isLoginPage) return;
    if (!getOwnerToken()) router.replace("/admin-cancha/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Cargar datos del panel (solo cuando hay token y no es login) ──
  useEffect(() => {
    if (isLoginPage) return;
    const token = getOwnerToken();
    if (!token) return;

    setToken(token);
    const user = getOwnerUser();
    if (user) setOwnerName(user.nombre ?? "");

    fetch("/api/admin-cancha/reservas", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const vistos = new Set<string>();
          let count = 0;
          for (const r of data.filter((r: any) => r.estado === "pendiente")) {
            const key = r.grupo_reserva_id ?? r.id;
            if (!vistos.has(key)) { vistos.add(key); count++; }
          }
          setPendientes(count);
        }
      })
      .catch(() => {});

    fetch("/api/admin-cancha/permisos", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setPuedeGestionarPublicaciones(
          Boolean(data?.puedeGestionarPublicaciones)
        );
      })
      .catch(() => setPuedeGestionarPublicaciones(false));
    // Solo re-ejecutar cuando cambia la ruta (para refrescar el badge de pendientes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("cp_owner_token");
    localStorage.removeItem("cp_owner_user");
    router.push("/admin-cancha/login");
  };

  // Página de login: renderizar sin el shell del panel
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Store className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {ownerName || "Mi Panel"}
            </p>
            <p className="text-xs text-muted-foreground">Dueño de cancha</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {item.href === "/admin-cancha/reservas" && pendientes > 0 && (
                <Badge className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5">
                  {pendientes}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-3 flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <p className="font-bold text-foreground">
                {ownerName || "Mi Panel"}
              </p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-3">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.href === "/admin-cancha/reservas" && pendientes > 0 && (
                    <Badge className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5">
                      {pendientes}
                    </Badge>
                  )}
                </Link>
              ))}
            </nav>
            <div className="border-t border-border p-3 flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
              <ThemeToggle />
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <p className="font-semibold text-foreground">Mi Panel</p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {token && <NotificationBell token={token} />}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
