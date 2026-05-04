-- Trip links status:
-- tracks decision state per hotel/agency/company link.

alter table public.trip_links
  add column if not exists link_status text;

update public.trip_links
set link_status = 'analisando'
where link_status is null
   or btrim(link_status) = '';

alter table public.trip_links
  alter column link_status set default 'analisando';

alter table public.trip_links
  alter column link_status set not null;

alter table public.trip_links
  drop constraint if exists trip_links_link_status_allowed;

alter table public.trip_links
  add constraint trip_links_link_status_allowed
  check (link_status in ('analisando', 'confirmado', 'descartado'));
