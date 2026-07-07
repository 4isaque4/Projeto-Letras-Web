# Etapa 1 no celular do alfabetizador — gate da Etapa 2 e do Espelhamento

## Contexto

**Requisito refinado (o "prompt melhor"):**

> A Etapa 1 de cada tema é **criada/autorada no painel web** (CMS já existente: Tema → Etapa → Módulo → Atividade), mas **executada no celular do alfabetizador**, no modo educador do app mobile, com o progresso registrado **no perfil de cada alfabetizando**. Dentro de um tema, a **Etapa 2 só é liberada** para o alfabetizando quando a Etapa 1 daquele tema estiver 100% concluída. O **espelhamento** (que hoje abre livremente no app do educador) também **só aparece/funciona após a conclusão plena da Etapa 1** daquele alfabetizando. O modo learner **não exibe mais a Etapa 1** — o alfabetizando começa na Etapa 2, visível só após o desbloqueio. Remover os trechos hardcoded ligados a etapas/conteúdo desta feature (escopo confirmado: só o ligado à feature; copy, pontuação e segredos ficam de fora).

**Dois repositórios:**
- `Projeto-Letras-Web/` — painel web (React+Vite) + API Express (`/api/v1`, é o **contrato vivo** que o mobile consome em produção via `painel.letras.cloud`) + Supabase Postgres.
- `letras/` — app mobile Expo/RN (`apps/mobile-app`, MVVM) + NestJS de referência.

**Descobertas-chave (validadas no código):**
- O espelhamento existe só no mobile: `EducatorHomeView.handleOpenLearner()` navega para `EducatorLiveMirror` em qualquer tap, sem gate algum.
- **Não existe executor de aulas no modo educador**: `EducatorEtapaOrientacoesView.handleAvancar()` (linha 134) dead-ends em `EducatorLearningMode`, que é só uma tela de detalhes/contato. Construir esse runner é o maior item da feature.
- Já existe primitiva server-side de "etapa completa": `maybeCreditStageCompletion` (`letrasDataService.js:1926`), **mas sem filtro por tema** (bug cross-theme a corrigir no refactor).
- O gate por etapa já existe no learner (`LearnerHomeView.tsx:52-72`, rollup de `stageNumber` × `completedLessonIds`) — reutilizar.
- Como o educador registra progresso da Etapa 1 sob o **id do alfabetizando**, o fluxo learner existente já enxerga essas conclusões sem mudança de dados.
- Hardcoded no escopo: `stageNumber: 1` em `LearnerThemeConfirmView.tsx:43`; `stage_number ?? 2` em `learnerFlowMapper.ts` (~1131 e ~1337); default `newModuleStage = 2` no wizard (`ConteudoCriarPage.tsx:1831`); seeds SQL de currículo (`20260621_etapa1_modulos.sql`, `20260618_media_library_stages_hints.sql` com premissa de tema único).

---

## Fase 1 — API do painel: fonte da verdade de status por etapa (deploy primeiro; puramente aditiva)

Repo: `Projeto-Letras-Web/apps/api`.

1. **Helper `computeLearnerStageStatus({ learnerProfileId, themeId })`** em `apps/api/src/services/letrasDataService.js`, computado **na leitura** (sem tabela nova):
   - `learning_stages` do tema (ativas, ordenadas por `stage_number`); módulos do tema agrupados por etapa (match por `stage_id`, fallback legado `stage_number`); atividades publicadas.
   - Progresso via `getActivityProgress()` (merge dual-schema `activity_progress` + `Completion` mobile — **nunca** a tabela crua; nota: o `GET /painel/progress/:id` atual em `painel.js:1146` não faz esse merge).
   - Por etapa: `completed = totalActivities > 0 && todas concluídas`; `unlocked = menor etapa || todas anteriores completas`. Retorna também `etapa1Completed` e `mirrorUnlocked` (alias). Tema sem atividades na Etapa 1 ⇒ `etapa1Completed = false` (mirror travado, default seguro).
2. **Refactor de `maybeCreditStageCompletion`** para usar o helper **escopado por tema** (adicionar `theme_id` ao select do módulo). Mantém `STAGE_COMPLETION_POINTS` e o `dedupeKey`. Flag no PR: corrige o bug cross-theme dos pontos.
3. **Novo endpoint** em `apps/api/src/routes/painel.js`:
   `GET /api/v1/painel/learners/:learnerProfileId/stage-status?themeId=<uuid>` — wrapper fino do helper, incluindo `completedActivityIds` por etapa.
