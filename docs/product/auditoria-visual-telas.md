# Auditoria visual de telas — Figma × código

Catálogo de todas as telas do app mobile (alfabetizador + alfabetizando), cruzando a referência oficial do Figma com o componente de código correspondente. Objetivo: para cada tela, saber **o que ela é, o que faz, e se está visualmente coerente com o Figma** — e manter isso rastreável no repositório em vez de só numa conversa.

Fonte de verdade visual: [docs/insumos/design-etapa1/figma-export/](../insumos/design-etapa1/figma-export/) (108 arquivos PNG+SVG exportados do Figma em 2026-08-18 — ver `Alfabetizador Online.zip` na raiz de `docs/`). Ver também [[reference_figma_export_completo]] na memória do agente para ressalvas de extração de cor.

Este documento é vivo: conforme cada tela é revisada, atualizar a linha (status + achados). Não é pra ser preenchido tudo de uma vez — é o backlog rastreável da revisão visual.

## Como ler a tabela

- **Figma**: nome do arquivo em `figma-export/` (sem extensão — existe `.png` e `.svg` dos dois).
- **Componente**: arquivo em `apps/mobile/src/views/...` que renderiza a tela (best-effort — alguns ainda precisam confirmação, marcados com *(confirmar)*).
- **Função**: o que a tela faz e por que existe no fluxo, em uma linha.
- **Status**: `⬜ não revisado` · `🔍 mapeado, cores não checadas` · `⚠️ drift encontrado` · `✅ coerente com Figma` · `🚫 não implementado (fora do MVP atual)` · `📄 não é tela (divisória/material de apoio)`.

## Regras de cor por contexto (confirmado com o usuário)

Não existe uma paleta única — o app tem **dois contextos de cor**:

| Contexto | Cor de ação/marca | Onde aparece |
|---|---|---|
| Telas do **alfabetizando** (aula, exercício) | Verde — confirmado no Figma real: **`#2F9711`** (⚠️ o token `brandGreen` em `appColors.ts` está em `#2fa536`, levemente diferente do Figma) | Botão AVANÇAR, ícones de áudio liberado, feedback de acerto |
| Telas do **alfabetizador** (login, cadastro, home, perfil) | Azul-marinho — **ainda não confirmado qual exato**: `#17335B` (protótipo antigo `fotos-etapa-1-referencia`) vs `#20385f` (`letras-educador.css` / `brandNavy` em `appColors.ts`) | Botões de ação, links, ícones de destaque |

**Pendência:** confirmar qual azul-marinho é o oficial antes de propor qualquer correção de cor em tela de alfabetizador — **decisão adiada a pedido do usuário até revisar todas as telas.** Rastreando ocorrências abaixo conforme a revisão avança:

| Valor | Onde apareceu |
|---|---|
| `#17335B` | Protótipo antigo (`fotos-etapa-1-referencia/theme.css`, `ActionButton` variant "avancar") |
| `#20385f` | `letras-educador.css` (`--le-blue-support`), `appColors.ts` (`brandNavy`), usado em `EducatorSplashView`, `EducatorOnboardingStepThreeView`, `LearnerOnboardingStep1/2View`, `LearnerThemeSelectView` |
| `#22385b` | Amostra de pixel real da seta AVANÇAR em `Cadastro de Perfil - 1.png` (Figma atual, autoritativo) |
| `#101a3d` | `EducatorEtapa1IntroViews.tsx` ("Etapa 1 - Orientações"/"Tela de Abertura"), `LearnerStageConclusionView.tsx` (modal de certificado), `LearnerActionButtons.tsx` |
| `#1e3a5f` | `EducatorComparativoView.tsx`, `EducatorLiveMirrorView.tsx`, `EducatorEtapa1LessonsView.tsx` |

*(atualizar esta tabela conforme mais telas forem revisadas)*

**Mesmo problema também apareceu no vermelho de erro/perigo** — 5 tons diferentes já encontrados até a tela #22: `#b91c1c` (token `danger`), `#9e1b1b`, `#e01b24`, `#7d1f1f`, `#c00`(`#cc0000`). Idem no verde de sucesso/ação (`#2fa536` token, `#2F9711` Figma, `#22c55e` visto na Home, `#0b6b3a`/`#0B6B3A` visto no Perfil e no `letras-educador.css`). Padrão recorrente: cada tela reinventa a própria cor semântica em vez de importar um token — não é só o azul.

