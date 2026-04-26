'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  CalendarCheck,
  MapPin,
  LogOut,
  Menu,
  X,
  Bell,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_admin_token');
}

function isAdmin() {
  return !!getAdminToken();
}

function logoutAdmin() {
  localStorage.removeItem('cp_admin_token');
  localStorage.removeItem('cp_admin_user');
}

const navItems = [
  { href: '/admin',           label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reservas',  label: 'Reservas',  icon: CalendarCheck },
  { href: '/admin/canchas',   label: 'Canchas',   icon: MapPin },
  { href: '/admin/usuarios',  label: 'Usuarios',  icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen]             = useState(false);
  const [pendientes, setPendientes] = useState(0);

  const isLoginPage = pathname === '/admin/login';

  // Verificar auth y refrescar token si expiró
  useEffect(() => {
    if (isLoginPage) return;
    const token = getAdminToken();
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    import('@supabase/ssr').then(({ createBrowserClient }) => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token && session.access_token !== token) {
          localStorage.setItem('cp_admin_token', session.access_token);
        } else if (!session) {
          localStorage.removeItem('cp_admin_token');
          localStorage.removeItem('cp_admin_user');
          router.replace('/admin/login');
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    logoutAdmin();
    router.push('/admin/login');
  };

  // Página de login: renderizar sin el shell del panel
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">

      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">CP</span>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">CanchaPiura</p>
            <p className="text-xs text-muted-foreground">Panel Admin</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {item.href === '/admin/reservas' && pendientes > 0 && (
                <Badge className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5">
                  {pendientes}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <p className="font-bold text-foreground">Panel Admin</p>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 p-3">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.href === '/admin/reservas' && pendientes > 0 && (
                    <Badge className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5">
                      {pendientes}
                    </Badge>
                  )}
                </Link>
              ))}
            </nav>
            <div className="border-t border-border p-3">
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary">
                <LogOut className="h-4 w-4" />Cerrar sesión
              </button>
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
          <div className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {pendientes > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {pendientes}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
