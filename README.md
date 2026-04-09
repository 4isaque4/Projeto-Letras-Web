# Projeto Letras Monorepo

Estrutura limpa por dominio:

- `apps/web`: painel web (Vite + React + TypeScript)
- `apps/api`: API inicial para cadastro unificado (Node + Express)
- `packages/contracts`: tipos compartilhados entre apps
- `infra/supabase`: migrations e documentacao do banco
- `infra/vps`: scripts e guia opcional de deploy em VPS
- `tools/scripts`: utilitarios de automacao local
- `docs`: documentacao funcional, tecnica e operacional

## Rodar local

```bash
npm install
npm run dev       # web + API
npm run dev:web   # somente web
npm run dev:api   # somente API
```

## Variaveis de ambiente

- Web: copie `apps/web/.env.example` para `apps/web/.env`
- API: copie `apps/api/.env.example` para `apps/api/.env`

## Etapa 1 (web + mobile)

- Plano de execucao: `docs/product/etapa1-web-execucao.md`
- Contrato de integracao: `docs/architecture/integracao-web-mobile-etapa1.md`
- Contrato realtime v1: `docs/architecture/realtime-contract-v1.md`
- Migration Supabase: `infra/supabase/migrations/20260325_etapa1_core.sql`
- SVGs mobile: `assets/mobile/etapa-1/`

Para gerar manifesto dos SVGs:

```bash
npm run mobile:manifest
```

## Deploy (opcional)

Caso precise publicar em VPS Ubuntu + Nginx:

- guia: `infra/vps/README.md`
- scripts: `infra/vps/*.sh`
