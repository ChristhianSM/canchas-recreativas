'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Shield, User, Trash2, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getAdminTokenFresh } from '@/lib/supabase-browser';

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: string;
  creado_en: string;
  puede_gestionar_publicaciones?: boolean;
};

type Cancha = {
  id: string;
  nombre: string;
  tipo: string;
  dueno: { id: string; nombre: string } | null;
};

const rolBadge = (rol: string) => {
  const map: Record<string, string> = {
    admin:   'bg-destructive/10 text-destructive border-destructive/20',
    dueno:   'bg-primary/10 text-primary border-primary/20',
    usuario: 'bg-muted text-muted-foreground',
  };
  const labels: Record<string, string> = {
    admin: 'Admin', dueno: 'Dueño', usuario: 'Usuario',
  };
  return (
    <Badge variant="outline" className={map[rol] ?? map.usuario}>
      {labels[rol] ?? rol}
    </Badge>
  );
};

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [canchas, setCanchas]     = useState<Cancha[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [canchasSeleccionadas, setCanchasSeleccionadas] = useState<string[]>([]);
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', telefono: '', rol: 'dueno',
  });
  const [busqueda, setBusqueda]                 = useState('');
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);
  const [eliminando, setEliminando]             = useState(false);
  const [togglingPermisoId, setTogglingPermisoId] = useState<string | null>(null);

  const usuariosFiltrados = usuarios.filter(u =>
    u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const reload = () => {
    getAdminTokenFresh().then(token => {
      const headers = { Authorization: `Bearer ${token}` };
      Promise.all([
        fetch('/api/admin/usuarios', { headers }).then(r => r.json()),
        fetch('/api/admin/canchas',  { headers }).then(r => r.json()),
      ]).then(([u, c]) => {
        setUsuarios(Array.isArray(u) ? u : []);
        setCanchas(Array.isArray(c) ? c : []);
        setLoading(false);
      });
    });
  };

  useEffect(() => { reload(); }, []);

  const handleCrear = async () => {
    if (!form.nombre || !form.email || !form.password) {
      setError('Nombre, email y contraseña son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    const token = await getAdminTokenFresh();
    const authHeader = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Error al crear usuario'); return; }

    // Asignar canchas si es dueño y seleccionó canchas
    if (form.rol === 'dueno' && canchasSeleccionadas.length > 0) {
      await fetch('/api/admin/asignar-cancha', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ dueno_id: data.id, cancha_ids: canchasSeleccionadas }),
      });
    }

    setModalOpen(false);
    setForm({ nombre: '', email: '', password: '', telefono: '', rol: 'dueno' });
    setCanchasSeleccionadas([]);
    reload();
  };

  const handleTogglePermisoPublicaciones = async (
    usuario: Usuario,
    checked: boolean
  ) => {
    setTogglingPermisoId(usuario.id);
    const token = await getAdminTokenFresh();
    const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ puede_gestionar_publicaciones: checked }),
    });
    const data = await res.json();
    setTogglingPermisoId(null);

    if (!res.ok) {
      setError(data.error ?? 'No se pudo actualizar el permiso');
      return;
    }

    setUsuarios(prev =>
      prev.map(u =>
        u.id === usuario.id
          ? { ...u, puede_gestionar_publicaciones: checked }
          : u
      )
    );
  };

  const handleEliminar = async () => {
    if (!usuarioAEliminar) return;
    setEliminando(true);
    const token = await getAdminTokenFresh();
    await fetch(`/api/admin/usuarios/${usuarioAEliminar.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setEliminando(false);
    setUsuarioAEliminar(null);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona los dueños de cancha y usuarios de la plataforma</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o correo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <Card className="border-border p-12 text-center">
          <User className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">No hay usuarios registrados</p>
          <p className="text-sm text-muted-foreground">Crea el primer usuario con el botón de arriba</p>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {['Nombre', 'Email', 'Teléfono', 'Rol', 'Puede publicar', 'Registrado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usuariosFiltrados.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {u.nombre?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{u.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.telefono || '—'}</td>
                    <td className="px-4 py-3">{rolBadge(u.rol)}</td>
                    <td className="px-4 py-3">
                      {u.rol === 'dueno' ? (
                        <Switch
                          checked={Boolean(u.puede_gestionar_publicaciones)}
                          disabled={togglingPermisoId === u.id}
                          onCheckedChange={(checked) =>
                            handleTogglePermisoPublicaciones(u, checked)
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.creado_en).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {u.rol === 'dueno' && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"
                          onClick={() => setUsuarioAEliminar(u)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal crear usuario */}
      <Dialog open={modalOpen} onOpenChange={open => { setModalOpen(open); setError(''); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear nuevo usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nombre completo</label>
              <Input placeholder="Ej: María Torres" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" placeholder="maria@ejemplo.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Contraseña</label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Teléfono</label>
              <Input placeholder="987654321" value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Rol</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'dueno',   label: 'Dueño de cancha', icon: Shield },
                  { value: 'usuario', label: 'Usuario normal',  icon: User },
                ].map(r => (
                  <button key={r.value} onClick={() => setForm(f => ({ ...f, rol: r.value }))}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all',
                      form.rol === r.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    )}>
                    <r.icon className="h-4 w-4" />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Selector de canchas — solo si es dueño */}
            {form.rol === 'dueno' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Canchas asignadas
                  <span className="ml-1 text-xs text-muted-foreground">(selecciona una o más)</span>
                </label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                  {canchas.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground">No hay canchas disponibles</p>
                  ) : canchas.map(c => {
                    const seleccionada = canchasSeleccionadas.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCanchasSeleccionadas(prev =>
                          seleccionada ? prev.filter(id => id !== c.id) : [...prev, c.id]
                        )}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                          seleccionada ? 'bg-primary/5' : 'hover:bg-muted/50'
                        )}
                      >
                        <div className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                          seleccionada ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        )}>
                          {seleccionada && <span className="text-[10px] font-bold text-white">✓</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{c.nombre}</p>
                          {c.dueno && (
                            <p className="text-xs text-yellow-600">Ya tiene dueño: {c.dueno.nombre}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {canchasSeleccionadas.length > 0 && (
                  <p className="text-xs text-primary">{canchasSeleccionadas.length} cancha{canchasSeleccionadas.length > 1 ? 's' : ''} seleccionada{canchasSeleccionadas.length > 1 ? 's' : ''}</p>
                )}
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleCrear} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? 'Creando...' : 'Crear usuario'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal confirmar eliminación */}
      <Dialog open={!!usuarioAEliminar} onOpenChange={open => { if (!open) setUsuarioAEliminar(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Eliminar dueño?
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {usuarioAEliminar && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1">
                <p className="font-medium text-foreground">{usuarioAEliminar.nombre}</p>
                <p className="text-muted-foreground">{usuarioAEliminar.email}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Se eliminarán sus datos, asignaciones de canchas y acceso a la plataforma. Las canchas asignadas quedarán sin dueño.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setUsuarioAEliminar(null)}>
                  Cancelar
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleEliminar} disabled={eliminando}>
                  {eliminando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
