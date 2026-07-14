# Roteiro de Validação — Projeto Letras (Web + Mobile)

> Objetivo: validar, de ponta a ponta, cada tela, módulo e rota do painel Web e do app Mobile,
> para os dois papéis (alfabetizando e alfabetizador/educador), além das rotas de API.
>
> Como usar: siga as fases na ordem. Marque `[x]` cada item ao validar. Cada item tem
> **Ação** (o que fazer) e **Esperado** (o que precisa acontecer para passar).

---

## ⚠️ Fato arquitetural que muda a estratégia

Existem **DUAS APIs distintas**, uma em cada repo:

| | API Web (`@letras/api`) | API Mobile (`apps/api`) |
|---|---|---|
| Repo | Projeto-Letras-Web | Projeto-Letras-Mobile |
| Stack | Express 4 + Socket.IO (JS) | NestJS + Socket.IO (TS) |
| Porta | **8080** | **3000** |
| Prefixo | `/api/v1` | nenhum (raiz) |
| Auth | Bearer = JWT Supabase | token de sessão opaco `educator_<hex>` |

**Em produção o app mobile aponta para a API Express da Web** (`EXPO_PUBLIC_API_URL=https://painel.letras.cloud/api/v1`).
Mas o script `pnpm dev:mobile:*` sobe a API **NestJS** local (:3000). Ou seja: **localmente o mobile testa contra uma API diferente da de produção.**

**Recomendação:** validar o mobile em DOIS modos —
1. **Modo "fiel à produção"**: subir a API Express da Web (:8080) e apontar o mobile para ela (`EXPO_PUBLIC_API_URL=http://SEU_IP:8080/api/v1`). É o que roda em prod.
2. **Modo "dev padrão"**: script `pnpm dev:mobile:*` contra a NestJS (:3000) — para validar a stack local do repo mobile.

Se der pouco tempo, priorize o **modo 1** (é o comportamento real dos usuários).

---

## FASE 0 — Preparação de ambiente

### 0.1 Pré-requisitos
- [ ] Node 20+, pnpm 10.5.2 (`corepack enable`)
- [ ] Docker (Postgres local) — opcional se usar Supabase remoto
- [ ] Um device Android com Expo Go (ou emulador Android Studio)
- [ ] Postman/Insomnia ou `curl` para as rotas de API

### 0.2 Banco / Supabase
- [ ] Definir se vai usar Supabase remoto (prod/staging) ou Postgres local
- [ ] **Web**: garantir migrations aplicadas — `infra/supabase/migrations/*.sql` (15 arquivos; conferir `2026071201_learner_link_lifecycle.sql` e `20260703_activity_photos.sql`)
- [ ] **Mobile (NestJS)**: `pnpm db:generate && pnpm db:migrate && pnpm db:seed`
- [ ] Seed cria educador de teste: **email `educadora@letras.app` / CPF `11111111111` / senha `123456`**

### 0.3 Subir a API Web (Express :8080)
- [ ] Criar `Projeto-Letras-Web/apps/api/.env` com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT=8080` (a API aborta sem as chaves Supabase)
- [ ] `cd Projeto-Letras-Web && pnpm dev:api`
- [ ] **Esperado**: `GET http://localhost:8080/health` → 200

### 0.4 Subir o Web (Vite :5173)
- [ ] Criar `Projeto-Letras-Web/apps/web/.env` com `VITE_API_BASE_URL=http://localhost:8080/api/v1`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_REALTIME_ENABLED=true`, `VITE_WS_URL=ws://localhost:8080/realtime`
  - ⚠️ O client tem default `http://localhost:8082/api/v1` — **precisa** setar `VITE_API_BASE_URL` para a porta certa (8080), senão tudo cai em erro.
- [ ] `pnpm dev:web` → abrir `http://localhost:5173`
- [ ] **Esperado**: tela de login carrega sem warning de config

### 0.5 Subir a API Mobile (NestJS :3000) — modo dev padrão
- [ ] `cd Projeto-Letras-Mobile && pnpm --filter api dev`
- [ ] **Esperado**: `GET http://localhost:3000/health` → 200 e `GET /health/db` → ok

