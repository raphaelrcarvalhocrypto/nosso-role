-- Prevent direct client-side changes to profiles.couple_id.
-- Couple linking must happen via controlled RPC (join_couple_with_invite).

drop policy if exists "profiles_update_own" on public.profiles;

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
