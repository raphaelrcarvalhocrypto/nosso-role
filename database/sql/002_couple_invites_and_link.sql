-- Couple invites and account linking flow.

create table if not exists public.couple_invites (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_couple_invites_invite_code on public.couple_invites(invite_code);

alter table public.couples enable row level security;
alter table public.couple_invites enable row level security;

drop policy if exists "couples_select_same_couple" on public.couples;
create policy "couples_select_same_couple" on public.couples
for select to authenticated
using (id = public.get_my_couple_id());

drop policy if exists "couples_insert_authenticated" on public.couples;
create policy "couples_insert_authenticated" on public.couples
for insert to authenticated
with check (true);

drop policy if exists "couples_update_same_couple" on public.couples;
create policy "couples_update_same_couple" on public.couples
for update to authenticated
using (id = public.get_my_couple_id())
with check (id = public.get_my_couple_id());

drop policy if exists "couples_delete_same_couple" on public.couples;
create policy "couples_delete_same_couple" on public.couples
for delete to authenticated
using (id = public.get_my_couple_id());

drop policy if exists "couple_invites_select_same_couple" on public.couple_invites;
create policy "couple_invites_select_same_couple" on public.couple_invites
for select to authenticated
using (couple_id = public.get_my_couple_id());

drop policy if exists "couple_invites_insert_same_couple" on public.couple_invites;
create policy "couple_invites_insert_same_couple" on public.couple_invites
for insert to authenticated
with check (couple_id = public.get_my_couple_id() and created_by = auth.uid());

drop policy if exists "couple_invites_update_same_couple" on public.couple_invites;
create policy "couple_invites_update_same_couple" on public.couple_invites
for update to authenticated
using (couple_id = public.get_my_couple_id() and created_by = auth.uid())
with check (couple_id = public.get_my_couple_id() and created_by = auth.uid());

drop policy if exists "couple_invites_delete_same_couple" on public.couple_invites;
create policy "couple_invites_delete_same_couple" on public.couple_invites
for delete to authenticated
using (couple_id = public.get_my_couple_id() and created_by = auth.uid());

create or replace function public.join_couple_with_invite(invite_code_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_couple_id uuid;
  current_user_id uuid;
  current_couple_id uuid;
  target_member_count integer;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select ci.couple_id
  into target_couple_id
  from public.couple_invites ci
  where upper(ci.invite_code) = upper(trim(invite_code_input));

  if target_couple_id is null then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  select p.couple_id
  into current_couple_id
  from public.profiles p
  where p.id = current_user_id;

  if current_couple_id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if current_couple_id = target_couple_id then
    return target_couple_id;
  end if;

  select count(*)
  into target_member_count
  from public.profiles p
  where p.couple_id = target_couple_id;

  if target_member_count >= 2 then
    raise exception 'COUPLE_ALREADY_HAS_TWO_MEMBERS';
  end if;

  update public.profiles
  set
    couple_id = target_couple_id,
    updated_at = now()
  where id = current_user_id;

  delete from public.couples c
  where c.id = current_couple_id
    and not exists (
      select 1
      from public.profiles p
      where p.couple_id = current_couple_id
    );

  return target_couple_id;
end;
$$;

revoke all on function public.join_couple_with_invite(text) from public;
grant execute on function public.join_couple_with_invite(text) to authenticated;
