# Letras — Contexto do projeto para agentes

Carregado automaticamente por todo agente Codex neste repositório. Consolida conceitos de produto, arquitetura e processo que **não podem ser inferidos apenas lendo o código**. Leia antes de sugerir código, copy de UI, nomes de entidade ou exemplos.

Fontes primárias (se divergir deste arquivo, as fontes prevalecem e este arquivo deve ser atualizado):

- [docs/product/glossario.md](docs/product/glossario.md)
- [docs/product/regras-negocio-mvp-alfabetizacao.md](docs/product/regras-negocio-mvp-alfabetizacao.md) — RN001 a RN123
- [docs/product/decisoes-etapa1-etapa2-2026-05-17.md](docs/product/decisoes-etapa1-etapa2-2026-05-17.md) — escopo congelado p/ Etapas 1 e 2
- [docs/product/etapa1-web-execucao.md](docs/product/etapa1-web-execucao.md)
- [docs/product/wireframe.md](docs/product/wireframe.md)
- [docs/architecture/integracao-web-mobile-etapa1.md](docs/architecture/integracao-web-mobile-etapa1.md)
- [docs/architecture/realtime-contract-v1.md](docs/architecture/realtime-contract-v1.md)
- [docs/operations/contributing.md](docs/operations/contributing.md)
- [docs/meetings/ata-reuniao-alfabetizador-2026-04-06.md](docs/meetings/ata-reuniao-alfabetizador-2026-04-06.md)

---

## 1. Glossário de produto (obrigatório)

### Tema

**Tema = universo de interesse do alfabetizando** (animais, comida, zona rural, profissões, desenhos animados, esportes). É vetor pedagógico de engajamento — define as imagens e áudios usados, **não** a sequência de aprendizado.

**Tema NÃO é estrutura didática.** Nunca use como tema: "Alfabeto — Vogais", "Etapa 2 — Reconhecimento", "Fonemas". Essas são classificações de aprendizado e vão no **módulo** ou na **aula**.

Sempre que sugerir placeholder, exemplo ou dica no wizard: use universos de interesse (Animais, Comida, Profissões).

### Módulo

Agrupamento didático dentro de um tema. Aqui sim entra a estrutura de aprendizado: "Etapa 2 — Reconhecimento da letra A", "Fonemas vocálicos", etc. Atributo-chave: `stage_number` (etapa).

### Aula (activity)

Tela ou exercício individual executado no app mobile. Tipos: `video`, `audio`, `quiz`, `letra`. Exercícios estruturados (RN121/RN123) usam payload JSON no schema `letras-stage2-v1`.

### Hierarquia

```
Tema (universo de interesse)
 └── Módulo (estrutura didática, tem stage_number)
      └── Aula (tela/exercício)
           └── Mídias (imagens, áudios, vídeos)
```

### Perfis de usuário

- **Alfabetizando**: aluno adulto. Usa o app mobile.
- **Alfabetizador (Tutor)**: voluntário/professor que acompanha o alfabetizando. Usa o painel web.
- **Admin/Coordenação**: acesso completo ao painel web.

### Telas-base (blueprints)

Templates de tela importados via `/admin/conteudo/importar-telas`. Servem de base visual para montar aulas no wizard. Não são publicadas diretamente.

### Etapa (stage)

Divisão macro da jornada: Etapa 1 (tutoriais, base), Etapa 2 (reconhecimento de letras). Atributo do módulo, não do tema.

---

## 2. Decisões de produto vigentes

Decisões tomadas em reuniões ou no planejamento do MVP que condicionam o código:

- **POC em modo individual**: sem suporte a grupos na POC atual. Não sugira features de grupo antes de confirmar.
- **App mobile separado do app do alfabetizador**: estratégia atual mantém **dois apps Expo distintos** (alfabetizador, alfabetizando). Avaliação técnica ainda em curso, mas a tendência de curto prazo é manter separado.
- **Cabeçalho das telas de aula**: sempre exibir o nome do alfabetizando.
- **Progresso visível**: percentual ou "tela X de Y" dentro da etapa.
- **Cidade/UF**: campo operacional para futura realocação de alfabetizador.
- **Cadastro**: exige CPF **ou** passaporte + telefone válido (RN003, RN005, RN025, RN027).
- **Tutoriais obrigatórios**: bloqueiam liberação da alfabetização até conclusão (RN012, RN016).
- **Listas**: paginação em blocos de 10 com "carregar mais" (RN024, RN090).

