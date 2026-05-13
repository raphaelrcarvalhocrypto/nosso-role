-- Fix upload failures in trip attachments storage policy.
-- Some environments return incomplete metadata during storage insert checks,
-- causing false RLS rejections on valid uploads.

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
);
