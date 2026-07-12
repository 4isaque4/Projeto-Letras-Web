# Gerenciamento de Atividades e Vínculos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar localmente uma fonte de verdade por vínculo para liberação de aulas, tentativas, primeira pontuação, conclusão real de etapa e manutenção de vínculo, integrada entre painel/API e mobile.

**Architecture:** O web repo concentra migration, domínio, endpoints e painel; o mobile consome o catálogo explícito sem inferir permissões. A conclusão de aula será idempotente e separará acesso, progresso, tentativas e pontuação. A VPS e o Supabase de produção ficam fora desta execução.

**Tech Stack:** PostgreSQL/Supabase, Express/Node test runner, React 18/Vite/Tailwind, Expo/React Native/TypeScript, Socket.IO.

## Global Constraints

- Não executar deploy, upload, scripts Paramiko, push ou migration no Supabase de produção.
- Trabalhar nas branches `feat/web/gerenciamento-atividades-vinculos` e `feat/mobile/progresso-liberacao-aulas`.
- Tema é universo de interesse; etapa pertence ao módulo; aula é exercício individual.
- A primeira conclusão concede pontos; repetições não concedem pontos.
- Aula concluída permanece visível e pode ser refeita.
- Concluir aula não significa concluir etapa.
- Não usar emojis; somente ícones e tokens visuais existentes.
- Registrar `sync_events` em escritas relevantes.
- Preservar `apps/web/.env.production`; testes locais usam configuração local.
- Não incluir `dist`, `dist-fresh-build`, `dist-deploy`, screenshots ou outros artefatos gerados nos commits.

---

## File Structure

### Web/API repo

- `infra/supabase/migrations/20260712_learner_activity_access_attempts_score.sql`: tabelas, índices, constraints, RLS e funções transacionais.
- `apps/api/src/domain/learnerActivities.js`: regras puras de sequência, primeira conclusão e conclusão de etapa.
- `apps/api/src/domain/learnerActivities.test.js`: testes unitários do domínio.
- `apps/api/src/services/learnerActivityService.js`: persistência e transação de catálogo/conclusão/liberação.
- `apps/api/src/services/learnerActivityService.contract.test.js`: testes de contrato com Supabase fake.
- `apps/api/src/routes/learnerActivities.js`: endpoints do painel e mobile.
- `apps/api/src/routes/learnerActivities.test.js`: autenticação, validação e shapes HTTP.
- `apps/api/src/routes/cadastros.js`: criação/troca/remoção de vínculo e cadastro atômico.
- `apps/api/src/routes/cadastros.vinculos.test.js`: regressões de vínculo único e histórico.
- `apps/api/src/server.js`: montagem do novo router.
- `apps/web/src/app/pages/admin/AtividadesAlfabetizando.tsx`: tela de gerenciamento.
- `apps/web/src/app/pages/admin/activityAccessPresentation.ts`: apresentação testável dos estados.
- `apps/web/src/app/pages/admin/activityAccessPresentation.test.ts`: testes Vitest dos estados/copy.
- `apps/web/src/app/pages/admin/Vinculos.tsx`: manutenção do vínculo.
- `apps/web/src/app/pages/admin/Alfabetizandos.tsx`: seleção de alfabetizador no cadastro.
- `apps/web/src/app/routes.ts`: rota da nova tela.
- `apps/web/src/app/components/Sidebar.tsx`: navegação com ícone.
- `apps/web/package.json`: runner Vitest para regras de apresentação.

### Mobile repo

