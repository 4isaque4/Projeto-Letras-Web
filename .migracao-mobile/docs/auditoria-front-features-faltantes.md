# Auditoria de Front-end e Features Faltantes
**Branch:** `feat/verificacao-front-features-faltantes`
**Data:** 2026-05-27
**Base:** `feat/etapa1-prod-web-mobile-unificacao` @ `05b7464`

---

## 1. Resumo Executivo

| Severidade | Qtd | Descrição |
|------------|-----|-----------|
| 🔴 Crítico  | 4   | Dados incorretos ou fluxo quebrado em produção |
| 🟡 Importante | 5 | Features parciais ou telas mock que não representam o produto |
| 🟢 Melhoria | 6   | Telas Figma faltantes, UX incompleta |

---

## 2. Problemas Críticos

### 2.1 Provisioning automático bypassa fluxo de vínculo
**Arquivo:** [apps/mobile-app/src/data/repositories/learner/learner-session-repository.impl.ts](apps/mobile-app/src/data/repositories/learner/learner-session-repository.impl.ts#L20)

O `bootstrapPersistentSession()` cria um perfil de alfabetizando automaticamente via `/cadastros/alfabetizandos/provisionar-mobile` sem passar pelo fluxo de CPF / passaporte / telefone definido no Figma. Quando o backend falha, cria um perfil local (`learner-local-profile-*`) que silencia todos os erros de API.

**Impacto:** Alfabetizandos não vinculados a um educador aparecem no sistema sem identidade real. Progresso nunca é associado ao aluno correto.

**Correção necessária:** Substituir o provisioning automático por navegação para tela de vínculo (CPF/telefone). Manter fallback local apenas para modo de demonstração offline explicitamente ativado.

---

### 2.2 Pontuação e progresso de aula são hardcoded
**Arquivo:** [apps/mobile-app/src/views/learner/LearnerLessonConclusionView.tsx](apps/mobile-app/src/views/learner/LearnerLessonConclusionView.tsx#L116)

```tsx
<Text style={styles.pointsText}>+50 pontos conquistados</Text>  // fixo
<Text style={styles.progressText}>1 de 1 aulas</Text>           // fixo
<View style={styles.progressFill} />                            // sempre 100%
```

O `recordProgress` é chamado corretamente (`status: 'COMPLETED'`), mas os dados exibidos na tela de conclusão não consomem a resposta do backend — usam valores estáticos.

**Correção necessária:** Usar o retorno de `recordProgress` (ou buscar de `getAssignedThemes`) para preencher pontos reais e progresso real (N de M aulas do módulo).

---

### 2.3 Barra de progresso da aula oculta via `display: 'none'`
**Arquivo:** [apps/mobile-app/src/views/learner/LearnerLessonScreenView.tsx](apps/mobile-app/src/views/learner/LearnerLessonScreenView.tsx#L1114)

```tsx
progressHeader: { display: 'none' }   // linha 1115
progressTrack:  { display: 'none' }   // linha 1131
```

O Figma especifica "Tela N de NN" com barra de progresso visível na tela de aula. O código calcula `progressPercent` corretamente mas esconde o componente.

**Correção necessária:** Remover `display: 'none'` dos estilos; ajustar layout para acomodar o header de progresso.

---

### 2.4 `expectedSelections` pode liberar exercício com seleção insuficiente
**Arquivo:** [apps/mobile-app/src/views/learner/LearnerLessonScreenView.tsx](apps/mobile-app/src/views/learner/LearnerLessonScreenView.tsx#L221)

```tsx
const expectedSelections = Math.max(1, screen.exercise?.expectedSelections ?? 1);
```

O editor web salva as imagens corretas mas não salva obrigatoriamente `expectedSelections`. Um exercício com 3 imagens corretas pode ser concluído selecionando apenas 1.

**Correção necessária:** O editor web deve persistir `expectedSelections` igual ao número de imagens marcadas como corretas. O mobile deve validar `selectedSet.size === correctSet.size` quando `expectedSelections` não vier configurado.

---

## 3. Problemas Importantes

### 3.1 `AppModeGateView` é tela técnica exposta ao usuário final
**Arquivo:** [apps/mobile-app/src/views/AppModeGateView.tsx](apps/mobile-app/src/views/AppModeGateView.tsx)
**Navigator:** [apps/mobile-app/src/navigation/RootNavigator.tsx](apps/mobile-app/src/navigation/RootNavigator.tsx)

O app inicia com uma tela que pergunta "Modo Aprendiz ou Educador" — não existe no Figma e não faz sentido como produto final.

**Correção necessária:** Substituir por detecção automática de role (token JWT / perfil salvo) ou mover para onboarding de primeiro acesso com UI adequada ao produto.

---

### 3.2 Menu inferior do alfabetizando navega todos os itens para Home
**Arquivo:** [apps/mobile-app/src/views/learner/LearnerLessonConclusionView.tsx](apps/mobile-app/src/views/learner/LearnerLessonConclusionView.tsx#L84)
e em múltiplas views do aprendiz.

```tsx
onMenuTrack={() => navigation.navigate('LearnerHome')}
onMenuTutorial={() => navigation.navigate('LearnerHome')}
onMenuScore={() => navigation.navigate('LearnerHome')}
onMenuProfile={() => navigation.navigate('LearnerHome')}
```

Pontuação, tutoriais e perfil ainda não têm telas próprias — todos redirecionam para Home.

**Correção necessária:** Criar `LearnerScoreView`, `LearnerTutorialView`, `LearnerProfileView` ou mostrar placeholder "Em breve" explícito em vez de navegar silenciosamente para Home.

---

### 3.3 Menu inferior do alfabetizador com todos os itens apontando para EducatorHome
**Arquivo:** [apps/mobile-app/src/views/educator/EducatorLearningModeView.tsx](apps/mobile-app/src/views/educator/EducatorLearningModeView.tsx#L113)

```tsx
onInicioPress={() => navigation.navigate('EducatorHome', ...)}
onTutorialPress={() => navigation.navigate('EducatorHome', ...)}
onAcompanharPress={() => navigation.navigate('EducatorHome', ...)}
onPontuacaoPress={() => navigation.navigate('EducatorHome', ...)}
```

Igual ao aprendiz: tutoriais, acompanhamento e pontuação do educador ainda não têm telas.

**Correção necessária:** Implementar ou registrar como placeholder explícito.

---

### 3.4 Lista de alfabetizandos do educador é placeholder hardcoded
**Arquivo:** [apps/mobile-app/src/views/educator/EducatorHomeView.tsx](apps/mobile-app/src/views/educator/EducatorHomeView.tsx#L19)

```tsx
const HAS_LEARNERS = false; // placeholder — sem fonte de dados real
```

A `EducatorHomeView` exibe "Nenhum alfabetizando vinculado" independente do estado real. O botão "+ NOVO ALFABETIZANDO" navega para `EducatorLearningMode` em vez de iniciar o fluxo de vínculo.

**Correção necessária:** Integrar com endpoint real de alunos vinculados ao educador autenticado. Botão deve abrir fluxo de cadastro/vínculo conforme Figma.

---

### 3.5 Notificações são botão vazio no EducatorHomeView
**Arquivo:** [apps/mobile-app/src/views/educator/EducatorHomeView.tsx](apps/mobile-app/src/views/educator/EducatorHomeView.tsx#L47)

```tsx
<Pressable style={styles.notificationButton} onPress={() => {}}>
  <View style={styles.badge}><Text>1</Text></View>
```

Badge fixo "1" e `onPress` vazio. Não integrado ao realtime.

**Correção necessária:** Integrar com `useEducatorRealtime` para contar pedidos de ajuda/bloqueio reais. `onPress` deve abrir lista de notificações ou navegar para fila de atendimento.

---

## 4. Telas Figma Faltantes vs. Existentes

| Tela (Figma)                                        | Status no Mobile |
|-----------------------------------------------------|------------------|
| Home do educador — sem tutoriais                    | ✅ `EducatorHomeView` (parcial, sem dados reais) |
| Home do educador — com tutoriais, pedidos, busca    | 🟡 Estrutura existe, lista vazia/mock |
| Tutorial de apoio com player e conclusão            | ❌ Não existe |
| Cadastro de alfabetizando no mobile (Figma)         | ❌ Não existe (provisioning automático) |
| Fluxo de vínculo educador ↔ alfabetizando           | ❌ Não existe no mobile |
| Tela de acompanhamento/status por etapa             | ❌ Não existe |
| Pontuação mobile do educador                        | ❌ Não existe |
| Tela de cálculo/regras de pontuação                 | ❌ Não existe |
| Notificações clicáveis                              | 🟡 Badge estático, sem ação |
| Tela de bloqueio/apoio com ligar/WhatsApp           | ❌ Não existe (só o banner no aprendiz) |
| Conclusão de etapa com selo e compartilhamento      | ❌ Não existe (só conclusão de aula) |
| Perfil completo do aprendiz com validações          | ❌ Não existe |
| Tela de aula — nome do aprendiz + "Tela N de NN"   | 🟡 Calculado, mas `display: 'none'` |
| Tela de aula — orientação para educador             | 🟡 `educatorGuidance` mapeado, não renderizado |
| Tela de aula — tutorial "Está com dúvidas?"         | ❌ Não existe |
| Pontuação mobile do aprendiz (LearnerScoreView)     | ❌ Não existe |
| Perfil do aprendiz (LearnerProfileView)             | ❌ Não existe |
| Tutorial do aprendiz (LearnerTutorialView)          | ❌ Não existe |

---

## 5. Problemas de Contrato API

### 5.1 Filtro `published=true` — RESOLVIDO
`learnerFlowData.ts:26` já usa `?scope=cms&published=true`. ✅

### 5.2 Blocos compostos `text` e `audio` não renderizados na tela de aula
**Arquivo:** [apps/mobile-app/src/views/learner/learnerFlowMapper.ts](apps/mobile-app/src/views/learner/learnerFlowMapper.ts#L691)

O mapper reconhece `videoUrl`, `imageUrl`, `mediaUrl`, mas não usa `audioUrl` de bloco composto (ex.: bloco `audio` standalone criado no editor). `learnerSpeech` e `educatorGuidance` são mapeados mas não renderizados no corpo da tela de aula.

### 5.3 Realtime: Socket.IO vs. endpoint `/ws`
**Arquivo:** [apps/mobile-app/src/infra/realtime/session-socket.ts](apps/mobile-app/src/infra/realtime/session-socket.ts#L10)

O mobile usa Socket.IO em `/realtime`. O painel web em ambiente local tentou conectar `ws://localhost:8082/ws` (404). Verificar se o backend NestJS expõe o namespace `/realtime` na porta correta e se o painel web aponta para o mesmo endpoint.

---

## 6. Prioridade de Correção Recomendada

| # | Item | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Remover `display: 'none'` da barra de progresso | Alto | Baixo |
| 2 | Corrigir `expectedSelections` no exercício de imagens | Alto | Baixo |
| 3 | Pontuação e progresso reais na tela de conclusão | Alto | Médio |
| 4 | Substituir `AppModeGateView` por detecção de role | Alto | Médio |
| 5 | Integrar lista real de alunos no `EducatorHomeView` | Alto | Médio |
| 6 | Implementar fluxo de vínculo no mobile | Alto | Alto |
| 7 | Renderizar `educatorGuidance` e `learnerSpeech` na aula | Médio | Médio |
| 8 | Criar telas stub para menus sem destino (Score, Tutorial, Profile) | Médio | Baixo |
| 9 | Corrigir notificações do educador (realtime real) | Médio | Médio |
| 10 | Verificar endpoint realtime painel web vs. NestJS | Médio | Baixo |

---

## 7. Arquivos-Chave para Cada Correção

| Arquivo | Correções relacionadas |
|---------|----------------------|
| [LearnerLessonScreenView.tsx](apps/mobile-app/src/views/learner/LearnerLessonScreenView.tsx) | #1, #2 |
| [LearnerLessonConclusionView.tsx](apps/mobile-app/src/views/learner/LearnerLessonConclusionView.tsx) | #3, #8 |
| [RootNavigator.tsx](apps/mobile-app/src/navigation/RootNavigator.tsx) | #4 |
| [EducatorHomeView.tsx](apps/mobile-app/src/views/educator/EducatorHomeView.tsx) | #5, #9 |
| [learner-session-repository.impl.ts](apps/mobile-app/src/data/repositories/learner/learner-session-repository.impl.ts) | #6 |
| [learnerFlowMapper.ts](apps/mobile-app/src/views/learner/learnerFlowMapper.ts) | #7 |
| [session-socket.ts](apps/mobile-app/src/infra/realtime/session-socket.ts) | #10 |
