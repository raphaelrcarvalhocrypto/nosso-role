-- Trip planning normalization:
-- - public.trip_stops
-- - public.trip_links
-- - public.trip_itinerary_items
--
-- This migration is additive and backward compatible:
-- existing columns in public.trips are preserved.

create extension if not exists pgcrypto;

-- Safely parse text as jsonb without raising.
create or replace function public.try_parse_jsonb(input text)
returns jsonb
language plpgsql
immutable
as $$
begin
  if input is null or btrim(input) = '' then
    return null;
  end if;
  return input::jsonb;
exception
  when others then
    return null;
end;
$$;

create table if not exists public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stop_order integer not null check (stop_order >= 1),
  name text not null,
  arrival_date date,
  arrival_time time,
  departure_date date,
  departure_time time,
  notes text,
  lat double precision,
  lng double precision,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, stop_order)
);

create table if not exists public.trip_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stop_id uuid references public.trip_stops(id) on delete set null,
  sort_order integer not null check (sort_order >= 1),
  title text,
  url text not null,
  category text not null default 'outro',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, sort_order)
);

create table if not exists public.trip_itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stop_id uuid references public.trip_stops(id) on delete set null,
  sort_order integer not null check (sort_order >= 1),
  event_date date,
  start_time time,
  end_time time,
  title text not null,
  location text,
  category text not null default 'outro',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, sort_order)
);

-- Ensure audit columns exist even if tables were pre-created in a partial run.
alter table public.trip_stops add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.trip_stops add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.trip_links add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.trip_links add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.trip_itinerary_items add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.trip_itinerary_items add column if not exists updated_by uuid references auth.users(id) on delete set null;

create index if not exists idx_trip_stops_trip_id on public.trip_stops(trip_id);
create index if not exists idx_trip_stops_trip_id_order on public.trip_stops(trip_id, stop_order);
create index if not exists idx_trip_links_trip_id on public.trip_links(trip_id);
create index if not exists idx_trip_links_stop_id on public.trip_links(stop_id);
create index if not exists idx_trip_itinerary_trip_id on public.trip_itinerary_items(trip_id);
create index if not exists idx_trip_itinerary_stop_id on public.trip_itinerary_items(stop_id);
create index if not exists idx_trip_itinerary_event_date on public.trip_itinerary_items(event_date);
create index if not exists idx_trip_stops_created_by on public.trip_stops(created_by);
create index if not exists idx_trip_links_created_by on public.trip_links(created_by);
create index if not exists idx_trip_itinerary_created_by on public.trip_itinerary_items(created_by);

alter table public.trip_stops enable row level security;
alter table public.trip_links enable row level security;
alter table public.trip_itinerary_items enable row level security;

drop policy if exists "trip_stops_rw_same_couple" on public.trip_stops;
create policy "trip_stops_rw_same_couple" on public.trip_stops
for all to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_stops.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_stops.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
);

drop policy if exists "trip_links_rw_same_couple" on public.trip_links;
create policy "trip_links_rw_same_couple" on public.trip_links
for all to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_links.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_links.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
);

drop policy if exists "trip_itinerary_rw_same_couple" on public.trip_itinerary_items;
create policy "trip_itinerary_rw_same_couple" on public.trip_itinerary_items
for all to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_itinerary_items.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_itinerary_items.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
);

grant all on public.trip_stops to authenticated;
grant all on public.trip_links to authenticated;
grant all on public.trip_itinerary_items to authenticated;

-- Keep updated_at fresh and capture user audit fields.
create or replace function public.set_audit_fields()
returns trigger
language plpgsql
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by := current_user_id;
    end if;
    if new.updated_by is null then
      new.updated_by := coalesce(current_user_id, new.created_by);
    end if;
  else
    new.updated_by := coalesce(current_user_id, old.updated_by, new.updated_by);
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trip_stops_touch_updated_at on public.trip_stops;
drop trigger if exists trip_stops_set_audit_fields on public.trip_stops;
create trigger trip_stops_set_audit_fields
before insert or update on public.trip_stops
for each row execute function public.set_audit_fields();