### 0.6 Subir o app Mobile
- [ ] Modo 1 (fiel a prod): `EXPO_PUBLIC_API_URL=http://SEU_IP:8080/api/v1 pnpm --filter mobile-app exec expo start --lan --clear`
- [ ] Modo 2 (dev): `pnpm dev:mobile:emulator` (emulador) ou `pnpm dev:mobile:local` (device na mesma Wi-Fi)
- [ ] `pnpm dev:mobile:web` também roda no navegador (bom para smoke test rápido)
- [ ] **Esperado**: app abre na tela `UnifiedLogin`

---

## FASE 1 — Smoke test de API (curl/Postman)

> Faça isto ANTES das telas: se a API não responde, todas as telas caem em erro.
> Rode contra a **API Web** (`http://localhost:8080/api/v1`). Repita as equivalentes contra a NestJS (`http://localhost:3000`, sem `/api/v1`) se for validar o modo dev.

### 1.1 Saúde e referência
- [ ] `GET /health` → 200
- [ ] `GET /api/v1/themes` → lista de temas ativos
- [ ] `GET /api/v1/reference/ufs` → 27 UFs
- [ ] `GET /api/v1/reference/ufs/SP/cities` → cidades de SP

### 1.2 Auth do educador
- [ ] `POST /api/v1/auth/educators/login` body `{"identifier":"11111111111","password":"123456"}` → `{ token, educator }`
- [ ] Guardar o `token`. `GET /api/v1/auth/educators/me` com `Authorization: Bearer <token>` → perfil
- [ ] `PATCH /api/v1/auth/educators/profile` (Bearer) alterando cidade → 200
- [ ] `POST /api/v1/auth/educators/register` (novo CPF) → cria educador role tutor

### 1.3 Cadastros (ver checklist completo na FASE 8)
- [ ] `GET /cadastros/alfabetizadores` → lista com métricas
- [ ] `GET /cadastros/alfabetizandos?educatorId=<id>` → alunos do tutor
- [ ] `POST /cadastros/alfabetizandos` → cria aluno (guardar `learnerProfileId`)
- [ ] `POST /cadastros/sessoes-confirmacao` `{learnerProfileId, educatorId}` → pedido PENDING
- [ ] `GET /cadastros/sessoes-confirmacao?educatorId=<id>` → aparece o pedido
- [ ] `PATCH /cadastros/sessoes-confirmacao/:id` `{status:"CONFIRMED"}` → confirmado
- [ ] `GET /cadastros/sessoes-confirmacao/:id` → status reflete a decisão

### 1.4 Painel / progresso / gate
- [ ] `GET /painel/dashboard/admin` → KPIs
- [ ] `GET /painel/dashboard/tutor?tutorId=<id>` → dashboard do tutor
- [ ] `GET /painel/conteudo?scope=cms` → currículo completo
- [ ] `POST /painel/progress` (concluir atividade do aluno) → 200
- [ ] `GET /painel/learners/:learnerProfileId/stage-status?themeId=<id>` → **gate Etapa1→2 + mirrorUnlocked**
- [ ] `GET /painel/score/:learnerId` → pontuação

### 1.5 Espelhamento / sessão / lock
- [ ] `POST /sessions` `{learnerProfileId, deviceId}` → cria sessão
- [ ] `PATCH /sessions/:id/state` `{currentView, currentActivityId, statePayload}` → 200 (snapshot p/ espelho)
- [ ] `PUT /sessions/:id/lock` `{isLocked:true}` → 200 + evento realtime `locked_changed`

### 1.6 WebSocket (`/realtime`)
- [ ] Conectar Socket.IO em `ws://localhost:8080/realtime` (Web) com query `learnerProfileId`,`role`
- [ ] Emitir estado do aluno e confirmar recebimento no educador (ver `apps/api/scripts/test-socket.ts` no repo mobile como referência)

### 1.7 Fotos de atividade (só API Web)
- [ ] `POST /painel/fotos-atividade` (base64) → cria
- [ ] `GET /painel/fotos-atividade?studentId=<id>` → lista
- [ ] `PATCH /painel/fotos-atividade/:id/aprovar` → aprovada

---

## FASE 2 — Painel Web: papel ADMIN

Login em `/login` com um usuário **admin** (papel derivado de `user_metadata.role` ou email sem "tutor").

