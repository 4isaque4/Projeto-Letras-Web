# Subsistema de Notificações (educador) — Design

**Data:** 2026-06-30
**Status:** design aprovado — aguardando revisão do spec
**Global Constraints visuais:** `docs/superpowers/specs/2026-06-30-design-reference-telas-educador.md`
**Figma:** `Notificações` (svg/pdf)

## Objetivo

O sino no header do educador não navega para lugar nenhum. Criar o subsistema
que alimenta e exibe a tela "Suas notificações:" do Figma — um feed cronológico
de eventos tipados, persistidos numa tabela própria (decisão do usuário: feed
histórico fiel, não derivado de estado atual).

## Tipos de notificação (exatos do Figma)

| type | title | body (template) |
|---|---|---|
| `HELP_REQUEST` | "Pedido de Ajuda" | "{nomeAluno}" |
| `AUTO_LOCK` | "Ajuda Automática" | "{nomeAluno} teve bloqueio de tela depois de 3 tentativas de realizar o exercício." |
| `POINTS_EARNED` | "Você ganhou + {N} pontos" | "{nomeAluno} concluiu a {etapa} da alfabetização" |
| `SUPPORT_DEADLINE` | "Prazo de apoio" | "Você tem até as {hora} horas do dia {data} para dar apoio ao {nomeAluno} e não perder ponto." |
| `MILESTONE` | "Parabéns!" | "Você completou mais uma letra da sua meta." |

> A tela renderiza cada item como: linha de título em **negrito**, corpo, e a
> data/hora "NN/NN/NNNN, às NN:NN." (exceto SUPPORT_DEADLINE/MILESTONE, que no
> Figma não têm a linha de timestamp separada — seguir o Figma).

## Modelo de dados (novo — controlamos as colunas, sem @map)

```prisma
model Notification {
  id          String           @id @default(cuid())
  educatorId  String
  learnerId   String?
  type        NotificationType
  title       String
  body        String?
  deadlineAt  DateTime?        // usado por SUPPORT_DEADLINE
  metadata    Json?
  readAt      DateTime?
  createdAt   DateTime         @default(now())

  educator    Educator         @relation(fields: [educatorId], references: [id], onDelete: Cascade)

  @@index([educatorId, createdAt])
  @@index([educatorId, readAt])
}

enum NotificationType {
  HELP_REQUEST
  AUTO_LOCK
  POINTS_EARNED
  SUPPORT_DEADLINE
  MILESTONE
}
```

Adicionar `notifications Notification[]` ao model `Educator`.

**Migração:** conexão direta ao Postgres confirmada funcionando (TCP :5432 OK).
Criar a tabela de forma **aditiva** sem tocar nas existentes — `prisma db execute`
com o `CREATE TYPE`/`CREATE TABLE` (ou `prisma db push` após adicionar o model).
Verificar com um SELECT depois.

## Pontos de gravação (onde a notificação nasce)

Todos confirmados existentes nesta API:

- **`POINTS_EARNED` + `MILESTONE`** — `apps/api/src/modules/scoring/scoring.service.ts`,
  onde cria `EducatorScoreEvent` (STAGE_COMPLETE). Ao registrar o evento de
  pontuação, criar também a `Notification` correspondente (educatorId, learnerId,
  delta → N pontos, etapa). MILESTONE quando o evento representa conclusão de letra.
- **`HELP_REQUEST`** — `apps/api/src/realtime/gateway/session.gateway.ts`,
  `handleHelpRequested` (após o emit existente para a sala do educador).
- **`AUTO_LOCK`** — mesmo arquivo, `handleLockSet` (o lock disparado pelo cliente
  após 3 erros).
- **`SUPPORT_DEADLINE`** — criada junto do HELP_REQUEST/AUTO_LOCK, com
  `deadlineAt = createdAt + janela da regra` (regra de inatividade = 5 dias, ver
  `EducatorScoreRulesView`). Confirmar a janela exata ao escrever o plano.

> Ao escrever o plano, ler as assinaturas exatas de `createScoreEvent` e dos
> handlers para obter `educatorId`/`learnerProfileId`/nome do aluno disponíveis
> e montar o título/corpo sem placeholder. Se algum nome de aluno não estiver no
> payload, buscar via `learnerProfileId`.

## API (padrão atual — sem auth, educatorId por parâmetro)

- `GET /painel/notificacoes?educatorId={id}&onlyUnread={bool}` → lista desc por
  `createdAt`; inclui `unreadCount`.
- `POST /painel/notificacoes/marcar-lidas` `{ educatorId, ids?: string[] }` →
  marca `readAt`; sem `ids` marca todas do educador. Retorna `unreadCount` novo.

Em `painel.service.ts` + `painel.controller.ts` (mesmo módulo das demais rotas do painel).

## Mobile

- **Rota nova** `EducatorNotificacoes` em `EducatorRootStackParamList`
  (`apps/mobile-app/src/types/navigation.ts`): `{ educatorId?: string }`.
- **Tela nova** `EducatorNotificacoesView` — feed fiel ao Figma: header (logo +
  `BellIcon`), título "Suas notificações:", lista de itens tipados (título negrito
  + corpo + timestamp), menu inferior. Estados: loading, vazio ("Nenhuma
  notificação por enquanto."), erro com retry. Ao abrir, chama marcar-lidas.
- **Sino navegável + badge:** onde o `BellIcon` aparece no header do educador,
  envolver em `Pressable` que navega para `EducatorNotificacoes`. Badge com a
  contagem de não-lidas (buscar `unreadCount`); sem badge quando 0. Registrar o
  componente de header/badge reutilizável para as várias telas que têm sino.

## Fora de escopo (follow-ups)

- Auth/validação de dono nos endpoints (entra no pass de segurança dedicado).
- Push/realtime do badge (por ora, atualiza no fetch/abertura de tela).
- Preferências de notificação.

## Verificação

- `prisma` reconhece o novo model; `tsc` limpo na API e no mobile.
- Runtime (dado): criar um `EducatorScoreEvent` de teste → conferir que nasce a
  `Notification`; `GET /painel/notificacoes` retorna o item com o texto do Figma.
- UI: abrir a tela pelo sino → feed renderizado conforme Figma; badge zera após
  marcar-lidas. (Clique-na-UI depende de browser/servidores; validar o que der.)
