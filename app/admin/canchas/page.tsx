'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil, Star, User, MapPin, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sportLabels } from '@/lib/types';
import { getAdminTokenFresh } from '@/lib/supabase-browser';

type CanchaAdmin = {
  id: string; nombre: string; tipo: string; direccion: string;
  distrito: string; precio_por_hora: number; imagenes: string[];
  rating: number; destacada: boolean; activa: boolean;
  dueno: { id: string; nombre: string; email: string } | null;
};

type Usuario = { id: string; nombre: string; email: string; rol: string };

const TIPOS = ['futbol', 'futsal', 'voley', 'basquet', 'tenis'];

export default function AdminCanchasPage() {
  const [canchas, setCanchas]     = useState<CanchaAdmin[]>([]);
  const [duenos, setDuenos]       = useState<Usuario[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [toggling, setToggling]   = useState<string | null>(null);
  const [busqueda, setBusqueda]   = useState('');
  const [form, setForm] = useState({
    nombre: '', tipo: 'futbol', direccion: '', distrito: 'Piura',
    descripcion: '', precio_por_hora: '', telefono: '', dueno_id: '',
  });

  const reload = () => {
    getAdminTokenFresh().then(token => {
      const headers = { Authorization: `Bearer ${token}` };
      Promise.all([
        fetch('/api/admin/canchas',  { headers }).then(r => r.json()),
        fetch('/api/admin/usuarios', { headers }).then(r => r.json()),
      ]).then(([c, u]) => {
        setCanchas(Array.isArray(c) ? c : []);
        setDuenos(Array.isArray(u) ? u.filter((x: Usuario) => x.rol === 'dueno') : []);
        setLoading(false);
      });
    });
  };

  useEffect(() => { reload(); }, []);

  const handleToggleActiva = async (id: string, actual: boolean) => {
    setToggling(id);
    const token = await getAdminTokenFresh();
    await fetch(`/api/admin/canchas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ activa: !actual }),
    });
    setCanchas(prev => prev.map(c => c.id === id ? { ...c, activa: !actual } : c));
    setToggling(null);
  };

  const handleCrear = async () => {
    if (!form.nombre || !form.tipo || !form.precio_por_hora) {
      setError('Nombre, tipo y precio son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    const token = await getAdminTokenFresh();
    const res = await fetch('/api/admin/canchas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, precio_por_hora: Number(form.precio_por_hora) }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Error al crear cancha'); return; }
    setModalOpen(false);
    setForm({ nombre: '', tipo: 'futbol', direccion: '', distrito: 'Piura', descripcion: '', precio_por_hora: '', telefono: '', dueno_id: '' });
    reload();
  };

  const canchasFiltradas = canchas.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Canchas</h1>
          <p className="text-muted-foreground">Gestiona todas las canchas de la plataforma</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva cancha
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          className="pl-9"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : canchasFiltradas.length === 0 ? (
        <Card className="border-border p-12 text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">{busqueda ? 'Sin resultados para esa búsqueda' : 'No hay canchas registradas'}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {canchasFiltradas.map(cancha => (
            <Card key={cancha.id} className={`overflow-hidden border-border transition-opacity ${cancha.activa ? '' : 'opacity-60'}`}>
              <div className="relative aspect-video bg-muted">
                {cancha.imagenes?.[0] ? (
                  <Image src={cancha.imagenes[0]} alt={cancha.nombre} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">
                    {cancha.tipo === 'futbol' || cancha.tipo === 'futsal' ? '⚽' : cancha.tipo === 'voley' ? '🏐' : cancha.tipo === 'basquet' ? '🏀' : '🎾'}
                  </div>
                )}
                <div className="absolute left-2 top-2 flex gap-1.5">
                  <Badge className="bg-primary text-primary-foreground text-xs capitalize">
                    {sportLabels[cancha.tipo as keyof typeof sportLabels] ?? cancha.tipo}
                  </Badge>
                  {!cancha.activa && (
                    <Badge variant="destructive" className="text-xs">Deshabilitada</Badge>
                  )}
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground line-clamp-1">{cancha.nombre}</h3>
                  {(cancha.rating ?? 0) > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      <span className="text-sm font-medium">{cancha.rating}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{cancha.direccion || 'Sin dirección'}</p>

                {/* Dueño asignado */}
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${cancha.dueno ? 'bg-primary/5 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <User className="h-3.5 w-3.5 shrink-0" />
                  {cancha.dueno ? cancha.dueno.nombre : 'Sin dueño asignado'}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-primary">S/ {cancha.precio_por_hora}/h</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cancha.activa}
                        disabled={toggling === cancha.id}
                        onCheckedChange={() => handleToggleActiva(cancha.id, cancha.activa)}
                      />
                      <span className="text-xs text-muted-foreground">{cancha.activa ? 'Activa' : 'Inactiva'}</span>
                    </div>
                    <Button size="sm" asChild>
                      <Link href={`/admin/canchas/${cancha.id}`}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear cancha */}
      <Dialog open={modalOpen} onOpenChange={open => { setModalOpen(open); setError(''); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear nueva cancha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nombre de la cancha</label>
              <Input placeholder="Ej: Complejo Deportivo Los Algarrobos"
                value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tipo de deporte</label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className={`rounded-xl border-2 px-3 py-2 text-sm font-medium capitalize transition-all ${
                      form.tipo === t ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}>
                    {sportLabels[t as keyof typeof sportLabels] ?? t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Precio por hora (S/)</label>
                <Input type="number" min={0} placeholder="80"
                  value={form.precio_por_hora} onChange={e => setForm(f => ({ ...f, precio_por_hora: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Teléfono</label>
                <Input placeholder="+51 999 999 999"
                  value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Dirección</label>
              <Input placeholder="Av. Los Algarrobos 1250, Piura"
                value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Descripción</label>
              <textarea
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
                placeholder="Describe la cancha..."
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Asignar dueño (opcional)</label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.dueno_id}
                onChange={e => setForm(f => ({ ...f, dueno_id: e.target.value }))}
              >
                <option value="">Sin dueño asignado</option>
                {duenos.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre} — {d.email}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleCrear} disabled={saving}>
                {saving ? 'Creando...' : 'Crear cancha'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