### 2.1 Autenticação e navegação
- [ ] **Login** (`/login`): email+senha → redireciona para `/admin/dashboard`
- [ ] "Esqueci minha senha" dispara email (Supabase `resetPasswordForEmail`)
- [ ] `/` redireciona corretamente por papel
- [ ] Guard: acessar `/tutor/*` como admin → redireciona para `/admin/dashboard`
- [ ] Topbar: status realtime "conectado" + Nº online; **sino** com badge de não-lidas; **Sair** funciona

### 2.2 Dashboard admin (`/admin/dashboard`)
- [ ] KPIs `ativos7d`, `vinculosPendentes`, `filaAjudaAgora`, `aulasConcluidasHoje` carregam
- [ ] Gráfico Recharts alterna 7/30/90 dias
- [ ] Tabela de alertas críticos lista itens
- [ ] Ao gerar um evento (ex.: criar vínculo pendente) o dashboard atualiza via realtime

### 2.3 Alfabetizandos (`/admin/alfabetizandos`)
- [ ] Listagem carrega com progresso/etapa/status/tutor
- [ ] **Cadastrar**: nome, email, senha, telefone (máscara), CPF (validação `000.000.000-00`), alfabetizador obrigatório → cria (POST `/cadastros/alfabetizandos`)
- [ ] **Ver detalhes** abre `/admin/alfabetizandos/:id`
- [ ] **Editar** (PATCH) salva
- [ ] **Alterar vínculo** (`LearnerLinkDialog`) exige motivo → PUT `.../vinculo`
- [ ] **Excluir** pede confirmação e remove

### 2.4 Detalhe do alfabetizando (`/admin/alfabetizandos/:id`)
- [ ] Dados + **badge "Etapa 1 concluída / em andamento"**
- [ ] Status "travado" quando aplicável
- [ ] Progresso por etapa, tentativas/erros
- [ ] Galeria de submissões (fotos/áudios) renderiza
- [ ] Linha do tempo de eventos; ações inline **desbloquear aluno** / **marcar ajuda atendida** (PATCH `/painel/fila/:id`)

### 2.5 Alfabetizadores (`/admin/alfabetizadores`)
- [ ] Listagem com #alunos, travados, pontuação
- [ ] **Cadastrar** educador (POST `/cadastros/alfabetizadores`)
- [ ] Editar / Excluir

### 2.6 Vínculos e Convites (`/admin/vinculos`) — RN101
- [ ] 3 abas Pendentes / Confirmados / Negados com contadores
- [ ] Busca funciona
- [ ] Em Pendentes: **Confirmar** e **Negar** (PATCH `/cadastros/vinculos/:id`)
- [ ] Aba Negados mostra o motivo

### 2.7 Trilha de aulas (`/admin/trilha-de-aulas`)
- [ ] Selecionar tema agrupa por Etapa → Módulo em cards
- [ ] Toggle **Incluir/Remover da trilha** (PATCH atividade `isPublished` + POST `/learner-activities/sync-grade`)
- [ ] Modo **Reorganizar**: drag-and-drop / setas ↑↓
- [ ] Mover aula entre módulos abre modal de confirmação
- [ ] Redirects legados `/admin/grade-temas` e `/admin/atividades-alfabetizando` → `/admin/trilha-de-aulas`

### 2.8 Fila de Atendimento (`/admin/fila`)
- [ ] 3 abas Bloqueados / Pedidos de ajuda / Vínculos pendentes com contadores
- [ ] Auto-seleciona a 1ª aba com itens
- [ ] Painel lateral de detalhe + **snapshot da tela onde o aluno travou** (`LessonScreenPreview`)
- [ ] Ações: confirmar/negar vínculo, **desbloquear** (motivo ≥3 chars), **resolver** ajuda (PATCH `/painel/fila/:id`)
- [ ] Refetch em tempo real ao chegar novo pedido

### 2.9 Aulas e Mídias (`/admin/conteudo`)
- [ ] Stats (temas/módulos/mídias/telas prontas)
- [ ] Lista "Aulas recentes" ordenada por criação
- [ ] **Publicar/Despublicar** aula (toggle `is_published`)
- [ ] **Preview** abre `/mobile/modulos#activity-<id>`
- [ ] **Editar** abre `/admin/conteudo/criar?id=<id>`
- [ ] **Excluir** remove
- [ ] Upload rápido de mídia por tema funciona

