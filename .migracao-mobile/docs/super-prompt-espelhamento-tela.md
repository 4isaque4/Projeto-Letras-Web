# Super Prompt — Espelhamento ao vivo da tela do alfabetizando (websocket)

> Branch de trabalho: `feat/websocket-espelhamento-tela` (criada a partir de `feat/conclusao-mvp-letras`).

## Problema

Hoje, quando o alfabetizador toca no nome de um alfabetizando na home (aba **acompanhar**), ele cai na rota `EducatorLearningMode` → `apps/mobile-app/src/views/educator/EducatorLearningModeView.tsx`, que mostra apenas **dados cadastrais** (CPF, celular, cidade, tutor, botões LIGAR/WHATSAPP/ATIVIDADE ENVIADA) e um card estático "ULTIMA TELA REGISTRADA" alimentado por REST (`GET /sessions/:learnerId`) com botão manual "ATUALIZAR SITUAÇÃO".

O comportamento correto, conforme o Figma ("Etapa 2 – Demonstração da tela de atividade"), é: **ao tocar no nome do alfabetizando, o alfabetizador deve ver, ao vivo, a tela/exercício que o alfabetizando está fazendo naquele momento** — não a tela de informações. Layout do mockup:

- Header padrão (logo LETRAS + sino de notificações).
- Título: `Alfabetizando <nome>`.
- Subtítulo: `Veja a tela que o alfabetizando está vendo. Tela N de XX da Etapa 2 de Alfabetização.`
- Moldura central com a **réplica da tela do aprendiz** (mídia, ícone AVANÇAR verde, ícone de áudio verde, exercício etc.), somente leitura.
- Abaixo da moldura, **texto de orientação pedagógica** para o alfabetizador, variando conforme o tipo de tela (ex.: para a tela com seta AVANÇAR: "Informe que este ícone leva ele para a próxima página, como se ele estivesse folheando um caderno..."; para tela com áudio: "Informe que todas as vezes em que aparecer este ícone na cor verde, ele deve apertar para ouvir orientações...").
- Botões `VOLTAR` / `AVANÇAR` (navegação local do educador entre as telas da aula, sem afetar o aprendiz).
- Card: "Está com dúvidas? Confira o trecho do tutorial que explica sobre este tipo de atividade." com botão de play (leva ao tutorial correspondente).
- Bottom menu do educador com **acompanhar** ativo.

## O que já existe (não reinventar)

Toda a fundação realtime já está pronta:

1. **Gateway Socket.IO** — `apps/api/src/realtime/gateway/session.gateway.ts`, namespace `/realtime`. Identidade via query string do handshake (`role`, `learnerProfileId`, `educatorId`, `participantId`). Quem conecta com `learnerProfileId` entra na sala desse aprendiz (`client.join(learnerProfileId)`). O handler `learner_state_update` (linha ~102) **persiste** o estado via `sessionService.updateState` e **retransmite** o evento para a sala do aprendiz — ou seja, um educador conectado com o `learnerProfileId` na query **já recebe** cada atualização. Presença online/offline também já é emitida (`learner_presence_changed`, `presence_changed`).
2. **Emissão pelo aprendiz** — `syncCurrentState` em `apps/mobile-app/src/viewmodels/learner/useLearnerHomeViewModel.ts` (linha ~116) emite o socket **e** faz `repository.pushState` (REST, persistido em `SessionState`). É chamado por `LearnerLessonScreenView`, `LearnerLessonIntroView`, `LearnerLessonActivityView`, `LearnerLessonConclusionView` e `LearnerHomeView`. Em `LearnerLessonScreenView.tsx` o `useFocusEffect` (linha ~379) dispara a cada troca de tela da aula — **porém o `statePayload` atual é magro**: só `moduleId`, `lessonId`, `screenIndex`, `screenTemplate`.
3. **Snapshot rico já modelado** — `LearnerScreenSnapshot` em `packages/shared-types/src/realtime.ts` (linha ~39) carrega tudo que o espelho precisa: `screenId`, `screenTitle`, `screenTemplate`, `screenIndex`, `totalScreens`, `stage`, `moduleLabel`, `moduleTitle`, `lessonTitle`, `mediaUrl`, `mediaKind`, `learnerSpeech`, `highlightMessage`, `exercise`. O builder já existe: `buildHelpSnapshot()` em `LearnerLessonScreenView.tsx` (linha ~637) — hoje só é usado no `help_requested`.
4. **Recepção pelo educador** — `apps/mobile-app/src/hooks/educator/useEducatorRealtime.ts` já escuta `REALTIME_EVENTS.LEARNER_STATE_UPDATE` e expõe `lastLearnerState` + `connect(identity)`. `createEducatorSocket` está em `apps/mobile-app/src/infra/realtime/session-socket.ts`.
5. **Navegação** — o clique no nome do aluno está em `apps/mobile-app/src/views/educator/EducatorHomeView.tsx` (linhas ~323, ~409, ~432), navegando para `EducatorLearningMode` (registrada em `apps/mobile-app/src/navigation/educator/EducatorNavigator.tsx`).
6. **Fallback frio** — `GET /sessions/:learnerId` devolve `sessionState.statePayload` persistido (é o que o card "ULTIMA TELA REGISTRADA" usa hoje).

## Tarefa

