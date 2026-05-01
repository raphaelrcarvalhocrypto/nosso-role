# PRD - Nosso Rolê

## 1. Visao Geral

Nosso Rolê e um webapp privado para um casal planejar, registrar e revisitar momentos importantes: dates, viagens, desejos, presentes e mensagens surpresa. O produto deve ser simples para uso diario, mas estruturado para crescer com novas memorias, automacoes e integracoes.

## 2. Problema

Ideias de passeios, viagens, presentes e datas importantes ficam espalhadas em conversas, notas, prints e links. Isso dificulta lembrar combinados, acompanhar planos futuros e preservar memorias do relacionamento em um unico lugar.

## 3. Objetivo do Produto

Criar um espaco compartilhado, seguro e mobile-first onde o casal consiga:

- Planejar dates e viagens.
- Registrar experiencias ja realizadas.
- Guardar desejos, presentes e links.
- Escrever mensagens bloqueadas para datas futuras.
- Acompanhar dados afetivos do relacionamento, como tempo juntos e historico.

## 4. Publico-Alvo

O publico inicial sao duas pessoas em um relacionamento que querem organizar planos pessoais sem expor dados publicamente. O app deve funcionar bem no celular, porque o uso natural acontece em conversas, deslocamentos, restaurantes, lojas e planejamento rapido.

## 5. Principios de Produto

- Privacidade primeiro: cada dado pertence ao casal autenticado.
- Rapidez de registro: adicionar uma ideia deve levar poucos segundos.
- Memoria afetiva sem bagunca: a interface deve ser acolhedora, mas organizada.
- Mobile-first: todos os fluxos principais devem ser confortaveis no celular.
- Crescimento incremental: novas features devem entrar por dominios claros.

## 6. Escopo MVP

### Autenticacao e Espaco do Casal

- Login com Google.
- Criacao automatica de perfil e `couple_id`.
- Redirecionamento para login quando nao autenticado.
- Isolamento dos dados por `couple_id`.

### Dashboard

- Exibir tempo de relacionamento.
- Mostrar frase romantica aleatoria.
- Exibir contadores de dates, viagens concluidas e desejos pendentes.
- Mostrar foto do casal quando configurada.

### Dates

- Criar date com titulo, data, local, categoria, status, nota e autor da sugestao.
- Listar historico em ordem decrescente.
- Mostrar rating e status.
- Exibir mapa como apoio visual.

### Viagens

- Criar viagem com destino, datas, orcamento, media diaria, media por refeicao, links e notas.
- Listar viagens por data de inicio.
- Mostrar status de planejamento.
- Exibir mapa como apoio visual.

### Lista de Desejos

- Criar desejo com titulo, descricao, link, prioridade, categoria e status.
- Alternar entre pendente e realizado.
- Organizar presentes, lugares, restaurantes, viagens e experiencias.

### Mensagens Surpresa

- Criar mensagem com titulo, conteudo e data de desbloqueio.
- Ocultar conteudo ate a data definida.
- Mostrar mensagem desbloqueada apos o prazo.

### Configuracoes

- Editar nomes do casal.
- Editar foto do casal via URL.
- Registrar periodos do relacionamento, incluindo pausas e retornos.
- Persistir configuracoes por casal.

## 7. Requisitos Funcionais

| ID | Requisito | Prioridade |
| --- | --- | --- |
| RF-001 | O usuario deve conseguir autenticar com Google. | Alta |
| RF-002 | O app deve criar um perfil com `couple_id` no primeiro cadastro. | Alta |
| RF-003 | Cada tela deve filtrar dados pelo `couple_id` do perfil autenticado. | Alta |
| RF-004 | O casal deve conseguir criar e listar dates. | Alta |
| RF-005 | O casal deve conseguir criar e listar viagens. | Alta |
| RF-006 | O casal deve conseguir criar e concluir desejos. | Alta |
| RF-007 | O casal deve conseguir criar mensagens com desbloqueio futuro. | Media |
| RF-008 | O casal deve conseguir editar configuracoes do relacionamento. | Alta |
| RF-009 | O app deve funcionar em desktop com sidebar e em mobile com bottom nav. | Alta |
| RF-010 | O usuario deve conseguir alternar tema claro/escuro. | Media |

## 8. Requisitos Nao Funcionais

- Performance: rotas devem carregar sem bloqueios longos; listas futuras com muitos itens devem considerar paginacao.
- Seguranca: policies de RLS no Supabase devem impedir leitura/escrita fora do `couple_id`.
- Acessibilidade: botoes devem ter area de toque adequada e labels claros.
- Responsividade: telas devem funcionar a partir de 375px de largura.
- Manutenibilidade: rotas em `frontend/src/app` devem ser finas; implementacao deve viver em `frontend/src/features`.
- Observabilidade futura: erros de Supabase devem manter contexto de operacao e tabela.

## 9. Jornada Principal

1. Pessoa acessa o app.
2. Faz login com Google.
3. Se for primeiro acesso, um perfil e um espaco do casal sao criados.
4. Pessoa configura nomes, foto e periodos do relacionamento.
5. O casal registra dates, viagens, desejos e mensagens surpresa.
6. O dashboard resume o estado atual da historia do casal.

## 10. Roadmap Sugerido

### Fase 1 - Consolidacao do MVP

- Corrigir textos/acentos caso a origem esteja com encoding quebrado.
- Criar estados vazios consistentes em todas as telas.
- Adicionar edicao e exclusao para dates, viagens e desejos.
- Melhorar validacao de formularios e feedback de erro.

### Fase 2 - Colaboracao Real de Casal

- Fluxo de convite para adicionar a segunda pessoa ao mesmo `couple_id`.
- Perfil de autor em cada item.
- Comentarios ou reacoes em dates/desejos.
- Notificacoes de mensagens desbloqueadas e datas importantes.

### Fase 3 - Memorias e Inteligencia

- Upload de fotos e album por date/viagem.
- Linha do tempo do relacionamento.
- Sugestoes automaticas de dates por cidade, clima, orcamento ou preferencias.
- Exportacao de memorias em PDF ou pagina compartilhavel privada.

## 11. Metricas de Sucesso

- Quantidade de dates cadastrados.
- Quantidade de desejos realizados.
- Quantidade de viagens planejadas/concluidas.
- Mensagens surpresa abertas apos desbloqueio.
- Frequencia de uso semanal pelo casal.

## 12. Fora de Escopo Inicial

- Rede social publica.
- Feed publico de casais.
- Chat em tempo real.
- Pagamentos.
- Reserva direta de hoteis/restaurantes/passagens.
- Compartilhamento publico sem controle de acesso.

## 13. Questoes em Aberto

- Como a segunda pessoa entra no mesmo `couple_id`: convite por link, codigo ou email?
- O app sera usado apenas pelo casal atual ou precisa suportar varios casais em producao?
- Fotos serao apenas URLs externas ou via Supabase Storage?
- As mensagens surpresa poderao ser editadas antes da data de desbloqueio?