### 2.10 Editor de aula (`/admin/conteudo/criar`)
- [ ] Preview mobile ao vivo à direita ("Tela X de Y", setas avançar/voltar)
- [ ] **"Onde salvar"**: Tema (existente/novo) → **Etapa obrigatória (radio 1/2/3)** → Módulo → título
- [ ] Bloquear submit sem Etapa em módulo novo
- [ ] **Editor de blocos**: adicionar `video`, `match-letter`, `mark-images`, `text` (audiência alfabetizador/aluno/ambos), `image`, `audio`
- [ ] Upload de arquivo por bloco OU seleção via `MediaPickerModal`
- [ ] Checkbox "Publicar atividade ao criar"
- [ ] Salvar cria tema/módulo/atividade + upload de mídias e volta para `/admin/conteudo`
- [ ] Rascunho persiste em localStorage e oferece restauração

### 2.11 Biblioteca de mídias (`/admin/conteudo/biblioteca`)
- [ ] Listar/filtrar (all/imagem/audio/mp4), preview/player, editar, upload, excluir

### 2.12 Importar telas (`/admin/conteudo/importar-telas`)
- [ ] Importar manifesto JSON
- [ ] Importar diretório de assets
- [ ] Upload de blueprints com `stageTag`/`moduleCode`; criar blueprint

### 2.13 Vídeos (`/admin/conteudo/videos`)
- [ ] Slots por tipo: `tutorial` (obrigatório), `intro-etapa`, `intro-modulo`, `dica`, `geral`
- [ ] Selecionar/Trocar/Remover vídeo (bucket `cms-videos/media-library` ou upload até 200 MB)

### 2.14 Ranking (`/admin/ranking`)
- [ ] Abas Ranking de Alunos / Tutores + Extrato de pontos carregam (GET `/painel/ranking`)

### 2.15 Relatórios (`/admin/relatorios`)
- [ ] Filtro N dias, resumo, **Exportar CSV** gera arquivo

### 2.16 Configurações (`/admin/configuracoes`)
- [ ] Aba Perfil: editar nome/telefone/CPF (email read-only); reset de senha por email
- [ ] Aba Sistema: limite de erros p/ bloqueio + dias de inatividade (salva em `/painel/configuracoes/sistema`)
- [ ] Aba Papéis: atalhos funcionam

### 2.17 Preview mobile (`/mobile/modulos`)
- [ ] Navegar temas → módulos → aulas renderiza no formato do app
- [ ] Players de áudio, exercícios match-letter/mark-images/vídeo funcionam
- [ ] Deep-link `#activity-<id>` foca a aula certa

---

## FASE 3 — Painel Web: papel TUTOR (alfabetizador)

Login com usuário **tutor** (email com "tutor" ou `role=tutor`).

- [ ] `/tutor/dashboard`: KPIs do tutor (meus ativos, travados, ajuda aberta, vínculos pendentes, notificações, em risco); pedidos recentes; resumo semanal (GET `/painel/dashboard/tutor?tutorId=`)
- [ ] `/tutor/alfabetizandos`: lista só os do tutor; **cadastro simplificado** (nome + CPF; email/senha auto; vínculo confirma só no login do app — RN101)
- [ ] `/tutor/alfabetizandos/:id`: reusa detalhe (mesmos checks da 2.4)
- [ ] `/tutor/fila`: reusa Fila (mesmos checks da 2.8, escopado ao tutor)
- [ ] `/tutor/ranking`: reusa Ranking
- [ ] `/tutor/configuracoes`: reusa Configurações
- [ ] Guard: tutor tentando `/admin/*` → redireciona para `/tutor/dashboard`
- [ ] Sidebar do tutor NÃO mostra: Alfabetizadores, Vínculos, Trilha, Conteúdo, Relatórios

---

## FASE 4 — Mobile: login unificado, cadastro e vínculo

### 4.1 Login unificado (`UnifiedLoginView`)
- [ ] Digitar CPF de **aluno vinculado e confirmado** → entra direto no LearnerFlow
- [ ] CPF de **aluno vinculado mas pendente** → cria `sessoes-confirmacao` → vai para tela de espera
- [ ] CPF de **aluno sem educador** → bloqueia com mensagem apropriada
- [ ] CPF de **educador** → login e entra no EducatorFlow
- [ ] Fechar e reabrir o app → sessão persistida restaura o papel correto

