-- Supabase initial schema (fresh start).
-- Auth users are managed in auth.users; app data lives in public schema.

create extension if not exists pgcrypto;

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name_1 text,
  name_2 text,
  relationship_start_date date,
  couple_photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  name_1 text,
  name_2 text,
  relationship_start_date date,
  relationship_periods jsonb not null default '[]'::jsonb,
  couple_photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dates (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  date date not null,
  end_date date,
  start_time time,
  end_time time,
  location_lat double precision,
  location_lng double precision,
  location text,
  category text,
  status text not null default 'planejado',
  rating integer,
  suggested_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  destination text not null,
  destinations jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  start_date date not null,
  end_date date not null,
  estimated_budget numeric(12, 2) default 0,
  daily_budget numeric(12, 2) default 0,
  meal_budget numeric(12, 2) default 0,
  links text,
  notes text,
  status text not null default 'planejando',
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  description text,
  link text,
  priority text,
  category text,
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

create table if not exists public.surprise_messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  unlock_date timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_couple_id on public.profiles(couple_id);
create index if not exists idx_dates_couple_id on public.dates(couple_id);
create index if not exists idx_dates_status on public.dates(status);
create index if not exists idx_trips_couple_id on public.trips(couple_id);
create index if not exists idx_trips_status on public.trips(status);
create index if not exists idx_wishlist_items_couple_id on public.wishlist_items(couple_id);
create index if not exists idx_wishlist_items_status on public.wishlist_items(status);
create index if not exists idx_surprise_messages_couple_id on public.surprise_messages(couple_id);
create index if not exists idx_surprise_messages_unlock_date on public.surprise_messages(unlock_date);

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.dates enable row level security;
alter table public.trips enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.surprise_messages enable row level security;

create or replace function public.get_my_couple_id()
returns uuid
language sql
stable
as $$
  select couple_id
  from public.profiles
  where id = auth.uid()
$$;

create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and couple_id = (
    select p.couple_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "app_settings_rw_same_couple" on public.app_settings
for all to authenticated
using (couple_id = public.get_my_couple_id())
with check (couple_id = public.get_my_couple_id());

create policy "dates_rw_same_couple" on public.dates
for all to authenticated
using (couple_id = public.get_my_couple_id())
with check (couple_id = public.get_my_couple_id());

create policy "trips_rw_same_couple" on public.trips
for all to authenticated
using (couple_id = public.get_my_couple_id())
with check (couple_id = public.get_my_couple_id());

create policy "wishlist_rw_same_couple" on public.wishlist_items
for all to authenticated
using (couple_id = public.get_my_couple_id())
with check (couple_id = public.get_my_couple_id());

create policy "surprises_select_unlocked_or_author_same_couple" on public.surprise_messages
for select to authenticated
using (
  couple_id = public.get_my_couple_id()
  and (unlock_date <= now() or author_id = auth.uid())
);

create policy "surprises_insert_same_couple_author" on public.surprise_messages
for insert to authenticated
with check (couple_id = public.get_my_couple_id() and author_id = auth.uid());

create policy "surprises_update_author_only" on public.surprise_messages
for update to authenticated
using (author_id = auth.uid() and couple_id = public.get_my_couple_id())
with check (author_id = auth.uid() and couple_id = public.get_my_couple_id());

create policy "surprises_delete_author_only" on public.surprise_messages
for delete to authenticated
using (author_id = auth.uid());
