# Consolidação em monorepo — fases 0 e 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar `IsraelNunes/letras` dentro de `4isaque4/Projeto-Letras-Web`, preservando o histórico dos dois, com tudo buildando e o Quality Gate verde.

**Architecture:** O repositório web é a base. O mobile entra via `git subtree` num prefixo temporário; os diretórios que ficam são movidos para o lugar definitivo (`apps/mobile`, `packages/shared-types`, `packages/shared-utils`) e o resto é removido. Configuração de raiz, ferramentas de qualidade, workflows e caminhos acoplados são reconciliados até o gate passar.

**Tech Stack:** pnpm workspaces, Node 22, Expo SDK 54 / React Native, React 18 + Vite, Express ESM, Socket.IO, Supabase, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-07-27-monorepo-contratos-design.md` (fases 0 e 1 da seção "Sequência").

## Nota sobre verificação

Esta é uma migração estrutural, não desenvolvimento de feature — não há ciclo TDD vermelho/verde para "mover arquivo". A verificação de cada tarefa é **executar o gate existente e comparar com a saída esperada**, que está escrita em cada passo. Onde um teste de regressão genuíno cabe (cobertura do verificador de copy), ele está incluído.

## Global Constraints

- Gerenciador: **pnpm 10.5.2** (`packageManager` no `package.json` raiz).
- Node: **22** no CI; `pnpm install --frozen-lockfile` no Quality Gate.
- Todo trabalho ocorre na branch **`arch/monorepo-contratos`**, no worktree `.worktrees/ci-gate-deploy`. Nada vai para `main` antes da Tarefa 7.
- O repo `IsraelNunes/letras` **não é apagado** ao final — permanece como arquivo histórico e fallback.
- Nomes de pacote seguem o padrão existente do repo base: `@letras/<nome>`.
- Nenhum nome de evento de socket é alterado nestas fases (decisão do spec).
- A API NestJS (`apps/api` do mobile-ref) **não é importada** — sua remoção é a fase 4 do spec e é antecipada aqui por não ter consumidor.
- Não rodar `git worktree remove` nem apagar diretórios de worktree: o ambiente Windows bloqueia com "Device or resource busy".

---

## Estrutura de arquivos

Estado alvo ao fim da Tarefa 7:

```
Projeto-Letras-Web/                     branch arch/monorepo-contratos
├── apps/
│   ├── api/          (inalterado)      Express — @letras/api
│   ├── web/          (inalterado)      Vite  — @letras/web
│   └── mobile/       NOVO              Expo  — @letras/mobile   (era apps/mobile-app)
├── packages/
│   ├── contracts/    (inalterado)      será substituído na fase 2
│   ├── shared-types/ NOVO              vindo do mobile-ref
│   └── shared-utils/ NOVO              vindo do mobile-ref
├── docs/
│   └── Conteudos das telas/  NOVO      vindo do mobile-ref (a API lê deste caminho)
├── tools/
│   ├── deploy/
│   │   ├── deploy_painel_ci.py  (inalterado)
│   │   └── deploy_mobile_web_ci.py  NOVO
│   └── quality/
│       ├── check-mobile-env.mjs  NOVO
│       ├── check-product-copy.mjs  MODIFICADO (cobre apps/mobile)
│       └── check-production-env.mjs  (inalterado)
├── .github/workflows/
│   ├── quality.yml       MODIFICADO   passa a cobrir mobile também
│   ├── deploy-painel.yml MODIFICADO   ganha filtro de caminho
│   └── deploy-mobile.yml NOVO         com filtro de caminho
├── tsconfig.base.json    NOVO         shared-types depende dele
├── pnpm-workspace.yaml   MODIFICADO
└── package.json          MODIFICADO
```

**Responsabilidade de cada arquivo tocado:**

| Arquivo | Responsabilidade |
|---|---|
| `package.json` (raiz) | Scripts unificados; `check` cobre os três apps |
| `pnpm-workspace.yaml` | União das permissões de build dos dois repos |
| `tsconfig.base.json` | Base de compilação que `packages/shared-types` estende |
| `tools/quality/check-mobile-env.mjs` | Valida `.env.example` do mobile e da API |
| `tools/quality/check-product-copy.mjs` | Verifica copy proibida em `apps/web/src` **e** `apps/mobile/src` |
| `tools/deploy/deploy_mobile_web_ci.py` | Export Expo → SFTP → promoção no VPS |
| `.github/workflows/quality.yml` | Gate único dos três apps |
| `apps/api/src/services/letrasDataService.js` | Deixa de apontar para repositório irmão |

---

## Task 1: Fase 0 — remover o stub `apps/web` do mobile-ref

Prepara o repositório de origem para que a importação não traga código morto.
`apps/educator-app` e `apps/learner-app` **não estão versionados** (só sobraram
`node_modules` locais), então não geram commit — apenas limpeza local.

**Repositório:** `C:\Projetos\letras-mobile-ref` (branch `main`)

**Files:**
- Delete: `apps/web/` (5 arquivos versionados: `index.html`, `package.json`, `src/App.tsx`, `src/main.tsx`, `src/styles.css`)
- Modify: `package.json` (remover script `dev:web`)
- Modify: `tools/quality/check-product-copy.mjs:4`

**Interfaces:**
- Consumes: nada.
- Produces: `IsraelNunes/letras@main` sem `apps/web`, com `pnpm check` verde. A Tarefa 2 importa exatamente este estado.

- [ ] **Step 1: Confirmar o que está versionado antes de apagar**

```bash
cd "/c/Projetos/letras-mobile-ref"
git status --short
git ls-files apps/web
```

Esperado: working tree limpo (fora de untracked conhecidos) e a listagem dos 5 arquivos de `apps/web`. Se o working tree tiver alterações não commitadas, **pare** e resolva antes de continuar.

- [ ] **Step 2: Remover as carcaças não versionadas**

```bash
cd "/c/Projetos/letras-mobile-ref"
rm -rf apps/educator-app apps/learner-app
git status --short
```

Esperado: `git status` não muda (eram apenas `node_modules` não rastreados).

- [ ] **Step 3: Remover o stub `apps/web` do versionamento**

```bash
cd "/c/Projetos/letras-mobile-ref"
git rm -r apps/web
```

Esperado: `rm 'apps/web/index.html'` … 5 linhas.

- [ ] **Step 4: Remover a referência a `apps/web` no verificador de copy**

Em `tools/quality/check-product-copy.mjs`, linha 4:

```js
const roots = ["apps/mobile-app/src", "apps/web/src"];
```

passa a ser:

```js
const roots = ["apps/mobile-app/src"];
```

- [ ] **Step 5: Remover o script `dev:web` do `package.json` raiz**

Em `package.json`, apagar a linha:

```json
    "dev:web": "pnpm --filter web dev",
