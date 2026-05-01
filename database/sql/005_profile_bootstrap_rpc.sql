-- Safe bootstrap for first login/profile creation.
-- Avoids client-side inserts into couples/profiles under RLS.

create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
  existing_profile public.profiles;
  new_couple_id uuid;
  user_email text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select p.* into existing_profile
  from public.profiles p
  where p.id = current_user_id;

  if found then
    return existing_profile;
  end if;

  select u.email into user_email
  from auth.users u
  where u.id = current_user_id;

  insert into public.couples default values
  returning id into new_couple_id;

  insert into public.profiles (id, couple_id, email, created_at, updated_at)
  values (current_user_id, new_couple_id, user_email, now(), now())
  returning * into existing_profile;

  insert into public.app_settings (couple_id, name_1, name_2, relationship_start_date, relationship_periods, couple_photo)
  values (new_couple_id, '', '', null, '[]'::jsonb, '')
  on conflict (couple_id) do nothing;

  return existing_profile;
end;
$$;

revoke all on function public.ensure_my_profile() from public;
grant execute on function public.ensure_my_profile() to authenticated;
