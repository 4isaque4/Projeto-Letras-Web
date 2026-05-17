# Handoff de sessão — 2026-05-13

Snapshot do que foi configurado nesta máquina e nesta sessão. Use como ponto
de partida ao continuar o trabalho em outra conta Claude / nova sessão.

## 1. Stack já configurada (independente de conta)

Tudo abaixo está versionado neste repo (ou em `letras-mobile-ref`) e **continua
disponível em qualquer conta** que abra estes diretórios:

### Skills do projeto

Em [.claude/skills/](../../.claude/skills/) — aparecem como slash-commands
após Reload Window:

- **`/deploy-mobile`** — build do Expo web + deploy SFTP em
  `mobile.letras.cloud` + smoke test + rollback. Encapsula
  `artifacts/deploy_mobile_web_20260506.py`.
- **`/deploy-painel`** — `pnpm --filter web build` + deploy SFTP em
  `painel.letras.cloud` + `systemctl restart letras-painel-api` + smoke test.
  Encapsula `artifacts/deploy_painel_20260506.py`.

### Scripts de deploy (Paramiko via SFTP)

- [artifacts/deploy_mobile_web_20260506.py](../../artifacts/deploy_mobile_web_20260506.py)
- [artifacts/deploy_painel_20260506.py](../../artifacts/deploy_painel_20260506.py)

Credenciais SSH estão hardcoded no topo de cada script (root@76.13.160.193).

### Convenções de produto/código

Estão consolidadas no [CLAUDE.md](../../CLAUDE.md) — leia primeiro. Em
especial:

- **"Tema"** é universo de interesse (animais, comida), não estrutura
  didática. Estrutura vai em **módulo** ou **aula**.
- **Aulas e Mídias** é o nome canônico da seção em `/admin/conteudo`. Não
  use "CMS" em copy de UI.
- **Cabeçalho de tela de aula** sempre identifica o **alfabetizando** (foi
  o que motivou o fix `roleLabel` de 2026-05-11).
- **Mesma fonte de dados Supabase para web e mobile** — não duplicar
  entidades. Toda escrita relevante registra evento em `sync_events`.

## 2. MCPs configurados (esta conta — não migram)

Os 3 MCPs abaixo estão registrados em
`C:\Users\Black\.claude.json` (user scope). **Trocar de conta Claude
preserva o arquivo, mas trocar de usuário Windows ou reinstalar perde**.
A nova conta deve re-registrar via comandos `claude mcp add`.

Comandos exatos que foram usados (sem tokens — buscar em vault/notas
pessoais; nunca commitar):

```bash
# Figma — leitura de frames/componentes/tokens
claude mcp add --scope user \
  --env FIGMA_API_KEY=<figma_pat> \
  --transport stdio figma \
  npx -- -y figma-developer-mcp --stdio

# Sentry — issues/releases da org spin-xs (projeto react-native = letras-mobile)
claude mcp add --scope user --transport stdio sentry \
  npx -- -y @sentry/mcp-server \
  --access-token=<sentry_auth_token> \
  --host=sentry.io \
  --organization-slug=spin-xs

# GitHub — read/write em issues, PRs, conteúdo. Usa PAT do `gh` CLI.
claude mcp add --scope user \
  --env GITHUB_PERSONAL_ACCESS_TOKEN=$(gh auth token) \
  --transport stdio github-pat \
  npx -- -y @modelcontextprotocol/server-github
```

Verificar saúde com `claude mcp list` — espera-se 3 ✓ Connected (`figma`,
`sentry`, `github-pat`).

### Por que `github-pat` em vez do plugin oficial

O plugin `github@claude-plugins-official` aponta para
`https://api.githubcopilot.com/mcp/` que requer assinatura **GitHub
Copilot**. Não temos. Substituído por `github-pat` (servidor
open-source MCP), que aceita o PAT que o `gh` CLI já tem (escopos
`repo`, `workflow`, `read:org`).

## 3. Estado atual em produção

### mobile.letras.cloud

