# Auditoria funcional — RN001–RN123 × comportamento real

Teste ao vivo em produção (`mobile.letras.cloud`, conta de teste do usuário) cruzado com o texto completo das regras em [regras-negocio-completo.md](regras-negocio-completo.md). Objetivo: achar bug de comportamento (não visual — isso já está em [auditoria-visual-telas.md](auditoria-visual-telas.md)) e sugestões de fluidez/UX.

**Importante, a pedido do usuário:** várias RNs foram deliberadamente deixadas de fora do escopo atual pra não atrapalhar o desenvolvimento em andamento (ver MVP-3 e dependências externas no [[CLAUDE.md]]). Não marcar como "bug" o que é decisão de escopo — só sinalizar como "faltando" o que parecer uma lacuna genuína, com bom senso.

Legenda: `✅` funciona como a RN descreve · `⚠️` funciona diferente do descrito (bug real) · `🚫` não implementado — **escopo** (esperado) · `❓` não implementado — **incerto se é escopo ou lacuna** · `💡` sugestão de melhoria/fluidez, não é bug

Conta de teste usada: alfabetizador com 5 alfabetizandos (Bruno Souza Teste e Maria Teste em Etapa 2 com Etapa 1 concluída; Carlos Teste, Edir Macedo, João Augusto em Etapa 1 com espelhamento bloqueado).

---

## Home do alfabetizador

| RN | Descrição | Status | Observação |
|---|---|---|---|
| RN017 | Sem pedido de apoio: "Não há pedido de apoio aberto no momento" | ⚠️ | Texto real é **"Nenhum pedido agora"** — mensagem diferente da especificada, mas a lógica (esconder quando não há pedido) funciona |
| RN019 | Sem alfabetização em andamento: "Não há alfabetização em andamento" | ❓ | Não testado ainda (conta já tem 5 alfabetizandos, não dá pra ver o estado vazio direto) |
| RN021 | Novo alfabetizando cadastrado entra automaticamente na lista | ❓ | A conferir ao cadastrar um novo |

**Achado visual (fora do escopo desta auditoria funcional):** botão "+ NOVO ALFABETIZANDO" está branco/contornado ao vivo, não amarelo como o Figma indicava — **segundo o usuário, é proposital** (amarelo ficava estranho ali). Não é bug, é uma decisão de estética que diverge do Figma de propósito. Não entra na lista de correções visuais.

---

## Painel web — achados da exploração ao vivo (admin, 2026-08-19)

Navegação real confirmada: Dashboard Geral (`/admin/dashboard`) · Alfabetizandos (`/admin/alfabetizandos`) · Alfabetizadores (`/admin/alfabetizadores`) · Vínculos e Convites (`/admin/vinculos`) · Trilha de aulas (`/admin/trilha-de-aulas`) · Fila de Atendimento (`/admin/fila`) · Aulas e Mídias (`/admin/conteudo`) · Pontuação & Ranking (`/admin/ranking`) · Relatórios (`/admin/relatorios`) · Configurações.

| RN | Descrição | Status | Observação |
|---|---|---|---|
| RN085/RN096 | Pontuação por conclusão de etapa deve refletir em extrato auditável | ✅ **corrigido** ([fix/api/pontuacao-e-fila-sem-nome](../../apps/api/src/routes/painel.js)) | Causa raiz: `GET /painel/ranking` somava `activity_progress.score` (score bruto da atividade) em vez da tabela real de pontos `learner_score_events`/`educator_score_events` — por isso o extrato aparecia sempre `+0`. Corrigido pra usar a fonte canônica (mesma já usada em `GET /painel/score/:learnerId`); saldo do extrato agora é o acumulado cronológico real por aluno/tutor |
| RN085 | Pontuação usa valores inteiros (10/15/25 + bônus) | ✅ **corrigido, era sintoma do mesmo bug acima** | A pontuação `3.45` do tutor Isaque vinha de somar `activity_progress.score` (não-inteiro por natureza) de todos os alunos vinculados. Com a troca pra `educator_score_events` (coluna `points` é sempre inteiro, `Math.trunc` na escrita), o valor exibido passa a ser sempre inteiro |
| RN085 | Aluno em Etapa 3 deveria ter pontuação acumulada de Etapas 1+2 concluídas | ✅ **corrigido, era sintoma do mesmo bug acima** | "Maria Teste" com 0 pontos era o mesmo problema de fonte errada de pontuação — resolvido junto com o fix do ranking |
| RN098-100 | Fila de Atendimento deve refletir pedidos de ajuda reais e resolvíveis | ✅ **corrigido** ([fix/api/pontuacao-e-fila-sem-nome](../../apps/api/src/routes/painel.js)) | Causa raiz do "Sem nome": o aluno existe de verdade, mas só no schema mobile (`LearnerProfile`), nunca foi espelhado na tabela `profiles` do painel — a busca de nome só olhava `profiles`. Adicionado fallback (`getMobileLearners`) pra resolver o nome nesses casos, aplicado na Fila de Atendimento e no dashboard do alfabetizador. **Os 43 dias em aberto continuam sendo esperados** (é um pedido real sem resolução ainda) — não há bug de "trava", só faltava o nome aparecer |
| — | Relatório de Inatividade deve comunicar claramente alunos que nunca acessaram | 💡 sugestão de UX, não bug | Vários alunos aparecem com "999 dias" de inatividade e "Último acesso" em branco (João Augusto, João Teste, Israel Nunes, "Teste geral da plataforma") — é um valor-sentinela pra "nunca acessou" que funciona, mas confunde um admin não-técnico. Sugestão: trocar por texto explícito tipo "Nunca acessou" |
| — | Escopo da Etapa 3 (RN064-075 ainda não tem telas dedicadas) | ✅ **correção de suposição anterior** | A auditoria visual anterior presumiu Etapa 3 "quase não implementada". Na prática, `Trilha de aulas` já tem conteúdo real publicado pra Etapa 3 ("Encontre o B nas palavras", "O que começa com a letra A?") e o motor de aula funciona igual entre etapas — só as telas dedicadas de Orientação/Abertura/Acompanhamento (que são conteúdo textual/vídeo específico da Etapa 3, não lógica de exercício) é que não têm componente próprio ainda |
| RN106-122 | Flag `isLearnerDriven` (`LearnerLessonScreenView.tsx`) trata Etapa 2 e Etapa 3 do mesmo jeito | ✅ **não é bug, suspeita anterior descartada** | A auditoria anterior marcou `isLearnerDriven = stageNumber >= 2` como incerto (não distinguia Etapa 2 de Etapa 3). Lendo o texto completo das RNs, isso está correto: RN106-122 descrevem literalmente "Etapas 2 e 3 - Modelo de Ensino ao Alfabetizando" como o mesmo modelo de tela — não há regra que peça comportamento diferente entre as duas nessa tela específica |