### 4.2 Cadastro do alfabetizando (fluxo do educador)
- [ ] `LearnerOnboardingStep1` (CPF/passaporte + telefone)
- [ ] `LearnerOnboardingStep2` (nome, nascimento, UF, cidade, foto)
- [ ] `LearnerOnboardingConfirm` grava e cria vínculo com o educador

### 4.3 Cadastro do educador
- [ ] `EducatorSplash` (CPF + telefone)
- [ ] `EducatorOnboardingStepTwo` (nome, nascimento, UF/cidade via `reference`, foto, idade ≥14)
- [ ] `EducatorOnboardingStepThree` (escolaridade, formação, redes)
- [ ] `EducatorOnboardingConfirm` registra e salva token de sessão

### 4.4 Vínculo por sessão com aceite (crítico)
- [ ] Aluno entra por CPF → `LearnerSessionPendingView` mostra "Notificação enviada" e faz polling a cada 3s
- [ ] No educador: `EducatorSessionConfirmView` lista o pedido
- [ ] **CONFIRMAR** → aluno sai do polling e entra no LearnerFlow
- [ ] **RECUSAR** com motivo (RN098: não conheço / desistiu / não vou mais alfabetizar / outro) → aluno vê recusa
- [ ] Refazer o fluxo e validar cada motivo de recusa

---

## FASE 5 — Mobile: fluxo do ALFABETIZANDO

### 5.1 Home (`LearnerHomeView`)
- [ ] Lista módulos/aulas com desbloqueio sequencial e cadeados
- [ ] Menu inferior 4 abas (início / tutoriais / pontuação / perfil) navega
- [ ] Estado sincroniza para o espelho (`syncCurrentState`)

### 5.2 Seleção de tema (conduzida pelo educador)
- [ ] `LearnerThemeSelectView` lista temas; `LearnerThemeConfirmView` confirma e abre Etapa 1 do tema
- [ ] Nota: essas telas rodam na stack do educador (é ele quem atribui)

### 5.3 Abertura e aula (`LearnerLessonIntro` → `LearnerLessonScreen`)
- [ ] Intro mostra "Etapa X" + orientações; avançar
- [ ] Aula renderiza mídia (imagem/vídeo/áudio via expo-av)
- [ ] Exercício **match-letter** (encontrar letra): acerto/erro com bip
- [ ] Exercício **mark-images** (marcar imagens): acerto/erro com bip
- [ ] Áudio de instrução toca; toggle de áudio funciona
- [ ] Card "Está com dúvidas?" abre vídeo de dica (`LearnerHintVideoOverlay`)
- [ ] Botão **PEDIR AJUDA** cria support-request
- [ ] **Trava por tentativas**: após `maxAttemptsBeforeLock` erros → banner "AGUARDANDO AJUDA" (sem texto técnico); checkpoint salvo localmente
- [ ] Erro de rede/500 NUNCA aparece cru (mensagem amigável / ícone)

### 5.4 Atividade e conclusão
- [ ] `LearnerLessonActivityView` mostra conteúdo/mídia da atividade
- [ ] `LearnerLessonConclusionView` grava progresso `COMPLETED` e decide próxima aula/etapa
- [ ] `LearnerStageConclusionView`: certificado, letra do nível (RN048/049), pontos ganhos, compartilhar em redes

### 5.5 Foto de atividade (`LearnerPhotoReviewView`)
- [ ] Abrir câmera (expo-image-picker), FAZER OUTRA FOTO / ENVIAR FOTO
- [ ] Envio com base64 (`kind: 'atividade'`); na Etapa 3 validar `kind: 'carta'`

### 5.6 Pontuação, tutoriais, perfil
- [ ] `LearnerPontuacaoView` (rota `LearnerScore`): total, concluídas, total de atividades, `PhraseProgressWidget`
- [ ] `LearnerTutoriaisView`: vídeos de dica (`GET /painel/dicas`), player overlay
- [ ] `LearnerProfileView`: dados, telefone, **logout**