### Recorte de MVP

- **MVP-1 (base operacional)**: Auth, cadastro, vínculo tutor↔aluno, home com estados vazios, tutoriais, notificações in-app. RN001-014, RN017-036, RN084, RN097-101, RN103, RN105-107, RN119-120.
- **MVP-2 (ensino assistido)**: Etapa 1 completa, fluxos principais de Etapa 2 sem IA, pedido de ajuda, lock/unlock. RN037-059, RN071-076, RN108-118, RN121-123.
- **MVP-3 (avançado)**: IA para avaliação de foto, pontuação completa, certificados PDF, WhatsApp/SMS. RN060-070, RN077-096, RN102, RN104.

### Dependências externas não implementadas

SMS (RN004, RN026), WhatsApp (RN058, RN068, RN093, RN109, RN119), IA de avaliação de foto (RN077, RN114-116), PDF dinâmico (RN049, RN062, RN092), publicação em redes sociais (RN050, RN063, RN086).

---

## 3. Arquitetura e integração

### Fonte única de verdade

Web e mobile apontam para o **mesmo projeto Supabase**. Nunca duplicar usuário por plataforma. Tabelas canônicas compartilhadas:

- `profiles`, `tutor_student_links`
- `learning_themes`, `learning_modules`, `learning_activities`, `content_assets`
- `activity_progress`, `sync_events`
- Schema mobile (Prisma): `Educator`, `LearnerProfile`, `Completion`, `Theme`, `LearningUnit`, `Activity`

### Storage buckets

`cms-videos`, `cms-images`, `cms-audios`, `mobile-blueprints`.

### Contrato de sincronização

Toda escrita relevante (cadastro, vínculo, progresso, publicação de conteúdo) **deve registrar evento em `sync_events`** com: `source_platform` (`web`/`mobile`), `event_type` (`profile.created`, `link.updated`, `progress.updated`, `content.published`, etc.), `entity_type`, `entity_id`, `payload`.

Regras de consistência: IDs UUID, datas ISO-8601 UTC, conflito resolvido por último `updated_at`, reconciliação por `updated_at > ultimo_sync` em lotes, SLA de 5 segundos para refletir cadastro no painel.

### Contrato realtime v1

WebSocket: `ws://localhost:8080/ws` (dev), `wss://api.letras.cloud/ws` (prod). Envelope `{type, payload, emittedAt, version: "1.0", traceId?}`. Eventos principais: `presence.snapshot`, `presence.user_joined`, `presence.user_left`, `session.metrics_updated`, `alert.created`, `pong`. Frontend deve ignorar eventos desconhecidos sem quebrar. Ver [docs/architecture/realtime-contract-v1.md](docs/architecture/realtime-contract-v1.md) para detalhes.

---

## 4. Estrutura do monorepo

- `apps/web/` — painel React + Vite (deploy: `painel.letras.cloud`)
- `apps/api/` — API Express (mesmo host, rota `/api/v1`)
- `packages/*` — contratos e libs compartilhadas
- `infra/supabase/migrations/` — migrations SQL
- `docs/` — documentação de produto, arquitetura, operações
- `artifacts/` — scripts de deploy gerados
- `C:\Projetos\letras-mobile-ref\` — app Expo/React Native (repo separado, deploy: `mobile.letras.cloud`)

### Stack web

React 18, React Router 7 (Data Mode), Tailwind CSS v4, Lucide React, Recharts, Vite, Supabase JS, Supabase Auth.

### Variáveis de ambiente

`apps/web/.env.production` é necessário para o build carregar `VITE_API_BASE_URL=https://painel.letras.cloud/api/v1`. Sem ele, o cliente cai no default `http://localhost:8080/api/v1` e o painel em produção quebra com "Failed to fetch".

