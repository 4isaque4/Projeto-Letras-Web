#!/usr/bin/env bash
# Executa psql contra o banco Supabase usando o DATABASE_URL de apps/api/.env,
# sem nunca imprimir a URL/senha. Uso:
#   bash scripts/psql-supabase.sh -f caminho/migration.sql
#   bash scripts/psql-supabase.sh -c "select count(*) from tabela;"
# Recusa rodar se o .env estiver apontando para o banco local (Docker, porta 5434).
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE="apps/api/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌  $ENV_FILE não encontrado." >&2
  exit 1
fi

REMOTE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | sed 's/^DATABASE_URL=//;s/^"//;s/"$//')"

if [ -z "$REMOTE_URL" ]; then
  echo "❌  DATABASE_URL não encontrado em $ENV_FILE." >&2
  exit 1
fi

if [[ "$REMOTE_URL" == *"localhost"* || "$REMOTE_URL" == *"127.0.0.1"* || "$REMOTE_URL" == *"5434"* ]]; then
  echo "❌  DATABASE_URL aponta para o banco local. Use: bash scripts/use-supabase-db.sh" >&2
  exit 1
fi

HOST_MASKED="$(printf '%s' "$REMOTE_URL" | sed -E 's#^[a-z]+://[^@]*@##; s#/.*$##')"
echo "🔗  Conectando ao Supabase ($HOST_MASKED)..." >&2

exec psql "$REMOTE_URL" --set=ON_ERROR_STOP=1 "$@"
