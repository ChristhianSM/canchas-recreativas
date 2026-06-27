"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  CalendarCheck,
  MapPin,
  LogOut,
  Menu,
  X,
  Users,
  Newspaper,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";
import { getAdminTokenFresh } from "@/lib/supabase-browser";

function getAdminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cp_admin_token");
}

function logoutAdmin() {
  localStorage.removeItem("cp_admin_token");
  localStorage.removeItem("cp_admin_user");
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reservas", label: "Reservas", icon: CalendarCheck },
  { href: "/admin/canchas", label: "Canchas", icon: MapPin },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/noticias", label: "Publicaciones", icon: Newspaper },
  { href: "/admin/loyalty", label: "Fidelización", icon: Gift },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  const isLoginPage = pathname === "/admin/login";

  // Verificar token en cada navegación (solo presencia en localStorage)
  useEffect(() => {
    if (isLoginPage) return;
    if (!getAdminToken()) router.replace("/admin/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) return;
    getAdminTokenFresh().then((token) => {
      if (!token) return;
      setToken(token);
      fetch("/api/reservas/all", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            const vistos = new Set<string>();
            let count = 0;
            for (const r of data.filter((r: any) => r.estado === "pendiente")) {
              const key = r.grupo_reserva_id ?? r.id;
              if (!vistos.has(key)) {
                vistos.add(key);
                count++;
              }
            }
            setPendientes(count);
          }
        })
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = () => {
    logoutAdmin();
    router.push("/admin/login");
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
          <Image
            src="/images/logo.png"
            alt="CanchaPiura"
            width={180}
            height={70}
            className="h-12 w-auto object-contain"
          />
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
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
              {item.href === "/admin/reservas" && pendientes > 0 && (
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

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <p className="font-bold text-foreground">Panel Admin</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-3">
              {navItems.map((item) => (
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
                  {item.href === "/admin/reservas" && pendientes > 0 && (
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
        {/* Top bar mobile */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <p className="font-semibold text-foreground">Panel Admin</p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {token && <NotificationBell token={token} />}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