4. **Flags no batch da lista de alfabetizandos** (`apps/api/src/routes/cadastros.js`, `GET /cadastros/alfabetizandos`, ~571): adicionar `etapa1Completed`, `mirrorUnlocked`, `currentStageNumber` no map por aluno (os dados já são carregados — sem N+1). Manter a string `etapa` por compatibilidade, derivada de `currentStageNumber` (hoje ela significa "etapa tocada", não desbloqueada).
5. **Sinal de conclusão** nos writes de progresso (`upsertActivityProgressFromMobile` ~5369 e `updateActivityProgressStatus` ~5513): quando `concluido` fecha a etapa — `registerSyncEvent("stage.completed")`, `emitOperationalRealtimeEvent` (sala dashboard) e notificação ao tutor, deduplicados pelo score-event existente. Push realtime ao app do educador fica como melhoria opcional (o namespace `/realtime` do painel não tem salas de educador hoje); o mobile usa o refetch-on-focus já existente.

**Verificação:** subir API local; `curl .../stage-status` antes/depois de `POST /painel/progress` completar todas as atividades da Etapa 1 → `completed` vira `true`, Etapa 2 `unlocked`, 1 linha em `educator_score_events` (dedupe em repetição), temas não relacionados intactos. Deploy: skill `deploy-painel`.

## Fase 2 — Painel web: autoria + visibilidade

Repo: `Projeto-Letras-Web/apps/web`.

1. **Wizard `ConteudoCriarPage.tsx`**: tornar a seleção de Etapa **obrigatória** quando `moduleMode === "new"` (bloquear submit até `selectedStageId` definido); eliminar o fallback `2` da linha 1831 e do restore de rascunho (~1911). O CRUD de etapas já existe (`painel.js:744-800`) — só conferir que a UI permite criar a Etapa 1 com `intro_video_id` por tema.
2. **`AlfabetizandoDetalhe.tsx`**: badge "Etapa 1 concluída / em andamento" alimentado pelo novo endpoint (o `ProgressByStage` já existe).

**Verificação:** criar tema novo no painel → Etapas 1 e 2 → wizard recusa módulo sem etapa → publicar atividade da Etapa 1 → conferir em `curl /painel/conteudo?scope=cms&published=true`.

## Fase 3 — Mobile educador: runner da Etapa 1 + espelhamento com gate

Repo: `letras/apps/mobile-app`. Depende só da Fase 1.

1. **Runner da Etapa 1 (novo)** — reutilizar o pipeline de aula do learner em vez de duplicar renderer:
   - Prop opcional `overrideLearnerProfileId` no `LearnerSessionProvider`/`useLearnerHomeViewModel` (pula bootstrap de sessão, realtime e lock-polling; `recordProgress` posta `/painel/progress` com o UUID do **alfabetizando** — guard `learner-local-profile-*` existente segue valendo).
   - Novas rotas em `EducatorRootStackParamList` (`types/navigation.ts`) + `EducatorNavigator.tsx`: `EducatorEtapa1Lessons { learnerId, learnerName, educatorId, themeId }` (lista de aulas da Etapa 1 do tema do aluno, com dots de conclusão e desbloqueio sequencial igual ao `isLessonUnlocked` do learner) e wrappers finos reexportando `LearnerLessonIntro/Screen/Activity/ConclusionView` sob o provider com override (a conclusion já chama `recordProgress COMPLETED`).
   - Ao fechar a Etapa 1, interstitial "Espelhamento e Etapa 2 liberados para {nome}" → volta ao `EducatorHome`.
   - **Religar o andaime:** `EducatorEtapaOrientacoesView.handleAvancar()` (linha 134) passa a navegar para `EducatorEtapa1Lessons` em vez de `EducatorLearningMode`.
2. **Remover hardcode** em `LearnerThemeConfirmView.tsx:43`: buscar `GET /painel/conteudo/etapas?themeId=` e usar a menor `stage_number` ativa (erro amigável se o tema não tem etapas).
3. **Gate do espelhamento em `EducatorHomeView.tsx`**:
   - `LearnerItem` ganha `etapa1Completed`/`mirrorUnlocked` (Fase 1.4).
   - `handleOpenLearner` (~322): `mirrorUnlocked` → `EducatorLiveMirror`; senão → `EducatorEtapa1Lessons`. Linha do aluno mostra chip explícito ("Etapa 1 concluída" verde / cadeado âmbar "espelhamento bloqueado") — **não esconder silenciosamente**.
   - Linhas de alerta de ajuda (~407) e sessão travada (~431): se travado, rotear para `EducatorLearningMode` (contato) com aviso.
   - Defesa em profundidade em `useEducatorLiveMirrorViewModel.ts`: checar `stage-status` no `connect()`; se travado, `EducatorLiveMirrorView` renderiza painel de bloqueio com CTA "Ir para Etapa 1". Fail-open em erro de rede (gate primário é o da home).
   - Status sempre buscado fresco (o cache de 60s em `learnerFlowData.ts` cobre só conteúdo); refetch-on-focus já existe (~232).