drop trigger if exists trip_links_touch_updated_at on public.trip_links;
drop trigger if exists trip_links_set_audit_fields on public.trip_links;
create trigger trip_links_set_audit_fields
before insert or update on public.trip_links
for each row execute function public.set_audit_fields();

drop trigger if exists trip_itinerary_touch_updated_at on public.trip_itinerary_items;
drop trigger if exists trip_itinerary_set_audit_fields on public.trip_itinerary_items;
create trigger trip_itinerary_set_audit_fields
before insert or update on public.trip_itinerary_items
for each row execute function public.set_audit_fields();

-- Backfill trip stops from trips.destinations (or fallback to trips.destination).
with source_stops as (
  select
    t.id as trip_id,
    t.destination as fallback_destination,
    d.value as item,
    d.ordinality as ordinality
  from public.trips t
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(t.destinations) = 'array' and jsonb_array_length(t.destinations) > 0
        then t.destinations
      else jsonb_build_array(jsonb_build_object('name', t.destination))
    end
  ) with ordinality as d(value, ordinality)
),
normalized_stops as (
  select
    trip_id,
    ordinality::integer as stop_order,
    coalesce(nullif(btrim(item->>'name'), ''), nullif(btrim(fallback_destination), ''), 'Destino') as name,
    case
      when coalesce(item->>'arrival_date', '') ~ '^\d{4}-\d{2}-\d{2}$' then (item->>'arrival_date')::date
      else null
    end as arrival_date,
    case
      when coalesce(item->>'arrival_time', '') ~ '^\d{2}:\d{2}(:\d{2})?$' then (item->>'arrival_time')::time
      else null
    end as arrival_time,
    case
      when coalesce(item->>'departure_date', '') ~ '^\d{4}-\d{2}-\d{2}$' then (item->>'departure_date')::date
      else null
    end as departure_date,
    case
      when coalesce(item->>'departure_time', '') ~ '^\d{2}:\d{2}(:\d{2})?$' then (item->>'departure_time')::time
      else null
    end as departure_time,
    nullif(btrim(item->>'notes'), '') as notes,
    case when jsonb_typeof(item->'lat') = 'number' then (item->>'lat')::double precision else null end as lat,
    case when jsonb_typeof(item->'lng') = 'number' then (item->>'lng')::double precision else null end as lng
  from source_stops
)
insert into public.trip_stops (
  trip_id,
  stop_order,
  name,
  arrival_date,
  arrival_time,
  departure_date,
  departure_time,
  notes,
  lat,
  lng
)
select
  trip_id,
  stop_order,
  name,
  arrival_date,
  arrival_time,
  departure_date,
  departure_time,
  notes,
  lat,
  lng
from normalized_stops
on conflict (trip_id, stop_order) do update
set
  name = excluded.name,
  arrival_date = excluded.arrival_date,
  arrival_time = excluded.arrival_time,
  departure_date = excluded.departure_date,
  departure_time = excluded.departure_time,
  notes = excluded.notes,
  lat = excluded.lat,
  lng = excluded.lng,
  updated_at = now();

