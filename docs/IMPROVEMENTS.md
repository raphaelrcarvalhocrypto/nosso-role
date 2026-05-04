# Improvements Plan - Nosso Role

## Objetivo
Consolidar o SaaS para casal com foco em:
- privacidade real dos dados;
- qualidade tecnica de build e deploy;
- consistencia de produto e documentacao;
- base pronta para evolucao de features.

## Acordo de Trabalho
- Branch de trabalho: `main` (edicao local primeiro).
- Commit: somente no final do ciclo completo de melhorias.
- Validacao minima por etapa: `npm run lint` e `npm run build`.

## Backlog Priorizado

### P0 - Critico (Seguranca e Confiabilidade)
- [x] Remover bypass de typecheck no build (`ignoreBuildErrors`).
- [x] Tornar bucket `couple-photos` privado (storage).
- [x] Migrar resolucao de foto para URL assinada no frontend.
- [x] Endurecer leitura de `surprise_messages` (apenas desbloqueada ou autor).
- [x] Restringir update direto de `profiles.couple_id` via cliente.
- [ ] Cobrir RLS com testes automatizados.

### P1 - Alto (Produto e UX)
- [x] Corrigir contador de dashboard para "dates realizados".
- [x] Estado vazio claro para mensagens surpresa.
- [x] Adicionar editar/excluir em dates, trips, wishlist e surpresas.
- [x] Melhorar feedback de loading e erro nas telas de lista.
- [x] Exibir tempo juntos em meses e marcos anuais no dashboard.
- [x] Trips com multi-destino, checklist base e mapa com rota.
- [x] Dates com categoria expandida/custom e duracao de 1+ dias.
- [x] Dates com modal grande, autocomplete de endereco e horario de entrada/saida.
- [x] Dates exibem marcador no mapa a partir do endereco salvo.
- [x] Trips com planejamento modular por parada (links categorizados e roteiro por destino/data).
- [x] Trips com anexos por escopo (viagem/parada/link/roteiro) e visualizacao segura via URL assinada.
- [x] Trips com orcamento separado em casal + individual por pessoa.
- [x] Trips com resumo de gastos vs. orcamento, breakdown por categoria e gasto inline.
- [x] Trips com notificacoes locais para alertas enquanto o app esta aberto.
- [x] Trips com status controlado por enum no Supabase.
- [x] Links de viagem dentro de roteiro com status de decisao (analisando, confirmado, nao fechado).
- [ ] Revisar UX de auth para evitar redirects redundantes.

### P2 - Medio (Arquitetura e Manutencao)
- [ ] Extrair `useCoupleProfile()` para remover repeticao.
- [ ] Criar repositorios Supabase por feature.
- [ ] Tipar entidades (remover `any` gradual).
- [ ] Padronizar aliases e config shadcn para pasta `frontend/src`.
- [ ] Limpar dependencias nao usadas no `package.json`.

### P3 - Documentacao
- [x] Atualizar PRD/SPEC/README para refletir Supabase 100%.
- [ ] Remover referencias antigas de Firebase/Firestore.
- [x] Registrar runbook de migracoes SQL e rollback.

## Fases de Execucao

### Fase 1 (em andamento) - Base segura e build confiavel
Escopo:
- hardening de privacidade;
- ajustes de build/typecheck;
- correcoes rapidas de coerencia no produto.

Concluido nesta fase:
1. Remocao de `ignoreBuildErrors` no Next config.
2. Storage de foto preparado para bucket privado.
3. Frontend atualizado para salvar path de foto e resolver signed URL.
4. Politica de leitura de surpresa endurecida em SQL.
5. Ajuste do card de "dates realizados" no dashboard.

### Fase 2 - Fluxos de CRUD e arquitetura
Escopo:
- editar/excluir nas features;
- extracao de hook/repository;
- tipagem por dominio.

### Fase 3 - Robustez de producao
Escopo:
- testes RLS;
- revisao de observabilidade;
- limpeza final de docs e checklist de release.

## Checklist de Fechamento
- [x] `npm run lint` sem erros.
- [x] `npm run build` sem bypass de tipos.
- [x] SQLs aplicados e validados no Supabase.
- [ ] Teste manual dos fluxos: login, dashboard, dates, trips, wishlist, surpresas, settings.
- [x] Documentacao atualizada.
