# SQL Scripts

Guarde aqui scripts SQL versionados, por exemplo:

- `001_initial_schema.sql`
- `002_add_indexes.sql`
- `003_seed_dev_data.sql`

Padrao recomendado:

1. Use prefixo numerico incremental.
2. Uma migration por mudanca logica.
3. Scripts devem ser idempotentes sempre que possivel.
4. Dados sensiveis nunca devem entrar em seeds versionadas.
