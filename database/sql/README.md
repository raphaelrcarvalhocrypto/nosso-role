# SQL Scripts

Guarde aqui scripts SQL versionados.

Scripts atuais:
- `001_initial_schema.sql`
- `002_couple_invites_and_link.sql`
- `003_profile_welcome_seen.sql`
- `004_couple_photos_storage.sql`
- `005_profile_bootstrap_rpc.sql`
- `006_privacy_hardening.sql`
- `007_profiles_couple_id_lockdown.sql`
- `008_surprise_messages_update_policy.sql`
- `009_trips_multi_destination_and_checklist.sql`
- `010_dates_end_date.sql`
- `011_enhanced_rls_policies.sql`
- `012_dates_time_fields.sql`
- `013_dates_location_coordinates.sql`
- `014_trip_planning_normalization.sql`
- `015_trips_budget_split.sql`
- `016_trip_ops_upgrades.sql`
- `017_trip_attachments_security_hardening.sql`
- `018_trips_status_enum.sql`
- `019_trip_links_status.sql`
- `020_trip_attachments_storage_insert_policy_fix.sql`

Resumo das migrations de viagens (fase atual):
- `014_trip_planning_normalization.sql`
  - Cria `trip_stops`, `trip_links`, `trip_itinerary_items`.
  - Ativa RLS por casal, auditoria (`created_by`/`updated_by`) e backfill do legado de `trips`.
- `015_trips_budget_split.sql`
  - Adiciona `couple_budget` e `individual_budget` em `trips`.
  - Mantem `estimated_budget` para compatibilidade.
- `016_trip_ops_upgrades.sql`
  - Adiciona `trip_expenses`, `trip_alerts`, `trip_attachments`.
  - Cria bucket privado `trip-attachments` e policies de storage.
- `017_trip_attachments_security_hardening.sql`
  - Hardening adicional de anexos para ambientes onde a `016` ja foi executada.
  - Reforca constraints, trigger de path imutavel/casal+trip, e policy de insert no storage.
- `018_trips_status_enum.sql`
  - Cria `public.trip_status` e converte `trips.status` para enum.
  - Normaliza valores fora do padrao para `planejando`.
- `019_trip_links_status.sql`
  - Adiciona `trip_links.link_status` com default `analisando`.
  - Restringe status para `analisando`, `confirmado` ou `descartado`.
- `020_trip_attachments_storage_insert_policy_fix.sql`
  - Ajusta a policy de `insert` no bucket `trip-attachments`.
  - Remove validacoes por `metadata` no RLS de storage para evitar falso negativo no upload.

Status desta rodada (2026-05-13):
- `014`, `015`, `016`, `017` e `018` executadas.
- `019` e `020` pendentes de execucao.

Padrao recomendado:

1. Use prefixo numerico incremental.
2. Uma migration por mudanca logica.
3. Scripts devem ser idempotentes sempre que possivel.
4. Dados sensiveis nunca devem entrar em seeds versionadas.
