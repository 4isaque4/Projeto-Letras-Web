# Letras

Monorepo do **Letras**, app mobile de alfabetizacao de adultos inspirado em Paulo Freire.

## O que existe neste repositorio

- `apps/learner-app`: app do aprendiz (Expo SDK 54, React Native, TypeScript, MVVM)
- `apps/educator-app`: app do educador (Expo SDK 54, React Native, TypeScript, MVVM)
- `apps/api`: backend (NestJS + Prisma + Socket.IO)
- `packages/shared-types`: contratos compartilhados (tipos, eventos)
- `packages/shared-utils`: utilitarios compartilhados

## Estrutura

```text
letras/
├─ apps/
│  ├─ learner-app/
│  ├─ educator-app/
│  └─ api/
├─ packages/
│  ├─ shared-types/
│  └─ shared-utils/
├─ docs/
│  └─ architecture/
├─ infra/
└─ scripts/
```

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker (opcional, para Postgres local)

## Setup rapido

No root do projeto:

```bash
pnpm install
```

Se o pnpm bloquear scripts de build na primeira instalacao, rode:

```bash
pnpm approve-builds
```

Selecione e aprove ao menos `@prisma/client`.

## Banco de dados

### Opcao A: Postgres local com Docker (recomendado)

```bash
docker compose -f infra/docker-compose.postgres.yml up -d
```

A configuracao atual usa host `localhost` porta `5433`.

### Opcao B: Supabase Postgres

1. No painel do Supabase, abra `Project Settings -> Database -> Connection string`.
2. Copie duas URLs:
   - Pooler (`port 6543`) para `DATABASE_URL`
   - Direct (`port 5432`) para `DIRECT_URL`
3. Edite `apps/api/.env`:

```bash
PORT=3000
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
CORS_ORIGIN="*"
```

Observacao:
- `DATABASE_URL` (pooler) e usada pela API em runtime.
- `DIRECT_URL` e usada pelo Prisma para migracoes/seed.

## Variaveis de ambiente

Arquivo da API:

```bash
cp apps/api/.env.example apps/api/.env
```

Se for usar Supabase, voce pode iniciar do template:

```bash
cp apps/api/.env.supabase.example apps/api/.env
```

Arquivo opcional para variaveis mobile no root:

```bash
cp .env.example .env
```

## Prisma (migracao e seed)

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Para validar conexao com Supabase:

```bash
curl http://localhost:3000/health/db
```

## Subir a API

```bash
pnpm --filter api dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Auth (educador):

- `POST /auth/educators/register`
- `POST /auth/educators/login`
- `GET /auth/educators/me` (Bearer token)
- `POST /auth/educators/logout` (Bearer token)

## Subir os apps

### API URL por ambiente

- Android Emulator: `http://10.0.2.2:3000`
- iOS Simulator: `http://localhost:3000`
- Dispositivo fisico: `http://SEU_IP_LOCAL:3000`

### Educador

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 pnpm --filter educator-app start
```

### Aprendiz

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 pnpm --filter learner-app start
```

## Fluxo recomendado de uso

1. Abra o app do educador e faca login.
2. Crie um `LearnerProfile`.
3. Carregue e atribua tema ao aprendiz.
4. Entre na sessao realtime (`learnerProfileId`).
5. Trave/destrave atividades e responda pedidos de ajuda.
6. No app do aprendiz, sincronize estado e solicite ajuda.

## Smoke test automatizado

Com API rodando, execute:

```bash
node apps/learner-app/letras-smoke-test.js
```

Esse script valida:

- endpoints REST principais
- criacao de learner + sessao
- progresso
- eventos realtime (`help_requested`, `help_received`, `lock_set`, `lock_release`, `locked_changed`)

## Solucao de problemas

### Credenciais seed do educador

Depois de aplicar schema/migracoes e rodar seed:

- Email: `educadora@letras.app`
- CPF: `11111111111`
- Senha: `123456`

### 1) API com varios erros de Prisma apos reinstalar

Sintomas comuns: `PrismaClient` nao encontrado, enums ausentes, modelos ausentes.

Passos:

```bash
pnpm approve-builds
pnpm install
pnpm --filter api prisma:generate
pnpm --filter api dev
```

### 2) App abre so com logo / tela em branco

Passos:

```bash
pnpm --filter educator-app exec expo start --clear
pnpm --filter learner-app exec expo start --clear
```

Se necessario, feche e limpe dados do Expo Go no Android.

### 3) Erro Java `String cannot be cast to Boolean`

Esse erro costuma indicar incompatibilidade de versoes nativas.

Valide dependencias:

```bash
cd apps/educator-app && npx expo install --check
cd ../learner-app && npx expo install --check
```

## Comandos uteis

- API: `./scripts/dev-api.sh`
- Learner: `./scripts/dev-learner.sh`
- Educator: `./scripts/dev-educator.sh`
- Typecheck geral: `pnpm typecheck`

## Arquitetura

Veja detalhes em:

- `docs/architecture/overview.md`

---

Status atual: base arquitetural + scaffolding prontos (sem UI final de produto).