### 5.7 Feedback sem leitura de texto (RN — alfabetizando não lê)
- [ ] Feedback de atividade aparece como ícone ✓/✗ (não texto)
- [ ] Banner "AGUARDANDO AJUDA" é visual

---

## FASE 6 — Mobile: fluxo do ALFABETIZADOR/EDUCADOR

### 6.1 Home (`EducatorHomeView`)
- [ ] Lista de alfabetizandos
- [ ] **Seção de pedidos de apoio e bloqueios** atualiza em tempo real (`useEducatorHomeRealtime`)
- [ ] Botão "Novo Alfabetizando" abre onboarding (isEducatorFlow)
- [ ] Card de tutorial destacado
- [ ] **Sino** de notificações com badge (`EducatorBell`)
- [ ] Menu 5 abas (início / tutoriais / acompanhar / pontuação / perfil)
- [ ] Clique no aluno roteia certo: Etapa 1 incompleta → `EducatorEtapa1Lessons`; falta tema → `LearnerThemeSelect`; `mirrorUnlocked` → `EducatorLiveMirror`

### 6.2 Aceite de vínculo (`EducatorSessionConfirmView`)
- [ ] Lista pedidos pendentes; CONFIRMAR / RECUSAR com motivos (RN098) — já coberto na 4.4

### 6.3 Etapa 1 conduzida (`EducatorEtapa1LessonsView`)
- [ ] Runner reusa telas de aula do learner sob o UUID do aluno
- [ ] Grava progresso no perfil do aluno
- [ ] **NÃO trava** por tentativas neste modo
- [ ] Ao concluir Etapa 1 → libera Etapa 2 e espelhamento (checar `stage-status`)

### 6.4 Espelhamento ao vivo (`EducatorLiveMirrorView`)
- [ ] Cold start: `GET /sessions/:id` popula a tela
- [ ] Ao vivo: aluno navega e o educador vê o mesmo (`learner_state_update` via Socket.IO)
- [ ] Orientações exclusivas do educador aparecem FORA do "quadrado" (`mirrorGuidance`)
- [ ] Só abre quando `mirrorUnlocked` (após Etapa 1)
- [ ] `lock_set`/`lock_release` bloqueiam/liberam a tela do aluno
- [ ] ⚠️ Navegação bidirecional sincronizada ("freio de autoescola") consta como pendente — validar estado atual

### 6.5 Acompanhamento e aprovação
- [ ] `EducatorLearningModeView`: dados, sessão atual, ligar/WhatsApp
- [ ] `EducatorComparativoView` (Etapa 3): comparativo atividade solicitada × foto entregue; VOLTAR / **APROVAR TAREFA** (RN082)

### 6.6 Pontuação, tutoriais, notificações, perfil
- [ ] `EducatorScoreView` + `EducatorScoreRulesView` (regras RN085/086/096)
- [ ] `EducatorTutoriaisView` / `EducatorTutorialView`: marca assistidos, desbloqueio sequencial
- [ ] `EducatorNotificacoesView`: lista (`GET /painel/notifications`), marca lidas, badge zera
- [ ] `EducatorProfileView`: dados, foto, **logout**

---

## FASE 7 — Integração ponta a ponta (Web ↔ API ↔ Mobile ↔ Realtime)

Cenários cruzados que exercitam tudo junto. Requer Web + API + Mobile no ar contra o MESMO backend.

- [ ] **E1 — Onboarding completo**: Admin cria aluno no painel → aluno faz login no app por CPF → pedido de vínculo aparece no educador (app e/ou painel) → confirma → aluno entra
- [ ] **E2 — Conteúdo→app**: Admin cria aula no editor, publica e inclui na trilha → aula aparece no app do aluno (após `sync-grade`)
- [ ] **E3 — Etapa 1 gate**: educador conduz Etapa 1 no app → ao concluir, `stage-status` libera Etapa 2 e o espelhamento
- [ ] **E4 — Espelhamento**: aluno navega numa aula → educador vê ao vivo → educador dá `lock` → tela do aluno trava
- [ ] **E5 — Ajuda/trava**: aluno erra 3× → trava "AGUARDANDO AJUDA" → aparece na Fila do painel com snapshot → admin desbloqueia → aluno destrava
- [ ] **E6 — Foto de atividade**: aluno envia foto → aparece em submissões (painel) e no comparativo (app educador) → educador/admin aprova
- [ ] **E7 — Pontuação**: concluir aulas gera pontos → reflete em `LearnerPontuacao`, `EducatorScore`, Ranking do painel
- [ ] **E8 — Notificações**: eventos (vínculo, ajuda, foto) geram notificação → sino no painel e no app com badge; marcar lida zera
- [ ] **E9 — Outbox offline**: colocar o device offline, concluir atividade, voltar online → progresso sincroniza sem duplicar (idempotência)

