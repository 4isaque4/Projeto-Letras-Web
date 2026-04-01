# Supabase - Etapa 1

Este diretorio concentra os artefatos da base de dados e integracao do painel web com o app mobile.

## Migrations

- `migrations/20260325_etapa1_core.sql`: cria a base unificada de cadastro, CMS e progresso.
- `migrations/20260401_mobile_backend_compat.sql`: adiciona compatibilidade de schema para o backend mobile (Nest + Prisma).

## Como aplicar

1. Abra o projeto no Supabase.
2. Entre em `SQL Editor`.
3. Execute o arquivo `20260325_etapa1_core.sql`.
4. Para o schema mobile, escolha **um** caminho:
   - rodar as migrations Prisma no repositorio mobile (recomendado), ou
   - executar `20260401_mobile_backend_compat.sql` direto no SQL Editor.
5. Valide se as tabelas foram criadas em `Table Editor`.

## Buckets recomendados

Crie os buckets abaixo no `Storage`:

- `cms-videos` (MP4)
- `cms-images` (PNG/JPG)
- `cms-audios` (MP3)
- `mobile-blueprints` (SVG de tela)

## Variaveis de ambiente no web

Preencha em `apps/web/.env`:

```bash
VITE_USE_SUPABASE_AUTH=true
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```