- Release ativa: `20260511-093533-mobile-web` (deploy de 2026-05-11)
- Rollback disponível em
  `/srv/letras-mobile-web/_releases/20260511-093533-mobile-web-prelive`
  e em `mobile.prev-20260511-*`
- Branch: `feat/etapa1-prod-web-mobile-unificacao` (no repo
  `letras-mobile-ref`)
- Últimos commits que entraram nesta release:
  - `10d4d98` fix(mobile): corrige telas do fluxo do alfabetizando
  - `64c14f6` fix(mobile): funde audio standalone no exercicio e impede
    sobreposicao
  - `1fd86df` chore(mobile): adicionar .env.example com vars do Expo e
    Sentry

Aula da Letra A tem 7 telas (eram 9 — bloco do educador filtrado, bloco
de áudio standalone fundido no exercício).

### painel.letras.cloud

- Branch: `feat/painel-mobile-integracao-mvp` (neste repo)
- Última release foi anterior à sessão atual — checar `git log` na VPS
  para timestamp exato.
- Sem alterações pendentes não-deployadas nesta sessão.

## 4. Sentry — estado da integração

- Org: `spin-xs`. Team: `letras-painel`.
- Projetos:
  - **`react-native`** (platform React Native) — usado pelo `letras-mobile-ref`.
  - **`painel-web`** (platform JavaScript/React) — usado pelo painel web.
    Criado em 2026-05-17.
- DSNs (public-safe, podem ficar no bundle):
  - Mobile: salvo em `apps/mobile-app/.env` (gitignored) e replicado em
    `.env.example`. Lido por `process.env.EXPO_PUBLIC_SENTRY_DSN` em
    `apps/mobile-app/App.tsx`.
  - Painel: `VITE_SENTRY_DSN` em `apps/web/.env.production` e `.env.example`.
    Lido por `apps/web/src/app/core/observability/sentry.ts`.
- SDK instrumentado em ambos:
  - Mobile: `@sentry/react-native@^8.11.1` via `@sentry/wizard`. App.tsx
    chama `Sentry.init` (guarded por DSN) e `Sentry.wrap(App)`. Plugin
    `@sentry/react-native/expo` registrado em `app.json`. `metro.config.js`
    usa `getSentryExpoConfig` para symbolication.
  - Painel: `@sentry/react@^10.53.1`. `main.tsx` chama `initSentry()` e
    embrulha `<App>` em `Sentry.ErrorBoundary`. Init habilita
    `browserTracingIntegration` (10% sample em prod) e
    `replayIntegration` (apenas on-error).
- **Faltando ainda:** upload automático de source maps no deploy.
  Mobile: precisa de `SENTRY_AUTH_TOKEN` com escopo `project:releases`
  configurado no EAS/CI. Painel: integrar `@sentry/vite-plugin` no build,
  também com auth token de release no CI (não usar user token pessoal).

## 5. Como retomar trabalho

1. Abrir VS Code/Claude Code com `cd "c:\Projetos\Projeto Letras - Sandbox Web"`.
2. Ler [CLAUDE.md](../../CLAUDE.md) — produto + convenções.
3. Ler este arquivo — estado da última sessão.
4. Se for outra conta Claude: re-rodar os 3 `claude mcp add` da seção 2
   (precisará dos tokens que estão fora do repo).
5. `claude mcp list` para confirmar 3 ✓ Connected.
6. Reload Window — skills `/deploy-mobile` e `/deploy-painel` aparecem.

## 6. Pendências conhecidas

- Source map upload automático no deploy do painel e do mobile (Sentry
  release flow). Hoje os crashes chegam no Sentry, mas sem stack trace
  resolvido pro código original.
- Validar um test event real no Sentry depois do próximo deploy mobile
  (`Sentry.captureException(new Error('test'))` em algum ponto temporário).
- Avaliar se o slug `react-native` no Sentry deve ser renomeado para
  `letras-mobile` (cosmético, mas alinha com a nomenclatura do produto).
- Painel não tem Figma URL conectada ainda — quando houver protótipo
  de alguma tela, passar URL completa (com `node-id`) para o MCP buscar
  layout/tokens.
