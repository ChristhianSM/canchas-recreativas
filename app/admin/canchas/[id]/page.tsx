'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft, Save, Trash2, Plus, GripVertical, Ban, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getCanchaById } from '@/lib/data';

const HORAS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

export default function EditarCanchaPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const cancha  = getCanchaById(id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved]           = useState(false);
  const [description, setDescription] = useState('');
  const [phone, setPhone]           = useState('');
  const [price, setPrice]           = useState(0);
  const [amenities, setAmenities]   = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [images, setImages]         = useState<string[]>([]);
  const [restricted, setRestricted] = useState<string[]>([]);

  useEffect(() => {
    if (!cancha) return;
    setDescription(cancha.description);
    setPhone(cancha.phone);
    setPrice(cancha.pricePerHour);
    setAmenities([...cancha.amenities]);
    setImages([...cancha.images]);
    setRestricted([]);
  }, [id, cancha]);

  if (!cancha) return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">Cancha no encontrada</p>
    </div>
  );

  const handleSave = async () => {
    await fetch(`/api/admin-cancha/canchas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descripcion: description, telefono: phone, precioHora: price,
        amenidades: amenities, imagenes: images, horariosRestringidos: restricted,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleHora = (hora: string) => {
    setRestricted(prev =>
      prev.includes(hora) ? prev.filter(h => h !== hora) : [...prev, hora]
    );
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const addImageUrl = (url: string) => {
    if (url.trim()) setImages(prev => [...prev, url.trim()]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) setImages(prev => [...prev, ev.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAmenity = (a: string) => setAmenities(prev => prev.filter(x => x !== a));
  const addAmenity = () => {
    if (newAmenity.trim()) {
      setAmenities(prev => [...prev, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground line-clamp-1">{cancha.name}</h1>
            <p className="text-sm text-muted-foreground">Editar información</p>
          </div>
        </div>
        <Button onClick={handleSave} className="gap-2 shrink-0">
          <Save className="h-4 w-4" />
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="info"     className="flex-1 sm:flex-none">Información</TabsTrigger>
          <TabsTrigger value="fotos"    className="flex-1 sm:flex-none">Fotos</TabsTrigger>
          <TabsTrigger value="horarios" className="flex-1 sm:flex-none">Horarios</TabsTrigger>
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
                <Input
                  type="number" min={0} value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ── Fotos ── */}
        <TabsContent value="fotos" className="space-y-4 pt-4">
          <Card className="border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{images.length} foto{images.length !== 1 ? 's' : ''}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Subir foto
                </Button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img, i) => (
                <div key={i} className="group relative aspect-video overflow-hidden rounded-xl border border-border">
                  <Image src={img} alt={`Foto ${i + 1}`} fill className="object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => removeImage(i)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {i === 0 && (
                    <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground text-xs">Principal</Badge>
                  )}
                </div>
              ))}
            </div>

            <Separator />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Agregar por URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  onKeyDown={e => { if (e.key === 'Enter') { addImageUrl((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }}
                />
                <Button variant="outline" size="sm" onClick={() => {
                  const input = document.querySelector('input[placeholder="https://..."]') as HTMLInputElement;
                  if (input) { addImageUrl(input.value); input.value = ''; }
                }}>
                  Agregar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Presiona Enter o el botón para agregar</p>
            </div>
          </Card>
        </TabsContent>

        {/* ── Horarios ── */}
        <TabsContent value="horarios" className="space-y-4 pt-4">
          <Card className="border-border p-5 space-y-4">
            <div>
              <p className="font-medium text-foreground">Horarios restringidos</p>
              <p className="text-sm text-muted-foreground">
                Los horarios marcados en rojo no estarán disponibles para reservas.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {HORAS.map(hora => {
                const bloqueado = restricted.includes(hora);
                return (
                  <button
                    key={hora}
                    onClick={() => toggleHora(hora)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all',
                      bloqueado
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    )}
                  >
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
                  <button onClick={() => removeAmenity(a)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ej: Estacionamiento, WiFi..."
                value={newAmenity}
                onChange={e => setNewAmenity(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addAmenity(); }}
              />
              <Button variant="outline" onClick={addAmenity}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
