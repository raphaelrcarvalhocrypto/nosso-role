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

Padrao recomendado:

1. Use prefixo numerico incremental.
2. Uma migration por mudanca logica.
3. Scripts devem ser idempotentes sempre que possivel.
4. Dados sensiveis nunca devem entrar em seeds versionadas.
