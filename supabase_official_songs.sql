-- =====================================================================
--  Canciones de los Himnarios Oficiales  (ejecutar en Supabase > SQL Editor)
-- =====================================================================

-- 1) Tabla
create table if not exists public.official_songs (
  id          bigint generated always as identity primary key,
  hymnal_id   bigint not null references public.official_hymnals(id) on delete cascade,
  number      text,
  title       text not null,
  artist      text,
  lyrics      text,
  chords      text,
  language    text default 'Castellano',
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create index if not exists official_songs_hymnal_idx on public.official_songs (hymnal_id);
create index if not exists official_songs_title_idx  on public.official_songs (lower(title));

-- 2) Función auxiliar: ¿el usuario actual es administrador?
--    (security definer evita problemas de recursión con las reglas de `profiles`)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- 3) Reglas RLS
alter table public.official_songs enable row level security;

drop policy if exists "official_songs_select_authenticated" on public.official_songs;
drop policy if exists "official_songs_insert_admin"         on public.official_songs;
drop policy if exists "official_songs_update_admin"         on public.official_songs;
drop policy if exists "official_songs_delete_admin"         on public.official_songs;

-- Cualquier usuario con sesión puede leer
create policy "official_songs_select_authenticated"
  on public.official_songs for select
  to authenticated
  using (true);

-- Solo el administrador puede insertar, editar y borrar
create policy "official_songs_insert_admin"
  on public.official_songs for insert
  to authenticated
  with check (public.is_admin());

create policy "official_songs_update_admin"
  on public.official_songs for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "official_songs_delete_admin"
  on public.official_songs for delete
  to authenticated
  using (public.is_admin());
