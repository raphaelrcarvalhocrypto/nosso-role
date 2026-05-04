-- Trips status enum.
-- Keeps the existing status values but enforces consistency at the database layer.

do $$
begin
  create type public.trip_status as enum ('planejando', 'confirmada', 'concluida');
exception
  when duplicate_object then null;
end;
$$;

alter table public.trips
  alter column status drop default;

update public.trips
set status = 'planejando'
where status is null
   or status::text not in ('planejando', 'confirmada', 'concluida');

alter table public.trips
  alter column status type public.trip_status
  using status::text::public.trip_status;

alter table public.trips
  alter column status set default 'planejando'::public.trip_status;

alter table public.trips
  alter column status set not null;
