-- Trip ops upgrades:
-- - real expenses per stop
-- - time alerts
-- - attachments (files) metadata

create table if not exists public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  destination_index integer check (destination_index is null or destination_index >= 0),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null default 'outro',
  paid_by text not null default 'casal' check (paid_by in ('casal', 'pessoa_1', 'pessoa_2')),
  spent_at timestamptz not null default now(),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_alerts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  destination_index integer check (destination_index is null or destination_index >= 0),
  title text not null,
  alert_at timestamptz not null,
  alert_type text not null default 'outro',
  notes text,
  dismissed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_attachments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  destination_index integer check (destination_index is null or destination_index >= 0),
  scope_type text not null default 'trip' check (scope_type in ('trip', 'stop', 'link', 'itinerary')),
  reference_index integer check (reference_index is null or reference_index >= 1),
  file_name text not null,
  file_path text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trip_attachments
  drop constraint if exists trip_attachments_file_name_safe;

alter table public.trip_attachments
  add constraint trip_attachments_file_name_safe
  check (
    nullif(btrim(file_name), '') is not null
    and file_name !~ '[\\/]+'
    and length(file_name) <= 255
  );

alter table public.trip_attachments
  drop constraint if exists trip_attachments_file_path_shape;

alter table public.trip_attachments
  add constraint trip_attachments_file_path_shape
  check (file_path ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9._-]+$');

alter table public.trip_attachments
  drop constraint if exists trip_attachments_mime_whitelist;

alter table public.trip_attachments
  add constraint trip_attachments_mime_whitelist
  check (
    mime_type is null
    or mime_type in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'application/zip'
    )
  );

alter table public.trip_attachments
  drop constraint if exists trip_attachments_size_limit;

alter table public.trip_attachments
  add constraint trip_attachments_size_limit
  check (size_bytes is null or size_bytes between 1 and 20971520);

create index if not exists idx_trip_expenses_trip_id on public.trip_expenses(trip_id);
create index if not exists idx_trip_expenses_destination_index on public.trip_expenses(destination_index);
create index if not exists idx_trip_expenses_spent_at on public.trip_expenses(spent_at);
create index if not exists idx_trip_alerts_trip_id on public.trip_alerts(trip_id);
create index if not exists idx_trip_alerts_alert_at on public.trip_alerts(alert_at);
create index if not exists idx_trip_attachments_trip_id on public.trip_attachments(trip_id);
create index if not exists idx_trip_attachments_scope_type on public.trip_attachments(scope_type);
create unique index if not exists idx_trip_attachments_file_path_unique on public.trip_attachments(file_path);

alter table public.trip_expenses enable row level security;
alter table public.trip_alerts enable row level security;
alter table public.trip_attachments enable row level security;

drop policy if exists "trip_expenses_rw_same_couple" on public.trip_expenses;
create policy "trip_expenses_rw_same_couple" on public.trip_expenses
for all to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_expenses.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_expenses.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
);

drop policy if exists "trip_alerts_rw_same_couple" on public.trip_alerts;
create policy "trip_alerts_rw_same_couple" on public.trip_alerts
for all to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_alerts.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_alerts.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
);

drop policy if exists "trip_attachments_rw_same_couple" on public.trip_attachments;
create policy "trip_attachments_rw_same_couple" on public.trip_attachments
for all to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_attachments.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_attachments.trip_id
      and t.couple_id = public.get_my_couple_id()
  )
  and coalesce(trip_attachments.created_by, auth.uid()) = auth.uid()
);

grant all on public.trip_expenses to authenticated;
grant all on public.trip_alerts to authenticated;
grant all on public.trip_attachments to authenticated;

drop trigger if exists trip_expenses_set_audit_fields on public.trip_expenses;
create trigger trip_expenses_set_audit_fields
before insert or update on public.trip_expenses
for each row execute function public.set_audit_fields();

drop trigger if exists trip_alerts_set_audit_fields on public.trip_alerts;
create trigger trip_alerts_set_audit_fields
before insert or update on public.trip_alerts
for each row execute function public.set_audit_fields();

drop trigger if exists trip_attachments_set_audit_fields on public.trip_attachments;
create trigger trip_attachments_set_audit_fields
before insert or update on public.trip_attachments
for each row execute function public.set_audit_fields();

create or replace function public.enforce_trip_attachment_path()
returns trigger
language plpgsql
as $$
declare
  folder_parts text[];
  trip_couple_id uuid;
begin
  if tg_op = 'UPDATE' and new.file_path <> old.file_path then
    raise exception 'file_path is immutable after creation';
  end if;

  folder_parts := string_to_array(coalesce(new.file_path, ''), '/');
  if array_length(folder_parts, 1) < 3 then
    raise exception 'invalid file_path format';
  end if;

  select t.couple_id
  into trip_couple_id
  from public.trips t
  where t.id = new.trip_id;

  if trip_couple_id is null then
    raise exception 'trip not found for attachment';
  end if;

  if folder_parts[1] <> trip_couple_id::text then
    raise exception 'file_path couple segment mismatch';
  end if;

  if folder_parts[2] <> new.trip_id::text then
    raise exception 'file_path trip segment mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trip_attachments_enforce_path on public.trip_attachments;
create trigger trip_attachments_enforce_path
before insert or update on public.trip_attachments
for each row execute function public.enforce_trip_attachment_path();

-- Private bucket for trip files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-attachments',
  'trip-attachments',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/zip'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "trip_attachments_storage_insert_same_couple" on storage.objects;
create policy "trip_attachments_storage_insert_same_couple"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trip-attachments'
  and (storage.foldername(name))[1] = public.get_my_couple_id()::text
  and exists (
    select 1
    from public.trips t
    where t.id::text = (storage.foldername(name))[2]
      and t.couple_id = public.get_my_couple_id()
  )
  and coalesce((storage.filename(name)), '') ~ '^[A-Za-z0-9._-]+$'
  and coalesce((metadata->>'mimetype'), '') in (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/zip'
  )
  and coalesce((metadata->>'size'), '') ~ '^[0-9]+$'
  and (metadata->>'size')::bigint between 1 and 20971520
);

drop policy if exists "trip_attachments_storage_select_same_couple" on storage.objects;
create policy "trip_attachments_storage_select_same_couple"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trip-attachments'
  and (storage.foldername(name))[1] = public.get_my_couple_id()::text
  and exists (
    select 1
    from public.trips t
    where t.id::text = (storage.foldername(name))[2]
      and t.couple_id = public.get_my_couple_id()
  )
);

drop policy if exists "trip_attachments_storage_update_same_couple" on storage.objects;
create policy "trip_attachments_storage_update_same_couple"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'trip-attachments'
  and (storage.foldername(name))[1] = public.get_my_couple_id()::text
  and exists (
    select 1
    from public.trips t
    where t.id::text = (storage.foldername(name))[2]
      and t.couple_id = public.get_my_couple_id()
  )
)
with check (
  bucket_id = 'trip-attachments'
  and (storage.foldername(name))[1] = public.get_my_couple_id()::text
  and exists (
    select 1
    from public.trips t
    where t.id::text = (storage.foldername(name))[2]
      and t.couple_id = public.get_my_couple_id()
  )
);

drop policy if exists "trip_attachments_storage_delete_same_couple" on storage.objects;
create policy "trip_attachments_storage_delete_same_couple"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trip-attachments'
  and (storage.foldername(name))[1] = public.get_my_couple_id()::text
  and exists (
    select 1
    from public.trips t
    where t.id::text = (storage.foldername(name))[2]
      and t.couple_id = public.get_my_couple_id()
  )
);
