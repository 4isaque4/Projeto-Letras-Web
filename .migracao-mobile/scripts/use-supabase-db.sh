#!/usr/bin/env bash
# Restaura apps/api/.env a partir do backup .env.supabase.bak (Supabase).
# Opcionalmente para o container Docker local.
set -e

ENV_FILE="apps/api/.env"
BACKUP_FILE="apps/api/.env.supabase.bak"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌  Backup $BACKUP_FILE não encontrado."
  echo "    Nada foi alterado."
  exit 1
fi

cp "$BACKUP_FILE" "$ENV_FILE"
echo "✅  $ENV_FILE restaurado a partir de $BACKUP_FILE"

read -r -p "Parar o container Docker local? (s/N) " STOP_DOCKER
if [[ "$STOP_DOCKER" =~ ^[Ss]$ ]]; then
  docker compose -f docker-compose.dev.yml down
  echo "✅  Container letras-db-local parado."
fi

echo ""
echo "Backup mantido em $BACKUP_FILE"
echo "Remova-o manualmente se não precisar mais."
