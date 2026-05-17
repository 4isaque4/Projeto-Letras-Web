# Decisões de produto — Etapa 1 e Etapa 2 (2026-05-17)

Decisões tomadas em 2026-05-17 para consolidar escopo e desbloquear execução
final das Etapas 1 e 2. **Etapa 3 explicitamente fora do escopo** desta onda.

Estas decisões prevalecem sobre o que está em outros docs e sobre defaults
inferíveis do código. Fonte de quem decidiu: usuário (Isaque Silva Nunes,
isaque.nunes@spinengenharia.com.br) em sessão Claude Code.

Cross-reference:

- Auditoria de fluxos: [docs/operations/auditoria-fluxos-mobile-web-2026-05-13.md](../operations/auditoria-fluxos-mobile-web-2026-05-13.md)
- Glossário de produto: [docs/product/glossario.md](glossario.md)
- Regras de negócio: [docs/product/regras-negocio-mvp-alfabetizacao.md](regras-negocio-mvp-alfabetizacao.md)

---

## 1. Mobile do alfabetizador **continua existindo** em paralelo ao painel

Alfabetizador pode atender ajuda no celular (presencial) ou no painel
(remoto). O app mobile do alfabetizador **não** será descontinuado.

Implicações:

- Notificações precisam funcionar nos dois canais (push no mobile, badge no painel).
- Tela `Notificacoes` do Figma vai ser implementada no app alfabetizador.
- Fluxos de cadastrar alfabetizando, selecionar/confirmar tema, confirmar
  vínculo e ver lista de alfabetizados continuam no mobile.

## 2. Etapa 2 é **híbrida** (configurável)

Cada aula (ou alfabetizando) pode operar em modo presencial supervisionado
**ou** remoto assíncrono. Novo campo `lesson_mode` no schema.

Default sugerido: **por aula** (mais simples que por aluno). Se o produto
preferir por aluno depois, o campo migra para `LearnerProfile`.

Implicações:

- Telas de Etapa 2 precisam variar copy/comportamento conforme modo.
- Painel precisa de UI de configuração do modo (lista de aulas com toggle).
- Pedido de ajuda em modo presencial pode esperar ação imediata; remoto entra na fila assíncrona.

## 3. POC **sem grupos**

Apesar do Figma ter telas "Alfabetização Individual ou em grupo", a POC
atual mantém modo individual. Telas de grupo ficam ocultas até nova
decisão.

Implicações:

- Não construir cadastro/listagem/configuração de grupos.
- UI condicional do Figma fica em backlog para após MVP.

## 4. Foto/áudio de exercício **só armazena** no MVP

Sem fluxo de avaliação manual pelo tutor neste momento. Upload acontece,
URL fica registrada, aluno avança automaticamente. Avaliação por IA fica
para MVP-3.

Implicações:

- Não construir tela "comparativa" de revisão no painel.
- Não construir UI Aprovar/Refazer no painel.
- Storage bucket recebe o asset; entidade `submission` (ou similar) só
  registra existência da submissão, sem status de revisão.

## 5. Trava é **configurável por aula** (granularidade)

Novo campo `lock_granularity` (`session` | `screen`) em
`learning_activities` (ou no nível de módulo, decidir no B1).

- Default: **`session`** — destravar libera o aluno até o próximo travamento.
- Aulas marcadas como `screen` — destravar libera só a tela atual.

Implicações:

- API de destravamento precisa ler o campo para decidir o escopo.
- CMS precisa de toggle de granularidade na criação/edição de aula.

## 6. Auto-trava **só manual**

Sistema **nunca** trava o aluno automaticamente. O único caminho é o
aluno clicar "preciso de ajuda" (botão `PEDIR AJUDA` do Figma).

Implicações:

- Não implementar contador de erros consecutivos para gatilhar trava.
- Telas que hoje têm lógica de auto-trava (se houver) precisam ser revistas.
- Cabe ao design pedagógico encorajar o aluno a pedir ajuda quando errar.

## 7. Pedido de ajuda em **abas separadas** no painel

`/admin/fila` ganha 3 abas:

1. **Bloqueados** — alunos em status `travado`, priorizados.
2. **Pedidos de ajuda** — ajuda solicitada sem bloqueio.
3. **Vínculos pendentes** — solicitações aguardando aprovação do alfabetizador.

Implicações:

- UI da fila vira `Tabs` (react), não lista única.
- Contagem de cada aba no badge superior.
- Ordenação default por urgência decrescente dentro de cada aba.

## 8. KPIs do dashboard admin: **operacional diário**

Os 4 cards no topo do `/admin/dashboard`:

1. **Alfabetizandos ativos (últimos 7 dias)** — quantos consumiram aula na semana.
2. **Vínculos pendentes** — solicitações aguardando aprovação.
3. **Fila de ajuda agora** — total atual (bloqueados + ajuda sem bloqueio).
4. **Aulas concluídas hoje** — total finalizado no dia.

Implicações:

- API `/painel/dashboard/kpis` precisa retornar exatamente esses 4 valores.
- Gráficos secundários (taxa de conclusão semanal, tempo médio etc.)
  ficam fora do topo, podem ir como secondary cards/gráficos abaixo.

---

## Micro-decisões pendentes (resolver no bloco respectivo)

- **B2** — Quais tipos de notificação disparam push mobile vs só badge painel?
- **B2** — `lesson_mode` é por aula (recomendado) ou por aluno?
- **B3** — Timeline do alfabetizando: granularidade — eventos brutos por update
  de `activity_progress`, ou agregado por sessão?
- **B6** — Tela "comparativo" no mobile (foto + gabarito visual): construir só
  visualmente mesmo sem avaliação, ou pular?

---

## Plano executivo (referência rápida)

| Bloco | Escopo | Estimativa |
|---|---|---|
| B1 Foundations | Migrations + endpoints + motivo obrigatório | 2 dias |
| B2 Notificações reais | Painel badge + mobile tela Notificacoes + triggers | 4-5 dias |
| B3 Painel admin upgrade | KPIs + fila abas + timeline alfabetizando | 4-5 dias |
| B4 Mobile alfabetizador Etapa 1 | Home, tutoriais, cadastro alfabetizando, tema, vínculo, lista, pontuação | 6-7 dias |
| B5 Mobile alfabetizando Etapa 1 | Entrada, vinculação, confirmação vínculo, ajuda screens | 3-4 dias |
| B6 Etapa 2 (CMS + mobile) | 5 templates + renderer + config presencial/remoto | 10-12 dias |
| B7 Polish | Estados loading/erro/offline + review Figma + pontuação | 3-4 dias |

**Total estimado:** ~32-39 dias.
