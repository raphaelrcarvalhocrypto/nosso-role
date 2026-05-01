# SPEC - Nosso Rolê

## 1. Stack Atual

- Framework: Next.js App Router.
- UI: React, Tailwind CSS v4, lucide-react e motion.
- Estado client-side: Zustand.
- Backend as a Service: Supabase Auth e Postgres (com RLS).
- Mapas: Mapbox via `react-map-gl`.
- Linguagem: TypeScript.

## 2. Arquitetura de Pastas

```text
frontend/
  src/
    app/                     # Rotas Next.js, layouts e arquivos especiais
      dashboard/page.tsx
      dates/page.tsx
      trips/page.tsx
      wishlist/page.tsx
      surprises/page.tsx
      settings/page.tsx
      login/page.tsx
      register/page.tsx
    components/
      layout/                # Shell global autenticado
      maps/                  # Componentes globais de mapa
      navigation/            # Sidebar e bottom navigation
    features/
      auth/                  # Telas e fluxos de login/cadastro
      dashboard/             # Resumo do casal
      dates/                 # Registro de dates
      trips/                 # Planejamento de viagens
      wishlist/              # Desejos e presentes
      surprises/             # Mensagens com desbloqueio futuro
      settings/              # Configuracoes do casal
    services/
      supabase/              # Cliente Supabase e helpers de erro/dados
    stores/                  # Stores Zustand globais
  config/                    # Configuracoes publicas do frontend
backend/
  firebase/                  # Legado antigo (nao utilizado no fluxo atual)
database/
  sql/                       # Scripts SQL opcionais/futuros
tools/                       # Scripts de dev, limpeza e orquestracao
```

Regra: `frontend/src/app` deve continuar fino. Toda tela com estado, efeito, formularios ou regra de dominio deve ficar em `frontend/src/features/<dominio>`.

## 2.1 Comando de Desenvolvimento

O comando principal do projeto e:

```bash
npm run dev
```

Ele executa `tools/dev.mjs`, que:

- sobe o frontend com `npm run dev:frontend`;
- verifica se existe `backend/package.json` com script `dev`;
- se existir backend local no futuro, sobe frontend e backend em paralelo;
- se nao existir, registra que o backend atual e o Supabase gerenciado externamente.

## 3. Rotas

| Rota | Feature | Acesso |
| --- | --- | --- |
| `/` | Redirect para `/dashboard` | Privado |
| `/login` | `features/auth/LoginPage` | Publico |
| `/register` | `features/auth/RegisterPage` | Publico |
| `/dashboard` | `features/dashboard/DashboardPage` | Privado |
| `/dates` | `features/dates/DatesPage` | Privado |
| `/trips` | `features/trips/TripsPage` | Privado |
| `/wishlist` | `features/wishlist/WishlistPage` | Privado |
| `/surprises` | `features/surprises/SurprisesPage` | Privado |
| `/settings` | `features/settings/SettingsPage` | Privado |

O controle de acesso atual acontece no `ClientLayout`, que observa `useAuthStore` e redireciona usuarios sem sessao para `/login`.

## 4. Fluxo de Dados

1. `ClientLayout` inicializa autenticacao e tema.
2. `authStore` escuta sessao e `onAuthStateChange` do Supabase Auth.
3. Cada feature busca `profiles/{uid}` para descobrir o `couple_id`.
4. As consultas de dominio filtram por `couple_id`.
5. Mutacoes gravam o `couple_id` junto ao documento.
6. Policies RLS no Supabase validam que o usuario so acessa dados do proprio casal.

## 5. Modelo de Dados Supabase (Postgres)

### `profiles/{userId}`

```ts
type Profile = {
  email?: string;
  couple_id: string;
  created_at: string;
  updated_at?: string;
};
```

### `app_settings/{coupleId}`

```ts
type RelationshipPeriod = {
  start_date: string;
  end_date?: string;
};

type AppSettings = {
  couple_id: string;
  name_1?: string;
  name_2?: string;
  relationship_start_date?: string | null;
  relationship_periods?: RelationshipPeriod[];
  couple_photo?: string;
};
```

### `dates/{dateId}`

```ts
type DateIdea = {
  couple_id: string;
  title: string;
  date: string;
  location?: string;
  category?: 'restaurante' | 'cinema' | 'aventura' | 'casa' | 'viagem' | 'surpresa' | string;
  status: 'planejado' | 'realizado' | string;
  rating?: number;
  suggested_by?: 'ambos' | string;
  created_at: string;
};
```

### `trips/{tripId}`

