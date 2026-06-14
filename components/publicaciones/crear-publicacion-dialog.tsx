'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Plus, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  PUBLICACION_DEPORTE_LABELS,
  PUBLICACION_TIPO_LABELS,
} from '@/components/publicaciones/publicacion-ui';
import {
  PUBLICACION_DEPORTES,
  PUBLICACION_TIPOS,
  type PublicacionDeporte,
  type PublicacionEstado,
  type PublicacionTipo,
} from '@/lib/publicaciones';
import {
  apiOwnerCrearNoticia,
  apiOwnerUploadPublicacionImage,
  getOwnerToken,
} from '@/lib/api';

type CrearPublicacionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

type CanchaOption = {
  id: string;
  nombre: string | null;
};

type FormState = {
  tipo: PublicacionTipo;
  titulo: string;
  resumen: string;
  contenido: string;
  imagenUrl: string;
  canchaIds: string[];
  deporte: PublicacionDeporte | '';
  fechaInicio: string;
  fechaFin: string;
  hora: string;
  precio: string;
  estado: PublicacionEstado;
};

type FormErrors = Partial<Record<keyof FormState | 'general' | 'tags', string>>;

const initialForm: FormState = {
  tipo: 'torneo',
  titulo: '',
  resumen: '',
  contenido: '',
  imagenUrl: '',
  canchaIds: [],
  deporte: '',
  fechaInicio: '',
  fechaFin: '',
  hora: '',
  precio: '',
  estado: 'borrador',
};

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

