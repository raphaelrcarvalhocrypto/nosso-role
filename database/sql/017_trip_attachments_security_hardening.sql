-- Trip attachments security hardening.
-- Use this migration when 016 may already be applied in an environment.

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

create unique index if not exists idx_trip_attachments_file_path_unique on public.trip_attachments(file_path);

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
