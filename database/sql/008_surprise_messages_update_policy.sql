-- Allow authors to update their own surprise messages inside their couple.

drop policy if exists "surprises_update_author_only" on public.surprise_messages;

create policy "surprises_update_author_only" on public.surprise_messages
for update to authenticated
using (author_id = auth.uid() and couple_id = public.get_my_couple_id())
with check (author_id = auth.uid() and couple_id = public.get_my_couple_id());
