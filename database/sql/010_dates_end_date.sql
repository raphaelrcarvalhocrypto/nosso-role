-- Dates: allow multi-day events.

alter table public.dates
  add column if not exists end_date date;

update public.dates
set end_date = date
where end_date is null;
