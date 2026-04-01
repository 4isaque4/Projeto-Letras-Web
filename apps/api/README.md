# Letras API

API inicial para cadastro unificado entre web e mobile.

## Rodar local

```bash
npm run dev --workspace @letras/api
```

## Variaveis de ambiente

1. Copie `apps/api/.env.example` para `apps/api/.env`.
2. Ajuste `PORT`, `API_PREFIX` e `CORS_ORIGIN` conforme necessario.

## Endpoints iniciais

- `GET /health`
- `GET /api/v1/cadastros/alfabetizadores`
- `POST /api/v1/cadastros/alfabetizadores`
- `GET /api/v1/cadastros/alfabetizandos`
- `POST /api/v1/cadastros/alfabetizandos`
- `GET /api/v1/cadastros/vinculos`
- `POST /api/v1/cadastros/vinculos`

## Compatibilidade com backend mobile

A API do painel suporta leitura hibrida quando o mesmo Supabase tambem tiver o schema do backend mobile:

- `Educator`
- `LearnerProfile`
- `Completion`
- `Theme`
- `LearningUnit`
- `Activity`

Para habilitar, use um dos caminhos:

- rodar as migrations Prisma no repositorio mobile (recomendado), ou
- aplicar `infra/supabase/migrations/20260401_mobile_backend_compat.sql` direto no Supabase.
