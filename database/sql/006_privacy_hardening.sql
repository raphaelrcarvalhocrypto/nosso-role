-- Privacy hardening for couple photos and surprise messages.

update storage.buckets
set public = false
where id = 'couple-photos';

drop policy if exists "surprises_select_same_couple" on public.surprise_messages;
drop policy if exists "surprises_select_unlocked_or_author_same_couple" on public.surprise_messages;
create policy "surprises_select_unlocked_or_author_same_couple" on public.surprise_messages
for select to authenticated
using (
  couple_id = public.get_my_couple_id()
  and (unlock_date <= now() or author_id = auth.uid())
);
