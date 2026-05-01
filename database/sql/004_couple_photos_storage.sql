-- Bucket + RLS policies for couple photos in Supabase Storage.
-- File path convention: <couple_id>/<filename>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-photos',
  'couple-photos',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "couple_photos_insert_same_couple" on storage.objects;
create policy "couple_photos_insert_same_couple"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = public.get_my_couple_id()::text
);

drop policy if exists "couple_photos_update_same_couple" on storage.objects;
create policy "couple_photos_update_same_couple"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = public.get_my_couple_id()::text
)
with check (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = public.get_my_couple_id()::text
);

drop policy if exists "couple_photos_delete_same_couple" on storage.objects;
create policy "couple_photos_delete_same_couple"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = public.get_my_couple_id()::text
);

drop policy if exists "couple_photos_select_same_couple" on storage.objects;
create policy "couple_photos_select_same_couple"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = public.get_my_couple_id()::text
);
