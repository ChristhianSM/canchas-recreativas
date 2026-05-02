'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Save, Trash2, Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { BloqueosAdminPanel } from '@/components/bloqueos-admin-panel';

const HORAS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00','23:00',
];

type Cancha = {  id: string; nombre: string; descripcion: string; telefono: string;
  precio_por_hora: number; amenidades: string[]; imagenes: string[];
  lat: number; lng: number; direccion: string;
};

function getOwnerToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_owner_token');
}

// ── Pestaña de ubicación ────────────────────────────────────────
function UbicacionTab({
  direccion, lat, lng, onDireccionChange, onCoordsChange, distrito, onDistritoChange,
}: {
  direccion: string;
  lat: string;
  lng: string;
  distrito: string;
  onDireccionChange: (v: string) => void;
  onCoordsChange: (lat: string, lng: string, distrito?: string) => void;
  onDistritoChange: (v: string) => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError]       = useState('');
  const [MapPicker, setMapPicker] = useState<React.ComponentType<{
    lat: number; lng: number; onChange: (lat: number, lng: number) => void;
  }> | null>(null);

  // Cargar MapPicker solo en cliente
  useEffect(() => {
    import('@/components/map-picker').then(m => setMapPicker(() => m.MapPicker));
  }, []);

  const buscarDireccion = async () => {
    if (!direccion.trim()) return;
    setBuscando(true);
    setError('');
    try {
      const query = encodeURIComponent(direccion);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await res.json();
      if (data.length === 0) {
        setError('No se encontró la dirección. Intenta ser más específico.');
      } else {
        const lat = data[0].lat;
        const lon = data[0].lon;
        onCoordsChange(lat, lon);
      }
    } catch {
      setError('Error al buscar la dirección. Verifica tu conexión.');
    } finally {
      setBuscando(false);
    }
  };

  const tieneCoords = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));
  // Coords por defecto: centro de Piura
  const mapLat = tieneCoords ? Number(lat) : -5.1945;
  const mapLng = tieneCoords ? Number(lng) : -80.6328;

  return (
    <Card className="border-border p-5 space-y-4">
      <div>
        <p className="font-medium text-foreground">Ubicación de la cancha</p>
        <p className="text-sm text-muted-foreground">
          Busca la dirección y luego arrastra el pin o haz clic en el mapa para ajustar la ubicación exacta.
        </p>
      </div>

      {/* Buscador */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Dirección</label>
        <div className="flex gap-2">
          <Input
            value={direccion}
            onChange={e => onDireccionChange(e.target.value)}
            placeholder="Ej: Av. Los Algarrobos 1250, Chiclayo"
            onKeyDown={e => { if (e.key === 'Enter') buscarDireccion(); }}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={buscarDireccion}
            disabled={buscando || !direccion.trim()}
            className="shrink-0 gap-2"
          >
            <MapPin className="h-4 w-4" />
            {buscando ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Campo de distrito editable */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Distrito</label>
        <Input
          value={distrito}
          onChange={e => onDistritoChange(e.target.value)}
          placeholder="Ej: Chiclayo, Piura, Tambogrande..."
          className="bg-blue-500/5 border-blue-500/20"
        />
        <p className="text-xs text-muted-foreground">
          💡 Escribe el distrito manualmente. Se guardará tal como lo escribas.
        </p>
      </div>

      {/* Mapa interactivo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Ajusta el pin en el mapa
          </label>
          {tieneCoords && (
            <span className="text-xs text-muted-foreground">
              {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
            </span>
          )}
        </div>

        {MapPicker ? (
          <MapPicker
            lat={mapLat}
            lng={mapLng}
            onChange={(newLat, newLng, newDireccion) => {
              onCoordsChange(String(newLat), String(newLng));
              if (newDireccion) onDireccionChange(newDireccion);
            }}
          />
        ) : (
          <div className="h-72 w-full animate-pulse rounded-xl bg-muted" />
        )}

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          💡 Haz clic en el mapa o arrastra el marcador para ajustar la posición exacta
        </p>
      </div>

      {tieneCoords && (
        <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <p className="text-sm text-primary font-medium">
            ✅ Ubicación lista. Haz clic en "Guardar cambios" para confirmar.
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0 ml-3"
          >
            <MapPin className="h-3 w-3" /> Ver en Google Maps
          </a>
        </div>
      )}
    </Card>
  );
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
  const [activeTab, setActiveTab]   = useState('info');
  const [preciosPorHora, setPreciosPorHora] = useState<Record<string, number>>({});
  const [lat, setLat]               = useState('');
  const [lng, setLng]               = useState('');
  const [direccion, setDireccion]   = useState('');
  const [distrito, setDistrito]     = useState('');

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
        setPreciosPorHora(canchaData.precios_por_hora ?? {});
        setLoading(false);

        setLat(String(canchaData.lat ?? ''));
        setLng(String(canchaData.lng ?? ''));
        setDireccion(canchaData.direccion ?? '');
        setDistrito(canchaData.distrito ?? '');
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

    console.log('🔍 handleSave - Valores a enviar:');
    console.log('  descripcion:', description);
    console.log('  telefono:', phone);
    console.log('  precioHora:', price);
    console.log('  lat:', lat);
    console.log('  lng:', lng);
    console.log('  direccion:', direccion);
    console.log('  distrito:', distrito);

    const res = await fetch(`/api/admin-cancha/cancha?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        descripcion: description,
        telefono: phone,
        precioHora: price,
        amenidades: amenities,
        imagenes: images,
        preciosPorHora,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        direccion: direccion || undefined,
        distrito: distrito || undefined,
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
      form.append('canchaId', id);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (data.error) {
        setUploadError(data.error);
      } else if (data.url) {
        setImages(prev => [...prev, data.url]);
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
        <Button onClick={handleSave} disabled={saving} className={cn("gap-2 shrink-0", activeTab === 'bloqueos' && "invisible")}>
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : saved ? '¡Guardado! ✓' : 'Guardar cambios'}
        </Button>
      </div>
      {saveError && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <Tabs defaultValue="info" onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
          <TabsList className="w-max min-w-full sm:w-auto">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="bloqueos">Bloqueos</TabsTrigger>
            <TabsTrigger value="ubicacion">Ubicación</TabsTrigger>
            <TabsTrigger value="servicios">Servicios</TabsTrigger>
          </TabsList>
        </div>

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
                <label className="text-sm font-medium text-foreground">Precio base por hora (S/)</label>
                <Input type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Se aplica a las horas que no tengan precio personalizado.</p>
              </div>
            </div>
          </Card>

          {/* Precios por hora */}
          <Card className="border-border p-5 space-y-4">
            <div>
              <p className="font-medium text-foreground">Precios por hora</p>
              <p className="text-sm text-muted-foreground">
                Personaliza el precio de cada horario. Las horas sin precio usarán el precio base (S/ {price}).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'].map(hora => {
                const valorActual = preciosPorHora[hora];
                const tienePersonalizado = valorActual !== undefined;
                return (
                  <div key={hora} className={`rounded-xl border p-3 space-y-1.5 transition-colors ${tienePersonalizado ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{hora}</span>
                      {tienePersonalizado && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...preciosPorHora };
                            delete next[hora];
                            setPreciosPorHora(next);
                          }}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">S/</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder={String(price)}
                        value={valorActual ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            const next = { ...preciosPorHora };
                            delete next[hora];
                            setPreciosPorHora(next);
                          } else {
                            setPreciosPorHora(prev => ({ ...prev, [hora]: Number(val) }));
                          }
                        }}
                        className="h-8 text-sm px-2"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {Object.keys(preciosPorHora).length > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-2.5">
                <p className="text-sm text-primary">
                  {Object.keys(preciosPorHora).length} hora{Object.keys(preciosPorHora).length > 1 ? 's' : ''} con precio personalizado
                </p>
                <button
                  type="button"
                  onClick={() => setPreciosPorHora({})}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Limpiar todo
                </button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Fotos ── */}
        <TabsContent value="fotos" className="space-y-4 pt-4">
          <Card className="border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{images.length} de {6} foto{images.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-muted-foreground">Máximo 6 imágenes por cancha</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileRef.current?.click()} 
                disabled={uploading || images.length >= 6}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {uploading ? 'Subiendo...' : images.length >= 6 ? 'Límite alcanzado' : 'Subir foto'}
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

        {/* ── Bloqueos avanzados ── */}
        <TabsContent value="bloqueos" className="space-y-4 pt-4">
          <div className="rounded-xl border border-border bg-card px-4 py-3 mb-2">
            <p className="text-sm font-medium text-foreground">Bloqueos por fecha o recurrentes</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bloquea horarios para un día específico, de forma recurrente cada semana, o de forma permanente.
              Los horarios bloqueados no estarán disponibles para reservas.
            </p>
          </div>
          <BloqueosAdminPanel canchaId={id} token={getOwnerToken() ?? ''} />
        </TabsContent>

        {/* ── Ubicación ── */}
        <TabsContent value="ubicacion" className="space-y-4 pt-4">          <UbicacionTab
            direccion={direccion}
            lat={lat}
            lng={lng}
            distrito={distrito}
            onDireccionChange={setDireccion}
            onDistritoChange={setDistrito}
            onCoordsChange={(newLat, newLng, newDistrito) => { 
              setLat(newLat); 
              setLng(newLng);
              if (newDistrito) setDistrito(newDistrito);
            }}
          />
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
