# Estrutura Completa — Projeto Letras (Web + Mobile + APIs)

> Mapa de arquitetura de ponta a ponta dos dois repositórios do Projeto Letras.
> Documento vivo — atualize ao mover/renomear telas, rotas ou módulos.
>
> Repositórios:
> - **Web**: `Projeto-Letras-Web` (`@letras/web` + API Express `@letras/api`)
> - **Mobile**: `Projeto-Letras-Mobile` (`apps/mobile-app` Expo + API NestJS `apps/api`)

---

## 1. Visão geral

Dois monorepos pnpm (`apps/*` + `packages/*`). Existem **DUAS APIs distintas e independentes**, uma em cada repo, ambas conversando com o **mesmo Supabase**:

| | API Web (`@letras/api`) | API Mobile (`apps/api`) |
|---|---|---|
| Stack | Express 4 + Socket.IO 4 (JS) | NestJS + Prisma + Socket.IO (TS) |
| Bootstrap | `apps/api/src/server.js` | `apps/api/src/main.ts` |
| Porta | **8080** (`PORT`) | **3000** (`PORT`) |
| Prefixo | `/api/v1` (`API_PREFIX`) | nenhum (rotas na raiz) |
| WebSocket | namespace `/realtime` (`src/realtime/dashboardRealtime.js`) | namespace `/realtime` (`src/realtime/gateway/session.gateway.ts`) |
| Auth | `Bearer` = JWT do Supabase | token de sessão opaco `educator_<hex>` (tabela `EducatorAuthSession`) |

> ⚠️ **Fato importante de integração**: em **produção o app mobile aponta para a API Express da Web**
> (`EXPO_PUBLIC_API_URL=https://painel.letras.cloud/api/v1`). Já o script `pnpm dev:mobile:*`
> sobe a API **NestJS** local (:3000). Ou seja, localmente o mobile testa contra uma API
> diferente da de produção. Para validar fielmente, aponte o mobile para a API Express.

Consumidores:
- **Painel Web** (React/Vite) → API Web (Express) → Supabase. Papéis: **ADMIN** e **TUTOR** (alfabetizador). O alfabetizando nunca acessa o painel.
- **App Mobile** (Expo/React Native) → em prod, API Web; em dev, API NestJS. Papéis: **alfabetizando** e **alfabetizador**, escolhidos por CPF no login unificado.

---

## 2. Como rodar

### 2.1 API Web (Express, :8080)
```
# Projeto-Letras-Web/apps/api/.env  →  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT=8080
pnpm dev:api          # ou: pnpm dev (sobe web + api juntos)
# health: GET http://localhost:8080/health
```
A API aborta no boot se faltar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (`apps/api/src/config/env.js`).

### 2.2 Painel Web (Vite, :5173)
```
# Projeto-Letras-Web/apps/web/.env
#   VITE_API_BASE_URL=http://localhost:8080/api/v1   (⚠️ default do client é 8082 e quebra tudo)
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
#   VITE_REALTIME_ENABLED=true, VITE_WS_URL=ws://localhost:8080/realtime
pnpm dev:web          # abre http://localhost:5173
```
Vite lê `.env` de `apps/web/` (não da raiz). Migrations SQL em `infra/supabase/migrations/*.sql` devem estar aplicadas.

### 2.3 API Mobile (NestJS, :3000)
```
# Projeto-Letras-Mobile
pnpm db:generate && pnpm db:migrate && pnpm db:seed   # Prisma + seed
pnpm --filter api dev                                 # health: GET http://localhost:3000/health
```
Postgres local via `docker-compose.dev.yml` (Postgres 16, porta host **5434**).
Seed cria educador de teste: **`educadora@letras.app` / CPF `11111111111` / senha `123456`**.

