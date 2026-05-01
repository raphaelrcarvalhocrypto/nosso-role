-- Fix RLS recursion causing "stack depth limit exceeded" on authenticated reads.
-- Root cause: profiles policies called get_my_couple_id(), which queried profiles again.

create or replace function public.get_my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p.couple_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

revoke all on function public.get_my_couple_id() from public;
grant execute on function public.get_my_couple_id() to authenticated;
grant execute on function public.get_my_couple_id() to service_role;

create or replace function public.is_user_in_couple(couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.couple_id = is_user_in_couple.couple_id
  )
$$;

revoke all on function public.is_user_in_couple(uuid) from public;
grant execute on function public.is_user_in_couple(uuid) to authenticated;
grant execute on function public.is_user_in_couple(uuid) to service_role;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and email is not distinct from (
    select u.email
    from auth.users u
    where u.id = auth.uid()
  )
);
