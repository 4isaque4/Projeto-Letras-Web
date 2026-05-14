# Auditoria de fluxos mobile + web — 2026-05-13

Fontes analisadas:

- Exportacao Figma em `C:\Users\Black\Downloads\letras\Alfabetizador Online pdf` — 108 PDFs, 1 pagina cada.
- `CLAUDE.md`
- `docs/product/regras-negocio-mvp-alfabetizacao.md`
- `docs/product/wireframe.md`
- `docs/architecture/integracao-web-mobile-etapa1.md`
- `docs/architecture/realtime-contract-v1.md`
- Painel web/API neste repo.
- App unificado em `C:\Projetos\letras-mobile-ref\apps\mobile-app`.
- Backend mobile em `C:\Projetos\letras-mobile-ref\apps\api`.

Observacao: o MCP do Figma autenticou, mas atingiu limite do plano Starter ao
expandir a pagina. A exportacao PDF local foi usada como fonte visual principal.

## Resumo executivo

O projeto tem boa base de cadastro, conteudo publicado, progresso e fila, mas
o fluxo completo desenhado no Figma ainda nao esta fechado no produto real.

As maiores lacunas sao:

1. Notificacoes in-app existem como icone/badge e redirecionamento para fila,
   mas nao existem como entidade de produto com lida/nao lida, detalhe, historico
   e tela mobile funcional.
2. Trava/destrava existe parcialmente em duas camadas diferentes:
   `activity_progress.status = travado` no painel e `SessionState.isLocked` no
   backend mobile/realtime. Essas camadas ainda nao estao unificadas.
3. Pedido de ajuda existe por Socket.IO no backend mobile e botao no app do
   alfabetizando, mas nao persiste em tabela canonica nem alimenta a fila do
   painel em producao.
4. O fluxo do alfabetizador no mobile esta incompleto em relacao ao Figma:
   cadastro/perfil/modo individual-grupo existem parcialmente, mas home,
   tutoriais obrigatorios, notificacoes, acompanhamento, lista de alfabetizados,
   pontuacao e confirmacao de vinculo ainda nao fecham como fluxo navegavel.
5. O fluxo do alfabetizando no mobile consome aulas publicadas e tem Etapa 1/2
   basica, mas faltam telas especificas do Figma para vinculacao, confirmacao
   de vinculo, foto de exercicio/carta, pedido de ajuda, aguardando ajuda e
   bloqueio com retorno operacional.
6. Etapas 2 e 3 aparecem amplamente no Figma, mas o app/cms ainda cobre mais
   fortemente Etapa 1 e alguns exercicios da Letra A.

## O que existe hoje

### Painel web

Rotas implementadas:

- `/admin/dashboard`
- `/admin/alfabetizandos`
- `/admin/alfabetizandos/:id`
- `/admin/alfabetizadores`
- `/admin/vinculos`
- `/admin/grupos`
- `/admin/fila`
- `/admin/conteudo`
- `/admin/ranking`
- `/admin/relatorios`
- `/admin/configuracoes`
- equivalentes tutor para dashboard, alfabetizandos, fila, ranking e configuracoes.

Funcionalidades reais relevantes:

- `/painel/conteudo` publica temas, modulos, atividades, assets e telas-base.
- `/painel/progress` recebe progresso do mobile e grava `activity_progress`.
- `/painel/fila` junta vinculos pendentes e progresso `travado`.
- `/painel/fila/:id` confirma/nega vinculo ou muda progresso travado para
  `em_andamento`.
- `/cadastros/vinculos` lista/atualiza vinculos.

### Mobile unificado

Fluxo alfabetizador implementado:

- `EducatorLoading`
- `EducatorLogin`
- `EducatorSplash`
- `EducatorProfile`
- `EducatorOnboardingStepTwo`
- `EducatorOnboardingStepThree`
- `EducatorOnboardingConfirm`
- `EducatorLearningMode`

Fluxo alfabetizando implementado:

- `LearnerHome`
- `LearnerLessonIntro`
- `LearnerLessonScreen`
- `LearnerLessonActivity`
- `LearnerLessonConclusion`

