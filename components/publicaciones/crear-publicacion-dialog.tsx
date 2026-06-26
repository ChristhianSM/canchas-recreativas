'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  publicacionMuestraPrecio,
  publicacionRequiereFechaFin,
  publicacionRequierePrecio,
  type Publicacion,
  type PublicacionDeporte,
  type PublicacionEstado,
  type PublicacionTipo,
} from '@/lib/publicaciones';
import {
  initialPublicacionForm,
  isPublicacionFormDirty,
  publicacionToForm,
  type PublicacionFormState,
} from '@/lib/publicaciones-form';
import { toast } from '@/components/ui/use-toast';
import {
  apiAdminCrearNoticia,
  apiAdminEditarNoticia,
  apiAdminUploadPublicacionImage,
  apiOwnerCrearNoticia,
  apiOwnerEditarNoticia,
  apiOwnerUploadPublicacionImage,
  getOwnerToken,
} from '@/lib/api';
import { getAdminTokenFresh } from '@/lib/supabase-browser';
import type { AdminNoticiasPanel } from '@/lib/publicaciones-panel';

type CrearPublicacionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  onUpdated?: (publicacion: Publicacion) => void;
  publicacion?: Publicacion | null;
  panel?: AdminNoticiasPanel;
};

type CanchaOption = {
  id: string;
  nombre: string | null;
};

type FormErrors = Partial<Record<keyof PublicacionFormState | 'general' | 'tags', string>>;

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