---

## 5. Nomenclatura de UI

A seção `/admin/conteudo` é chamada **"Aulas e Mídias"** na sidebar e cabeçalhos. **Nunca use "CMS"** em texto voltado ao usuário — só internamente em código (variáveis/tipos `cms*` são legado aceito, mas copy visível não).

Vocabulário de UI preferido: "aulas", "mídias", "temas", "módulos", "telas-base". Evite: "conteúdos", "assets", "folders", "CMS", "sessões".

---

## 6. Convenções de código e contribuição

### Branches

- `feat/web/<issue>-<slug>`
- `feat/api/<issue>-<slug>`
- `fix/web/<issue>-<slug>`
- `fix/api/<issue>-<slug>`
- `chore/<issue>-<slug>`

### Commits (Conventional Commits)

- `feat(web): add online users widget`
- `feat(api): add cadastro endpoint`
- `fix(web): handle reconnect timeout`
- `chore(repo): reorganize monorepo structure`

### PRs

Toda issue vira PR dedicado (1 issue = 1 PR). PR deve fechar a issue via `Closes #<num>`. Merge só após review + checks verdes. Evitar PRs gigantes.

---

## 7. Deploy

### Painel web (painel.letras.cloud)

Build local com `VITE_API_BASE_URL` correto (garantido pelo `apps/web/.env.production`), depois upload via Paramiko SFTP usando um script em `artifacts/deploy_painel_<data>.py`. Padrão:

1. Upload `apps/web/dist/` para `/srv/letras-painel/_releases/painel-<timestamp>/`
2. Backup de `/srv/letras-painel/dist` para `_releases/painel-<timestamp>-prelive/`
3. Promove release nova para `dist/`
4. Smoke test via `curl` em `https://painel.letras.cloud/` e `/api/v1/painel/conteudo`

Infra: host Linux (root@76.13.160.193). Não usar sshpass/plink (não disponíveis no ambiente Windows). Paramiko é o caminho.

### Mobile (mobile.letras.cloud)

App Expo separado, repo `C:\Projetos\letras-mobile-ref`. Deploy web mobile usa Nginx vhost isolado em `mobile.letras.cloud` com TLS via certbot.

---

## 8. Fluxo operacional canônico (para contexto ao implementar features)

1. Alfabetizador se cadastra no painel web e completa tutoriais obrigatórios.
2. Alfabetizador cadastra alfabetizando informando dados essenciais (nome, telefone, CPF/passaporte).
3. Na Etapa 2 do app mobile, alfabetizando informa CPF/passaporte ou telefone para solicitar vínculo.
4. Alfabetizador recebe notificação e confirma/nega o vínculo com motivo obrigatório em caso de recusa.
5. Após vínculo, acompanhamento ocorre a distância pelo painel web (dashboard, fila de atendimento, timeline por aluno).
6. Admin publica aulas no `/admin/conteudo`; publicação sincroniza automaticamente com o app mobile.
7. App mobile grava `activity_progress` e `sync_events` conforme aluno avança.
8. Painel web consome progresso via reconciliação + canal realtime.

---

## 9. Pontos de cautela ao sugerir código

- **Não introduza mocks** quando há endpoint real: os valores canônicos (`VITE_USE_MOCKS=false`, `VITE_USE_SUPABASE_AUTH=true`) devem ser respeitados em produção.
- **Nunca remova `apps/web/.env.production`** — base do build de produção.
- **Não duplicar entidades** entre schema painel e schema mobile. Use o best-effort de sync existente.
- **Migrations SQL** devem ir em `infra/supabase/migrations/` com timestamp no nome (`YYYYMMDD_descricao.sql`) e ser aplicadas no Supabase antes de código dependente ser deployado.
- **Inconsistências conhecidas em RNs**: `RN006` duplicado, `RN010` sem valor numérico definido, `RN015` precisa detalhamento. Não assumir — confirmar com produto.