---

## FASE 8 — Checklist completo de rotas de API

> Marque cada rota testada. Web = prefixo `/api/v1` porta 8080. Mobile = raiz porta 3000.
> "Auth" = precisa `Authorization: Bearer <token>`.

### 8.1 API WEB (Express)
Auth:
- [ ] POST `/auth/educators/login`
- [ ] GET `/auth/educators/me` (auth)
- [ ] POST `/auth/educators/register`
- [ ] PATCH `/auth/educators/profile` (auth)
- [ ] POST `/auth/educators/logout`

Reference / raiz:
- [ ] GET `/health`
- [ ] GET `/` (info)
- [ ] GET `/reference/ufs`
- [ ] GET `/reference/ufs/:uf/cities`
- [ ] GET `/themes`
- [ ] GET `/scoring/me` (Bearer opcional / `?educatorId`)

Cadastros:
- [ ] GET `/cadastros/alfabetizadores`
- [ ] POST `/cadastros/alfabetizadores`
- [ ] GET `/cadastros/perfis/:id`
- [ ] PATCH `/cadastros/perfis/:id`
- [ ] PATCH `/cadastros/alfabetizadores/:id`
- [ ] DELETE `/cadastros/alfabetizadores/:id`
- [ ] GET `/cadastros/sessoes-bloqueadas`
- [ ] PUT `/cadastros/sessions/:learnerId/lock`
- [ ] GET `/cadastros/alfabetizandos`
- [ ] POST `/cadastros/alfabetizandos/provisionar-mobile`
- [ ] GET `/cadastros/alfabetizandos/buscar`
- [ ] GET `/cadastros/alfabetizandos/:id`
- [ ] POST `/cadastros/alfabetizandos`
- [ ] PATCH `/cadastros/alfabetizandos/:id`
- [ ] PUT `/cadastros/alfabetizandos/:id/vinculo` (auth admin/tutor)
- [ ] DELETE `/cadastros/alfabetizandos/:id/vinculo` (auth admin)
- [ ] DELETE `/cadastros/alfabetizandos/:id`
- [ ] GET `/cadastros/vinculos`
- [ ] POST `/cadastros/vinculos`
- [ ] PATCH `/cadastros/vinculos/:id`
- [ ] POST `/cadastros/sessoes-confirmacao`
- [ ] GET `/cadastros/sessoes-confirmacao`
- [ ] GET `/cadastros/sessoes-confirmacao/:id`
- [ ] PATCH `/cadastros/sessoes-confirmacao/:id`

Painel (dashboard/conteúdo/progresso/fila/etc.):
- [ ] GET `/painel/dashboard/admin`
- [ ] GET `/painel/dashboard/tutor`
- [ ] GET `/painel/conteudo`
- [ ] POST/PATCH/DELETE `/painel/conteudo/temas[/:id]`
- [ ] POST/PATCH/DELETE `/painel/conteudo/modulos[/:id]`
- [ ] POST/PATCH/DELETE `/painel/conteudo/atividades[/:id]`
- [ ] GET/POST/PATCH/DELETE `/painel/conteudo/etapas[/:id]`
- [ ] GET/POST/PATCH/DELETE `/painel/conteudo/media-biblioteca[/:id]`
- [ ] GET `/painel/conteudo/storage-files`
- [ ] POST `/painel/conteudo/media-biblioteca/:id/upload`
- [ ] GET `/painel/tutoriais`
- [ ] GET `/painel/dicas`
- [ ] POST `/painel/tutoriais/:mediaId/progresso`
- [ ] POST `/painel/conteudo/reset`
- [ ] POST/PATCH/DELETE `/painel/conteudo/assets[...]`
- [ ] POST `/painel/conteudo/assets/upload`
- [ ] POST `/painel/conteudo/assets/import-directory`
- [ ] POST/PATCH `/painel/conteudo/blueprints[/:id]`
- [ ] POST `/painel/conteudo/blueprints/import-manifest`
- [ ] POST `/painel/progress`
- [ ] GET `/painel/progress/:learnerProfileId`
- [ ] GET `/painel/learners/:learnerProfileId/stage-status`
- [ ] GET `/painel/score/:learnerId`
- [ ] POST `/painel/support-requests`
- [ ] GET `/painel/notifications`
- [ ] PATCH `/painel/notifications/:id/read`
- [ ] GET `/painel/learner-sessions/:learnerProfileId`
- [ ] GET `/painel/fila`
- [ ] PATCH `/painel/fila/:id`
- [ ] GET `/painel/ranking`
- [ ] GET `/painel/relatorios/inatividade`
- [ ] GET `/painel/grupos`
- [ ] GET `/painel/eventos`
- [ ] GET/PATCH `/painel/configuracoes/sistema`
- [ ] POST `/painel/tts/generate`
- [ ] POST `/painel/fotos-atividade`
- [ ] GET `/painel/fotos-atividade`
- [ ] PATCH `/painel/fotos-atividade/:id/aprovar`