export function CrearPublicacionDialog({
  open,
  onOpenChange,
  onCreated,
  onUpdated,
  publicacion = null,
  panel = 'owner',
}: CrearPublicacionDialogProps) {
  const isEditing = Boolean(publicacion);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PublicacionFormState>(initialPublicacionForm);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [canchas, setCanchas] = useState<CanchaOption[]>([]);
  const [loadingCanchas, setLoadingCanchas] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificarSuscritos, setNotificarSuscritos] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) return;

    if (publicacion) {
      setForm(publicacionToForm(publicacion));
      setTags(publicacion.tags ?? []);
    } else {
      setForm(initialPublicacionForm);
      setTags([]);
    }
    setTagInput('');
    setErrors({});
    if (fileRef.current) fileRef.current.value = '';

    const loadCanchas = async () => {
      const token =
        panel === 'superadmin'
          ? await getAdminTokenFresh()
          : getOwnerToken();

      if (!token) {
        setErrors({ general: 'Tu sesion expiro. Vuelve a iniciar sesion.' });
        return;
      }

      const canchasUrl =
        panel === 'superadmin'
          ? '/api/admin/canchas'
          : '/api/admin-cancha/canchas';

      setLoadingCanchas(true);

      try {
        const res = await fetch(canchasUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!Array.isArray(data)) {
          setErrors(prev => ({
            ...prev,
            canchaIds: data?.error ?? 'No se pudieron cargar las canchas',
          }));
          return;
        }

        setCanchas(
          data.map((cancha: { id: string; nombre?: string | null }) => ({
            id: cancha.id,
            nombre: cancha.nombre ?? null,
          }))
        );
      } catch {
        setErrors(prev => ({
          ...prev,
          canchaIds: 'No se pudieron cargar las canchas',
        }));
      } finally {
        setLoadingCanchas(false);
      }
    };

    void loadCanchas();
  }, [open, publicacion, panel]);

  const updateField = <Key extends keyof PublicacionFormState>(
    key: Key,
    value: PublicacionFormState[Key]
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined, general: undefined }));
  };

  const resetForm = () => {
    setForm(initialPublicacionForm);
    setTags([]);
    setTagInput('');
    setNotificarSuscritos(false);
    setErrors({});
    if (fileRef.current) fileRef.current.value = '';
  };

  const buildPayload = () => ({
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
    precio:
      publicacionMuestraPrecio(form.tipo) && form.precio.trim()
        ? form.precio.trim()
        : null,
    tags,
    canchaIds: form.canchaIds,
    notificarSuscritos: !isEditing && notificarSuscritos,
  });

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
    const token =
      panel === 'superadmin'
        ? await getAdminTokenFresh()
        : getOwnerToken();

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
      const uploadFn =
        panel === 'superadmin'
          ? apiAdminUploadPublicacionImage
          : apiOwnerUploadPublicacionImage;
      const data = await uploadFn(file);

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
    const requiereFechaFin = publicacionRequiereFechaFin(form.tipo);
    const requierePrecio = publicacionRequierePrecio(form.tipo);

    if (!form.tipo) nextErrors.tipo = 'Selecciona un tipo';
    if (!form.titulo.trim()) nextErrors.titulo = 'Ingresa un titulo';
    if (!form.resumen.trim()) nextErrors.resumen = 'Ingresa un resumen';
    if (!form.contenido.trim()) nextErrors.contenido = 'Ingresa el contenido';
    if (!form.canchaIds.length) nextErrors.canchaIds = 'Selecciona al menos una cancha';
    if (!form.deporte) nextErrors.deporte = 'Selecciona un deporte';
    if (!form.fechaInicio) nextErrors.fechaInicio = 'Selecciona una fecha de inicio';
    if (requiereFechaFin && !form.fechaFin) {
      nextErrors.fechaFin = 'Selecciona una fecha de fin';
    }
    if (form.fechaFin && form.fechaInicio && form.fechaFin < form.fechaInicio) {
      nextErrors.fechaFin = 'La fecha de fin no puede ser anterior al inicio';
    }
    if (requierePrecio && !form.precio.trim()) {
      nextErrors.precio = 'Ingresa un precio';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const token =
      panel === 'superadmin'
        ? await getAdminTokenFresh()
        : getOwnerToken();

    if (!token) {
      setErrors({ general: 'Tu sesion expiro. Vuelve a iniciar sesion.' });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const payload = buildPayload();
      const editarFn =
        panel === 'superadmin' ? apiAdminEditarNoticia : apiOwnerEditarNoticia;
      const crearFn =
        panel === 'superadmin' ? apiAdminCrearNoticia : apiOwnerCrearNoticia;

      if (isEditing && publicacion) {
        const data = await editarFn(publicacion.slug, payload);

        if (data.error || !data.publicacion) {
          const mensaje = data?.error ?? 'No se pudo actualizar la publicacion';
          setErrors({ general: mensaje });
          toast({
            title: 'No se pudo actualizar la publicación',
            description: mensaje,
            variant: 'destructive',
            duration: 4000,
          });
          return;
        }

        toast({
          title: 'Publicación actualizada',
          description: data.publicacion.titulo,
          duration: 3000,
        });

        resetForm();
        onOpenChange(false);
        onUpdated?.(data.publicacion);
        return;
      }

      const data = await crearFn(payload);

      if (data.error) {
        const mensaje = data?.error ?? 'No se pudo crear la publicacion';
        setErrors({ general: mensaje });
        toast({
          title: 'No se pudo crear la publicación',
          description: mensaje,
          variant: 'destructive',
          duration: 4000,
        });
        return;
      }

      const titulo = form.titulo.trim();
      toast({
        title: form.estado === 'publicado' ? 'Publicación publicada' : 'Borrador guardado',
        description:
          form.estado === 'publicado'
            ? notificarSuscritos
              ? `"${titulo}" publicada y notificación enviada a suscritos.`
              : `"${titulo}" ya es visible en noticias.`
            : `"${titulo}" quedó guardada como borrador.`,
        duration: 3000,
      });

      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch {
      setErrors({
        general: isEditing
          ? 'No se pudo actualizar la publicacion'
          : 'No se pudo crear la publicacion',
      });
      toast({
        title: isEditing
          ? 'No se pudo actualizar la publicación'
          : 'No se pudo crear la publicación',
        description: 'Intenta de nuevo.',
        variant: 'destructive',
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const closeDialog = (nextOpen: boolean) => {
    if (saving || uploadingImage) return;
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  };

  const requiereFechaFin = publicacionRequiereFechaFin(form.tipo);
  const requierePrecio = publicacionRequierePrecio(form.tipo);
  const muestraPrecio = publicacionMuestraPrecio(form.tipo);

  const hasChanges = useMemo(() => {
    if (!isEditing || !publicacion) return true;
    return isPublicacionFormDirty(form, tags, publicacion);
  }, [form, tags, publicacion, isEditing]);

  const handleTipoChange = (tipo: PublicacionTipo) => {
    setForm(prev => ({
      ...prev,
      tipo,
      precio: tipo === 'mantenimiento' ? '' : prev.precio,
    }));
    setErrors(prev => ({
      ...prev,
      tipo: undefined,
      fechaFin: undefined,
      precio: undefined,
      general: undefined,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-2xl">
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar publicacion' : 'Crear publicacion'}
            </DialogTitle>
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
                onValueChange={value => handleTipoChange(value as PublicacionTipo)}
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
                  Fecha de fin{requiereFechaFin ? ' *' : ' (opcional)'}
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

              {muestraPrecio ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Precio{requierePrecio ? ' *' : ' (opcional)'}
                  </label>
                  <Input
                    value={form.precio}
                    onChange={event => updateField('precio', event.target.value)}
                    placeholder="Ej: S/ 400 por equipo"
                  />
                  {errors.precio ? (
                    <p className="text-xs text-destructive">{errors.precio}</p>
                  ) : null}
                </div>
              ) : null}
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
                onClick={() => {
                  updateField('estado', 'borrador');
                  setNotificarSuscritos(false);
                }}
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

            {!isEditing && (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  form.estado === 'publicado'
                    ? 'border-border hover:bg-muted/20'
                    : 'cursor-not-allowed border-border opacity-50'
                }`}
              >
                <Checkbox
                  checked={notificarSuscritos}
                  disabled={form.estado !== 'publicado'}
                  onCheckedChange={v => setNotificarSuscritos(v === true)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium">Notificar a suscritos por email</span>
                  <p className="text-xs text-muted-foreground">
                    {form.estado !== 'publicado'
                      ? 'Solo disponible al publicar'
                      : 'Se enviará el contenido completo por email a todos los suscritos activos'}
                  </p>
                </div>
              </label>
            )}
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
              disabled={saving || uploadingImage || (isEditing && !hasChanges)}
              onClick={handleSubmit}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar publicacion'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
