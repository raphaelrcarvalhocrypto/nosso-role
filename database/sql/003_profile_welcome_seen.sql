alter table public.profiles
add column if not exists welcome_seen_at timestamptz null;