-- Backfill trip links from trips.links (JSON or legacy plain URL text).
with parsed_links as (
  select
    t.id as trip_id,
    public.try_parse_jsonb(t.links) as parsed_json,
    t.links as raw_links
  from public.trips t
),
json_links as (
  select
    p.trip_id,
    l.value as item,
    l.ordinality::integer as sort_order
  from parsed_links p
  cross join lateral jsonb_array_elements(
    case
      when p.parsed_json is null then '[]'::jsonb
      when jsonb_typeof(p.parsed_json) = 'array' then p.parsed_json
      when jsonb_typeof(p.parsed_json) = 'object' and jsonb_typeof(p.parsed_json->'links') = 'array' then p.parsed_json->'links'
      else '[]'::jsonb
    end
  ) with ordinality as l(value, ordinality)
),
json_links_with_stop as (
  select
    jl.trip_id,
    ts.id as stop_id,
    jl.sort_order,
    nullif(btrim(jl.item->>'title'), '') as title,
    nullif(btrim(jl.item->>'url'), '') as url,
    coalesce(nullif(btrim(jl.item->>'category'), ''), 'outro') as category,
    nullif(btrim(jl.item->>'notes'), '') as notes
  from json_links jl
  left join public.trip_stops ts
    on ts.trip_id = jl.trip_id
   and ts.stop_order = (
     case
       when coalesce(jl.item->>'destination_index', '') ~ '^\d+$' then (jl.item->>'destination_index')::integer + 1
       else null
     end
   )
),
legacy_plain_links as (
  select
    p.trip_id,
    null::uuid as stop_id,
    1::integer as sort_order,
    'Link util'::text as title,
    nullif(btrim(p.raw_links), '') as url,
    'outro'::text as category,
    null::text as notes
  from parsed_links p
  where p.parsed_json is null
    and nullif(btrim(p.raw_links), '') is not null
)
insert into public.trip_links (
  trip_id,
  stop_id,
  sort_order,
  title,
  url,
  category,
  notes
)
select
  trip_id,
  stop_id,
  sort_order,
  title,
  url,
  category,
  notes
from (
  select * from json_links_with_stop where url is not null
  union all
  select * from legacy_plain_links
) unioned_links
on conflict (trip_id, sort_order) do update
set
  stop_id = excluded.stop_id,
  title = excluded.title,
  url = excluded.url,
  category = excluded.category,
  notes = excluded.notes,
  updated_at = now();

-- Backfill trip itinerary from trips.notes JSON payload.
with parsed_notes as (
  select
    t.id as trip_id,
    public.try_parse_jsonb(t.notes) as parsed_json
  from public.trips t
),
json_itinerary as (
  select
    pn.trip_id,
    i.value as item,
    i.ordinality::integer as sort_order
  from parsed_notes pn
  cross join lateral jsonb_array_elements(
    case
      when pn.parsed_json is not null
       and jsonb_typeof(pn.parsed_json) = 'object'
       and jsonb_typeof(pn.parsed_json->'itinerary') = 'array'
        then pn.parsed_json->'itinerary'
      else '[]'::jsonb
    end
  ) with ordinality as i(value, ordinality)
),
normalized_itinerary as (
  select
    ji.trip_id,
    ts.id as stop_id,
    ji.sort_order,
    case
      when coalesce(ji.item->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$' then (ji.item->>'date')::date
      else null
    end as event_date,
    case
      when coalesce(ji.item->>'start_time', '') ~ '^\d{2}:\d{2}(:\d{2})?$' then (ji.item->>'start_time')::time
      else null
    end as start_time,
    case
      when coalesce(ji.item->>'end_time', '') ~ '^\d{2}:\d{2}(:\d{2})?$' then (ji.item->>'end_time')::time
      else null
    end as end_time,
    coalesce(nullif(btrim(ji.item->>'title'), ''), 'Atividade sem titulo') as title,
    nullif(btrim(ji.item->>'location'), '') as location,
    coalesce(nullif(btrim(ji.item->>'category'), ''), 'outro') as category,
    nullif(btrim(ji.item->>'notes'), '') as notes
  from json_itinerary ji
  left join public.trip_stops ts
    on ts.trip_id = ji.trip_id
   and ts.stop_order = (
     case
       when coalesce(ji.item->>'destination_index', '') ~ '^\d+$' then (ji.item->>'destination_index')::integer + 1
       else null
     end
   )
)
insert into public.trip_itinerary_items (
  trip_id,
  stop_id,
  sort_order,
  event_date,
  start_time,
  end_time,
  title,
  location,
  category,
  notes
)
select
  trip_id,
  stop_id,
  sort_order,
  event_date,
  start_time,
  end_time,
  title,
  location,
  category,
  notes
from normalized_itinerary
on conflict (trip_id, sort_order) do update
set
  stop_id = excluded.stop_id,
  event_date = excluded.event_date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  title = excluded.title,
  location = excluded.location,
  category = excluded.category,
  notes = excluded.notes,
  updated_at = now();