- `apps/mobile-app/src/views/learner/learnerAccessPolicy.ts`: regras puras de visibilidade, ação e conclusão.
- `apps/mobile-app/src/views/learner/learnerAccessPolicy.test.ts`: testes Vitest.
- `apps/mobile-app/src/views/learner/learnerFlowMapper.ts`: mapear contrato de acesso/progresso.
- `apps/mobile-app/src/views/learner/learnerFlowData.ts`: buscar e atualizar catálogo canônico.
- `apps/mobile-app/src/views/learner/LearnerHomeView.tsx`: exibir bloqueada/disponível/concluída e Refazer.
- `apps/mobile-app/src/views/learner/LearnerLessonConclusionView.tsx`: obedecer `stageCompleted` da API.
- `apps/mobile-app/src/views/learner/LearnerStageConclusionView.tsx`: usar pontos canônicos.
- `apps/mobile-app/src/views/educator/EducatorLiveMirrorView.tsx`: alinhar conclusão de aula no espelho.
- `apps/mobile-app/src/views/learner/learnerSessionContext.tsx`: enviar chave idempotente e consumir resposta.
- `apps/mobile-app/src/types/navigation.ts`: params de conclusão explícitos.
- `apps/mobile-app/package.json`: runner Vitest.

---

### Task 1: Modelo de domínio e migration local

**Files:**
- Create: `apps/api/src/domain/learnerActivities.js`
- Create: `apps/api/src/domain/learnerActivities.test.js`
- Create: `infra/supabase/migrations/20260712_learner_activity_access_attempts_score.sql`

**Interfaces:**
- Produces: `getNextAssignedActivity(assignments, activityId)`, `isAssignedStageComplete(assignments, completedIds, stageNumber)`, `shouldAwardFirstCompletion(existingCredit)`.

- [ ] **Step 1: Write failing domain tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { getNextAssignedActivity, isAssignedStageComplete, shouldAwardFirstCompletion } from "./learnerActivities.js";

