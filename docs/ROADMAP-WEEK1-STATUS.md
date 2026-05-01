# Roadmap 30 dias - Semana 1 (Status)

Data de fechamento: 2026-05-01

## Objetivo da semana

Evoluir o Dashboard para uma experiencia mais viva e interativa, com foco em:
- visao rapida do relacionamento;
- atalhos para acoes principais;
- indicadores recentes de uso;
- base de UX para as proximas semanas.

## Entregas concluidas

### 1) Ajustes de estabilidade e desbloqueio de desenvolvimento
- Correcao de incompatibilidades no `middleware` para runtime do Next.
- Ajustes em cabecalhos/CSP para ambiente de desenvolvimento.
- Correcao de comportamento de rate limit em desenvolvimento.
- Mitigacao de loading infinito em fluxo de autenticacao.

### 2) Correcao de regras de seguranca no banco (Supabase / RLS)
- Correcao de recursao de politicas que causava `stack depth limit exceeded`.
- Ajuste de funcoes e policies para evitar loop de autenticacao.
- Registro SQL versionado em:
  - `database/sql/012_fix_rls_recursion.sql`

### 3) Dashboard - experiencia principal (Semana 1)
- Bloco "Tempo Juntos" com foco em numeros corretos.
- Calculo acumulado com periodos de relacionamento, desconsiderando iatos.
- Exibicao em formato humano com anos/meses/dias acumulados.
- Indicador de fase atual em dias.

### 4) Interatividade inicial no Dashboard
- Acoes rapidas:
  - `Dates`
  - `Trips`
  - `Wishlist`
  - `Surprises`
- Bloco de "Proximo Marco" com contagem regressiva em dias.
- Timeline compacta dos periodos do relacionamento.
- Estado vazio com CTA para criacao do primeiro date.

### 5) Indicadores recentes
- Bloco "Resumo da Semana" (ultimos 7 dias):
  - Dates
  - Viagens
  - Desejos
  - Surpresas
- Variacao versus semana anterior (`+N`, `-N`, `0`) em cada indicador.

## Resultado da Semana 1

- Dashboard significativamente mais util para uso diario.
- Melhoria de clareza no tempo de relacionamento (incluindo iato corretamente).
- Melhor navegabilidade para as principais acoes do produto.
- Base pronta para iniciar feed de atividades e evolucoes da Semana 2.

## Pendencias movidas para Semana 2

- Feed de atividades recentes em ordem cronologica.
- Comparativos mais avancados (meta semanal e tendencia).
- Mais microinteracoes de feedback e polimento visual.
- Camada de observabilidade (erros/eventos) mais robusta.
