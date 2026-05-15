# Integracao Web + Mobile - Etapa 1

Data de referencia: **2026-03-25**

## Fonte unica de verdade

Web e mobile devem apontar para o mesmo backend de dados (Supabase), usando as mesmas tabelas:

- `profiles`
- `tutor_student_links`
- `learning_themes`
- `learning_modules`
- `learning_activities`
- `content_assets`
- `activity_progress`
- `sync_events`

## Contratos de escrita obrigatorios

## Cadastro

Ao criar/editar usuario (web ou mobile):

- atualizar `profiles`
- registrar evento em `sync_events` com:
  - `source_platform`: `web` ou `mobile`
  - `event_type`: `profile.created` ou `profile.updated`
  - `entity_type`: `profile`
  - `entity_id`: `profiles.id`
  - `payload`: dados alterados

## Vinculo tutor x aluno

Ao confirmar/negar vinculo:

- atualizar `tutor_student_links.status`
- registrar `sync_events` com:
  - `event_type`: `link.updated`
  - `entity_type`: `tutor_student_link`

## Consumo de atividade

Ao iniciar/finalizar atividade no app:

- atualizar `activity_progress`
- registrar `sync_events` com:
  - `event_type`: `progress.updated`
  - `entity_type`: `activity_progress`

## Publicacao de conteudo no CMS

Ao publicar tema/modulo/atividade/asset no web:

- atualizar tabelas de conteudo
- registrar `sync_events` com:
  - `event_type`: `content.published`
  - `entity_type`: `learning_activity` ou `content_asset`

## Regras de consistencia

1. IDs devem ser UUID.
2. Datas em ISO-8601 UTC (`timestamptz`).
3. Nunca duplicar usuario por plataforma.
4. Mobile nao deve manter cache sem reconciliacao (usar `updated_at`).
5. Alteracoes de cadastro devem refletir em no maximo 5 segundos no painel.

## IDs canonicos de alfabetizando

O identificador aceito pelos endpoints operacionais do painel e sempre
`profiles.id`/`LearnerProfile.id` em formato UUID. IDs locais gerados pelo app
ou pelo Prisma, como `cmn...`, nao devem ser enviados para
`POST /api/v1/painel/progress`.

Fluxo recomendado:

1. O mobile cria ou autentica o alfabetizando e resolve um profile canonico no
   Supabase antes de registrar progresso.
2. Se o app ainda tiver apenas um ID local, ele deve chamar o fluxo de
   provisionamento/sync primeiro e guardar o UUID retornado.
3. Sessoes antigas com ID local devem ficar em modo de reconciliacao: bloquear
   escrita de progresso canonico, sincronizar cadastro, trocar o cache local
   pelo UUID e entao reenfileirar eventos pendentes.
4. A API deve responder `400 learnerProfileId invalido (esperado UUID)` para ID
   local em `/painel/progress`; isso e intencional para evitar progresso orfao.

## Estrategia de reconciliacao

1. Ler por `updated_at > ultimo_sync` em lotes.
2. Resolver conflito por ultimo `updated_at`.
3. Guardar `sync_cursor` por plataforma.
4. Reprocessar eventos falhos com retentativa exponencial.

## Realtime recomendado

Para telas administrativas:

- canal realtime para `activity_progress`
- canal realtime para `tutor_student_links`
- canal realtime para alertas de `sync_events` com erro

## Testes de contrato

1. Criar cadastro no mobile e validar leitura no web.
2. Confirmar vinculo no web e validar leitura no mobile.
3. Publicar conteudo no web e validar consumo no mobile.
4. Concluir atividade no mobile e validar dashboard web.

## Compatibilidade com backend mobile (commit `9bbbefd`)

Para usar o backend mobile (Nest + Prisma) no mesmo Supabase do painel:

1. Aplicar a migration do painel `infra/supabase/migrations/20260325_etapa1_core.sql`.
2. Escolher **uma** estrategia para o schema mobile (nao executar as duas):
   - Rodar as migrations Prisma no repositorio mobile (recomendado para manter `_prisma_migrations`).
   - Ou aplicar `infra/supabase/migrations/20260401_mobile_backend_compat.sql` quando quiser preparar o schema direto por SQL.
3. Apontar os `.env` do backend mobile para o mesmo `SUPABASE_URL` e credenciais do projeto do painel.

Com isso:

- O painel continua lendo seu schema nativo (`profiles`, `tutor_student_links`, `activity_progress` etc.).
- O painel tambem passa a ler o schema mobile (`Educator`, `LearnerProfile`, `Completion`, `Theme`, `LearningUnit`, `Activity`) quando existir.
- Cadastros e vinculos criados pelo painel sao sincronizados por best effort para o schema mobile.