test("returns the next assigned activity by sequence", () => {
  assert.equal(getNextAssignedActivity([{ activityId: "a", order: 1 }, { activityId: "b", order: 2 }], "a")?.activityId, "b");
});
test("stage completes only when every required assigned activity is complete", () => {
  const rows = [{ activityId: "a", stageNumber: 1, required: true }, { activityId: "b", stageNumber: 1, required: true }];
  assert.equal(isAssignedStageComplete(rows, new Set(["a"]), 1), false);
  assert.equal(isAssignedStageComplete(rows, new Set(["a", "b"]), 1), true);
});
test("awards only when first-completion credit is absent", () => {
  assert.equal(shouldAwardFirstCompletion(null), true);
  assert.equal(shouldAwardFirstCompletion({ id: "credit" }), false);
});
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @letras/api test`

Expected: FAIL because `learnerActivities.js` does not exist.

- [ ] **Step 3: Implement minimal pure functions**

Implement stable sorting, required-only stage calculation, empty-stage=false and boolean first-credit decision.

- [ ] **Step 4: Run GREEN**

Run: `pnpm --filter @letras/api test`

Expected: all Node tests pass.

- [ ] **Step 5: Add migration**

Create tables `learner_activity_access`, `activity_attempts`, `learner_score_events`; add unique keys, indexes, update triggers, RLS policies and a transaction/RPC for first completion. Include idempotency key unique per student/activity/request and unique first-completion credit.

- [ ] **Step 6: Validate SQL statically**

Run: `rg -n "learner_activity_access|activity_attempts|learner_score_events|sync_events|unique|policy" infra/supabase/migrations/20260712_learner_activity_access_attempts_score.sql`

Expected: every required object and constraint appears.

- [ ] **Step 7: Commit**

```powershell
git add apps/api/src/domain/learnerActivities.js apps/api/src/domain/learnerActivities.test.js infra/supabase/migrations/20260712_learner_activity_access_attempts_score.sql
git commit -m "feat(api): modelar acesso tentativas e pontuacao por aula"
```

### Task 2: Serviço de catálogo e conclusão idempotente

**Files:**
- Create: `apps/api/src/services/learnerActivityService.js`
- Create: `apps/api/src/services/learnerActivityService.contract.test.js`
- Reuse: `apps/api/src/services/letrasDataService.contract.test.js` fake patterns

**Interfaces:**
- Produces: `getLearnerActivityCatalog({ actor, studentId })`, `completeLearnerActivity({ actor, studentId, activityId, idempotencyKey, attempt })`, `setLearnerActivityAccess({ actor, linkId, changes })`.

- [ ] **Step 1: Write failing contract tests**

Cover isolation, completed-visible catalog, next unlock, repeated completion with no second credit, stage false/true and `sync_events`.

- [ ] **Step 2: Run RED**

Run: `node --test apps/api/src/services/learnerActivityService.contract.test.js`

Expected: FAIL because service exports are missing.

- [ ] **Step 3: Implement catalog read**

Join access, activities, modules, themes, progress, attempt aggregates and score credits. Return `{ themes: [{ stages: [{ modules: [{ lessons }] }] }] }` with explicit `accessStatus`, `progressStatus`, `canReplay`, `attemptCount`, `pointsAwarded`.

- [ ] **Step 4: Implement idempotent completion**

Call the local transaction/RPC when available; provide a tested service fallback for the fake. Return:

```js
{
  lessonCompleted: true,
  stageCompleted: false,
  pointsAwardedNow: 0,
  totalPoints: 200,
  nextActivityId: "uuid-or-null"
}
```

- [ ] **Step 5: Run GREEN**

Run: `node --test apps/api/src/services/learnerActivityService.contract.test.js`

Expected: all service contract tests pass.

- [ ] **Step 6: Run full API tests**

Run: `pnpm --filter @letras/api test`

Expected: zero failures.

- [ ] **Step 7: Commit**

```powershell
git add apps/api/src/services/learnerActivityService.js apps/api/src/services/learnerActivityService.contract.test.js
git commit -m "feat(api): concluir aulas com liberacao e pontos idempotentes"
```

### Task 3: Endpoints autenticados de atividades

**Files:**
- Create: `apps/api/src/routes/learnerActivities.js`
- Create: `apps/api/src/routes/learnerActivities.test.js`
- Modify: `apps/api/src/server.js`

**Interfaces:**
- `GET /api/v1/learner-activities/catalog?studentId=`
- `POST /api/v1/learner-activities/:activityId/complete`
- `GET /api/v1/painel/learner-activities?linkId=`
- `PATCH /api/v1/painel/learner-activities/access`

- [ ] **Step 1: Write failing route tests**

Assert 401/403 without actor, 400 for missing IDs, response shape, batch access validation and idempotency key forwarding.

- [ ] **Step 2: Run RED**

Run: `node --test apps/api/src/routes/learnerActivities.test.js`

Expected: FAIL because router is missing.

- [ ] **Step 3: Implement routes and authorization**

Admin may manage any link; tutor only its active link; learner only its own catalog/completion. Reject cross-student access.

- [ ] **Step 4: Run GREEN and regression suite**

Run: `pnpm --filter @letras/api test`

Expected: zero failures.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/routes/learnerActivities.js apps/api/src/routes/learnerActivities.test.js apps/api/src/server.js
git commit -m "feat(api): expor gerenciamento de atividades por vinculo"
```

### Task 4: Cadastro e manutenção robusta de vínculo

**Files:**
- Create: `apps/api/src/routes/cadastros.vinculos.test.js`
- Modify: `apps/api/src/routes/cadastros.js`
- Modify: `apps/api/src/services/letrasDataService.js`

**Interfaces:**
- Extend learner create body with `educatorId`.
- Add `PUT /api/v1/cadastros/alfabetizandos/:studentId/vinculo`.
- Add `DELETE /api/v1/cadastros/alfabetizandos/:studentId/vinculo`.

- [ ] **Step 1: Write failing vínculo tests**

Test create+link, default tutor actor, swap closes previous, remove keeps profile/history and two-active rejection.

- [ ] **Step 2: Run RED**

Run: `node --test apps/api/src/routes/cadastros.vinculos.test.js`

Expected: FAIL on missing swap/remove behavior.

- [ ] **Step 3: Implement canonical vínculo mutation**

Centralize pair resolution; update previous confirmed link to ended/revoked, persist reason/timestamps, create/activate new link and write `sync_events`.