export function CrearPublicacionDialog({
  open,
  onOpenChange,
  onCreated,
}: CrearPublicacionDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [canchas, setCanchas] = useState<CanchaOption[]>([]);
  const [loadingCanchas, setLoadingCanchas] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) return;

    const token = getOwnerToken();
    if (!token) {
      setErrors({ general: 'Tu sesion expiro. Vuelve a iniciar sesion.' });
      return;
    }

    setLoadingCanchas(true);
    fetch('/api/admin-cancha/canchas', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) {
          setErrors(prev => ({
            ...prev,
            canchaIds: data?.error ?? 'No se pudieron cargar tus canchas',
          }));
          return;
        }

        setCanchas(data);
      })
      .catch(() => {
        setErrors(prev => ({
          ...prev,
          canchaIds: 'No se pudieron cargar tus canchas',
        }));
      })
      .finally(() => setLoadingCanchas(false));
  }, [open]);

  const updateField = <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key]
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined, general: undefined }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setTags([]);
    setTagInput('');
    setErrors({});
    if (fileRef.current) fileRef.current.value = '';
  };

  const addTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag) return;

    if (tags.includes(nextTag)) {
      setTagInput('');
      return;
    }

    if (tags.length >= 10) {
      setErrors(prev => ({ ...prev, tags: 'Maximo 10 tags por publicacion' }));
      return;
    }

    setTags(prev => [...prev, nextTag]);
    setTagInput('');
    setErrors(prev => ({ ...prev, tags: undefined }));
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(item => item !== tag));
    setErrors(prev => ({ ...prev, tags: undefined }));
  };

  const toggleCancha = (canchaId: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      canchaIds: checked
        ? [...prev.canchaIds, canchaId]
        : prev.canchaIds.filter(id => id !== canchaId),
    }));
    setErrors(prev => ({ ...prev, canchaIds: undefined, general: undefined }));
  };

  const handleImageUpload = async (file: File) => {
    const token = getOwnerToken();
    if (!token) {
      setErrors(prev => ({
        ...prev,
        imagenUrl: 'Tu sesion expiro. Vuelve a iniciar sesion.',
      }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, imagenUrl: 'Selecciona una imagen valida' }));
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      setErrors(prev => ({
        ...prev,
        imagenUrl: 'La imagen no puede superar 5MB',
      }));
      return;
    }

    setUploadingImage(true);
    setErrors(prev => ({ ...prev, imagenUrl: undefined, general: undefined }));

    try {
      const data = await apiOwnerUploadPublicacionImage(file);

      if (data.error) {
        setErrors(prev => ({
          ...prev,
          imagenUrl: data?.error ?? 'No se pudo subir la imagen',
        }));
        return;
      }

      setForm(prev => ({ ...prev, imagenUrl: data.url ?? '' }));
    } catch {
      setErrors(prev => ({
        ...prev,
        imagenUrl: 'No se pudo subir la imagen',
      }));
    } finally {
      setUploadingImage(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.tipo) nextErrors.tipo = 'Selecciona un tipo';
    if (!form.titulo.trim()) nextErrors.titulo = 'Ingresa un titulo';
    if (!form.resumen.trim()) nextErrors.resumen = 'Ingresa un resumen';
    if (!form.contenido.trim()) nextErrors.contenido = 'Ingresa el contenido';
    if (!form.canchaIds.length) nextErrors.canchaIds = 'Selecciona al menos una cancha';
    if (!form.deporte) nextErrors.deporte = 'Selecciona un deporte';
    if (!form.fechaInicio) nextErrors.fechaInicio = 'Selecciona una fecha de inicio';
    if (form.fechaFin && form.fechaInicio && form.fechaFin < form.fechaInicio) {
      nextErrors.fechaFin = 'La fecha de fin no puede ser anterior al inicio';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const token = getOwnerToken();
    if (!token) {
      setErrors({ general: 'Tu sesion expiro. Vuelve a iniciar sesion.' });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const data = await apiOwnerCrearNoticia({
        tipo: form.tipo,
        estado: form.estado,
        titulo: form.titulo.trim(),
        resumen: form.resumen.trim(),
        contenido: form.contenido.trim(),
        imagenUrl: form.imagenUrl || null,
        deporte: form.deporte || null,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin || null,
        hora: form.hora || null,
        precio: form.precio.trim() || null,
        tags,
        canchaIds: form.canchaIds,
      });

      if (data.error) {
        setErrors({
          general: data?.error ?? 'No se pudo crear la publicacion',
        });
        return;
      }

      resetForm();
      onOpenChange(false);
      onCreated();
    } catch {
      setErrors({ general: 'No se pudo crear la publicacion' });
    } finally {
      setSaving(false);
    }
  };

  const closeDialog = (nextOpen: boolean) => {
    if (saving || uploadingImage) return;
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-2xl">
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle>Crear publicacion</DialogTitle>
          </DialogHeader>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Informacion principal
            </h3>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tipo de publicacion *
              </label>
              <Select
                value={form.tipo}
                onValueChange={value => updateField('tipo', value as PublicacionTipo)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {PUBLICACION_TIPOS.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                      {PUBLICACION_TIPO_LABELS[tipo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo ? <p className="text-xs text-destructive">{errors.tipo}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Titulo *</label>
              <Input
                value={form.titulo}
                onChange={event => updateField('titulo', event.target.value)}
                placeholder="Ej: Liga Relampago Verano 2026"
              />
              {errors.titulo ? <p className="text-xs text-destructive">{errors.titulo}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Resumen corto *
              </label>
              <Input
                value={form.resumen}
                onChange={event => updateField('resumen', event.target.value)}
                placeholder="Breve descripcion que aparecera en la tarjeta"
              />
              {errors.resumen ? <p className="text-xs text-destructive">{errors.resumen}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Contenido completo *
              </label>
              <Textarea
                value={form.contenido}
                onChange={event => updateField('contenido', event.target.value)}
                placeholder="Descripcion detallada de la publicacion"
                className="min-h-28 resize-none"
              />
              {errors.contenido ? <p className="text-xs text-destructive">{errors.contenido}</p> : null}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Imagen</h3>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) void handleImageUpload(file);
              }}
            />

            {form.imagenUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img
                  src={form.imagenUrl}
                  alt="Imagen de la publicacion"
                  className="h-48 w-full object-cover"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm"
                  onClick={() => updateField('imagenUrl', '')}
                  aria-label="Quitar imagen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileRef.current?.click()}
                className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center transition hover:bg-muted/40 disabled:opacity-60"
              >
                {uploadingImage ? (
                  <Loader2 className="mb-2 h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {uploadingImage ? 'Subiendo imagen...' : 'Click para subir imagen'}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG hasta 5MB
                </span>
              </button>
            )}
            {errors.imagenUrl ? <p className="text-xs text-destructive">{errors.imagenUrl}</p> : null}
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Detalles del evento/publicacion
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Canchas asociadas *
                </label>
                <div className="min-h-10 rounded-md border border-input bg-transparent px-3 py-2">
                  {loadingCanchas ? (
                    <p className="text-sm text-muted-foreground">Cargando canchas...</p>
                  ) : canchas.length ? (
                    <div className="space-y-2">
                      {canchas.map(cancha => {
                        const checked = form.canchaIds.includes(cancha.id);

                        return (
                          <label
                            key={cancha.id}
                            className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={value => toggleCancha(cancha.id, value === true)}
                            />
                            <span>{cancha.nombre ?? 'Cancha sin nombre'}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tienes canchas disponibles</p>
                  )}
                </div>
                {form.canchaIds.length ? (
                  <p className="text-xs text-muted-foreground">
                    {form.canchaIds.length} cancha{form.canchaIds.length !== 1 ? 's' : ''} seleccionada{form.canchaIds.length !== 1 ? 's' : ''}
                  </p>
                ) : null}
                {errors.canchaIds ? <p className="text-xs text-destructive">{errors.canchaIds}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Deporte/Categoria *
                </label>
                <Select
                  value={form.deporte}
                  onValueChange={value => updateField('deporte', value as PublicacionDeporte)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLICACION_DEPORTES.map(deporte => (
                      <SelectItem key={deporte} value={deporte}>
                        {PUBLICACION_DEPORTE_LABELS[deporte]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.deporte ? <p className="text-xs text-destructive">{errors.deporte}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Fecha de inicio *
                </label>
                <Input
                  type="date"
                  value={form.fechaInicio}
                  onChange={event => updateField('fechaInicio', event.target.value)}
                />
                {errors.fechaInicio ? <p className="text-xs text-destructive">{errors.fechaInicio}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Fecha de fin (opcional)
                </label>
                <Input
                  type="date"
                  value={form.fechaFin}
                  onChange={event => updateField('fechaFin', event.target.value)}
                />
                {errors.fechaFin ? <p className="text-xs text-destructive">{errors.fechaFin}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Hora (opcional)
                </label>
                <Input
                  type="time"
                  value={form.hora}
                  onChange={event => updateField('hora', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Precio (opcional)
                </label>
                <Input
                  value={form.precio}
                  onChange={event => updateField('precio', event.target.value)}
                  placeholder="Ej: S/ 400 por equipo"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Tags</h3>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={event => setTagInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Agregar tag (ej: Dia del Padre, Gratis, etc.)"
              />
              <Button type="button" onClick={addTag} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length ? (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Quitar ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
            {errors.tags ? <p className="text-xs text-destructive">{errors.tags}</p> : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Estado de publicacion
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => updateField('estado', 'borrador')}
                className={`rounded-xl border p-4 text-center transition ${
                  form.estado === 'borrador'
                    ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                    : 'border-border text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <span className="block text-sm font-semibold">Borrador</span>
                <span className="text-xs">Guardar sin publicar</span>
              </button>
              <button
                type="button"
                onClick={() => updateField('estado', 'publicado')}
                className={`rounded-xl border p-4 text-center transition ${
                  form.estado === 'publicado'
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-border text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <span className="block text-sm font-semibold">Publicado</span>
                <span className="text-xs">Visible para usuarios</span>
              </button>
            </div>
          </section>

          {errors.general ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.general}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving || uploadingImage}
              onClick={() => closeDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || uploadingImage}
              onClick={handleSubmit}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar publicacion'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