```

- [ ] **Step 6: Rodar o gate completo do mobile-ref**

```bash
cd "/c/Projetos/letras-mobile-ref"
pnpm check
```

Esperado: termina com sucesso. As linhas `[quality] Ambiente mobile/API OK.` e `[quality] Copy de produto OK.` devem aparecer, e o build do Expo web deve concluir com `Exported: dist-web-check`.

- [ ] **Step 7: Commit e push**

```bash
cd "/c/Projetos/letras-mobile-ref"
git add -A
git commit -m "chore(repo): remove stub apps/web antes da consolidacao

O apps/web deste repositorio era um stub de 2 arquivos (resquicio de
abril) que ainda era buildado no CI a cada push. O painel real vive no
repositorio web. Remocao previa para que a consolidacao em monorepo nao
importe codigo morto."
git push origin main
```

Esperado: push aceito. O Quality Gate do mobile-ref deve ficar verde — conferir com `gh run list --limit 2`.

---

## Task 2: Importar o mobile via subtree, preservando histórico

**Repositório:** worktree `C:\Projetos\Projeto Letras - Sandbox Web\.worktrees\ci-gate-deploy` (branch `arch/monorepo-contratos`)

**Files:**
- Create: `apps/mobile/` (todo o conteúdo de `apps/mobile-app` do mobile-ref)
- Create: `packages/shared-types/`, `packages/shared-utils/`
- Create: `tsconfig.base.json`
- Create: `tools/quality/check-mobile-env.mjs`
- Create: `tools/deploy/deploy_mobile_web_ci.py`
- Create: `docs/Conteudos das telas/`
- Create: `.github/workflows/deploy-mobile.yml`

**Interfaces:**
- Consumes: `IsraelNunes/letras@main` no estado produzido pela Tarefa 1.
- Produces: os diretórios acima posicionados; `@letras/shared-types` e `@letras/shared-utils` resolvíveis como workspace; o pacote mobile ainda chamado `mobile-app` (renomeado na Tarefa 4). O build **ainda não passa** neste ponto — quem conserta é a Tarefa 3.

- [ ] **Step 1: Confirmar a branch e o estado limpo**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git branch --show-current
git status --short
```

Esperado: `arch/monorepo-contratos` e working tree limpo.

- [ ] **Step 2: Registrar o repositório de origem**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git remote add mobile-origin https://github.com/IsraelNunes/letras.git
git fetch mobile-origin main
```

Esperado: `* branch main -> FETCH_HEAD`.

- [ ] **Step 3: Trazer o repositório inteiro num prefixo temporário**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git subtree add --prefix=.migracao-mobile mobile-origin main
```

Esperado: `Added dir '.migracao-mobile'`. O histórico do mobile passa a existir no grafo — confirmar com `git log --oneline -3`.