### 2.4 App Mobile (Expo)
```
# Modo FIEL À PRODUÇÃO (recomendado): mobile → API Express
EXPO_PUBLIC_API_URL=http://SEU_IP:8080/api/v1 pnpm --filter mobile-app exec expo start --lan --clear

# Modo dev padrão (mobile → API NestJS :3000):
pnpm dev:mobile:emulator   # emulador Android (API 10.0.2.2:3000)
pnpm dev:mobile:local      # device físico na mesma Wi-Fi
pnpm dev:mobile:tunnel     # fallback via túnel Expo
pnpm dev:mobile:web        # roda no navegador (react-native-web)
```
Env em `apps/mobile-app/.env` (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN` opcional).
O script `scripts/dev-mobile-local.sh` builda os `packages/`, sobe a API se `/health` não responder, e inicia o Expo com a URL correta.

---

## 3. App Mobile — `apps/mobile-app`

Expo SDK 54 + React Native 0.81 + React 19 + React Navigation v7 (native-stack), arquitetura **MVVM**. Áudio/vídeo via `expo-av`, câmera via `expo-image-picker`, realtime via `socket.io-client`. Entrypoint `index.ts → App.tsx → src/navigation/RootNavigator.tsx`.

> Os antigos `apps/learner-app` e `apps/educator-app` foram **fundidos** neste app único
> (ver `docs/architecture/mobile-app-unification.md` no repo mobile). README.md é antigo;
> use README2.md + `scripts/dev-mobile-local.sh` como fonte de verdade.

### 3.1 Camadas (`src/`)
- `views/` — telas (`learner/`, `educator/`, `shared/` + `components/`)
- `viewmodels/` — lógica de tela
- `navigation/` — `RootNavigator` + `learner/LearnerNavigator` + `educator/EducatorNavigator`
- `hooks/` — realtime (`learner/useLearnerRealtime`, `educator/useEducatorRealtime`, `educator/useEducatorHomeRealtime`)
- `infra/` — `api/http-client.ts`, `api/resolve-api-base-url.ts`, `realtime/session-socket.ts`, `storage/*` (AsyncStorage: sessão, educador, outbox, checkpoints)
- `data/repositories/` + `domain/interfaces/` — repositórios e contratos
- `types/navigation.ts` — ParamLists; `theme/appColors.ts`

### 3.2 Navegação (3 stacks aninhadas)
`RootNavigator`: `UnifiedLogin` (inicial) → `EducatorFlow` (`EducatorNavigator`) / `LearnerFlow` (`LearnerNavigator`, com `LearnerSessionProvider`). Sem tabs — os menus inferiores (`EducatorBottomMenu` 5 abas / `LearnerBottomMenu` 4 abas) chamam `navigation.navigate`.
Detalhe: o **runner da Etapa 1 do educador reaproveita as telas de aula do learner** (`EducatorEtapa1LessonsView` monta navigator aninhado com as `LearnerLesson*View`).

### 3.3 Telas — Gate compartilhado (`src/views/shared/`)
| Tela | Função |
|---|---|
| `UnifiedLoginView` | Login único por CPF: resolve papel (aluno vinculado → LearnerFlow; aluno pendente → cria `sessoes-confirmacao` e vai à espera; aluno sem educador → bloqueia; senão login de educador → EducatorFlow). Restaura sessão persistida. |
| `BellIcon` / `EducatorBell` | Ícone de sino + badge de não-lidas (`GET /painel/notifications?unreadOnly=true`), navega a `EducatorNotificacoes`. |

### 3.4 Telas — ALFABETIZANDO (`src/views/learner/`, `LearnerNavigator`)
| Tela | Fluxo | Função |
|---|---|---|
| `LearnerLoadingView` | boot | Splash/roteador; com perfil → `LearnerHome`, senão → `UnifiedLogin`. |
| `LearnerSessionPendingView` | vínculo | "Notificação enviada"; **polling 3s** de `GET /cadastros/sessoes-confirmacao/:id` (PENDING/CONFIRMED/DENIED). |
| `LearnerOnboardingStep1/2/ConfirmView` | cadastro | CPF/telefone → nome/nascimento/UF/cidade/foto → confirmação. |
| `LearnerHomeView` | home | Módulos/aulas com desbloqueio sequencial e cadeados; sincroniza estado p/ espelho; menu 4 abas. |
| `LearnerLessonIntroView` | abertura | "Etapa X" + orientações. |
| `LearnerLessonScreenView` | aula/exercícios | Mídia (expo-av); exercícios `match-letter` e `mark-images`; áudio de instrução; card "Está com dúvidas?"; PEDIR AJUDA; **trava por tentativas** → banner "AGUARDANDO AJUDA"; checkpoints locais. |
| `LearnerLessonActivityView` | aula | Conteúdo/mídia da atividade (`LearnerActionButtons`). |
| `LearnerLessonConclusionView` | conclusão | Grava progresso `COMPLETED`; decide próxima aula/etapa. |
| `LearnerStageConclusionView` | conclusão de etapa | Certificado, letra do nível (RN048/049), pontos, compartilhar em redes. |
| `LearnerPhotoReviewView` | foto | Câmera (expo-image-picker); envia base64; `kind: 'atividade' | 'carta'` (carta na Etapa 3). |
| `LearnerPontuacaoView` (`LearnerScore`) | pontuação | Total, concluídas, `PhraseProgressWidget`. |
| `LearnerTutoriaisView` | tutoriais | Vídeos de dica (`GET /painel/dicas`), player overlay. |
| `LearnerProfileView` | perfil | Dados, telefone, logout. |
| `LearnerThemeSelectView` / `LearnerThemeConfirmView` | seleção de tema | ⚠️ Rodam na **stack do EDUCADOR** — é o educador quem atribui o tema. |

### 3.5 Telas — ALFABETIZADOR (`src/views/educator/`, `EducatorNavigator`)
| Tela | Fluxo | Função |
|---|---|---|
| `EducatorLoadingView` | boot | Valida token; expirado → `UnifiedLogin`; válido → `EducatorHome`. |
| `EducatorLoginView` | login | Login do educador por CPF. |
| `EducatorSplashView` + `EducatorOnboardingStepTwo/Three/ConfirmView` | cadastro | CPF/telefone → nome/nascimento/UF-cidade/foto (idade ≥14) → escolaridade/formação/redes → registra e salva token. |
| `EducatorHomeView` | home | Lista de alunos; **seção de pedidos de apoio e bloqueios** (realtime); "Novo Alfabetizando"; card de tutorial; sino; menu 5 abas; roteia clique no aluno (Etapa 1 incompleta → `EducatorEtapa1Lessons`; falta tema → `LearnerThemeSelect`; `mirrorUnlocked` → `EducatorLiveMirror`). |
| `EducatorSessionConfirmView` | aceite de vínculo | Lista pedidos pendentes; CONFIRMAR / RECUSAR com motivos RN098. |
| `EducatorLearningModeView` | acompanhar | Detalhe do aluno, sessão atual, ligar/WhatsApp. |
| `EducatorLiveMirrorView` | espelhamento | Espelho ao vivo (Socket.IO) + orientações exclusivas fora do "quadrado"; cold start `GET /sessions/:id`; gate `mirrorUnlocked`. |
| `EducatorEtapa1LessonsView` | Etapa 1 conduzida | Runner reusa telas do learner sob o UUID do aluno; **sem trava por tentativas**; libera Etapa 2/espelho. |
| `EducatorComparativoView` | aprovação (Etapa 3) | Comparativo atividade × foto entregue; VOLTAR / APROVAR TAREFA (RN082). |
| `EducatorScoreView` / `EducatorScoreRulesView` | pontuação | Pontuação e regras (RN085/086/096). |
| `EducatorTutoriaisView` / `EducatorTutorialView` | tutoriais | Playlist; marca assistidos; desbloqueio sequencial (`tutorialPresentation.ts`). |
| `EducatorNotificacoesView` | notificações | Lista (`GET /painel/notifications`), marca lidas. |
| `EducatorProfileView` | perfil | Dados, foto, logout. |

### 3.6 Módulos transversais (mobile)
- **Login unificado**: um CPF resolve papel; token do educador em `infra/storage/educator-storage.ts`; identidade do aluno em `infra/storage/session-storage.ts`; `httpClient` injeta `setAuthToken`/`setLearnerIdentity`.
- **Vínculo com aceite**: (a) inicial no cadastro pelo educador; (b) por sessão — aluno entra por CPF (`createSessionRequest`) → `EducatorSessionConfirmView` confirma/recusa (motivos RN098) → aluno vê resultado por polling.
- **Outbox idempotente** (`infra/storage/learner-sync-outbox.js`): escritas de progresso/conclusão que falham por rede são enfileiradas com `idempotencyKey` e drenadas no bootstrap, no foreground (`AppState`) e na reconexão. Endpoints `/learner-activities/:id/complete` e `/painel/progress`.
- **Realtime/espelhamento** (`infra/realtime/session-socket.ts`, namespace `/realtime`): eventos em `packages/shared-types/src/realtime.ts` — `learner_state_update`, `locked_changed`, `help_requested`, `help_received`, `lock_set`, `lock_release`, `presence_changed`, etc. Snapshot da tela em `LearnerScreenSnapshot`, renderizado por `MirrorScreenRenderer`.
- **Trava por tentativas** (`LearnerLessonScreenView`): `maxAttemptsBeforeLock` vem do CMS por exercício (**default 3**, ver `learnerFlowMapper.ts`); ao atingir → banner visual "AGUARDANDO AJUDA" (sem texto, pois o aluno não lê); não trava no modo conduzido pelo educador (`isEducatorConducted`).
- **Erro nunca cru** (`infra/api/user-facing-error.js`): `toUserFacingMessage()` filtra termos técnicos (status HTTP, JSON, stack, `supabase`, `prisma`, `network`…) e troca por mensagem amigável fixa.

---

## 4. Painel Web — `apps/web`

React 18.3 + Vite 6 + React Router 7 (Data Mode, `createBrowserRouter`) + Tailwind v4 + MUI/Radix + Recharts + Supabase. Entrada `main.tsx → app/App.tsx`. Roteamento em `app/routes.ts`.

### 4.1 Estrutura
- `app/pages/` — `Login.tsx`, `HomeRedirect.tsx`, `MobileModulos.tsx`; `pages/admin/*`; `pages/tutor/*`; `pages/admin/conteudo/*`.
- `app/components/` — `Layout.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `KPICard.tsx`, `StateDisplay.tsx`, `ConfirmDialog.tsx`, `LessonScreenPreview.tsx` + `components/ui/*` (shadcn/Radix).
- `app/core/` — `auth/` (AuthProvider, authService), `api/client.ts`, `config/env.ts`, `supabase/client.ts`, `realtime/*`, `observability/sentry.ts`.
- `Layout.tsx` protege rotas (redireciona a `/login`), expulsa alfabetizando, e faz cross-guard de papel (tutor em `/admin/*` → `/tutor/dashboard`; admin em `/tutor/*` → `/admin/dashboard`).

Papel derivado em `core/auth/authService.ts`: `user_metadata.role`/`app_metadata.role`, fallback por email ("tutor"→tutor, "aluno"/"student"→alfabetizando, senão admin).

### 4.2 Páginas — ADMIN
| Rota | Arquivo | Função |
|---|---|---|
| `/login` | `pages/Login.tsx` | Email+senha (Supabase), "Esqueci minha senha", redireciona por papel. |
| `/` | `pages/HomeRedirect.tsx` | Redireciona por papel. |
| `/admin/dashboard` | `pages/admin/Dashboard.tsx` | KPIs (`ativos7d`, `vinculosPendentes`, `filaAjudaAgora`, `aulasConcluidasHoje`), gráfico 7/30/90d, alertas críticos; atualiza via realtime. |
| `/admin/alfabetizandos` | `pages/admin/Alfabetizandos.tsx` | Listagem + cadastro (CPF validado, alfabetizador obrigatório); ver/editar/**alterar vínculo**/excluir. |
| `/admin/alfabetizandos/:id` | `pages/admin/AlfabetizandoDetalhe.tsx` | Detalhe, badge "Etapa 1 concluída/em andamento", tentativas/erros, galeria de submissões, linha do tempo com ações inline. |
| `/admin/alfabetizadores` | `pages/admin/Alfabetizadores.tsx` | Cadastro/listagem de educadores (#alunos, travados, pontuação). |
| `/admin/vinculos` | `pages/admin/Vinculos.tsx` | Vínculos e Convites (RN101): abas Pendentes/Confirmados/Negados; Confirmar/Negar. |
| `/admin/trilha-de-aulas` | `pages/admin/TrilhaAulas.tsx` | Trilha (grade comum por tema): incluir/remover da trilha (+`sync-grade`), reordenar drag-and-drop. (redirects legados: `/admin/grade-temas`, `/admin/atividades-alfabetizando`) |
| `/admin/fila` | `pages/admin/Fila.tsx` | Fila: Bloqueados/Ajuda/Vínculos; snapshot da tela travada (`LessonScreenPreview`); confirmar/negar/desbloquear/resolver. |
| `/admin/conteudo` | `pages/admin/Conteudo.tsx` → `conteudo/ConteudoDashboardPage.tsx` | "Aulas e Mídias": stats, aulas recentes com Publicar/Despublicar, Preview, Editar, Excluir; upload rápido. |
| `/admin/conteudo/criar` | `conteudo/ConteudoCriarPage.tsx` | Editor de aula + preview mobile ao vivo; "Onde salvar" (Tema→**Etapa obrigatória 1/2/3**→Módulo); editor de blocos (`video`/`match-letter`/`mark-images`/`text`/`image`/`audio`); publicar ao criar; rascunho em localStorage. |
| `/admin/conteudo/biblioteca` | `conteudo/ConteudoBibliotecaPage.tsx` | Biblioteca de mídias (filtrar/preview/upload/editar/excluir). |
| `/admin/conteudo/importar-telas` | `conteudo/ConteudoImportarTelasPage.tsx` | Importar manifesto/diretório/blueprints (`stageTag`/`moduleCode`). |
| `/admin/conteudo/videos` | `conteudo/ConteudoVideosPage.tsx` | Slots por tipo (`tutorial`/`intro-etapa`/`intro-modulo`/`dica`/`geral`); selecionar/trocar/upload até 200 MB. |
| `/admin/ranking` | `pages/admin/Ranking.tsx` | Ranking de alunos/tutores + extrato. |
| `/admin/relatorios` | `pages/admin/Relatorios.tsx` | Relatório de inatividade + exportar CSV. |
| `/admin/configuracoes` | `pages/admin/Configuracoes.tsx` | Perfil / Sistema (limites de erro/inatividade) / Papéis. |
| `/mobile/modulos` | `pages/MobileModulos.tsx` | Preview mobile navegável (temas→módulos→aulas); deep-link `#activity-<id>`. |
| `/admin/grupos` | `pages/admin/Grupos.tsx` | Grupos (periférico; fora da sidebar). |

> Legado não roteado: `conteudo/ConteudoNovaAulaPage.tsx` (wizard de 5 etapas antigo) — ignorar.

### 4.3 Páginas — TUTOR (alfabetizador)
| Rota | Arquivo | Função |
|---|---|---|
| `/tutor/dashboard` | `pages/tutor/Dashboard.tsx` | KPIs do tutor, pedidos recentes, resumo semanal. |
| `/tutor/alfabetizandos` | `pages/tutor/MeusAlfabetizandos.tsx` | Só os do tutor; cadastro simplificado (nome+CPF; vínculo confirma no login do app — RN101). |
| `/tutor/alfabetizandos/:id` | reusa `AlfabetizandoDetalhe.tsx` | Detalhe do aluno. |
| `/tutor/fila` | reusa `Fila.tsx` | Fila escopada ao tutor. |
| `/tutor/ranking` | reusa `Ranking.tsx` | Ranking. |
| `/tutor/configuracoes` | reusa `Configuracoes.tsx` | Configurações. |

### 4.4 Menus por papel (`Sidebar.tsx`)
- **ADMIN**: Dashboard, Alfabetizandos, Alfabetizadores, Vínculos e Convites, Trilha de aulas, Fila, Aulas e Mídias, Pontuação & Ranking, Relatórios, Configurações.
- **TUTOR**: Meu Dashboard, Meus Alfabetizandos, Fila, Pontuação & Ranking, Configurações.
- **Exclusivo ADMIN**: alfabetizadores, vínculos globais, trilha, todo `conteudo/*`, relatórios, grupos, `/mobile/modulos`.
- `Topbar.tsx`: status realtime, sino de notificações (poll 30s), Sair.

---

## 5. API Web (Express) — prefixo `/api/v1`, porta 8080

Arquivos em `apps/api/src/`. A maioria das rotas administrativas **não exige token** (usam `supabaseAdmin` service-role). Exceções que exigem `Bearer`: `/auth/educators/me`, `PATCH /auth/educators/profile`, todo `/learner-activities/*`, `PUT/DELETE /cadastros/alfabetizandos/:id/vinculo`. Obter token: `POST /api/v1/auth/educators/login`.

### Auth (`routes/auth.js`)
- `POST /auth/educators/login` · `GET /auth/educators/me` (Bearer) · `POST /auth/educators/register` · `PATCH /auth/educators/profile` (Bearer) · `POST /auth/educators/logout`

### Raiz / Reference (`server.js`, `routes/health.js`, `routes/reference.js`)
- `GET /health` · `GET /` · `GET /api/v1/scoring/me` · `GET /api/v1/themes` · `GET /reference/ufs` · `GET /reference/ufs/:uf/cities`

### Cadastros (`routes/cadastros.js`)
- Alfabetizadores: `GET/POST /cadastros/alfabetizadores`, `PATCH/DELETE /cadastros/alfabetizadores/:id`
- Perfis: `GET/PATCH /cadastros/perfis/:id`
- Alfabetizandos: `GET /cadastros/alfabetizandos`, `POST /cadastros/alfabetizandos/provisionar-mobile`, `GET /cadastros/alfabetizandos/buscar`, `GET /cadastros/alfabetizandos/:id`, `POST /cadastros/alfabetizandos`, `PATCH /cadastros/alfabetizandos/:id`, `DELETE /cadastros/alfabetizandos/:id`
- Vínculo: `PUT /cadastros/alfabetizandos/:id/vinculo` (Bearer admin/tutor), `DELETE .../vinculo` (Bearer admin)
- Sessões/lock: `GET /cadastros/sessoes-bloqueadas`, `PUT /cadastros/sessions/:learnerId/lock`
- Vínculos: `GET/POST /cadastros/vinculos`, `PATCH /cadastros/vinculos/:id`
- Confirmação por sessão: `POST/GET /cadastros/sessoes-confirmacao`, `GET /cadastros/sessoes-confirmacao/:id`, `PATCH /cadastros/sessoes-confirmacao/:id`

### Painel (`routes/painel.js`)
- Dashboard: `GET /painel/dashboard/admin`, `GET /painel/dashboard/tutor`
- Conteúdo (CMS): `GET /painel/conteudo`; CRUD de `temas`, `modulos`, `atividades`, `etapas`, `media-biblioteca`, `assets`, `blueprints`; `GET /painel/conteudo/storage-files`; uploads (`media-biblioteca/:id/upload`, `assets/upload`, `assets/import-directory`, `blueprints/import-manifest`); `POST /painel/conteudo/reset`
- Tutoriais/dicas: `GET /painel/tutoriais`, `GET /painel/dicas`, `POST /painel/tutoriais/:mediaId/progresso`
- Progresso/gate: `POST /painel/progress`, `GET /painel/progress/:learnerProfileId`, `GET /painel/learners/:learnerProfileId/stage-status` (**gate Etapa1→2 + mirrorUnlocked**), `GET /painel/score/:learnerId`
- Operação: `POST /painel/support-requests`, `GET /painel/notifications`, `PATCH /painel/notifications/:id/read`, `GET /painel/learner-sessions/:learnerProfileId`, `GET /painel/fila`, `PATCH /painel/fila/:id`, `GET /painel/ranking`, `GET /painel/relatorios/inatividade`, `GET /painel/grupos`, `GET /painel/eventos`, `GET/PATCH /painel/configuracoes/sistema`
- Extras: `POST /painel/tts/generate`; **Fotos de atividade**: `POST/GET /painel/fotos-atividade`, `PATCH /painel/fotos-atividade/:id/aprovar`

### Sessions (`routes/sessions.js`)
- `POST /sessions` · `GET /sessions/:learnerProfileId` · `PATCH /sessions/:learnerProfileId/state` (espelhamento) · `PUT /sessions/:learnerProfileId/lock`

### Learners (`routes/learners.js`)
- `GET /learners/themes-list` · `POST /learners` · `GET/POST /learners/:learnerProfileId/themes`

### Learner Activities (`routes/learnerActivities.js`) — **todo o router exige Bearer**
- `GET /learner-activities/catalog` · `POST /learner-activities/:activityId/complete` (idempotente, header `Idempotency-Key`) · `PATCH /learner-activities/access` · `POST /learner-activities/sync-grade` · `POST /learner-activities/reorder`

### WebSocket (`realtime/dashboardRealtime.js`)
- `ws://<host>:8080/realtime` (auth opcional via env `REALTIME_TOKEN`). Query: `learnerProfileId`, `userId`, `name`, `role`.
- Eventos: `presence.*`, `session.metrics_updated`, `locked_changed`, `help_received`, `support.created`, `progress.locked/unlocked`, `support.resolved`, `stage.completed`, `notification.created`.

---

## 6. API Mobile (NestJS) — sem prefixo, porta 3000

Arquivos em `apps/api/src/modules/`. Token de sessão opaco próprio (`educator_<hex>`, não JWT). Obter: `POST /auth/educators/login`. Rotas com guard (`Bearer`): `/auth/educators/me`, `PATCH /profile`, `/logout`, `/painel/notificacoes`, `/painel/tutoriais`.

- **Health**: `GET /health`, `GET /health/db`
- **Auth**: `POST /auth/educators/register` (+ alias `/registers`), `/login`; `GET /me` (Bearer); `PATCH /profile` (Bearer); `POST /logout` (Bearer)
- **Cadastros**: `/cadastros/alfabetizadores[/:id]`, `/cadastros/alfabetizandos[/buscar|/:id]`, `/cadastros/sessoes-bloqueadas`, `/cadastros/vinculos[/:id]`, `/cadastros/sessoes-confirmacao[/:id]` (mesmos caminhos da Web, sem `/api/v1`)
- **Painel**: `/painel/notificacoes` (Bearer), `/painel/notificacoes/marcar-lidas` (Bearer), `/painel/dashboard/admin|tutor`, `/painel/conteudo` (+ POST temas/modulos/atividades/assets/blueprints, upload), `/painel/progress[/:id]`, `/painel/tutoriais` (Bearer) + `/:id/progresso`, `/painel/score/:id`, `/painel/support-requests`, `/painel/fila`, `/painel/ranking`, `/painel/relatorios/inatividade`, `/painel/grupos`, `/painel/eventos`
- **Learners**: `POST /learners`, `GET/POST /learners/:id/themes`
- **Themes**: `GET/POST /themes`
- **Learning Content**: `GET /learning-content/units` (`?themeId`), `GET /learning-content/units/:id/activities`
- **Sessions**: `POST /sessions`, `GET /sessions/:id`, `PATCH /sessions/:id/state`, `PUT /sessions/:id/lock`
- **Progress**: `POST /progress`, `GET /progress/:id`
- **Scoring**: `GET /scoring/me` (`?educatorId`), `GET /scoring/rules`
- **Reference**: `GET /reference/ufs`, `GET /reference/ufs/:uf/cities`
- **WebSocket** (`realtime/gateway/session.gateway.ts`): `ws://<host>:3000/realtime`. Query: `role` (`learner`/`educator`) + `learnerProfileId` (learner) ou `educatorId` (educador). Mensagens: `learner_state_update`, `lock_set`, `lock_release`, `help_requested`, `help_received`. É o servidor de espelhamento de tela. Referência: `apps/api/scripts/test-socket.ts`.

---

## 7. Pendências / pontos de atenção conhecidos

Confirmar estado atual — o código evoluiu além do `PENDENCIAS.md` (23/06):
- **Espelhamento**: navegação bidirecional sincronizada ("freio de autoescola") e o "quadrado" de espelho constam como pendentes.
- **Tutoriais — "14 vídeos no bundle": NÃO implementado.** Vídeos ainda resolvidos dinamicamente via CMS/`media_library` (`hintVideos.ts`, `resolveHintVideoUrl`). `match-letter` propositalmente sem vídeo de fallback.
- **Tutoriais — "regra dos 7 dias": NÃO implementada** (não existe no código; `sevenDaysAgo` no painel é só métrica de dashboard). O que existe é o **desbloqueio sequencial** (`tutorialPresentation.ts`).
- **Trava por 3 tentativas**: `maxAttemptsBeforeLock` vem do CMS (default 3); banner "AGUARDANDO AJUDA" é visual (aluno não lê); erro técnico/500 nunca cru (`user-facing-error.js`).
- **Divergência de porta**: client web tem default `8082` mas API roda em `8080` — setar `VITE_API_BASE_URL`.
- **Deep-links órfãos** (mobile) **removidos** do `App.tsx`: `EducatorLinkConfirm`, `EducatorLinkSuccess`, `LearnerFirstAccessGate`, `LearnerCpfLogin`, `LearnerLinkStep1`, `LearnerLinkSuccess` (resíduo dos apps antigos; não tinham tela registrada).

---

## 8. Documentos relacionados
- Roteiro de validação passo a passo: ver `ROTEIRO-VALIDACAO.md` (se versionado).
- Mobile: `README2.md`, `docs/architecture/mobile-app-unification.md`, `docs/architecture/overview.md`, `docs/super-prompt-espelhamento-tela.md`, `docs/plano-etapa1-educador-gate.md`.
- Web: `CLAUDE.md`, `AGENTS.md`, `docs/product/` (RN001–RN123), `docs/architecture/`.
