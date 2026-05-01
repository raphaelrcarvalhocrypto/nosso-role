# Nosso Rolê

Webapp privado para casal organizar dates, viagens, desejos, presentes e mensagens surpresa.

## 🎨 UI/UX Design System

Este projeto utiliza um ecossistema completo de design e desenvolvimento para criar interfaces profissionais e consistentes.

### Ferramentas Instaladas

- **[shadcn/ui](https://ui.shadcn.com)** - Component library para React/Next.js
- **[UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)** - AI-powered design system generator
- **[Radix UI](https://radix-ui.com)** - UI primitives acessíveis
- **[Lucide React](https://lucide.dev)** - Ícones elegantes e consistentes

### Paleta de Cores

- **Primária**: Rose (#f43f5e) - Calor, paixão, conexão
- **Secundária**: Wine (#9333ea) - Sofisticação, mistério
- **Destaque**: Gold (#eab308) - Luxo, celebração
- **Neutros**: Slate tones para fundos e textos

### Tipografia

- **Display**: Cormorant Garamond - Elegante, editorial
- **Interface**: Inter - Moderna, legível

### Estilos Disponíveis

- Glassmorphism e efeitos de profundidade
- Animações suaves e transições refinadas
- Modo claro/escuro integrado
- Cards com efeito hover
- Foco em acessibilidade (WCAG AA)

## Documentação

- [PRD](docs/PRD.md): Visão de produto, escopo MVP e roadmap
- [SPEC](docs/SPEC.md): Arquitetura técnica, pastas, rotas, modelo de dados
- [UI-UX-SETUP.md](UI-UX-SETUP.md): Guia completo de configuração das ferramentas de design

## Rodando Localmente

### Pré-requisitos

- Node.js 18+ e npm
- Conta Supabase (para autenticação e banco de dados)
- Mapbox API key (para mapas)
- Gemini API key (para funcionalidades de IA)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/nosso-role.git
cd nosso-rolê
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp frontend/.env.example frontend/.env.local
```

Edite `frontend/.env.local` com suas chaves:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (apenas server-side)
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `GEMINI_API_KEY`
- `APP_URL`

4. Rode o sistema completo:
```bash
npm run dev
```

Isso iniciará o frontend Next.js na porta 3000 e o backend.

## Desenvolvimento

### Adicionar Componentes UI

Use o shadcn/ui CLI para adicionar novos componentes:

```bash
npx shadcn@latest add [component-name]
# Exemplo: npx shadcn@latest add button card dialog
```

### Componentes Disponíveis

Os componentes UI customizados estão em `frontend/src/components/ui/`:
- `button.tsx` - Botões com múltiplas variantes
- `card.tsx` - Cards com efeitos glassmorphism
- `alert.tsx` - Alertas com diferentes variantes

### Utilidades

- `frontend/src/lib/utils.ts` - Funções utilitárias (cn para classes)
- `frontend/src/stores/themeStore.ts` - Gerenciamento de tema claro/escuro

### Validação de Setup

Valide sua configuração de desenvolvimento:

```bash
npx tsx validate-setup.ts
```

## Estrutura de Pastas

```text
nosso-rolê/
 frontend/                    # Aplicação Next.js
    src/
       app/                # Rotas e páginas Next.js
          layout.tsx      # Layout principal
          page.tsx        # Página inicial
          globals.css     # Estilos globais
          
          # Páginas principais
          dashboard/      
          settings/
          login/
          register/
          
       components/        # Componentes React
          ui/            # Componentes UI (shadcn/ui + custom)
          layout/        # Layouts (sidebar, navbar)
          maps/          # Componentes de mapa
          
          features/      # Feature pages
              dashboard/
              settings/
              surprises/
              wishlist/
              trips/
              dates/
              
       stores/           # Estado global (zustand)
          authStore.ts
          themeStore.ts
          
       lib/              # Utilitários
           utils.ts
    
    config/                # Configurações públicas
    
 backend/                   # API backend (futuro)
 database/                  # Schema SQL e configurações
    sql/
    
 tools/                     # Scripts de desenvolvimento
    
 docs/                      # Documentação
    PRD.md
    SPEC.md
    
 UI-UX-SETUP.md            # Configuração UI/UX
 components.json           # Configuração shadcn/ui
```

## Scripts Disponíveis

- `npm run dev` - Inicia frontend e backend em desenvolvimento
- `npm run dev:frontend` - Inicia apenas o frontend
- `npm run dev:backend` - Inicia apenas o backend (placeholder)
- `npm run build` - Build de produção
- `npm run start` - Start em produção
- `npm run lint` - Validação de tipos TypeScript
- `npm run clean` - Limpa arquivos temporários

## Design System

### Princípios

1. **Consistência** - Padronização visual e interações
2. **Acessibilidade** - WCAG AA compliance, foco visível
3. **Performance** - Animações 60fps, carregamento otimizado
4. **Responsividade** - Mobile-first (375px, 768px, 1024px, 1440px)
5. **Redução de Movimento** - Respeita `prefers-reduced-motion`

### Anti-Patterns Evitados

- Cores neon agressivas (roxo/rosa AI)
- Animações excessivas
- Falta de contraste
- Ausência de estados de foco
- Layouts não responsivos

## Contribuindo

1. Siga as convenções de código existentes
2. Utilize os componentes da biblioteca
3. Respeite o design system
4. Documente novas features
5. Teste responsividade e acessibilidade

## Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript
- **Estilização**: Tailwind CSS v4, CSS Modules
- **Componentes**: shadcn/ui, Radix UI
- **Estado**: Zustand
- **Backend**: Supabase (Auth + Postgres)
- **Mapas**: Mapbox GL, React Google Maps
- **Ícones**: Lucide React

## Licença

Privado - Uso restrito aos desenvolvedores do projeto.

## Suporte

Para dúvidas sobre:
- **UI/UX Design**: Consulte [UI-UX-SETUP.md](UI-UX-SETUP.md)
- **Arquitetura**: Consulte [SPEC](docs/SPEC.md)
- **Produto**: Consulte [PRD](docs/PRD.md)