- [ ] **Step 4: Mover para o lugar definitivo o que fica**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git mv .migracao-mobile/apps/mobile-app apps/mobile
git mv .migracao-mobile/packages/shared-types packages/shared-types
git mv .migracao-mobile/packages/shared-utils packages/shared-utils
git mv .migracao-mobile/tsconfig.base.json tsconfig.base.json
git mv .migracao-mobile/tools/quality/check-mobile-env.mjs tools/quality/check-mobile-env.mjs
git mv .migracao-mobile/tools/deploy/deploy_mobile_web_ci.py tools/deploy/deploy_mobile_web_ci.py
git mv ".migracao-mobile/docs/Conteudos das telas" "docs/Conteudos das telas"
git mv .migracao-mobile/.github/workflows/deploy-mobile.yml .github/workflows/deploy-mobile.yml
```

Esperado: nenhum erro. `docs/Conteudos das telas` é obrigatório — `apps/api/src/services/letrasDataService.js` lê deste caminho (corrigido na Tarefa 5).

- [ ] **Step 5: Remover o restante do prefixo temporário**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git rm -r --quiet .migracao-mobile
ls .migracao-mobile 2>/dev/null || echo "removido"
```

Esperado: `removido`. Isto descarta a API NestJS, o `package.json`/`pnpm-workspace.yaml` antigos do mobile-ref, seus `.githooks` e demais duplicatas.

- [ ] **Step 6: Conferir o resultado da movimentação**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
ls apps/ packages/
test -f apps/mobile/package.json && echo "mobile OK"
test -f packages/shared-types/src/index.ts && echo "shared-types OK"
test -d "docs/Conteudos das telas" && echo "docs OK"
```

Esperado: `apps/` contém `api web mobile`; `packages/` contém `contracts shared-types shared-utils`; as três linhas `OK`.

- [ ] **Step 7: Commit**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git add -A
git commit -m "feat(repo): importa o app mobile via subtree preservando historico

Traz IsraelNunes/letras via git subtree num prefixo temporario e move
para o lugar definitivo o que permanece: apps/mobile (era
apps/mobile-app), packages/shared-types, packages/shared-utils,
tsconfig.base.json, o verificador de env do mobile, o script de deploy e
docs/Conteudos das telas (lido pela API na importacao de conteudo).

A API NestJS nao vem junto: nao tem consumidor em producao e usa um
conjunto de tabelas disjunto do que a Express usa (fase 4 do spec,
antecipada aqui). O repositorio de origem permanece como arquivo.

Build ainda nao passa neste commit — a reconciliacao da configuracao de
raiz e o proximo passo."
```

Esperado: commit criado. O hook de pre-commit roda `pnpm quality` e deve passar (ainda usa os verificadores antigos, que só olham `apps/web/src`).

---

## Task 3: Reconciliar a configuração de raiz

Faz o workspace enxergar os três apps e os dois pacotes novos, e o `pnpm install` funcionar.

**Files:**
- Modify: `package.json` (raiz)
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Consumes: a árvore posicionada pela Tarefa 2.
- Produces: `pnpm install` resolvendo os 5 pacotes (`@letras/api`, `@letras/web`, `mobile-app`, `@letras/shared-types`, `@letras/shared-utils`, `@letras/contracts`); scripts `build:shared`, `build:mobile:web` e `typecheck` disponíveis na raiz. O pacote mobile ainda se chama `mobile-app` — a Tarefa 4 renomeia.

- [ ] **Step 1: Atualizar `pnpm-workspace.yaml`**

Conteúdo integral do arquivo passa a ser:

```yaml
packages:
  - "apps/*"
  - "packages/*"
allowBuilds:
  '@sentry/cli': true
  '@tailwindcss/oxide': true
  esbuild: true
```

As entradas `@nestjs/core`, `@prisma/client`, `@prisma/engines`, `prisma` e o bloco `onlyBuiltDependencies` do arquivo do mobile-ref não são trazidos: pertenciam à API NestJS, que não foi importada.

- [ ] **Step 2: Atualizar o `package.json` da raiz**

Adicionar o campo `packageManager` logo após `"version"`:

```json
  "packageManager": "pnpm@10.5.2",
```

Substituir o bloco `"scripts"` inteiro por:

```json
  "scripts": {
    "prepare": "node tools/quality/install-git-hooks.mjs",
    "dev": "concurrently -k -n web,api -c cyan,magenta \"pnpm --filter @letras/web dev\" \"pnpm --filter @letras/api dev\"",
    "dev:local": "pnpm dev",
    "dev:web": "pnpm --filter @letras/web dev",
    "dev:front": "pnpm run dev:web",
    "dev:api": "pnpm --filter @letras/api dev",
    "dev:mobile": "pnpm --filter mobile-app start",
    "build": "pnpm --filter @letras/web build",
    "build:web": "pnpm --filter @letras/web build",
    "build:front": "pnpm run build:web",
    "build:shared": "pnpm --filter @letras/shared-types build && pnpm --filter @letras/shared-utils build",
    "build:mobile:web": "pnpm --filter mobile-app build:web",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm --filter @letras/api test",
    "quality": "node tools/quality/check-production-env.mjs && node tools/quality/check-mobile-env.mjs && node tools/quality/check-product-copy.mjs",
    "check:fast": "pnpm quality && pnpm test",
    "check": "pnpm quality && pnpm build:shared && pnpm typecheck && pnpm test && pnpm build && pnpm build:mobile:web",
    "hooks:install": "node tools/quality/install-git-hooks.mjs",
    "review:uncommitted": "node tools/quality/codex-review.mjs --uncommitted",
    "review:commit": "node tools/quality/codex-review.mjs --commit",
    "mobile:manifest": "node tools/scripts/generate-mobile-screen-manifest.mjs",
    "conteudo:importar-video-aula": "node tools/scripts/import-video-aula-real.mjs"
  },
```

No bloco `"pnpm"` ao final do arquivo, acrescentar `@sentry/cli`:

```json
  "pnpm": {
    "onlyBuiltDependencies": [
      "@sentry/cli",
      "@tailwindcss/oxide",
      "esbuild"
    ]
  }
```

- [ ] **Step 3: Instalar as dependências do workspace unificado**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
pnpm install
```

Esperado: conclui sem erro e resolve os 6 pacotes do workspace. Se o pnpm avisar que algum pacote teve o script de build ignorado (`Ignored build scripts: …`), acrescentar esse pacote a `allowBuilds` no `pnpm-workspace.yaml` **e** a `pnpm.onlyBuiltDependencies` no `package.json`, e rodar `pnpm install` de novo.

- [ ] **Step 4: Confirmar que o workspace enxerga todos os pacotes**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
pnpm ls --depth -1 --recursive
```

Esperado: a listagem inclui `@letras/api`, `@letras/web`, `@letras/contracts`, `@letras/shared-types`, `@letras/shared-utils` e `mobile-app`.

- [ ] **Step 5: Verificar que `typecheck` não quebra em pacotes sem o script**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
pnpm build:shared && pnpm typecheck
```

Esperado: `build:shared` compila os dois pacotes; `typecheck` roda nos pacotes que possuem o script e **ignora silenciosamente** os que não possuem (`@letras/web` e `@letras/api` não têm). Termina com código 0. Se o pnpm falhar por ausência do script em vez de pular, trocar o script raiz para `"typecheck": "pnpm -r --if-present typecheck"` e repetir.

- [ ] **Step 6: Commit**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git add package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(repo): reconcilia workspace e scripts de raiz

Une os scripts dos dois repositorios num so: build:shared e
build:mobile:web passam a existir na raiz e o check cobre os tres apps.
allowBuilds vira a uniao dos dois, menos as entradas de NestJS/Prisma
que perderam o consumidor."
```

---

## Task 4: Renomear o pacote mobile para `@letras/mobile`

Alinha o mobile ao padrão de nomes do monorepo (`@letras/*`).

**Files:**
- Modify: `apps/mobile/package.json` (campo `name`)
- Modify: `package.json` (raiz — dois filtros)

**Interfaces:**
- Consumes: workspace funcional da Tarefa 3.
- Produces: o pacote passa a ser referenciável como `@letras/mobile`. As Tarefas 6 e 7 usam esse nome nos workflows.

- [ ] **Step 1: Renomear o pacote**

Em `apps/mobile/package.json`, trocar:

```json
  "name": "mobile-app",
```

por:

```json
  "name": "@letras/mobile",
```

- [ ] **Step 2: Atualizar os filtros na raiz**

Em `package.json` (raiz), as duas ocorrências de `--filter mobile-app` passam a `--filter @letras/mobile`:

```json
    "dev:mobile": "pnpm --filter @letras/mobile start",
    "build:mobile:web": "pnpm --filter @letras/mobile build:web",
```

- [ ] **Step 3: Confirmar que não restou nenhuma referência ao nome antigo**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
grep -rn "filter mobile-app\|\"mobile-app\"" --include="*.json" --include="*.yml" --include="*.mjs" . | grep -v node_modules
```

Esperado: nenhuma linha. Se aparecer alguma, atualizar para `@letras/mobile`.

- [ ] **Step 4: Reinstalar e validar o build do mobile**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
pnpm install
pnpm build:mobile:web
```

Esperado: `pnpm install` reconhece o novo nome; o export do Expo conclui com `Exported: dist-web-check`.

- [ ] **Step 5: Commit**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git add apps/mobile/package.json package.json pnpm-lock.yaml
git commit -m "chore(mobile): renomeia o pacote para @letras/mobile