**Verificação:** Expo + API local: educador → novo aluno → tema → orientações (copy/vídeo do painel) → concluir todas as aulas da Etapa 1 → interstitial → chip verde → tap abre espelhamento; segundo aluno sem Etapa 1 mostra cadeado e roteia para as aulas; conferir `activity_progress` com `student_id` do aluno. Deploy: `deploy-mobile`.

## Fase 4 — Mobile learner: esconder Etapa 1, liberar Etapa 2

Repo: `letras/apps/mobile-app`. Sai no mesmo release da Fase 3.

1. **`learnerFlowMapper.ts`**: remover `unit.stage_number ?? 2` (linhas ~1131 e ~1337) — resolver etapa via `stage_id → payload.stages`, fallback legado `stage_number`; sem resolução ⇒ `stageNumber: null` e **excluir a aula do fluxo learner** (warn em dev). Ajustar tipo de `LearnerFlowLesson.stageNumber`.
2. **`learnerFlowData.ts`**: buscar `stage-status` junto com as completions e expor `unlockedStages`/`etapa1Completed`; fallback para o rollup local existente quando o endpoint falhar/404 (offline ou API antiga — torna a ordem de deploy segura).
3. **`LearnerHomeView.tsx`**: filtrar `stageNumber >= 2 && unlocked`; novo empty state "Suas aulas serão liberadas quando o alfabetizador concluir a Etapa 1 com você." (distinto do "Nenhum conteúdo publicado"). Perfis `learner-local-profile-*` caem nesse estado de espera — correto.

**Verificação:** learner com Etapa 1 incompleta → estado de espera, zero aulas da Etapa 1 listadas; concluir Etapa 1 pelo educador (ou via curl) → focus/refresh → módulos da Etapa 2 aparecem.

## Fase 5 — Seeds e limpeza (sem apagar migrations)

- **Não deletar/editar** `20260621_etapa1_modulos.sql` nem o bloco de seed de `20260618_media_library_stages_hints.sql` (já aplicados em prod). Em vez disso: nota em `docs/product/` declarando os seeds congelados — todo currículo novo é autorado pelo painel, por tema.
- A premissa de tema único fica neutralizada daqui pra frente: `learning_stages` é escopada por tema (`unique(theme_id, stage_number)`), o wizard exige tema+etapa explícitos (Fase 2) e o gate é por tema (Fase 1).
- Conferência final de hardcodes da feature: `stageNumber: 1` (ThemeConfirm), `?? 2` (mapper ×2), default `2` do wizard, e `normalizeStageLabel` default "Etapa 1" em `EducatorHomeView.tsx:70-73` agora derivado de `currentStageNumber` real.

## Sequência de deploy

1. Fase 1 + 2 → `deploy-painel` (contrato aditivo; mobile em prod segue funcionando).
2. Fases 3 + 4 → um release `deploy-mobile` (tolera 404 no `stage-status` com fallback local).
3. Fase 5 → docs, sem dependência de deploy.

## Edge cases contemplados

- Merge dual-schema de progresso sempre via `getActivityProgress()`.
- Perfis offline `learner-local-profile-*`: nunca postam; learner vê estado de espera; `recordProgress` no-op (guard existente em `useLearnerHomeViewModel.ts:205`).
- Tema sem atividades na Etapa 1 → mirror travado + orientação "configure conteúdo no painel".
- Conclusões repetidas → dedupe pelo `dedupeKey` `stage:{tutor}:{student}:{stage}`.
- Skip por FK (path 23503 do upsert) → runner do educador exibe aviso não-bloqueante se o POST voltar 202.

## Fora de escopo (registrado)

- Espelhamento no painel web (só existe em ata como futuro; o endpoint `stage-status` já nasce reutilizável para esse gate).
- Migração de copy hardcoded (FIGMA_COPY, mirrorGuidance), tabela de pontos e **segredos commitados** — atenção: o `.env` do `Projeto-Letras-Web` tem a service-role key do Supabase versionada; recomendo rotacionar em tarefa separada.
