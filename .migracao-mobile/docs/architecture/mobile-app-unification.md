# Mobile App Unification (Learner + Educator)

## Objetivo
Unificar `apps/learner-app` e `apps/educator-app` em um único app Expo (`apps/mobile-app`) com migração incremental, sem alterar contratos de API/backend/realtime e sem perder funcionalidades já entregues.

## Estrutura Atual do `apps/mobile-app`

```text
apps/mobile-app
├─ App.tsx
└─ src
   ├─ data
   │  └─ repositories
   │     ├─ educator
   │     │  └─ educator-repository.impl.ts
   │     ├─ learner
   │     │  └─ learner-session-repository.impl.ts
   │     ├─ educator-repository.impl.ts (compat re-export)
   │     └─ learner-session-repository.impl.ts (compat re-export)
   ├─ domain
   │  ├─ entities
   │  │  └─ index.ts
   │  └─ interfaces
   │     ├─ educator
   │     │  └─ educator-repository.ts
   │     ├─ learner
   │     │  └─ learner-session-repository.ts
   │     ├─ educator-repository.ts (compat re-export)
   │     └─ learner-session-repository.ts (compat re-export)
   ├─ hooks
   │  ├─ educator
   │  │  └─ useEducatorRealtime.ts
   │  ├─ learner
   │  │  └─ useLearnerRealtime.ts
   │  ├─ useEducatorRealtime.ts (compat re-export)
   │  └─ useLearnerRealtime.ts (compat re-export)
   ├─ infra
   │  ├─ api
   │  │  ├─ http-client.ts
   │  │  └─ resolve-api-base-url.ts
   │  ├─ realtime
   │  │  └─ session-socket.ts
   │  └─ storage
   │     ├─ app-mode-storage.ts
   │     ├─ educator-storage.ts
   │     └─ session-storage.ts
   ├─ navigation
   │  ├─ RootNavigator.tsx
   │  ├─ educator
   │  │  └─ EducatorNavigator.tsx
   │  └─ learner
   │     └─ LearnerNavigator.tsx
   ├─ types
   │  ├─ index.ts
   │  └─ navigation.ts
   ├─ viewmodels
   │  ├─ educator
   │  │  └─ .gitkeep
   │  └─ learner
   │     └─ useLearnerHomeViewModel.ts
   └─ views
      ├─ AppModeGateView.tsx
      ├─ educator
      │  ├─ EducatorLoadingView.tsx
      │  ├─ EducatorLoginView.tsx
      │  ├─ EducatorSplashView.tsx
      │  ├─ EducatorOnboardingStepTwoView.tsx
      │  ├─ EducatorOnboardingStepThreeView.tsx
      │  ├─ EducatorOnboardingConfirmView.tsx
      │  ├─ EducatorLearningModeView.tsx
      │  ├─ EducatorProfileView.tsx
      │  └─ components
      │     └─ EducatorBottomMenu.tsx
      └─ learner
         └─ LearnerHomeView.tsx
```

## Migração por Fase e Arquivos

### Fase 1 - Scaffold do app unificado
- Commit: `775bdb8`
- Criado `apps/mobile-app` em Expo SDK 54 sem tocar nos apps legados.

### Fase 2 - Camadas compartilhadas (infra/domain/data/hooks/types)
- Commit: `5a56593`
- Movido/organizado:
  - `data/repositories/educator/*`
  - `domain/interfaces/educator/*`
  - `hooks/educator/*`
- Adicionado learner base:
  - `data/repositories/learner/*`
  - `domain/interfaces/learner/*`
  - `hooks/learner/*`
  - `infra/storage/session-storage.ts`
- Realtime unificado:
  - `infra/realtime/session-socket.ts` com `createEducatorSocket` e `createLearnerSocket`.
- Compatibilidade incremental:
  - arquivos re-export em caminhos antigos.

### Fase 3 - Paridade Educator (views + navigation namespaced)
- Commit: `4e0cec9`
- Migrado para namespace:
  - `views/educator/*`
  - `navigation/educator/EducatorNavigator.tsx`
- Ajustados imports e paths de assets.

### Fase 4 - Paridade Learner
- Commit: `70f96a6`
- Migrado para namespace:
  - `views/learner/LearnerHomeView.tsx`
  - `viewmodels/learner/useLearnerHomeViewModel.ts`
  - `navigation/learner/LearnerNavigator.tsx`

### Fase 5 - Entry gate por papel/contexto
- Commit: `dc92006`
- Adicionado:
  - `navigation/RootNavigator.tsx`
  - `views/AppModeGateView.tsx`
  - `infra/storage/app-mode-storage.ts`
- Comportamento:
  - Se houver sessão válida de educador: entra em `EducatorFlow`.
  - Se houver learner provisionado no device: entra em `LearnerFlow`.
  - Senão, apresenta escolha manual de modo.

## Principais Patches

- `App.tsx`: agora renderiza `RootNavigator`.
- `infra/realtime/session-socket.ts`: socket compartilhado para os dois papéis.
- `types/navigation.ts`: inclui `EducatorRootStackParamList`, `LearnerRootStackParamList` e `RootStackParamList`.
- `views/educator/*`: tela do educador preservada com paths corrigidos.
- `views/learner/* + viewmodels/learner/*`: fluxo learner trazido para o app único.

## Execução Local

### 1) API (Nest)

```bash
pnpm --filter api dev
```

API padrão: `http://localhost:3000`

### 2) Mobile app unificado

Arquivo: `apps/mobile-app/.env`

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/
```

Comandos:

```bash
# iniciar metro
pnpm --filter mobile-app start

# abrir no Android
pnpm --filter mobile-app android

# abrir no Web
pnpm --filter mobile-app web
```

Observação (Expo Go em device físico): se a API estiver na sua máquina, use IP LAN no `.env`, por exemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000/
```

## Checklist de Regressão Executado

- [x] `pnpm --filter api typecheck`
- [x] `pnpm --filter mobile-app typecheck`
- [x] Build web do app unificado:
  - `pnpm --filter mobile-app exec expo export --platform web --output-dir dist-web-check`
- [x] Nenhuma alteração de contrato em `apps/api` (sem mudança de regra de negócio/backend)
- [x] Sem commit de segredos/chaves

## Estado Atual

- `apps/educator-app` e `apps/learner-app` foram removidos do repositório.
- O app mobile ativo é exclusivamente `apps/mobile-app`.
- Scripts legados `scripts/dev-educator.sh` e `scripts/dev-learner.sh` também foram removidos.

## Plano de Rollback

### Rollback no Git (incremental)
- Reverter commits de unificação em ordem inversa:
  1. `dc92006` (entry gate)
  2. `70f96a6` (learner flow)
  3. `4e0cec9` (educator namespacing)
  4. `5a56593` (shared layer migration)
  5. `775bdb8` (scaffold mobile-app)
  6. commit de remoção dos legados (`apps/educator-app`, `apps/learner-app`, scripts legados)

Isso retorna ao cenário pré-unificação sem mexer no backend.
