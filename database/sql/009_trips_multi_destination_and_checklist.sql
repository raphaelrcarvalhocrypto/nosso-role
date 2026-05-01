-- Trips: support multi-destination routes and planning checklist.

alter table public.trips
  add column if not exists destinations jsonb not null default '[]'::jsonb;

alter table public.trips
  add column if not exists checklist jsonb not null default '[]'::jsonb;

update public.trips
set destinations = jsonb_build_array(jsonb_build_object('name', destination))
where coalesce(trim(destination), '') <> ''
  and destinations = '[]'::jsonb;
