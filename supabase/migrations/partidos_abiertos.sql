-- ============================================================
-- Partidos Abiertos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── Tabla principal de partidos ───────────────────────────────
create table public.partidos (
  id                  uuid primary key default uuid_generate_v4(),

  -- Cancha y reserva base
  cancha_id           uuid references public.canchas(id) on delete cascade not null,
  reserva_id          uuid references public.reservas(id) on delete set null,

  -- Organizador (crea el partido)
  organizador_id      uuid references public.usuarios(id) on delete cascade not null,

  -- Detalles del partido
  deporte             text not null check (deporte in ('futbol','voley','basquet','tenis','futsal')),
  fecha               date not null,
  hora                text not null,
  nivel               text not null default 'libre'
                        check (nivel in ('libre','principiante','intermedio','avanzado')),

  -- Cupos
  jugadores_max       int not null check (jugadores_max >= 2),
  jugadores_actuales  int not null default 1,

  -- Precio dividido
  precio_total        int not null,
  precio_por_persona  int generated always as (precio_total / jugadores_max) stored,

  -- Estado del partido
  estado              text not null default 'abierto'
                        check (estado in ('abierto','completo','cancelado','finalizado')),

  -- Descripción opcional del organizador
  descripcion         text,

  creado_en           timestamptz default now(),
  actualizado_en      timestamptz default now()
);

-- ── Tabla de jugadores del partido ────────────────────────────
create table public.partido_jugadores (
  id          uuid primary key default uuid_generate_v4(),
  partido_id  uuid references public.partidos(id) on delete cascade not null,
  usuario_id  uuid references public.usuarios(id) on delete cascade not null,
  estado_pago text not null default 'pendiente'
                check (estado_pago in ('pendiente','pagado','reembolsado')),
  es_organizador boolean not null default false,
  unido_en    timestamptz default now(),

  unique(partido_id, usuario_id)
);

-- ── Índices ───────────────────────────────────────────────────
create index idx_partidos_cancha        on public.partidos(cancha_id);
create index idx_partidos_organizador   on public.partidos(organizador_id);
create index idx_partidos_fecha         on public.partidos(fecha);
create index idx_partidos_estado        on public.partidos(estado);
create index idx_partido_jugadores_pid  on public.partido_jugadores(partido_id);
create index idx_partido_jugadores_uid  on public.partido_jugadores(usuario_id);

-- ── Trigger: actualizar jugadores_actuales automáticamente ────
create or replace function sync_jugadores_actuales()
returns trigger language plpgsql as $$
begin
  update public.partidos
  set
    jugadores_actuales = (
      select count(*) from public.partido_jugadores
      where partido_id = coalesce(NEW.partido_id, OLD.partido_id)
    ),
    actualizado_en = now()
  where id = coalesce(NEW.partido_id, OLD.partido_id);

  -- Marcar como completo si se llenaron los cupos
  update public.partidos
  set estado = 'completo'
  where id = coalesce(NEW.partido_id, OLD.partido_id)
    and jugadores_actuales >= jugadores_max
    and estado = 'abierto';

  -- Re-abrir si un jugador sale y había cupos llenos
  update public.partidos
  set estado = 'abierto'
  where id = coalesce(NEW.partido_id, OLD.partido_id)
    and jugadores_actuales < jugadores_max
    and estado = 'completo';

  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_sync_jugadores
after insert or delete on public.partido_jugadores
for each row execute function sync_jugadores_actuales();

-- ── Trigger: actualizar timestamp ─────────────────────────────
create or replace function set_actualizado_en()
returns trigger language plpgsql as $$
begin
  NEW.actualizado_en = now();
  return NEW;
end;
$$;

create trigger trg_partidos_updated
before update on public.partidos
for each row execute function set_actualizado_en();

-- ── Row Level Security ────────────────────────────────────────
alter table public.partidos          enable row level security;
alter table public.partido_jugadores enable row level security;

-- partidos: cualquiera puede leer partidos abiertos
create policy "partidos_public_read" on public.partidos
  for select using (true);

-- partidos: solo el organizador puede crear/editar/cancelar el suyo
create policy "partidos_organizador_insert" on public.partidos
  for insert with check (auth.uid() = organizador_id);

create policy "partidos_organizador_update" on public.partidos
  for update using (auth.uid() = organizador_id);

create policy "partidos_organizador_delete" on public.partidos
  for delete using (auth.uid() = organizador_id);

-- partido_jugadores: cualquier usuario autenticado puede leer (para ver quién va)
create policy "partido_jugadores_read" on public.partido_jugadores
  for select using (true);

-- partido_jugadores: usuario autenticado puede unirse
create policy "partido_jugadores_insert" on public.partido_jugadores
  for insert with check (auth.uid() = usuario_id);

-- partido_jugadores: el usuario puede retirarse del partido
create policy "partido_jugadores_delete" on public.partido_jugadores
  for delete using (auth.uid() = usuario_id);

-- partido_jugadores: el organizador puede actualizar el estado de pago
create policy "partido_jugadores_organizador_update" on public.partido_jugadores
  for update using (
    auth.uid() = usuario_id
    or auth.uid() = (
      select organizador_id from public.partidos where id = partido_id
    )
  );

-- ── Vista pública con datos enriquecidos ──────────────────────
create or replace view public.partidos_con_detalles as
select
  p.*,
  c.nombre          as cancha_nombre,
  c.distrito        as cancha_distrito,
  c.imagenes[1]     as cancha_imagen,
  u.nombre          as organizador_nombre,
  -- jugadores con iniciales para los avatares
  (
    select json_agg(json_build_object(
      'usuario_id', pj.usuario_id,
      'nombre',     usr.nombre,
      'inicial',    upper(left(usr.nombre, 1)),
      'es_organizador', pj.es_organizador,
      'estado_pago', pj.estado_pago
    ) order by pj.unido_en)
    from public.partido_jugadores pj
    join public.usuarios usr on usr.id = pj.usuario_id
    where pj.partido_id = p.id
  ) as jugadores
from public.partidos p
join public.canchas  c on c.id = p.cancha_id
join public.usuarios u on u.id = p.organizador_id;