Capacidades parciais:

- Consumo de conteudo publicado pelo painel.
- Header e progresso nas telas de aula.
- Render de texto, imagem, video, audio.
- Exercicios `exercise-mark-images` e `exercise-match-letter`.
- Botao "PEDIR AJUDA" no layout do alfabetizando.
- Estado bloqueado na UI do alfabetizando.
- Socket.IO para `help_requested`, `help_received`, `lock_set`,
  `lock_release`, `locked_changed`.

## Matriz Figma x implementacao

| Area Figma | PDFs encontrados | Status atual | Lacuna |
|---|---|---:|---|
| Entrada | `Entrada - Alfabetizador`, `Entrada - Alfabetizando` | Parcial | Gate existe, mas entrada do alfabetizando ainda provisiona perfil local/automatico em prod. |
| Cadastro alfabetizador | `Cadastro de Perfil - 1/2/3`, `Perfil` | Parcial | Mobile tem perfil, mas fluxo de cadastro inicial completo e tutoriais obrigatorios nao esta amarrado ao desbloqueio. |
| Home alfabetizador | `Home - Nao assistiu tutoriais`, `Home - Assistiu tutoriais`, `lista aberta` | Parcial baixo | Nao ha home do alfabetizador equivalente no mobile; menu aponta varias acoes para `EducatorLearningMode`. |
| Tutoriais | `Tutoriais`, `Tutorial de Apoio`, `Conclusao da Capacitacao` | Nao fechado | Falta tabela/estado `tutorial_watches`, regra bloqueante e tela funcional conectada. |
| Cadastro alfabetizando | `Cadastrar Alfabetizando - 1/2`, `Confirmar Alfabetizando` | Parcial | API/painel tem cadastros; mobile alfabetizador nao fecha cadastro + confirmacao + tema + vinculo. |
| Tema | `Seleciona tema`, `Confirmacao de tema` | Parcial | App alfabetizador busca temas, mas fluxo visual completo e persistencia por aluno/grupo ainda nao fecham. |
| Individual/grupo | `Alfabetizacao Individual ou em grupo - 1/2` | Parcial | UI local existe, mas grupos estao fora da POC atual e nao ha regra final aplicada. |
| Vinculo | `Vinculacao do Alfabetizando - 1/2/3`, `Confirmacao de Vinculo*` | Parcial | Painel confirma/nega; falta fluxo do alfabetizando pedir vinculo e notificacao persistente para alfabetizador. |
| Notificacoes | `Notificacoes` | Parcial baixo | Icone/badge existe; falta modelo, tela, leitura, status, detalhe e fonte real. |
| Etapa 1 | abertura, orientacoes, modelos de aula, conclusao, transicao | Parcial bom | Mobile consome telas e midias; ainda falta encaixar fluxo do alfabetizador presencial completo como no Figma. |
| Etapa 2 | abertura, orientacoes, navegacao, demonstracoes, conclusao, transicao | Parcial medio | Exercicios existem, mas fluxo de orientacao do alfabetizador + tela real do alfabetizando ainda nao esta completo. |
| Etapa 3 | orientacoes, abertura, acompanhamento, comparativo, pedido de apoio, conclusao | Parcial baixo | Painel tem fila/detalhe; mobile nao tem acompanhamento remoto completo nem submissao/avaliacao. |
| Pedido de ajuda | `Ajuda ao Alfabetizando`, `Demonstração de Tela com Pedido de Apoio` | Parcial tecnico | Socket existe; falta persistencia canonica e integracao com fila/notificacoes. |
| Bloqueio | `Etapas 2 e 3 - Tela bloqueada` | Parcial divergente | UI e status existem, mas destravar pelo painel nao libera `SessionState.isLocked` do app mobile. |
| Foto/submissao | `Foto do exercicio`, `Foto da carta de agradecimento`, `Carta enviada` | Nao fechado | Falta captura/upload/submissao como entidade com avaliacao/status. |
| Pontuacao | `Pontuacao`, `Pontuacao - Calculo` | Parcial | Ranking/pontuacao no painel existem; mobile alfabetizador/alfabetizando nao fecha regra visual e eventos. |

