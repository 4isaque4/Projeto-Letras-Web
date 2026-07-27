#!/usr/bin/env bash
# Troca apps/api/.env para usar o PostgreSQL local (Docker).
# Faz backup de .env → .env.supabase.bak antes de alterar.
set -e

ENV_FILE="apps/api/.env"
BACKUP_FILE="apps/api/.env.supabase.bak"

LOCAL_DB_URL='postgresql://postgres:letras@localhost:5434/letras'
LOCAL_DIRECT_URL='postgresql://postgres:letras@localhost:5434/letras'

if [ ! -f "$ENV_FILE" ]; then
  echo "❌  $ENV_FILE não encontrado. Crie-o antes de continuar."
  exit 1
fi

if [ -f "$BACKUP_FILE" ]; then
  echo "⚠️  Backup já existe em $BACKUP_FILE — não será sobrescrito."
  echo "    Para forçar, remova o backup manualmente e rode novamente."
  exit 1
fi

cp "$ENV_FILE" "$BACKUP_FILE"
echo "✅  Backup salvo em $BACKUP_FILE"

patch_or_append() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=\"${value}\"|" "$ENV_FILE"
  else
    echo "${key}=\"${value}\"" >> "$ENV_FILE"
  fi
}

patch_or_append "DATABASE_URL"  "$LOCAL_DB_URL"
patch_or_append "DIRECT_URL"    "$LOCAL_DIRECT_URL"

echo "✅  DATABASE_URL e DIRECT_URL atualizados para DB local."
echo ""
echo "Próximos passos:"
echo "  1. docker compose -f docker-compose.dev.yml up -d"
echo "  2. pnpm db:migrate"
echo "  3. pnpm db:seed   (opcional)"
echo "  4. pnpm dev"
