# UI de atividades, blocos e persistência mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar gestão visual e reordenação livre de aulas, edição de vínculo em modal, editor de blocos com GIF e galeria de envios, além de retomada confiável e cabeçalho fiel ao Figma no mobile.

**Architecture:** O painel usa componentes focados para apresentação, ordenação e modais, enquanto a API concentra movimentação atômica e auditoria. O mobile persiste checkpoint e outbox por alfabetizando, valida o estado canônico na retomada e compartilha um cabeçalho único entre as telas de execução.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Lucide React, Express, Supabase/Postgres, Expo/React Native, AsyncStorage, Node test runner.

## Global Constraints

- Manter fidelidade aos SVGs/PDFs/Figma aprovados; não redesenhar telas-base.
- Cabeçalho: `Alfabetizando <nome>` e `Tela N de NN da Etapa X` conforme `Etapa 1 - Tela de Aula (Modelo letra).svg`.
- Não usar emojis; usar ícones aprovados/Lucide.
- Não exibir JSON, URLs, schema, payload ou termos técnicos ao usuário.
- Preservar conclusão, tentativas, pontos e histórico durante reordenação e troca de vínculo.
- Escritas relevantes registram `sync_events`.
- Implementar por TDD e executar builds web e Expo antes dos commits finais.

---

### Task 1: Domínio e API de reordenação livre

**Files:**
- Create: `apps/api/src/domain/activityOrdering.js`
- Test: `apps/api/src/domain/activityOrdering.test.js`
- Modify: `apps/api/src/services/learnerActivityService.js`
- Modify: `apps/api/src/routes/learnerActivities.js`
- Modify: `infra/supabase/migrations/2026071203_activity_assignment_reordering.sql`

**Interfaces:**
- Produces: `normalizeActivityOrder(assignments, movement)` e `POST /learner-activities/reorder`.
- Request: `{ linkId, activityId, targetThemeId, targetModuleId, targetStageNumber, targetIndex, confirmedCrossGroup }`.
- Response: `{ updated, assignments }`.

- [ ] Escrever testes que comprovem normalização sem posições duplicadas, movimento entre agrupamentos e exigência de confirmação.
- [ ] Executar `node --test apps/api/src/domain/activityOrdering.test.js` e confirmar falha pela implementação ausente.
- [ ] Implementar domínio puro e repositório transacional/RPC que atualiza destino e ordem sem tocar em progresso ou pontuação.
- [ ] Registrar `content.assignment_reordered` em `sync_events` com origem e destino.
- [ ] Executar testes de domínio e contratos de API até passarem.
- [ ] Commitar como `feat(api): permitir reordenacao livre das aulas`.

### Task 2: Nova gestão visual de atividades

**Files:**
- Create: `apps/web/src/app/pages/admin/activityManagementPresentation.ts`
- Test: `apps/web/src/app/pages/admin/activityManagementPresentation.test.ts`
- Create: `apps/web/src/app/pages/admin/ActivityLessonCard.tsx`
- Create: `apps/web/src/app/pages/admin/ActivityReorderConfirmDialog.tsx`
- Modify: `apps/web/src/app/pages/admin/AtividadesAlfabetizando.tsx`

**Interfaces:**
- Consumes: catálogo atual e `POST /learner-activities/reorder`.
- Produces: cards sem payload técnico, seções recolhíveis e modo de reorganização híbrido.

- [ ] Escrever testes para descrição amigável, contagem de telas e detecção de movimento entre agrupamentos.
- [ ] Executar Vitest e confirmar falhas esperadas.
- [ ] Extrair apresentação do payload para dados seguros e legíveis.
- [ ] Implementar cards, estados, ações liberar/bloquear e controles arrastar/subir/descer.
- [ ] Implementar confirmação obrigatória para mudança de tema, etapa ou módulo e rollback otimista em erro.
- [ ] Validar responsividade e ausência de JSON/URLs na tela.
- [ ] Commitar como `feat(web): redesenhar gestao e ordem das atividades`.

### Task 3: Modal de vínculo e tabela responsiva

**Files:**
- Create: `apps/web/src/app/pages/admin/LearnerLinkDialog.tsx`
- Modify: `apps/web/src/app/pages/admin/Alfabetizandos.tsx`

**Interfaces:**
- Consumes: endpoints existentes de trocar/remover vínculo.
- Produces: modal controlado por `student`, `tutors`, `onSaved` e `onClose`.

- [ ] Escrever teste de apresentação/estado garantindo motivo obrigatório e preservação do vínculo atual até confirmação.
- [ ] Remover formulário de vínculo das células da tabela.
- [ ] Implementar ação compacta e modal com vínculo atual, novo alfabetizador, motivo e confirmação destrutiva separada.
- [ ] Ajustar colunas e ações para larguras menores.
- [ ] Commitar como `fix(web): reorganizar edicao de vinculos`.

### Task 4: Editor de blocos selecionável e GIF

**Files:**
- Modify: `apps/web/src/app/pages/admin/conteudo/LessonBlockEditor.tsx`
- Modify: `apps/web/src/app/pages/admin/conteudo/ConteudoNovaAulaPage.tsx`
- Modify: `apps/mobile-app/src/views/learner/learnerFlowMapper.ts`
- Modify: `apps/mobile-app/src/views/learner/LearnerLessonScreenView.tsx`
- Test: `apps/web/src/app/pages/admin/conteudo/LessonBlockEditor.test.ts`