## Fluxo correto sugerido para trava/destrava

1. Alfabetizando erra N vezes ou clica em "Preciso de ajuda".
2. Mobile grava evento persistente:
   - `support_requests` para ajuda.
   - `activity_progress.status = travado` para bloqueio operacional.
   - `sync_events` com `support.created` ou `progress.locked`.
3. Painel mostra item na Fila de Atendimento e em Notificacoes.
4. Alfabetizador abre o item, ve:
   - aluno,
   - etapa,
   - tela/atividade,
   - print/contexto da atividade quando houver,
   - motivo automatico/manual.
5. Alfabetizador responde:
   - "Ajuda recebida" para pedido simples.
   - "Desbloquear aluno" para bloqueio.
6. Backend atualiza simultaneamente:
   - `activity_progress.status = em_andamento`;
   - `SessionState.isLocked = false` no schema mobile, se houver sessao;
   - `support_requests.status = resolvido`, quando aplicavel;
   - `sync_events`.
7. Mobile recebe realtime/polling e libera a tela.

Hoje o passo 6 esta incompleto: o painel destrava o progresso canonico, mas nao
parece chamar o backend mobile/session para liberar `SessionState.isLocked`.

## Backlog recomendado

### P0 — Fechar contrato de ajuda/trava/destrava

- Criar migration para `support_requests` e `educator_notifications`.
- Definir contrato unico de eventos: `support.created`, `support.resolved`,
  `progress.locked`, `progress.unlocked`.
- Ajustar `/painel/fila/:id` para, ao desbloquear, tambem liberar
  `SessionState.isLocked` quando houver sessao mobile vinculada.
- Persistir pedido de ajuda do mobile em API HTTP, nao so socket.
- Painel: exigir motivo/observacao quando negar vinculo e quando destravar.

### P1 — Implementar notificacoes reais

- Mobile alfabetizador: tela `Notificacoes` do Figma.
- Painel: badge com quantidade real, nao so redirecionamento para fila.
- Tabela com `read_at`, `target_role`, `type`, `payload`, `source_entity`.
- Acoes: abrir pedido de ajuda, abrir vinculo, abrir aluno travado.

### P1 — Completar fluxo do alfabetizador no mobile

- Home antes/depois de tutoriais.
- Lista "Alfabetizacao em andamento".
- Lista de alfabetizados.
- Tutoriais obrigatorios com progresso.
- Cadastro alfabetizando 1/2 + confirmar alfabetizando.
- Selecionar tema + confirmar tema.
- Confirmacao de vinculo.
- Pontuacao e perfil navegaveis a partir do bottom menu.

### P2 — Completar fluxo do alfabetizando

- Entrada alfabetizando.
- Vinculacao por CPF/passaporte ou telefone.
- Confirmacao de vinculo aguardando/realizada.
- Tela de pedido de ajuda/aguardando ajuda igual Figma.
- Foto de exercicio e envio.
- Carta de agradecimento.

### P2 — Etapas 2 e 3

- Modelar no CMS os tipos de tela do Figma:
  - ensino ao alfabetizando;
  - marcar caixas;
  - marcar quadrado da letra;
  - foto de exercicio;
  - comparativo de atividade;
  - tela bloqueada.
- Garantir que cada template tenha payload versionado e renderer mobile.
- Registrar progresso/tentativas/erros por atividade com motivo de bloqueio.

## Decisoes de produto a confirmar

1. A POC segue sem grupos? O Figma tem grupos, mas `CLAUDE.md` diz POC individual.
2. Etapa 2 deve ser presencial supervisionada ou ja parcialmente remota?
   O Figma indica presencial com celular do alfabetizando e supervisao.
3. O app do alfabetizador mobile continua existindo ou o alfabetizador deve usar
   apenas painel web? O repo mobile ainda tem fluxo de alfabetizador.
4. O desbloqueio deve ser por tela/atividade ou por sessao inteira?
5. Pedido de ajuda sem bloqueio deve aparecer na mesma fila de bloqueios ou em
   aba separada?

