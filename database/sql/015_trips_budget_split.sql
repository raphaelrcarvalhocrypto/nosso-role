-- Trips budget split:
-- - couple_budget: shared spending for both
-- - individual_budget: per-person spending
--
-- The total budget remains in estimated_budget for compatibility.

alter table public.trips
  add column if not exists couple_budget numeric(12, 2) default 0;

alter table public.trips
  add column if not exists individual_budget numeric(12, 2) default 0;

-- Backfill strategy:
-- if couple_budget is still zero and estimated_budget has value, move it to couple_budget.
update public.trips
set couple_budget = coalesce(estimated_budget, 0)
where coalesce(couple_budget, 0) = 0
  and coalesce(estimated_budget, 0) > 0;

alter table public.trips
  alter column couple_budget set default 0;

alter table public.trips
  alter column individual_budget set default 0;

alter table public.trips
  alter column couple_budget set not null;

alter table public.trips
  alter column individual_budget set not null;

alter table public.trips
  drop constraint if exists trips_couple_budget_nonnegative;

alter table public.trips
  add constraint trips_couple_budget_nonnegative
  check (couple_budget >= 0);

alter table public.trips
  drop constraint if exists trips_individual_budget_nonnegative;

alter table public.trips
  add constraint trips_individual_budget_nonnegative
  check (individual_budget >= 0);

create index if not exists idx_trips_couple_budget on public.trips(couple_budget);
create index if not exists idx_trips_individual_budget on public.trips(individual_budget);