**Interfaces:**
- Extends `LessonBlock` with `{ type: "gif", url: string, caption: string }`.
- Serialização permanece `letras-stage2-v2` e leitores antigos ignoram tipo desconhecido.

- [ ] Escrever testes de serialização/deserialização, seleção, troca de tipo e ordenação.
- [ ] Adicionar GIF ao tipo, menu agrupado, upload/biblioteca e prévia animada.
- [ ] Implementar bloco selecionado expandido e demais blocos resumidos/recolhíveis.
- [ ] Implementar troca de tipo com confirmação quando houver perda de campos.
- [ ] Renderizar GIF no mobile com fallback acessível.
- [ ] Exibir contagem de telas no editor.
- [ ] Commitar web/API como `feat(web): melhorar editor de blocos e adicionar gifs` e mobile como `feat(mobile): renderizar blocos gif`.

### Task 5: Galeria de imagens recebidas

**Files:**
- Create: `apps/web/src/app/pages/admin/ActivitySubmissionsGallery.tsx`
- Modify: `apps/web/src/app/pages/admin/AlfabetizandoDetalhe.tsx`
- Modify: `apps/api/src/routes/painel.js`
- Modify: `apps/api/src/services/letrasDataService.js`

**Interfaces:**
- Consumes: `activity_photos` e endpoints atuais de listagem/aprovação.
- Produces: itens com `publicUrl`, aluno, aula, data, status e aprovação.

- [ ] Escrever contrato de API que inclui URL, nomes relacionados e filtros sem quebrar resposta existente.
- [ ] Implementar consulta enriquecida e autorização pelo vínculo/admin.
- [ ] Substituir tabela textual por galeria com miniatura, ampliação e aprovação.
- [ ] Adicionar acesso claro à área de envios no detalhe/acompanhamento.
- [ ] Commitar como `feat(web): exibir galeria de envios das atividades`.

### Task 6: Checkpoint e outbox mobile

**Files:**
- Create: `apps/mobile-app/src/infra/storage/learner-progress-checkpoint.ts`
- Create: `apps/mobile-app/src/infra/storage/learner-sync-outbox.ts`
- Test: `apps/mobile-app/src/infra/storage/learner-persistence.test.js`
- Modify: `apps/mobile-app/src/viewmodels/learner/useLearnerHomeViewModel.ts`
- Modify: `apps/mobile-app/src/views/learner/LearnerLessonScreenView.tsx`
- Modify: `apps/mobile-app/src/data/repositories/learner/learner-session-repository.impl.ts`

**Interfaces:**
- `LearnerProgressCheckpoint.save/load/clear(learnerId, activityId)`.
- `LearnerSyncOutbox.enqueue/drain/ack` com `idempotencyKey`.

- [ ] Escrever testes com adaptador de storage em memória para roundtrip, isolamento por aluno/aula e drenagem idempotente.
- [ ] Persistir checkpoint antes de navegação e após respostas relevantes.
- [ ] Enfileirar progresso, conclusão, ajuda e sessão antes do envio.
- [ ] Drenar ao bootstrap, reconexão e retorno ao primeiro plano.
- [ ] Manter estado local em falha temporária e invalidar apenas quando vínculo/acesso não existir.
- [ ] Commitar como `feat(mobile): persistir retomada e sincronizacao das aulas`.

### Task 7: Cabeçalho fiel ao Figma e retomada de rota

**Files:**
- Create: `apps/mobile-app/src/views/learner/components/LearnerLessonHeader.tsx`
- Modify: `apps/mobile-app/src/views/learner/LearnerLessonActivityView.tsx`
- Modify: `apps/mobile-app/src/views/learner/LearnerLessonScreenView.tsx`
- Modify: `apps/mobile-app/src/views/educator/EducatorLiveMirrorView.tsx`

**Interfaces:**
- Props: `{ learnerName, screenIndex, totalScreens, stageNumber }`.
- Copy: `Alfabetizando {learnerName}` e `Tela {screenIndex + 1} de {totalScreens} da Etapa {stageNumber}`.

- [ ] Escrever teste de apresentação para primeira, intermediária e última tela.
- [ ] Implementar componente seguindo medidas, alinhamento, escala e espaçamento do SVG aprovado.
- [ ] Integrar em todas as telas de execução sem deslocar o índice.
- [ ] Alimentar espelhamento com o mesmo snapshot.
- [ ] Validar visualmente em larguras mobile e desktop contra a referência.
- [ ] Commitar como `fix(mobile): alinhar cabecalho e progresso ao figma`.

### Task 8: Verificação integrada e commits finais

**Files:**
- Modify apenas arquivos necessários para correções encontradas pelos gates.

- [ ] Rodar `pnpm check` no web/API e confirmar todos os testes/build.
- [ ] Rodar `pnpm check:fast` e os testes de persistência no mobile.
- [ ] Exportar Expo web com `EXPO_PUBLIC_API_URL=https://painel.letras.cloud/api/v1`.
- [ ] Executar fluxo local: reordenar entre etapas com aviso, trocar vínculo no modal, alternar blocos/GIF, abrir envio e retomar aula após refresh.
- [ ] Comparar screenshot do cabeçalho com `Etapa 1 - Tela de Aula (Modelo letra).svg`.
- [ ] Executar `git diff --check` e confirmar working trees sem mudanças não commitadas do escopo.
- [ ] Entregar hashes dos commits; não fazer deploy sem novo pedido explícito.
