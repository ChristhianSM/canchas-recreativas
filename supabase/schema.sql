-- ============================================================
-- CanchaPiura — Schema completo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ── Usuarios ──────────────────────────────────────────────────
create table public.usuarios (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  email       text unique not null,
  telefono    text,
  rol         text not null default 'usuario' check (rol in ('usuario', 'dueno', 'superadmin')),
  creado_en   timestamptz default now()
);

-- ── Canchas ───────────────────────────────────────────────────
create table public.canchas (
  id                uuid primary key default uuid_generate_v4(),
  nombre            text not null,
  tipo              text not null check (tipo in ('futbol','voley','basquet','tenis','futsal')),
  direccion         text not null,
  distrito          text not null,
  descripcion       text,
  imagenes          text[] default '{}',
  rating            numeric(3,1) default 0,
  total_resenas     int default 0,
  precio_por_hora   int not null,
  amenidades        text[] default '{}',
  lat               numeric(10,7),
  lng               numeric(10,7),
  telefono          text,
  destacada         boolean default false,
  activa            boolean default true,
  creado_en         timestamptz default now()
);

-- ── Dueños de canchas ─────────────────────────────────────────
create table public.duenos_canchas (
  id          uuid primary key default uuid_generate_v4(),
  usuario_id  uuid references public.usuarios(id) on delete cascade,
  cancha_id   uuid references public.canchas(id) on delete cascade,
  unique(usuario_id, cancha_id)
);

-- ── Horarios bloqueados ───────────────────────────────────────
create table public.horarios_bloqueados (
  id          uuid primary key default uuid_generate_v4(),
  cancha_id   uuid references public.canchas(id) on delete cascade,
  hora        text not null,
  unique(cancha_id, hora)
);

-- ── Reservas ──────────────────────────────────────────────────
create table public.reservas (
  id                uuid primary key default uuid_generate_v4(),
  cancha_id         uuid references public.canchas(id),
  usuario_id        uuid references public.usuarios(id),
  usuario_nombre    text not null,
  usuario_email     text not null,
  usuario_telefono  text,
  cancha_nombre     text not null,
  fecha             date not null,
  hora              text not null,
  precio            int not null,
  precio_original   int,
  cupon_aplicado    boolean default false,
  metodo_pago       text check (metodo_pago in ('yape','plin')),
  comprobante_url   text,
  estado            text default 'pendiente' check (estado in ('pendiente','confirmada','rechazada','cancelada')),
  creado_en         timestamptz default now()
);

-- ── Notificaciones ────────────────────────────────────────────
create table public.notificaciones (
  id          uuid primary key default uuid_generate_v4(),
  usuario_id  uuid references public.usuarios(id) on delete cascade,
  reserva_id  uuid references public.reservas(id) on delete cascade,
  mensaje     text not null,
  tipo        text check (tipo in ('confirmada','rechazada','cancelada','favorito')),
  leida       boolean default false,
  creado_en   timestamptz default now()
);

-- ── Fidelización ──────────────────────────────────────────────
create table public.loyalty (
  id              uuid primary key default uuid_generate_v4(),
  usuario_id      uuid references public.usuarios(id) on delete cascade unique,
  sellos          int default 0,
  total_reservas  int default 0
);

-- ── Cupones ───────────────────────────────────────────────────
create table public.cupones (
  id          uuid primary key default uuid_generate_v4(),
  usuario_id  uuid references public.usuarios(id) on delete cascade,
  descuento   int not null default 5,
  usado       boolean default false,
  generado_en timestamptz default now(),
  usado_en    timestamptz
);

-- ── Favoritos ─────────────────────────────────────────────────
create table public.favoritos (
  id          uuid primary key default uuid_generate_v4(),
  usuario_id  uuid references public.usuarios(id) on delete cascade,
  cancha_id   uuid references public.canchas(id) on delete cascade,
  unique(usuario_id, cancha_id)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.usuarios           enable row level security;
alter table public.canchas            enable row level security;
alter table public.duenos_canchas     enable row level security;
alter table public.horarios_bloqueados enable row level security;
alter table public.reservas           enable row level security;
alter table public.notificaciones     enable row level security;
alter table public.loyalty            enable row level security;
alter table public.cupones            enable row level security;
alter table public.favoritos          enable row level security;

-- Canchas: cualquiera puede leer
create policy "canchas_public_read" on public.canchas
  for select using (true);

-- Reservas: el usuario ve solo las suyas
create policy "reservas_own" on public.reservas
  for all using (auth.uid() = usuario_id);

-- Notificaciones: el usuario ve solo las suyas
create policy "notifs_own" on public.notificaciones
  for all using (auth.uid() = usuario_id);

-- Loyalty: el usuario ve solo la suya
create policy "loyalty_own" on public.loyalty
  for all using (auth.uid() = usuario_id);

-- Cupones: el usuario ve solo los suyos
create policy "cupones_own" on public.cupones
  for all using (auth.uid() = usuario_id);

-- Favoritos: el usuario ve solo los suyos
create policy "favoritos_own" on public.favoritos
  for all using (auth.uid() = usuario_id);

-- Usuarios: cada uno ve su propio perfil
create policy "usuarios_own" on public.usuarios
  for all using (auth.uid() = id);

-- Horarios bloqueados: cualquiera puede leer
create policy "horarios_public_read" on public.horarios_bloqueados
  for select using (true);

-- ── Bloqueos temporales de horarios ──────────────────────────
-- Se crean cuando un usuario inicia el proceso de pago
-- Expiran automáticamente después de 5 minutos
create table public.bloqueos_temporales (
  id          uuid primary key default uuid_generate_v4(),
  cancha_id   uuid references public.canchas(id) on delete cascade,
  fecha       date not null,
  hora        text not null,
  usuario_id  uuid references public.usuarios(id) on delete cascade,
  expira_en   timestamptz not null,
  creado_en   timestamptz default now(),
  unique(cancha_id, fecha, hora)
);

alter table public.bloqueos_temporales enable row level security;
create policy "bloqueos_public_read" on public.bloqueos_temporales
  for select using (true);
create policy "bloqueos_own" on public.bloqueos_temporales
  for all using (auth.uid() = usuario_id);