- [ ] **Step 4: Run GREEN and full API suite**

Run: `pnpm --filter @letras/api test`

Expected: zero failures.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/routes/cadastros.js apps/api/src/routes/cadastros.vinculos.test.js apps/api/src/services/letrasDataService.js
git commit -m "feat(api): criar trocar e remover vinculos do alfabetizando"
```

### Task 5: Painel de gerenciamento de atividades

**Files:**
- Create: `apps/web/src/app/pages/admin/activityAccessPresentation.ts`
- Create: `apps/web/src/app/pages/admin/activityAccessPresentation.test.ts`
- Create: `apps/web/src/app/pages/admin/AtividadesAlfabetizando.tsx`
- Modify: `apps/web/src/app/routes.ts`
- Modify: `apps/web/src/app/components/Sidebar.tsx`
- Modify: `apps/web/package.json`

**Interfaces:**
- Produces `getActivityStatePresentation({ accessStatus, progressStatus })` returning icon key, label, action label and semantic tone.

- [ ] **Step 1: Add Vitest script and failing presentation tests**

```ts
expect(getActivityStatePresentation({ accessStatus: "available", progressStatus: "completed" })).toMatchObject({ label: "Concluída", actionLabel: "Bloquear" });
expect(getActivityStatePresentation({ accessStatus: "locked", progressStatus: "completed" })).toMatchObject({ label: "Concluída", actionLabel: "Liberar" });
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @letras/web test -- --run`

Expected: FAIL because presentation module is missing.

- [ ] **Step 3: Implement presentation rules and page**

Build selector, summary, stage/module groups, lesson rows, individual/batch controls, confirmation dialog and loading/empty/error feedback using existing panel components and Lucide icons. No emoji and no color-only state.

- [ ] **Step 4: Run GREEN and build**

Run: `pnpm --filter @letras/web test -- --run`

Run: `pnpm --filter @letras/web build`

Expected: tests and Vite build exit 0.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/app/pages/admin/activityAccessPresentation.ts apps/web/src/app/pages/admin/activityAccessPresentation.test.ts apps/web/src/app/pages/admin/AtividadesAlfabetizando.tsx apps/web/src/app/routes.ts apps/web/src/app/components/Sidebar.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): gerenciar atividades do alfabetizando"
```

### Task 6: UI de cadastro, troca e remoção de vínculo

**Files:**
- Modify: `apps/web/src/app/pages/admin/Vinculos.tsx`
- Modify: `apps/web/src/app/pages/admin/Alfabetizandos.tsx`
- Modify: `apps/web/src/app/pages/admin/AlfabetizandoDetalhe.tsx`
- Test: `apps/web/src/app/pages/admin/activityAccessPresentation.test.ts`

- [ ] **Step 1: Extend failing UI-state tests**

Cover eligible tutor labels, current-link warning and disabled conflicting actions.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @letras/web test -- --run`

Expected: new assertions fail.

- [ ] **Step 3: Implement forms and dialogs**

Add educator selection to creation, current vínculo card, swap dialog and remove confirmation stating that history remains preserved.

- [ ] **Step 4: Run GREEN, quality and build**

Run: `pnpm quality`

Run: `pnpm --filter @letras/web test -- --run`

Run: `pnpm --filter @letras/web build`

Expected: all exit 0.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/app/pages/admin/Vinculos.tsx apps/web/src/app/pages/admin/Alfabetizandos.tsx apps/web/src/app/pages/admin/AlfabetizandoDetalhe.tsx apps/web/src/app/pages/admin/activityAccessPresentation.test.ts
git commit -m "feat(web): manter vinculo no cadastro do alfabetizando"
```

### Task 7: Política de acesso explícita no mobile

**Files:**
- Create: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/learner/learnerAccessPolicy.ts`
- Create: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/learner/learnerAccessPolicy.test.ts`
- Modify: `C:/Projetos/letras-mobile-ref/apps/mobile-app/package.json`
- Modify: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/learner/learnerFlowMapper.ts`
- Modify: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/learner/learnerFlowData.ts`