### Fase 1 — Enriquecer o estado emitido pelo aprendiz
- Em `LearnerLessonScreenView.tsx`, reutilizar `buildHelpSnapshot()` para incluir o snapshot completo no `statePayload` do `syncCurrentState` do `useFocusEffect` (ex.: `statePayload: { ...buildHelpSnapshot() }` — cuidado com deps do `useCallback`).
- Nas demais telas do aprendiz (Intro, Activity, Conclusion, Home), enviar snapshot parcial com o que houver (`moduleId`, `lessonId`, `lessonTitle`, `screenIndex`, `totalScreens` quando existirem) — o tipo `LearnerScreenSnapshot` já é todo opcional por design.
- Backend: **nenhuma migration necessária** — `state`/`statePayload` já é JSON livre no DTO e no Prisma. Apenas conferir que o `LearnerStateUpdateDto` não rejeita o payload maior.
- Se fizer sentido, tipar em `shared-types` que `LearnerStateUpdatePayload.state` pode conter `snapshot?: LearnerScreenSnapshot`, para o contrato ficar explícito nos dois apps.

### Fase 2 — Tela de espelhamento do educador
- Criar `EducatorAcompanharAoVivoView` (rota nova, ex. `EducatorLiveMirror`) seguindo o padrão MVVM do app, e **trocar a navegação do clique no nome do aluno** em `EducatorHomeView.tsx` para essa rota.
- A tela de dados cadastrais (`EducatorLearningModeView`) **continua existindo**: colocar na nova tela um botão/link discreto "DADOS DO ALFABETIZANDO" que navega para ela (LIGAR/WHATSAPP/ATIVIDADE ENVIADA continuam acessíveis por lá — não quebrar RN059/RN070).
- Conexão: `connect({ learnerProfileId, role: 'educator', participantId: educatorId })` via `useEducatorRealtime` ao focar a tela; desconectar ao sair (blur/unmount), para não vazar sockets.
- Estado inicial (cold start): buscar `GET /sessions/:learnerId` e renderizar o snapshot persistido; depois, cada `learner_state_update` recebido substitui o espelho em tempo real — sem botão de refresh manual.
- Presença: usar os eventos de presença já existentes para exibir badge "AO VIVO" (aprendiz online) vs. "OFFLINE — última tela registrada às HH:MM" (fallback com o snapshot persistido).
- Se `sessionState.isLocked`, manter o destaque visual de "PEDIDO DE APOIO ATIVO" (card amarelo, como hoje).

### Fase 3 — Renderização do espelho
- Criar componente `MirrorScreenRenderer` (em `views/educator/components/`) que recebe um `LearnerScreenSnapshot` e renderiza a réplica **somente leitura** dentro da moldura: imagem/vídeo/áudio (`mediaUrl`/`mediaKind`), texto (`learnerSpeech`/`highlightMessage`), e o exercício (`exercise`) com alternativas visíveis mas não interativas. Reaproveitar o máximo possível dos padrões visuais de `LearnerLessonScreenView` (ícones verdes de avançar/áudio etc.) sem duplicar lógica de negócio — extrair subcomponentes puros se necessário.
- Contador "Tela N de XX da Etapa <stage> de Alfabetização" a partir de `screenIndex`/`totalScreens`/`stage` (screenIndex pode ser 0-based — exibir `screenIndex + 1`).
- Mapa `screenTemplate → texto de orientação pedagógica` (os textos estão nos mockups do Figma em `docs/mockups` / "Conteudos das telas"; se algum template não tiver texto definido, usar um genérico e listar os faltantes no resumo final).
- Card "Está com dúvidas?" linkando para o tutorial do tipo de atividade (rotas de `EducatorTutoriaisView`/`EducatorTutorialView`).
- Botões VOLTAR/AVANÇAR: permitem ao educador folhear localmente as telas da aula em que o aprendiz está (buscar a aula via o mesmo fluxo do CMS usado pelo aprendiz, `learnerFlowMapper`), **sem afetar o aprendiz**. Ao folhear, sai do modo "AO VIVO" e aparece um botão "VOLTAR AO VIVO" que re-sincroniza com a tela atual do aprendiz. Se isso inflar demais o escopo, entregar como fase separada — o espelho ao vivo é o essencial.

### Fase 4 — Validação
- `pnpm typecheck` limpo.
- Teste manual com dois clientes simultâneos (`pnpm dev` + duas janelas do mobile web em `pnpm dev:mobile:web`): logar como aprendiz numa janela e educador na outra, navegar pelas telas da aula como aprendiz e confirmar que o espelho do educador acompanha em < 2s, incluindo exercícios; derrubar o aprendiz e confirmar o fallback offline; testar cold start (educador abre a tela com o aprendiz já no meio da aula).
- Não commitar sem eu revisar; ao final, resumo do que foi feito + o que ficou de fora.

## Critérios de aceite

1. Tocar no nome do alfabetizando abre o espelho ao vivo, não a tela de dados cadastrais.
2. O espelho reflete a tela atual do aprendiz em tempo real via Socket.IO (sem polling, sem botão de atualizar).
3. Exercícios aparecem no espelho com seu conteúdo real (alternativas, imagens, áudio), somente leitura.
4. Contador "Tela N de XX" e texto de orientação corretos por tipo de tela.
5. Aprendiz offline → última tela registrada com indicação clara de offline.
6. Dados cadastrais e ações LIGAR/WHATSAPP/ATIVIDADE ENVIADA continuam acessíveis a um toque.
7. `pnpm typecheck` sem erros; nenhuma migration de banco.