---

## 1. Entrada e autenticação

| # | Figma | Componente | Função | Status |
|---|---|---|---|---|
| 1 | `Entrada - Alfabetizador` | *(sem componente — ver nota)* | Splash com seleção de perfil (logo + "PERFIL ALFABETIZADOR") | 🕸️ **superado**: texto "PERFIL ALFABETIZADOR" não existe em nenhum lugar do código atual. É provavelmente resquício do design de "dois apps separados", anterior à decisão de 11/06/2026 ("app mobile único" — [[CLAUDE.md]] §2), que eliminou a tela de seleção de perfil |
| 2 | `Entrada - Alfabetizando` | *(sem componente — mesma nota do item 1)* | Splash equivalente pro alfabetizando | 🕸️ **superado**, mesma razão do item 1 |
| 3 | *(sem arquivo Figma — gap identificado)* | `shared/UnifiedLoginView.tsx` | Formulário de login por CPF, único para os dois perfis | ⚠️ **drift confirmado**: label/botão em `#101010` (deveria ser `#111111`); botão ENTRAR é caixa preenchida — protótipo antigo mostra texto+ícone sem fundo (ainda não confirmado se é decisão posterior ou drift) |

## 2. Cadastro do alfabetizador

| # | Figma | Componente | Função | Status |
|---|---|---|---|---|
| 4 | `Cadastro de Perfil - 1` | `educator/EducatorSplashView.tsx` (nome do arquivo é enganoso — não é splash, é a 1ª tela de cadastro) | CPF/passaporte + telefone do alfabetizador (RN003/RN005) | ⚠️ ver achados abaixo |
| 5 | `Cadastro de Perfil - 2` | `educator/EducatorOnboardingStepTwoView.tsx` | Nome, data de nascimento, UF, cidade, foto, email | ⚠️ ver achados abaixo |
| 6 | `Cadastro de Perfil - 3` | `educator/EducatorOnboardingStepThreeView.tsx` | Escolaridade, área de formação, redes sociais | ⬜ *(mapeado, cores ainda não comparadas)* |
| 6b | *(sem arquivo Figma correspondente)* | `educator/EducatorOnboardingConfirmView.tsx` | Tela-resumo de confirmação final do cadastro (Nome/CPF/data/cidade/UF) antes de enviar | ⬜ |
| 7 | `Alfabetização Individual ou em grupo - 1/2` | *(sem componente — decisão de produto)* | Escolha individual/grupo. **Decisão vigente: POC só modo individual** ([[CLAUDE.md]] §2) — provavelmente não implementada de propósito | 🚫 |

## 3. Cadastro e vínculo do alfabetizando

| # | Figma | Componente | Função | Status |
|---|---|---|---|---|
| 8 | `Cadastrar Alfabetizando - 1` | `learner/LearnerOnboardingStep1View.tsx` | Alfabetizador cadastra dados do alfabetizando (CPF/passaporte + telefone) — app mobile único, configurado no celular do aluno | ⚠️ mesmo padrão de dark-text duplicado (`#111111`/`#141414`/`#101010`/`#111827` no mesmo arquivo) |
| 9 | `Cadastrar Alfabetizando - 2` | `learner/LearnerOnboardingStep2View.tsx` | Cadastro do alfabetizando (nome, nascimento, UF, cidade, foto) — **top 7 do ranking de drift de cor no código** (20 cores fora do padrão) | ⚠️ |
| 10 | `Confirmar Alfabetizando` | `learner/LearnerOnboardingConfirmView.tsx` | Tela-resumo (Celular/Nome/CPF/Nascimento/Cidade/UF) com VOLTAR (seta navy) e CONFIRMAR (selo preto com check branco) | ⬜ *(mapeado, cores ok à primeira vista — `#101010`/`#111111`/`#141414` ainda triplicados)* |
| 11 | `Vinculação do Alfabetizando - 1/2/3` | *(mapeamento incerto — ver nota)* | Tela diz "o cadastro já foi feito... agora é só vincular": fluxo de **buscar** um alfabetizando já cadastrado por CPF/telefone e só linkar (não recadastrar). Pode corresponder à rota `GET /cadastros/alfabetizandos/buscar`, mas não achei o componente de tela mobile que a chama | ⬜ *(mapeamento pendente)* |
| 12 | `Confirmação de Vínculo` / `- Vinculado` / `- Não Vinculado` | *(mapeamento pendente, mesma nota do item 11)* | Resultado da decisão de vínculo | ⬜ |
| 13 | `Seleciona tema` | `learner/LearnerThemeSelectView.tsx` | Escolha do tema de interesse, lista simples (RN: tema trava após início da jornada) | ⚠️ setas VOLTAR/AVANÇAR no Figma são navy — código usa `#20385f` (1 dos 3 candidatos de azul) |
| 14 | `Confirmação de tema` | `learner/LearnerThemeConfirmView.tsx` | Confirmação do tema + aviso de que não pode trocar depois de iniciar | ⬜ *(mapeado, mesmo padrão de VOLTAR/CONFIRMAR das telas 10 e 13)* |

