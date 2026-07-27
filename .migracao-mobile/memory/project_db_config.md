---
name: project-db-config
description: Configuração atual do banco de dados e infraestrutura local do projeto Letras
metadata:
  type: project
---

Supabase novo projeto: `wfyjprjjhmcejovfozug` (us-east-1), substituiu o antigo `ototlfedrkfxjlojuevu`.
DATABASE_URL usa conexão direta `db.wfyjprjjhmcejovfozug.supabase.co:5432` (não pooler).
Migrations do Prisma ainda NÃO foram aplicadas no banco Supabase novo — banco está vazio.

**Why:** Projeto Supabase anterior ficou inadimplente/pausado. Novo projeto criado com novas credenciais.
**How to apply:** Antes de qualquer operação no banco, rodar `pnpm db:migrate` para criar as tabelas. Confirmar com o usuário antes pois é banco de produção.

Scripts de troca de banco:
- `bash scripts/use-local-db.sh` → troca para PostgreSQL local Docker (porta 5434)
- `bash scripts/use-supabase-db.sh` → restaura .env do Supabase
- Backup em `apps/api/.env.supabase.bak`