Alinha ao padrao @letras/* usado pelos demais pacotes do monorepo."
```

---

## Task 5: Corrigir os caminhos acoplados à estrutura antiga

Três lugares apontam para caminhos que deixaram de existir. O mais crítico é a
API, que referenciava o **repositório irmão** por caminho relativo.

**Files:**
- Modify: `tools/quality/check-mobile-env.mjs:4`
- Modify: `tools/quality/check-product-copy.mjs:4`
- Modify: `tools/deploy/deploy_mobile_web_ci.py:43-44`
- Modify: `apps/api/src/services/letrasDataService.js:68-81`

**Interfaces:**
- Consumes: estrutura renomeada das Tarefas 2–4.
- Produces: `pnpm quality` verde cobrindo o mobile; script de deploy apontando para `apps/mobile`; API lendo conteúdo de dentro do próprio repositório. A Tarefa 6 depende do script de deploy correto.

- [ ] **Step 1: Repontar o verificador de env do mobile**

Em `tools/quality/check-mobile-env.mjs`, linha 4:

```js
const mobileExamplePath = resolve("apps/mobile-app/.env.example");
```

passa a:

```js
const mobileExamplePath = resolve("apps/mobile/.env.example");
```

As mensagens de erro nas linhas 29 e 37 citam `apps/mobile-app/.env.example` — atualizar as duas para `apps/mobile/.env.example`. A verificação de `apps/api/.env.example` (linha 5) **permanece como está**: o `apps/api` do monorepo é a Express, que possui esse arquivo.

- [ ] **Step 2: Fazer o verificador de copy cobrir o mobile**

Em `tools/quality/check-product-copy.mjs`, linha 4:

```js
const roots = ["apps/web/src"];
```

passa a:

```js
const roots = ["apps/mobile/src", "apps/web/src"];
```

Esta é a cobertura de regressão da migração: sem ela, o gate deixaria de inspecionar o código do mobile silenciosamente.

- [ ] **Step 3: Verificar que o gate de qualidade agora passa**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
pnpm quality
```

Esperado, nesta ordem:
```
[quality] Ambiente de producao do painel OK.
[quality] Ambiente mobile/API OK.
[quality] Copy de produto OK.
```

- [ ] **Step 4: Provar que o verificador de copy realmente lê o mobile**

O verificador só inspeciona arquivos `.tsx` e `.jsx` (`allowedExtensions` em
`check-product-copy.mjs:5`) e o único padrão proibido hoje é `\bCMS\b`
(linha 9). O teste precisa respeitar as duas coisas, senão passa por engano.

Inserir temporariamente, na primeira linha de
`apps/mobile/src/views/learner/LearnerLessonScreenView.tsx`:

```tsx
// verificacao temporaria do gate: CMS
```

Rodar:

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
pnpm quality
```

Esperado: **falha** com
`apps/mobile/src/views/learner/LearnerLessonScreenView.tsx:1 - Use "Aulas e Midias" em texto visivel; "CMS" fica apenas em codigo interno.`

Se passar, o `roots` não está sendo aplicado — corrigir antes de seguir. Note que
`check-product-copy.mjs:31` ignora silenciosamente raízes inexistentes, então um
caminho errado em `roots` não gera erro: só deixa de verificar.

Remover a linha inserida e rodar `pnpm quality` de novo. Esperado: passa.

- [ ] **Step 5: Corrigir os caminhos do script de deploy do mobile**

Em `tools/deploy/deploy_mobile_web_ci.py`, linhas 43-44:

```python
LOCAL_SOURCE = os.path.join(REPO_ROOT, "apps", "mobile-app", "dist-fresh-build")
LOCAL_DEPLOY = os.path.join(REPO_ROOT, "apps", "mobile-app", "dist-deploy")
```

passam a:

```python
LOCAL_SOURCE = os.path.join(REPO_ROOT, "apps", "mobile", "dist-fresh-build")
LOCAL_DEPLOY = os.path.join(REPO_ROOT, "apps", "mobile", "dist-deploy")
```

Na docstring (linha 10), trocar `apps/mobile-app/dist-fresh-build` por `apps/mobile/dist-fresh-build`.

- [ ] **Step 6: Remover o acoplamento da API ao repositório irmão**

Em `apps/api/src/services/letrasDataService.js`, o trecho das linhas 68-81:

```js
const mobileRefRootPath = resolve(monorepoRootPath, "..", "letras-mobile-ref");
```

passa a apontar para o próprio monorepo:

```js
// Antes da consolidacao, os conteudos viviam no repositorio irmao
// letras-mobile-ref. Agora vivem dentro deste monorepo.
const mobileRefRootPath = monorepoRootPath;
```

`DEFAULT_STAGE_TWO_CONTENTS_DIRECTORY_PATH` e `ALLOWED_CONTENT_IMPORT_ROOTS` derivam dessa constante e passam a resolver para `<monorepo>/docs/Conteudos das telas`, que existe desde a Tarefa 2.

- [ ] **Step 7: Confirmar que o diretório de conteúdo resolve**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
node -e "import('./apps/api/src/services/letrasDataService.js').then(()=>console.log('modulo carrega OK')).catch(e=>{console.error(e.message);process.exit(1)})"
test -d "docs/Conteudos das telas" && echo "diretorio de conteudo presente"
```

Esperado: as duas linhas de confirmação. Se o import falhar por variável de ambiente ausente, isso é esperado fora do runtime da API — nesse caso validar apenas com o `test -d` e seguir.

- [ ] **Step 8: Rodar os testes da API**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
pnpm test
```

Esperado: mesma quantidade de testes passando que antes da migração. Vários testes exigem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`; se falharem por isso, exportar valores fictícios antes:

```bash
SUPABASE_URL="https://exemplo.supabase.co" SUPABASE_SERVICE_ROLE_KEY="dummy" pnpm test
```

- [ ] **Step 9: Commit**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git add tools/quality/check-mobile-env.mjs tools/quality/check-product-copy.mjs tools/deploy/deploy_mobile_web_ci.py apps/api/src/services/letrasDataService.js
git commit -m "fix(repo): corrige caminhos acoplados a estrutura de dois repositorios

- verificadores de qualidade passam a olhar apps/mobile (o de copy nao
  cobria o mobile: sem isso o gate deixaria de inspeciona-lo em silencio)
- script de deploy aponta para apps/mobile
- a API deixa de resolver ../letras-mobile-ref por caminho relativo: os
  conteudos de importacao agora vivem dentro do monorepo"
```

---

## Task 6: Unificar CI e deploy com filtro de caminho

Evita que mexer no mobile redeploye o painel e vice-versa.

> **Desvio consciente do spec.** O filtro de caminho está listado na fase 5, não
> na 1. Foi antecipado porque o `deploy-mobile.yml` chega apontando para
> `apps/mobile-app` e **precisa** ser corrigido nesta fase de qualquer forma —
> deixá-lo pela metade significaria mergear um workflow quebrado. Como o arquivo
> já será reescrito, adicionar o filtro junto custa quase nada. O que **não** foi
> antecipado é o rename do job, pelo motivo no bloco "Interfaces" abaixo.

**Files:**
- Modify: `.github/workflows/quality.yml`
- Modify: `.github/workflows/deploy-painel.yml`
- Modify: `.github/workflows/deploy-mobile.yml`

**Interfaces:**
- Consumes: scripts de raiz da Tarefa 3, nome `@letras/mobile` da Tarefa 4 e caminhos corrigidos da Tarefa 5.
- Produces: Quality Gate cobrindo os três apps e dois deploys com filtro de caminho. **O nome do job permanece `Web/API quality`** — renomear obrigaria a alterar a branch protection no mesmo momento do merge, e um check obrigatório que deixa de existir bloqueia o PR. O rename fica para a fase 5, junto com o resto da infraestrutura.

- [ ] **Step 1: Confirmar que os secrets de deploy existem neste repositório**

O `deploy-mobile.yml` vem do mobile-ref e usa `DEPLOY_HOST`, `DEPLOY_USER` e
`DEPLOY_PASSWORD`. Eles existem no repo de origem; é preciso confirmar que
existem também aqui (o painel usa os mesmos nomes, e o VPS é o mesmo).

```bash
gh secret list -R 4isaque4/Projeto-Letras-Web
```

Esperado: a listagem inclui `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PASSWORD` e
`WEB_ENV_PRODUCTION`. Se algum dos três primeiros faltar, copiar do repo de
origem antes de seguir — sem eles o deploy do mobile falha na autenticação SSH.

- [ ] **Step 2: Fazer o Quality Gate cobrir o monorepo inteiro**

Em `.github/workflows/quality.yml`, **não alterar** `name:` do workflow nem do job.
O passo `run: pnpm check` também não muda — o script de raiz já cobre os três apps
depois da Tarefa 3.

Acrescentar apenas as variáveis que os testes da API e o export do Expo exigem, no
nível do job, logo abaixo de `timeout-minutes`:

```yaml
    env:
      SUPABASE_URL: https://exemplo.supabase.co
      SUPABASE_SERVICE_ROLE_KEY: dummy-ci-key
      EXPO_PUBLIC_API_URL: https://painel.letras.cloud/api/v1
```

- [ ] **Step 3: Dar filtro de caminho ao deploy do painel**

Em `.github/workflows/deploy-painel.yml`, o bloco `on.workflow_run` **permanece**
como está (gate implantado em 25/07). Como `workflow_run` não aceita `paths`, o
filtro é feito por passo.

Substituir o passo de checkout existente por estes dois:

```yaml
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha || github.sha }}
          fetch-depth: 2

      - name: Detectar mudancas relevantes
        id: filtro
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "deploy=true" >> "$GITHUB_OUTPUT"
          elif git diff --name-only HEAD^ HEAD | grep -qE '^(apps/web/|apps/api/|packages/contracts/|tools/deploy/deploy_painel_ci\.py)'; then
            echo "deploy=true" >> "$GITHUB_OUTPUT"
          else
            echo "deploy=false" >> "$GITHUB_OUTPUT"
            echo "Sem mudanca em apps/web, apps/api ou packages/contracts — deploy do painel dispensado."
          fi
```

Em **cada um** dos passos seguintes do job (`pnpm/action-setup`, `setup-node`,
`Restaurar .env.production`, `Instalar dependências`, `Build do painel web`,
`Instalar paramiko`, `Deploy no VPS`), acrescentar como última linha do passo:

```yaml
        if: steps.filtro.outputs.deploy == 'true'
```

- [ ] **Step 4: Reescrever o deploy do mobile para o monorepo**

O `.github/workflows/deploy-mobile.yml` trazido na Tarefa 2 ainda aponta para
`apps/mobile-app`. Substituir o **conteúdo integral** do arquivo por:

```yaml
# Deploy automático do app mobile (Expo web) em mobile.letras.cloud.
#
# Dispara só depois que o Quality Gate terminar com sucesso na main, e apenas
# se a área do mobile mudou. Secrets: DEPLOY_HOST, DEPLOY_USER, DEPLOY_PASSWORD.
name: Deploy mobile web

on:
  workflow_run:
    workflows: ["Quality Gate"]
    types: [completed]
    branches: [main]
  workflow_dispatch: {}

concurrency:
  group: deploy-mobile
  cancel-in-progress: false

jobs:
  deploy:
    if: github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha || github.sha }}
          fetch-depth: 2

      - name: Detectar mudancas relevantes
        id: filtro
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "deploy=true" >> "$GITHUB_OUTPUT"
          elif git diff --name-only HEAD^ HEAD | grep -qE '^(apps/mobile/|packages/shared-types/|packages/shared-utils/|packages/contracts/|tools/deploy/deploy_mobile_web_ci\.py)'; then
            echo "deploy=true" >> "$GITHUB_OUTPUT"
          else
            echo "deploy=false" >> "$GITHUB_OUTPUT"
            echo "Sem mudanca em apps/mobile ou nos pacotes compartilhados — deploy do mobile dispensado."
          fi

      - uses: pnpm/action-setup@v4
        if: steps.filtro.outputs.deploy == 'true'

      - uses: actions/setup-node@v4
        if: steps.filtro.outputs.deploy == 'true'
        with:
          node-version: 20
          cache: pnpm

      - name: Instalar dependências
        if: steps.filtro.outputs.deploy == 'true'
        run: pnpm install --no-frozen-lockfile

      - name: Exportar bundle web do Expo
        if: steps.filtro.outputs.deploy == 'true'
        working-directory: apps/mobile
        run: npx expo export --platform web --output-dir dist-fresh-build
        env:
          EXPO_PUBLIC_API_URL: https://painel.letras.cloud/api/v1

      - name: Instalar paramiko
        if: steps.filtro.outputs.deploy == 'true'
        run: pip install paramiko

      - name: Deploy no VPS
        if: steps.filtro.outputs.deploy == 'true'
        run: python tools/deploy/deploy_mobile_web_ci.py
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_PASSWORD: ${{ secrets.DEPLOY_PASSWORD }}
```

- [ ] **Step 5: Validar a sintaxe dos três workflows**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
python -c "
import yaml, sys
for p in ['.github/workflows/quality.yml','.github/workflows/deploy-painel.yml','.github/workflows/deploy-mobile.yml']:
    with open(p, encoding='utf-8') as f:
        yaml.safe_load(f)
    print('OK', p)
"
```

Esperado: três linhas `OK`.

- [ ] **Step 6: Commit**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git add .github/workflows/
git commit -m "ci: gate cobre os tres apps e deploys ganham filtro de caminho

O pnpm check da raiz ja cobre api, web e mobile, entao o Quality Gate
passa a validar o monorepo inteiro sem mudar de nome (renomear o job
exigiria alterar a branch protection no mesmo momento do merge).

Cada deploy so roda se a area dele mudou: mexer no mobile nao redeploya
o painel. Mudanca em packages/contracts dispara os dois, por ser
contrato compartilhado."
```

---

## Task 7: Verificação de ponta a ponta e merge para `main`

**Files:** nenhum arquivo novo — validação, push e merge.

**Interfaces:**
- Consumes: tudo das Tarefas 1–6.
- Produces: `main` com o monorepo consolidado e CI verde. A fase 2 do spec (contratos em Zod) parte deste estado.

- [ ] **Step 1: Rodar o gate completo localmente**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
SUPABASE_URL="https://exemplo.supabase.co" SUPABASE_SERVICE_ROLE_KEY="dummy" pnpm check
```

Esperado: passa de ponta a ponta — os três verificadores de qualidade, build dos pacotes compartilhados, typecheck, testes da API, build do painel e export do Expo web.

- [ ] **Step 2: Conferir que o histórico dos dois repositórios está presente**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
git log --oneline -- apps/mobile | tail -5
git log --oneline -- apps/web | tail -5
```

Esperado: as duas listagens mostram commits antigos, anteriores à migração. Se a de `apps/mobile` vier vazia ou só com o commit de subtree, o histórico não foi preservado — investigar antes de prosseguir.

- [ ] **Step 3: Push da branch**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
SUPABASE_URL="https://exemplo.supabase.co" SUPABASE_SERVICE_ROLE_KEY="dummy" git push -u origin arch/monorepo-contratos
```

Esperado: branch publicada. O hook de pre-push roda o `check` completo — pode levar vários minutos por causa do export do Expo.

- [ ] **Step 4: Abrir o PR**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
gh pr create --base main --head arch/monorepo-contratos \
  --title "Consolidacao em monorepo (fases 0 e 1)" \
  --body "Unifica IsraelNunes/letras neste repositorio, preservando o historico dos dois.

Spec: docs/superpowers/specs/2026-07-27-monorepo-contratos-design.md
Plano: docs/superpowers/plans/2026-07-27-consolidacao-monorepo-fases-0-1.md

- apps/mobile (era apps/mobile-app), packages/shared-types e shared-utils importados via subtree
- API NestJS nao importada: sem consumidor em producao e com tabelas disjuntas das da Express
- caminhos acoplados corrigidos, incluindo a API que resolvia ../letras-mobile-ref
- Quality Gate unico cobrindo os tres apps; deploys com filtro de caminho

Contratos em Zod sao a proxima fase, em PR separado."
```

- [ ] **Step 5: Acompanhar o CI**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
gh pr checks --watch
```

Esperado: `Web/API quality` verde — é o check obrigatório da branch protection, e é ele que agora valida os três apps. Nenhum deploy deve rodar ainda (os deploys só disparam a partir de `main`).

- [ ] **Step 6: Merge**

```bash
cd "/c/Projetos/Projeto Letras - Sandbox Web/.worktrees/ci-gate-deploy"
gh pr merge --merge
```

Esperado: merge concluído. Em seguida, o Quality Gate roda em `main` e, ao ficar verde, dispara **os dois** deploys — a migração toca `apps/web`, `apps/api` e `apps/mobile`.

- [ ] **Step 7: Confirmar produção**

```bash
gh run list --limit 4 -R 4isaque4/Projeto-Letras-Web
curl -sS -o /dev/null -w "painel: %{http_code}\n" https://painel.letras.cloud/
curl -sS -o /dev/null -w "mobile: %{http_code}\n" https://mobile.letras.cloud/
curl -sS -o /dev/null -w "api: %{http_code}\n" "https://painel.letras.cloud/api/v1/painel/conteudo?scope=cms&published=true"
```

Esperado: os deploys concluídos com `success` e os três endpoints em `200`. Um 502 momentâneo logo após o deploy do painel é esperado (reinício da API) — repetir após alguns segundos.

- [ ] **Step 8: Registrar o estado do repositório de origem**

Não apagar `IsraelNunes/letras`. Abrir uma issue lá registrando a consolidação:

```bash
gh issue create -R IsraelNunes/letras \
  --title "Repositorio consolidado em 4isaque4/Projeto-Letras-Web" \
  --body "O codigo deste repositorio foi consolidado no monorepo em
https://github.com/4isaque4/Projeto-Letras-Web (apps/mobile,
packages/shared-types, packages/shared-utils), com historico preservado.

Este repositorio permanece como arquivo historico. Novo trabalho no
mobile deve ocorrer no monorepo."
```

---

## Fora do escopo destas fases

Conforme o spec, cada um destes tem aprovação própria e **não** deve ser feito aqui:

- Criar `packages/contracts` em Zod (fase 2)
- Relatório de conformidade e validação de conteúdo (fase 3)
- Projeto Supabase de desenvolvimento e `pnpm dev` unificado (fase 5)
- Renomear o job do Quality Gate de `Web/API quality` para algo que reflita o
  monorepo, atualizando o check obrigatório da branch protection junto (fase 5)
- Dropar as ~20 tabelas órfãs do Prisma
- Executar a fronteira de segurança
- Resolver as lacunas de realtime
- Renomear `apps/web` → `apps/painel`