## 4. Home, perfil e navegação do alfabetizador

| # | Figma | Componente | Função | Status |
|---|---|---|---|---|
| 15 | `Home - Não assistiu tutoriais` | `educator/EducatorHomeView.tsx` | Home do alfabetizador — estado bloqueado até completar tutoriais obrigatórios (RN012/RN016); mostra texto de boas-vindas + card do vídeo 1 | ⚠️ ver achados |
| 16 | `Home - Assistiu tutoriais` | `educator/EducatorHomeView.tsx` | Mesma home, estado liberado: pedidos de apoio/bloqueio, banner amarelo "+ NOVO ALFABETIZANDO", lista de alfabetizandos/grupos | ⚠️ banner amarelo bate com token `attention*` — resto não |
| 17 | `Home - Assistiu tutoriais (lista aberta)` | `educator/EducatorHomeView.tsx` | Home com a lista de alfabetizandos expandida | ⚠️ (mesmo componente) |
| 18 | `Lista de Alfabetizados` | `educator/EducatorHomeView.tsx` *(seção da mesma tela)* / painel web `Alfabetizandos.tsx` | Lista de alunos do alfabetizador | ⬜ |
| 19 | `Notificações` | `educator/EducatorNotificacoesView.tsx` | Central de notificações (pedido de ajuda, ajuda automática, pontos ganhos, prazo de apoio, conquistas) | ✅ **melhor tela até agora** — só 4 cores no arquivo, a maioria já é `#111111` exato; só `#888888` (deveria ser `#6b7280`) e `#7d1f1f` (deveria ser um `danger` único) fora do padrão |
| 20 | `Perfil` | `educator/EducatorProfileView.tsx` | Perfil do alfabetizador (CPF, celular, nome, foto, nascimento, UF, cidade, escolaridade, redes sociais) + botão SALVAR (selo preto). **#1 do ranking de drift de cor** (35 cores fora do padrão — pior tela do app nesse critério) | ⚠️ **prioridade alta**: 6 tons de preto diferentes (`#101010/#111111/#141414/#121212/#111827/#000000`) e 4 tons de cinza-texto diferentes (`#8f8f8f/#8d8d8d/#7a7a7a/#666666`) no mesmo arquivo |
| 21 | `Pontuação` | `educator/EducatorScoreView.tsx` | Sistema de pontos, frase "PESSOA QUE TRANSFORMA PESSOA", redes sociais, link p/ regras | ⚠️ usa hex de 3 dígitos (`#333`, `#000`, `#c00`) — mais um vermelho novo (`#c00`=`#cc0000`), o 5º tom de vermelho diferente encontrado no app até agora |
| 22 | `Pontuação - Cálculo` | `educator/EducatorScoreRulesView.tsx` | Explicação de como a pontuação é calculada | ⬜ *(ainda não comparado com o Figma)* |
| 23 | `Tutoriais` | `components/TutoriaisContent.tsx` (`EducatorTutoriaisView.tsx` só encaminha, não tem cor própria) | Lista dos 4 vídeos obrigatórios com card placeholder "logo+play+VÍDEO N" e status assistido/não-assistido | ⚠️ 12× `#111111` corretos, mas ainda tem `#888888` (deveria ser inkMuted), `#0f1720` (mais um preto), `#7d1f1f`/`#FF0000` (mais vermelhos) |
| 24 | `Tutorial de Apoio` | `components/TutoriaisContent.tsx` (mesma base) | Reprodução de 1 vídeo isolado + VOLTAR (seta navy) — mesmo card placeholder da tela 23 | ⚠️ mesmo arquivo, mesmos achados |
| 25 | `Conclusão da Capacitação (1)` / `(2)` | `components/TutoriaisContent.tsx` *(estado final)* | Tela ao concluir todos os tutoriais obrigatórios | ⬜ |
| 26 | `NO CELULAR DO ALFABETIZANDO` / `TREINAMENTO USO DO APP` | — | Divisórias de apresentação da trilha de tutoriais, não são telas do app | 📄 |