**Interfaces:**
- Produces: `canOpenLesson(lesson)`, `getLessonActionLabel(lesson)`, `shouldShowStageConclusion(response)`.

- [ ] **Step 1: Add Vitest and failing policy tests**

```ts
expect(canOpenLesson({ accessStatus: "available", progressStatus: "completed" })).toBe(true);
expect(getLessonActionLabel({ accessStatus: "available", progressStatus: "completed" })).toBe("Refazer");
expect(shouldShowStageConclusion({ lessonCompleted: true, stageCompleted: false })).toBe(false);
```

- [ ] **Step 2: Run RED**

Run from mobile repo: `pnpm --filter mobile-app test -- --run`

Expected: FAIL because policy module is absent.

- [ ] **Step 3: Implement policy and catalog mapping**

Preserve completed lessons, map explicit access/progress fields and remove positional inference as source of truth.

- [ ] **Step 4: Run GREEN and typecheck**

Run: `pnpm --filter mobile-app test -- --run`

Run: `pnpm --filter mobile-app typecheck`

Expected: both exit 0.

- [ ] **Step 5: Commit in mobile repo**

```powershell
git add apps/mobile-app/src/views/learner/learnerAccessPolicy.ts apps/mobile-app/src/views/learner/learnerAccessPolicy.test.ts apps/mobile-app/src/views/learner/learnerFlowMapper.ts apps/mobile-app/src/views/learner/learnerFlowData.ts apps/mobile-app/package.json pnpm-lock.yaml
git commit -m "feat(mobile): consumir acesso explicito das aulas"
```

### Task 8: Lista, repetição e conclusão correta no mobile

**Files:**
- Modify: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/learner/LearnerHomeView.tsx`
- Modify: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/learner/LearnerLessonConclusionView.tsx`
- Modify: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/learner/LearnerStageConclusionView.tsx`
- Modify: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/learner/learnerSessionContext.tsx`
- Modify: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/types/navigation.ts`
- Test: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/learner/learnerAccessPolicy.test.ts`

- [ ] **Step 1: Add failing completion/replay tests**

Test concluded lesson remains openable as `Refazer`, repeated response with `pointsAwardedNow=0`, and navigation to stage conclusion only with `stageCompleted=true`.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter mobile-app test -- --run`

Expected: new assertions fail.

- [ ] **Step 3: Implement UI and idempotent request**

Generate one idempotency key per attempt, consume completion response, refresh catalog, keep lesson visible and route correctly. Use existing learner colors and vector icons; no emojis.

- [ ] **Step 4: Run GREEN, typecheck and web export**

Run: `pnpm --filter mobile-app test -- --run`

Run: `pnpm --filter mobile-app typecheck`

Run: `pnpm --filter mobile-app build:web`

Expected: all exit 0.

- [ ] **Step 5: Commit**

```powershell
git add apps/mobile-app/src/views/learner/LearnerHomeView.tsx apps/mobile-app/src/views/learner/LearnerLessonConclusionView.tsx apps/mobile-app/src/views/learner/LearnerStageConclusionView.tsx apps/mobile-app/src/views/learner/learnerSessionContext.tsx apps/mobile-app/src/types/navigation.ts apps/mobile-app/src/views/learner/learnerAccessPolicy.test.ts
git commit -m "fix(mobile): separar conclusao de aula e etapa"
```

### Task 9: Espelho do alfabetizador alinhado à conclusão da aula

**Files:**
- Modify: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/educator/EducatorLiveMirrorView.tsx`
- Create: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/educator/mirrorCompletionPresentation.ts`
- Create: `C:/Projetos/letras-mobile-ref/apps/mobile-app/src/views/educator/mirrorCompletionPresentation.test.ts`

- [ ] **Step 1: Write failing presentation test**

Assert lesson completion copy says “Aula concluída”, includes the learner name/progress context and never claims stage completion without `stageCompleted=true`.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter mobile-app test -- --run`

