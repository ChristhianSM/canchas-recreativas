-- Permiso opcional para que dueños gestionen publicaciones (beta)
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS puede_gestionar_publicaciones boolean NOT NULL DEFAULT false;
