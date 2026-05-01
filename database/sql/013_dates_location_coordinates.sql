-- Dates: store resolved coordinates for map markers.

alter table public.dates
  add column if not exists location_lat double precision;

alter table public.dates
  add column if not exists location_lng double precision;