Expected: module missing.

- [ ] **Step 3: Implement aligned presentation**

Use the learner completion snapshot and existing mobile theme. Keep the educator guidance block separate and use iconography only.

- [ ] **Step 4: Run GREEN and typecheck**

Run: `pnpm --filter mobile-app test -- --run`

Run: `pnpm --filter mobile-app typecheck`

Expected: both exit 0.

- [ ] **Step 5: Commit**

```powershell
git add apps/mobile-app/src/views/educator/EducatorLiveMirrorView.tsx apps/mobile-app/src/views/educator/mirrorCompletionPresentation.ts apps/mobile-app/src/views/educator/mirrorCompletionPresentation.test.ts
git commit -m "fix(mobile): alinhar espelho da conclusao de aula"
```

### Task 10: Compatibilidade, migração local e verificação integrada

**Files:**
- Modify if required: `apps/api/src/services/letrasDataService.js`
- Create: `tools/scripts/seed-local-learner-activity-access.mjs`
- Create: `docs/operations/teste-local-atividades-vinculos.md`

- [ ] **Step 1: Add failing compatibility fixture**

Extend API contract tests with legacy `Completion`/`activity_progress` rows and no access rows; expect a safe derived local catalog with completed lessons available.

- [ ] **Step 2: Run RED then implement compatibility adapter**

Run: `pnpm --filter @letras/api test`

Expected before adapter: compatibility test fails; after adapter: passes.

- [ ] **Step 3: Create local-only seed script and manual test guide**

The script must require an explicit local database URL/flag and refuse hosts containing production identifiers. The guide covers the seven scenarios from the design.

- [ ] **Step 4: Run full web verification**

Run: `pnpm check`

Expected: quality, API tests and web build exit 0.

- [ ] **Step 5: Run full mobile verification**

Run from `C:\Projetos\letras-mobile-ref`: `pnpm check:fast`

Run: `pnpm --filter mobile-app build:web`

Expected: quality, typecheck, lint and export exit 0.

- [ ] **Step 6: Inspect both diffs and generated artifacts**

Run: `git status --short --branch` in both repos and `git diff --check`.

Expected: only intended source/docs/migration files; generated export directories remain unstaged.

- [ ] **Step 7: Commit compatibility/docs**

```powershell
git add apps/api/src/services/letrasDataService.js apps/api/src/services/learnerActivityService.contract.test.js tools/scripts/seed-local-learner-activity-access.mjs docs/operations/teste-local-atividades-vinculos.md
git commit -m "test(repo): validar fluxo local de atividades e vinculos"
```

### Task 11: Iniciar os três serviços para validação do usuário

**Files:**
- No source changes expected.

- [ ] **Step 1: Start panel and API locally**

Run from web repo in a hidden background process: `pnpm dev`.

Verify: `http://localhost:5173/` and `http://localhost:8082/health` return successfully.

- [ ] **Step 2: Start Expo web against local API**

Run from mobile repo with `EXPO_PUBLIC_API_URL=http://localhost:8082/api/v1`: `pnpm --filter mobile-app web`.

Verify the actual Expo URL printed by the process, normally `http://localhost:19007` or the next free port.

- [ ] **Step 3: Browser smoke test**

Validate panel navigation, activity management, vínculo controls, learner list, replay and lesson/stage conclusion with a mobile viewport. Capture failures in the local test guide, not as production deploy notes.

- [ ] **Step 4: Report local access points**

Provide exact URLs, process status, test accounts/data requirements and any local database blocker. Explicitly state that nothing was deployed or pushed.

---

## Self-review result

- Spec coverage: all functional requirements map to Tasks 1-11.
- Type consistency: API response names are consistently `lessonCompleted`, `stageCompleted`, `pointsAwardedNow`, `totalPoints`, `nextActivityId`.
- Production safety: deployment and production migration are explicitly prohibited; local seed refuses production hosts.
- Execution mode: inline in this session because the user did not request subagents.