## 5. Etapa 1 (conduzida presencialmente pelo alfabetizador)

| # | Figma | Componente | Função | Status |
|---|---|---|---|---|
| 27 | `ETAPA 1 DE ALFABETIZAÇÃO` | — | Divisória de seção, não é tela do app | 📄 |
| 28 | `Etapa 1 - Orientações` | `educator/EducatorEtapa1IntroViews.tsx` | Instruções de como conduzir a Etapa 1 + vídeo (placeholder genérico no Figma, não é pra bater 1:1) + "INICIAR ALFABETIZAÇÃO". **Texto confirmado idêntico ao Figma** — bate com o texto que o relatório de erros do cliente pediu (ver [[project-pdf-relatorio-erros-status]]), então esse item específico do relatório está genuinamente resolvido | ✅ texto ok; ⚠️ cor: só 5 cores no arquivo, mas 1 preto (`#111111`, correto) + `#1d2733` (preto extra) + `#101a3d` (4º candidato de azul-marinho) |
| 29 | `Etapa 1 - Tela de Abertura` | `educator/EducatorEtapa1IntroViews.tsx` | Nome do alfabetizando + lista de módulos ("Módulos" em vermelho) + VOLTAR/AVANÇAR | ⚠️ mesmo arquivo do item 28, mesmos achados de cor |
| 30 | `Etapa 1 - Tela de Aula (Modelo só texto)` | `learner/LearnerLessonScreenView.tsx` (`!isLearnerDriven`, sem mídia) | Header (nome+"Tela N de NN") + box cinza de orientação ao educador + texto + VOLTAR/AVANÇAR navy + card "Está com dúvidas?" com play preto | ✅ estrutura bate 1:1 com o Figma — ver achados de cor consolidados abaixo |
| 31 | `Etapa 1 - Tela de Aula (Modelo imagem)` | `learner/LearnerLessonScreenView.tsx` (`mediaKind: "image"`) | Mesmo layout + card de imagem com ícone de expandir (RN043) | ✅ estrutura bate; imagem de exemplo no Figma é produto genérico (Ariel), não é pra bater o conteúdo, só o layout |
| 32 | `Etapa 1 - Tela de Aula (Modelo áudio)` | `learner/LearnerLessonScreenView.tsx` (`mediaKind: "audio"`, `!isLearnerDriven` → player nativo, não o `SoundWaveIcon` verde) | Mesmo layout + ícone de alto-falante **preto** (nativo) | ✅ correto o código NÃO usar o ícone verde de som aqui — verde é só para Etapas 2+ (`isLearnerDriven`), e o Figma da Etapa 1 mesmo mostra o ícone em preto |
| 33 | `Etapa 1 - Tela de Aula (Modelo vídeo)` | `learner/LearnerLessonScreenView.tsx` (`mediaKind: "video"`) | Mesmo layout + player de vídeo nativo | ✅ estrutura bate |
| 34 | `Etapa 1 - Tela de Aula (Modelo letra)` | `learner/LearnerLessonScreenView.tsx` (`mediaKind: "image"` — **correção**: não é `exercise-match-letter`; é o mesmo modelo-imagem, só com uma imagem de referência de traçado de letra pro alfabetizando copiar no papel) | Mesmo layout + imagem de referência da letra (maiúscula/minúscula, bastão/manuscrita) | ✅ estrutura bate — mapeamento do item corrigido nesta revisão |
| 35 | `Etapa 1 - Conclusão` | `learner/LearnerStageConclusionView.tsx` **(corrigido — não é `LearnerLessonConclusionView`)** | "PARABÉNS!!! Você concluiu a Etapa 1", selo de nível (letra grande + ícone de certificado), redes sociais, "IR PARA ETAPA 2" (seta navy) | ✅ **resolvido**: a tela principal usa só `learnerTheme.textStrong` (`#111111`), sem hex solto — uma das telas mais limpas encontradas. O `certCard` (`#101a3d`/`#2fa536`) é um **modal separado** (RN049, abre ao tocar no ícone de certificado — tem até botão "SALVAR EM PDF" via `print()` do navegador) e não aparece no frame do Figma revisado; não é a mesma tela, é feature-bônus sem referência visual ainda encontrada |
| 36 | `Etapa 1 - Transição para Etapa 2` | *(mapeamento pendente)* | Orientações finais antes da Etapa 2 (celular carregado, app instalado, levar papel/lápis) + vídeo explicativo + AVANÇAR. Estruturalmente idêntico aos modelos de aula (#30-34) — pode ser apenas **conteúdo publicado** renderizado por `LearnerLessonScreenView.tsx`, não um componente dedicado | ⬜ |

## 6. Etapa 2 e 3 (jornada autônoma do alfabetizando)

| # | Figma | Componente | Função | Status |
|---|---|---|---|---|
| 37 | `ETAPA 2 DE ALFABETIZAÇÃO` / `ETAPA 3 DE ALFABETIZAÇÃO` / `ETAPAS 2 E 3 DO ALFABETIZANDO` | — | Divisórias de seção | 📄 |
| 38 | `Etapa 2 - Orientações` | `learner/LearnerLessonIntroView.tsx` *(confirmar)* | Orientação de início da Etapa 2 | ⬜ |
| 39 | `Etapa 2 - Tela de Abertura` | `learner/LearnerLessonIntroView.tsx` *(confirmar)* | Abertura da Etapa 2 | ⬜ |
| 40 | `Etapa 2 - Orientação sobre navegação (1)/(2)` | `learner/components/LearnerHintVideoOverlay.tsx` *(confirmar)* | Explicação de como navegar entre telas | ⬜ |
| 41 | `Etapa 2 - Demonstração da tela de orientação do alfabetizando (1)…(17)` | — | Storyboard passo-a-passo (17 quadros), provavelmente material de treinamento/apresentação, não 17 telas distintas do app | 📄 *(confirmar)* |
| 42 | `Etapa 2 - Áudio informando que seguirá com a alfabetização (1)/(2)` | `learner/LearnerLessonScreenView.tsx` (narração automática) | Aviso sonoro de transição dentro da aula | ⬜ |
| 43 | `Etapas 2 e 3 - Modelo de Ensino ao Alfabetizando (1)/(2)/(3)` | `learner/LearnerLessonScreenView.tsx` (`isLearnerDriven`, tela padrão) | Modelo-base da aula conduzida pelo próprio aluno (Etapas 2+) | ⬜ |
| 44 | `Etapas 2 e 3 - Modelo de Exercício de Marcar Caixas (1)…(6)` | `learner/LearnerLessonScreenView.tsx` (`screenTemplate: "exercise-mark-images"`) + `learner/components/LearnerActionButtons.tsx` | Grid de imagens (animais) pra marcar, ícone de som verde, AVANÇAR verde (claro quando desabilitado) | ✅ **coerente**: verde do ícone de som e do AVANÇAR batem com o token `brandGreen`/`successBorder`; `LearnerActionButtons.tsx` é uma das telas mais limpas do app (só 4 cores, todas certas) |
| 45 | `Etapas 2 e 3 - Modelo de Exercício de Marcar o Quadrado da Letras (1)…(5)` | `learner/LearnerLessonScreenView.tsx` (`screenTemplate: "exercise-match-letter"`) | Palavra + quadrados por letra + áudio por item, tudo em verde quando liberado | ✅ mesmo padrão coerente do item 44 |
| 46 | `Etapas 2 e 3 - Tela bloqueada` | `learner/components/LearnerScreenLayout.tsx` (banner "AGUARDANDO AJUDA" + X + telefone/chat) | Estado de tela travada após tentativas sem acerto (RN111) | ✅ **coerente**: banner usa `#e11d2c`, bate exatamente com o token `dangerStrong` do `appColors.ts` |
| 47 | `Etapas 2 e 3 - Foto do exercício` | Botão "FOTOGRAFAR ATIVIDADE" já existe em `LearnerLessonScreenView.tsx` (comentário no código cita "Fase 2 RN113/RN114 + Figma Modelo de Ensino 1/2"); `LearnerPhotoReviewView.tsx` é a tela de revisão | ✅ botão usa `#2fa536` (verde correto); 🚫 avaliação por IA (RN077/RN114-116) ainda não implementada — mas o gatilho de foto em si já existe, correção da nota anterior |
| 48 | `Ajuda ao Alfabetizando (1)/(2)` | *(não é tela real — ver nota)* | Explica o botão amarelo "PRECISO DE AJUDA" que aparece pro alfabetizando | 📄 é material de treinamento (o próprio texto do Figma diz "esta é apenas uma simulação de solicitação de apoio"), não uma tela de produção |
| 49 | `Conclusão da Etapa 2` | `learner/LearnerStageConclusionView.tsx` | Celebração ao concluir a Etapa 2 | ⬜ |
| 50 | `Etapa 2 - Transição para Etapa 3` | `learner/LearnerStageConclusionView.tsx` *(confirmar se etapa 3 já é tratada)* | Transição para a Etapa 3 | 🚫 *(Etapa 3 não é escopo do MVP atual — ver §2 do [[CLAUDE.md]])* |

## 7. Etapa 3 e materiais fora do MVP atual

**Correção importante desta revisão:** o [[CLAUDE.md]] (§2) lista Etapa 3 e avaliação de foto como não implementadas (MVP-3), mas achei código real e funcional para pelo menos duas dessas peças — o CLAUDE.md do projeto está um pouco desatualizado nesse ponto, vale revisar depois.

| # | Figma | Função prevista | Status |
|---|---|---|---|
| 51 | `Etapa 3 - Orientações` | Orientações da Etapa 3 | 🚫 não encontrado componente dedicado |
| 52 | `Etapa 3 - Tela de Abertura` | Abertura da Etapa 3 | 🚫 não encontrado componente dedicado |
| 53 | `Etapa 3 - Acompanhamento` | Acompanhamento a distância pelo alfabetizador | 🚫 não encontrado componente dedicado |
| 54 | `Etapa 3 - Comparativo de Atividade` | Comparação de fotos do exercício (antes/depois) | ✅ **na verdade implementado** — `educator/EducatorComparativoView.tsx`, já ligado na navegação, busca `ActivityPhoto` da API. Cores majoritariamente corretas (`#111111`, `#6b7280` certos) + `#1e3a5f` (6º candidato de azul-marinho) + `#15803d` (mais um verde) |
| 55 | `Etapa 3 - Demonstração de Tela com Pedido de Apoio` | Pedido de apoio na Etapa 3 | 🚫 não encontrado componente dedicado (provavelmente reaproveita o mesmo banner "AGUARDANDO AJUDA" do item 46, comum a Etapas 2/3) |
| 56 | `Conclusão da Etapa 3` | Celebração final | 🚫 não encontrado — mas `LearnerStageConclusionView.tsx` (item 35) já é genérico por `stageNumber`, pode já suportar Etapa 3 sem tela dedicada nova |
| 57 | `Carta enviada` / `Foto da carta de agradecimento` | Carta de agradecimento do alfabetizando ao alfabetizador (RN050/062/092) | 🚫 confirmado não implementado — **não confundir com o certificado** (item 35, esse sim já tem modal funcional) |

## 8. Material de apoio / não são telas do app

| Figma | Observação |
|---|---|
| `VÁRIAS` | Folha de referência com várias telas juntas (contact sheet) |
| `Ilustrações` | Folha de assets ilustrados |
| `Section 1` | Divisória genérica do arquivo Figma |
| `Rectangle 37` | Elemento solto (forma), não uma tela |

---

## Achados de coerência já confirmados (detalhados)

### Login (`UnifiedLoginView.tsx`)
Sem arquivo Figma exato (gap — só existe a splash "Entrada - Alfabetizador", não o formulário). Cores capturadas ao vivo em produção (via DOM, `mobile.letras.cloud`) comparadas ao protótipo mais próximo disponível (`fotos-etapa-1-referencia/theme.css`):

| Elemento | Ao vivo | Protótipo mais próximo | Bate? |
|---|---|---|---|
| Fundo da tela | `#ededed` | `#EDEDED` | ✅ |
| Fundo do input | `#e4e4e4` | `#E4E4E4` | ✅ |
| Texto secundário | `#333333` | `#333333` | ✅ |
| Label/botão ENTRAR | `#101010` | `#111111` | ⚠️ |
| Estilo do botão ENTRAR | caixa preenchida | texto+ícone sem fundo (protótipo antigo) | ⚠️ *(pode ser decisão posterior — confirmar)* |

### Telas de aula da Etapa 1 (todos os 5 modelos, `LearnerLessonScreenView.tsx`)
Estrutura bate perfeitamente com o Figma nos 5 modelos (texto/imagem/áudio/vídeo/letra) — mesmo layout, mesmos elementos, mesma ordem. É a tela mais estruturalmente coerente encontrada até agora.

Cor é outra história: esse componente sozinho tem, além do `#2fa536`/`#111111` corretos, **mais 6 verdes diferentes** (`#35a632`, `#9bc844`, `#b8e4b3`, `#92d78b`, `#52bb4d`, `#258b22`) e **múltiplos vermelhos/âmbares** (`#ef4444`, `#e11d2c`, `#fee2e2`, `#f5b0b0`, `#fef3c7`, `#f59e0b`, `#92400e`) que não aparecem nas telas da Etapa 1 — pertencem à lógica de feedback de exercício (acerto/erro/reforço) usada nas Etapas 2 e 3, não à Etapa 1 propriamente. Ou seja: **esse arquivo sozinho concentra boa parte de todo o drift de cor do app**, porque atende Etapa 1 e Etapas 2/3 ao mesmo tempo sem separar os tokens.

### 🔴 Achado mais importante da auditoria até agora: botão "PRECISO DE AJUDA" está com a cor semântica errada
No Figma (`Etapas 2 e 3 - Modelo de Ensino ao Alfabetizando`), o botão de solicitar ajuda é um banner **amarelo** com texto preto — uma cor de "atenção/pedido", distinta de propósito da cor de bloqueio. No código (`LearnerScreenLayout.tsx`, estilo `helpVisualButton`), esse botão é **vermelho** (`#e30613`) — a mesma família de cor do banner "AGUARDANDO AJUDA" (`#e11d2c`, tela bloqueada, item 46). Ou seja: hoje as duas situações diferentes — "eu, alfabetizando, estou pedindo ajuda agora" vs. "o sistema me travou e estou esperando ajuda" — usam praticamente a mesma cor vermelha, quando o Figma as diferencia de propósito (amarelo = ação do usuário, vermelho = estado passivo do sistema). Essa distinção inclusive já está documentada no comentário do token `attention` em `appColors.ts` ("NÃO usar para estados passivos... reservado para AÇÃO que pede atenção ativa") — o código de `appColors.ts` sabe a regra, mas o botão real não a segue.

### Home do alfabetizador (`EducatorHomeView.tsx`)
- Banner amarelo "+ NOVO ALFABETIZANDO" bate com os tokens `attentionBg`/`attentionBorder` do `appColors.ts` (`#fff7ed`/`#fed7aa`) — um dos poucos casos até agora 100% coerente.
- Cor de destaque/alerta usada no componente (`#ea580c`) é diferente do token canônico `attention` (`#c2410c`) — mesma cor semântica, tom diferente.
- Existe `#22c55e` (mais um verde, terceiro ou quarto candidato distinto de `#2fa536`/`#2F9711`) e `#FF0000` (vermelho puro, fora dos tokens `danger`/`dangerStrong`).
- **Não é bug, é escopo:** o Figma mostra "Grupo de Alfabetizandos 3/4/5" — grupos não existem no código porque a POC atual é só modo individual ([[CLAUDE.md]] §2, decisão de produto vigente). Divergência esperada, não conta como drift.

### Cadastro de Perfil - 1/2/3 (fluxo de cadastro do alfabetizador)

**Cor de ação do alfabetizador, resolvida por amostragem de pixel real** (o SVG exportado marca a seta como `fill="black"`, mas isso é só o valor base antes de um efeito de cor do Figma — a imagem PNG renderizada, que é o que o usuário via de fato, mostra a seta em azul-marinho). Amostrei pixel a pixel a seta AVANÇAR em `Cadastro de Perfil - 1.png`: cor dominante **`#22385b`**. É um azul-marinho diferente dos outros dois candidatos que já tínhamos (`#17335B` do protótipo antigo, `#20385f` do `letras-educador.css`/`brandNavy`) — ou seja, existem **três** tons de azul-marinho quase iguais espalhados entre Figma antigo, Figma atual e código. Usando `#22385b` (Figma atual, mais autoritativo) como referência:

| Elemento | Figma (`Cadastro de Perfil - 1/2/3`) | Código (`EducatorSplashView`/`StepTwoView`) | Bate? |
|---|---|---|---|
| Seta/label AVANÇAR | `#22385b` (seta) | `#101010` (label "AVANÇAR", cor do texto — a seta em si é uma imagem PNG (`avancar.png`), não teve a cor extraída ainda) | ⚠️ label não é navy, é quase-preto |
| Texto de parágrafo/label | preto/cinza-escuro no Figma | `#141414` | ⚠️ (deveria ser `#111111`) |
| Fundo do input | cinza claro (`#F1F1F1` no Figma) | `#e4e4e4` no código | ⚠️ tom de cinza diferente |
| Botão "← Voltar" (só existe no código, não aparece no Figma) | — | `#20385f` | — usa um dos três azuis candidatos, mas não o `#22385b` confirmado no Figma atual |

**Nota:** `EducatorOnboardingStepTwoView.tsx` é a 2ª pior tela do ranking de drift (20 cores fora do padrão: `#8f8f8f`, `#d6d6d6`, `#7a7a7a`, etc.) — os mesmos problemas de tom-de-cinza-duplicado descritos na seção de regras de cor se repetem aqui.

### Ranking de telas com mais cor fora do padrão (análise estática do código, `apps/mobile/src`)
Contagem de valores hex que não batem com os tokens de `appColors.ts`/`learnerTheme.ts` — serve como priorização de qual tela revisar primeiro contra o Figma:

1. `EducatorProfileView.tsx` — 35
2. `EducatorLiveMirrorView.tsx` — 25
3. `EducatorEtapa1LessonsView.tsx` — 25
4. `LearnerLessonScreenView.tsx` — 24
5. `EducatorLearningModeView.tsx` — 24
6. `EducatorHomeView.tsx` — 22
7. `LearnerOnboardingStep2View.tsx` — 20
8. `EducatorOnboardingStepTwoView.tsx` — 20
9. `educator/components/MirrorScreenRenderer.tsx` — 17
10. `shared/UnifiedLoginView.tsx` — 14
11. `educator/components/TutoriaisContent.tsx` — 14
12. `EducatorSessionConfirmView.tsx` — 14
13. `learner/learnerTheme.ts` (o próprio arquivo de tema, nunca migrado para `appColors.ts`) — 13

## Pendências abertas

1. **Azul-marinho**: agora são **6 candidatos** encontrados (`#17335B`, `#20385f`, `#22385b`, `#101a3d`, `#1e3a5f`, e mais alguma variação possível nas telas ainda não abertas em detalhe). Decisão adiada a pedido do usuário até fechar a rodada — ver tabela de rastreamento acima.
2. Confirmar se o botão ENTRAR da tela de login como caixa preenchida (em vez de texto+ícone) é decisão de produto posterior ou drift.
3. Mapear com certeza os componentes ainda marcados *(confirmar)* ou *(pendente)* — principalmente o fluxo "Vinculação do Alfabetizando" (item 11), que não achei o componente mobile correspondente.
4. Corrigir `brandGreen` em `appColors.ts` (`#2fa536` → `#2F9711`, valor real do Figma).
5. **Prioridade alta**: recolorir o botão "PRECISO DE AJUDA" (`LearnerScreenLayout.tsx`, hoje `#e30613` vermelho) para amarelo/atenção, igual ao Figma — hoje é visualmente idêntico ao banner de bloqueio "AGUARDANDO AJUDA", confundindo duas situações diferentes.
6. Atualizar o [[CLAUDE.md]] do projeto: Etapa 3 (comparativo de foto) e a base do certificado (RN049) já têm implementação real, ao contrário do que §2 sugere.

## Cobertura desta rodada

Revisão a fundo (Figma PNG + SVG + amostra de pixel quando necessário + código) cobrindo o fluxo completo: entrada → cadastro do alfabetizador → cadastro/tema do alfabetizando → home/perfil/notificações/pontuação/tutoriais → Etapa 1 completa (orientação, 5 modelos de aula, conclusão) → exercícios de Etapas 2/3 (marcar caixas, marcar letra, tela bloqueada, ajuda) → Etapa 3/certificado. Itens ainda em aberto: fluxo de vinculação (item 11), "Pontuação - Cálculo" (item 22), Etapa 2 orientação/navegação (itens 38-42), e conferência fina dos componentes marcados *(confirmar)*.