Sessions / Learners / Learner-activities:
- [ ] POST `/sessions`
- [ ] GET `/sessions/:learnerProfileId`
- [ ] PATCH `/sessions/:learnerProfileId/state`
- [ ] PUT `/sessions/:learnerProfileId/lock`
- [ ] GET `/learners/themes-list`
- [ ] POST `/learners`
- [ ] GET `/learners/:learnerProfileId/themes`
- [ ] POST `/learners/:learnerProfileId/themes`
- [ ] GET `/learner-activities/catalog` (auth)
- [ ] POST `/learner-activities/:activityId/complete` (auth, `Idempotency-Key`)
- [ ] PATCH `/learner-activities/access` (auth)
- [ ] POST `/learner-activities/sync-grade` (auth)
- [ ] POST `/learner-activities/reorder` (auth)

WebSocket:
- [ ] Conexão `/realtime` + eventos `presence.*`, `locked_changed`, `help_received`, `stage.completed`, `notification.created`

### 8.2 API MOBILE (NestJS) — validar se for usar o modo dev
- [ ] GET `/health`, `/health/db`
- [ ] POST `/auth/educators/register` (+ alias `/registers`), `/login`; GET `/me` (auth); PATCH `/profile` (auth); POST `/logout` (auth)
- [ ] `/cadastros/*` (alfabetizadores, alfabetizandos, buscar, sessoes-bloqueadas, vinculos, sessoes-confirmacao) — mesmos caminhos, sem `/api/v1`
- [ ] `/painel/*` (notificacoes [auth], marcar-lidas [auth], dashboard admin/tutor, conteudo, progress, tutoriais [auth], score, support-requests, fila, ranking, relatorios, grupos, eventos)
- [ ] `/learners`, `/learners/:id/themes`
- [ ] `/themes` (GET/POST)
- [ ] `/learning-content/units`, `/learning-content/units/:id/activities`
- [ ] `/sessions` (POST/GET/PATCH state/PUT lock)
- [ ] `/progress` (POST/GET)
- [ ] `/scoring/me`, `/scoring/rules`
- [ ] `/reference/ufs`, `/reference/ufs/:uf/cities`
- [ ] WebSocket `/realtime` com query `role` + `learnerProfileId`/`educatorId`; eventos `learner_state_update`, `lock_set/release`, `help_requested/received`, `presence_changed`

---

## Anexo — Pendências conhecidas a observar durante a validação
(do `PENDENCIAS.md` mobile e docs; confirmar estado atual, pois o código evoluiu)
- Espelhamento: navegação bidirecional sincronizada ("freio de autoescola") e o "quadrado" de espelho
- Tutoriais: 14 vídeos no bundle (hoje usa URL dinâmica) e regra dos 7 dias para vídeo novo
- Divergência de porta no client web (default 8082 vs API 8080) — setar `VITE_API_BASE_URL`
- Rotas de deep-link sem tela registrada (`EducatorLinkConfirm`, `LearnerFirstAccessGate`, etc.) — resíduo do fluxo antigo
