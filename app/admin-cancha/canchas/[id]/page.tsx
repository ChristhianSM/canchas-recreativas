'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Save, Trash2, Plus, Ban, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const HORAS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

type Cancha = {
  id: string; nombre: string; descripcion: string; telefono: string;
  precio_por_hora: number; amenidades: string[]; imagenes: string[];
};

function getOwnerToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_owner_token');
}

export default function OwnerEditarCanchaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cancha, setCancha]         = useState<Cancha | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone]           = useState('');
  const [price, setPrice]           = useState(0);
  const [amenities, setAmenities]   = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [images, setImages]         = useState<string[]>([]);
  const [restricted, setRestricted] = useState<string[]>([]);

  useEffect(() => {
    const token = getOwnerToken();
    if (!token) { router.replace('/admin-cancha/login'); return; }

    // Cargar cancha desde BD
    fetch(`/api/admin-cancha/cancha?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(canchaData => {
        if (canchaData.error) {
          console.error('Error cargando cancha:', canchaData.error, canchaData.debug);
          router.replace('/admin-cancha/canchas');
          return;
        }
        setCancha(canchaData);
        setDescription(canchaData.descripcion ?? '');
        setPhone(canchaData.telefono ?? '');
        setPrice(canchaData.precio_por_hora ?? 0);
        setAmenities(canchaData.amenidades ?? []);
        setImages(canchaData.imagenes ?? []);
        setLoading(false);

        // Los horarios ya vienen incluidos en la respuesta de la cancha
        setRestricted(Array.isArray(canchaData.horariosRestringidos) ? canchaData.horariosRestringidos : []);
      })
      .catch(err => {
        console.error('Error de red:', err);
        setLoading(false);
      });
  }, [id, router]);

  const handleSave = async () => {
    const token = getOwnerToken();
    if (!token) return;
    setSaving(true);
    setSaveError('');

    const res = await fetch(`/api/admin-cancha/cancha?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        descripcion: description,
        telefono: phone,
        precioHora: price,
        amenidades: amenities,
        imagenes: images,
        horariosRestringidos: restricted,
      }),
    });

    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setSaveError(data.error ?? 'Error al guardar');
    }
  };

  const toggleHora = (hora: string) =>
    setRestricted(prev => prev.includes(hora) ? prev.filter(h => h !== hora) : [...prev, hora]);

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const token = getOwnerToken();
    if (!token) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    setUploadError('');

    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (data.url) {
        setImages(prev => [...prev, data.url]);
      } else {
        setUploadError(data.error ?? 'Error al subir imagen');
      }
    }
    setUploading(false);
    // Limpiar el input para permitir subir el mismo archivo de nuevo
    if (fileRef.current) fileRef.current.value = '';
  };

  const addImageUrl = () => {}; // ya no se usa

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!cancha) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground line-clamp-1">{cancha.nombre}</h1>
            <p className="text-sm text-muted-foreground">Editar mi cancha</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : saved ? '¡Guardado! ✓' : 'Guardar cambios'}
        </Button>
      </div>
      {saveError && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="info"      className="flex-1 sm:flex-none">Información</TabsTrigger>
          <TabsTrigger value="fotos"     className="flex-1 sm:flex-none">Fotos</TabsTrigger>
          <TabsTrigger value="horarios"  className="flex-1 sm:flex-none">Horarios</TabsTrigger>
          <TabsTrigger value="servicios" className="flex-1 sm:flex-none">Servicios</TabsTrigger>
        </TabsList>

        {/* ── Información ── */}
        <TabsContent value="info" className="space-y-4 pt-4">
          <Card className="border-border p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Descripción</label>
              <textarea
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px] resize-none"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe tu cancha..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Teléfono de contacto</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+51 999 999 999" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Precio por hora (S/)</label>
                <Input type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ── Fotos ── */}
        <TabsContent value="fotos" className="space-y-4 pt-4">
          <Card className="border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{images.length} foto{images.length !== 1 ? 's' : ''}</p>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {uploading ? 'Subiendo...' : 'Subir foto'}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img, i) => (
                <div key={i} className="group relative aspect-video overflow-hidden rounded-xl border border-border">
                  <Image src={img} alt={`Foto ${i + 1}`} fill className="object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => removeImage(i)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-white">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {i === 0 && <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground text-xs">Principal</Badge>}
                </div>
              ))}
            </div>
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
          </Card>
        </TabsContent>

        {/* ── Horarios ── */}
        <TabsContent value="horarios" className="space-y-4 pt-4">
          <Card className="border-border p-5 space-y-4">
            <div>
              <p className="font-medium text-foreground">Horarios restringidos</p>
              <p className="text-sm text-muted-foreground">Los horarios en rojo no estarán disponibles para reservas.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {HORAS.map(hora => {
                const bloqueado = restricted.includes(hora);
                return (
                  <button key={hora} onClick={() => toggleHora(hora)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all',
                      bloqueado
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    )}>
                    {bloqueado
                      ? <Ban className="h-3.5 w-3.5 shrink-0" />
                      : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    }
                    {hora}
                  </button>
                );
              })}
            </div>
            {restricted.length > 0 && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3">
                <p className="text-sm font-medium text-destructive mb-1">
                  {restricted.length} horario{restricted.length > 1 ? 's' : ''} bloqueado{restricted.length > 1 ? 's' : ''}:
                </p>
                <p className="text-sm text-muted-foreground">{restricted.join(', ')}</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Servicios ── */}
        <TabsContent value="servicios" className="space-y-4 pt-4">
          <Card className="border-border p-5 space-y-4">
            <p className="font-medium text-foreground">Servicios y amenidades</p>
            <div className="flex flex-wrap gap-2">
              {amenities.map(a => (
                <div key={a} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm">
                  <span className="text-foreground">{a}</span>
                  <button onClick={() => setAmenities(prev => prev.filter(x => x !== a))}
                    className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Ej: Estacionamiento, WiFi..."
                value={newAmenity} onChange={e => setNewAmenity(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { if (newAmenity.trim()) { setAmenities(prev => [...prev, newAmenity.trim()]); setNewAmenity(''); } } }} />
              <Button variant="outline" onClick={() => { if (newAmenity.trim()) { setAmenities(prev => [...prev, newAmenity.trim()]); setNewAmenity(''); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