```ts
type Trip = {
  couple_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  estimated_budget?: number;
  daily_budget?: number;
  meal_budget?: number;
  links?: string;
  notes?: string;
  status: 'planejando' | 'confirmada' | 'concluida' | string;
  created_at: string;
};
```

### `wishlist_items/{itemId}`

```ts
type WishlistItem = {
  couple_id: string;
  title: string;
  description?: string;
  link?: string;
  priority?: 'baixa' | 'media' | 'alta' | string;
  category?: 'lugar' | 'restaurante' | 'viagem' | 'experiencia' | 'presente' | string;
  status: 'pendente' | 'realizado' | string;
  created_at: string;
};
```

### `surprise_messages/{messageId}`

```ts
type SurpriseMessage = {
  couple_id: string;
  author_id: string;
  title: string;
  message: string;
  unlock_date: string;
  created_at: string;
};
```

## 6. Segurança

- RLS no schema `public` negando acesso por padrao.
- `profiles` so pode ser lido/alterado pelo proprio `auth.uid()`.
- Tabelas de dominio so podem ser lidas/escritas se `couple_id = get_my_couple_id()`.
- `surprise_messages` permite delete apenas do autor.
- `app_settings` so aceita leitura/escrita para o mesmo `couple_id` do perfil autenticado.

Melhoria recomendada: adicionar testes automatizados das policies RLS antes de evoluir colaboracao entre duas contas.

## 7. Variaveis de Ambiente

```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
GEMINI_API_KEY=
APP_URL=
```

Observacao: manter somente segredos server-side fora do repositorio e revisar periodicamente variaveis nao utilizadas.
Observacao: para producao, manter apenas chaves publicas no frontend (`NEXT_PUBLIC_SUPABASE_*`) e preservar `SUPABASE_SERVICE_ROLE_KEY` exclusivamente em contexto server-side.

Arquivo de template: `frontend/.env.example`.

## 8. Padroes de UI

- Layout privado: sidebar em desktop e bottom nav em mobile.
- Estilo: glassmorphism discreto, tema escuro por padrao e suporte a tema claro.
- Icones: usar `lucide-react` para acoes e navegacao.
- Formularios: labels visiveis, inputs com foco claro e feedback de loading/erro.
- Mobile: botoes e links com area de toque minima de 44px.
- Evitar textos explicativos longos dentro da interface; a tela deve priorizar acao.

## 9. Padroes de Implementacao

- Nome de feature: `frontend/src/features/<domain>/<Domain>Page.tsx`.
- Componentes globais reutilizaveis: `frontend/src/components/<categoria>`.
- Stores globais: `frontend/src/stores`.
- Clientes externos e SDKs: `frontend/src/services/<provider>`.
- Helpers que dependem de Supabase devem ficar em `frontend/src/services/supabase`.
- Novas tabelas/policies devem ser documentadas neste SPEC e em `database/sql`.
- Novos fluxos privados devem validar `couple_id` tanto na consulta quanto nas regras.
- Scripts SQL devem ficar em `database/sql`, com prefixo incremental.

## 10. Estados e Erros

- `authStore` mantem `user`, `loading`, `initialized` e `error`.
- `themeStore` persiste `theme` em `localStorage`.
- `handleDatabaseError` registra operacao, tabela e informacoes do usuario autenticado.
- Cada feature deve exibir estado vazio quando nao houver documentos.
- Mutacoes devem desabilitar botao durante envio e mostrar feedback de sucesso/erro.

## 11. Criterios de Aceite do MVP

- Usuario nao autenticado nao acessa rotas privadas.
- Usuario autenticado consegue acessar dashboard apos login.
- Criar date persiste registro em `dates` com `couple_id`.
- Criar viagem persiste registro em `trips` com orcamentos numericos.
- Criar desejo persiste registro em `wishlist_items` e permite marcar como realizado.
- Criar surpresa persiste registro em `surprise_messages` e oculta conteudo ate `unlock_date`.
- Atualizar configuracoes persiste nomes, foto e periodos em `app_settings`.
- App compila com `npm run lint`.
- `npm run dev` sobe o frontend e esta preparado para subir um backend local quando ele existir.

## 12. Backlog Tecnico Recomendado

- Tipar entidades do Supabase em `frontend/src/types` ou dentro de cada feature.
- Extrair hook `useCoupleProfile()` para evitar repeticao de busca de perfil.
- Criar camada de repository por feature para centralizar consultas Supabase.
- Adicionar componentes compartilhados para form field, empty state, section header e status badge.
- Adicionar loading skeletons.
- Remover `any` gradualmente.
- Cobrir policies RLS com testes.
- Revisar dependency versions e atualizar Next/React quando o projeto sair de prototipo.
