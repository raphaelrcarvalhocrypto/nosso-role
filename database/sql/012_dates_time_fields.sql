-- Dates: allow start and end times for the event.

alter table public.dates
  add column if not exists start_time time;

alter table public.dates
  add column if not exists end_time time;
