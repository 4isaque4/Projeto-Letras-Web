#!/usr/bin/env bash
# Sincroniza o banco local (Docker) com um dump do Supabase.
# Requer: pg_dump, psql, docker compose com o container letras-db-local rodando.
set -euo pipefail

ENV_FILE="apps/api/.env"
LOCAL_DB_URL="postgresql://postgres:letras@localhost:5434/letras"
DUMP_FILE="/tmp/letras-supabase-dump.sql"

# ── Lê DATABASE_URL do .env atual ────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "❌  $ENV_FILE não encontrado."
  exit 1
fi

REMOTE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | sed 's/^DATABASE_URL=//;s/^"//;s/"$//')"

if [ -z "$REMOTE_URL" ]; then
  echo "❌  DATABASE_URL não encontrado em $ENV_FILE."
  exit 1
fi

if [[ "$REMOTE_URL" == *"localhost"* || "$REMOTE_URL" == *"127.0.0.1"* || "$REMOTE_URL" == *"5434"* ]]; then
  echo "❌  DATABASE_URL aponta para o banco local. Troque para o Supabase antes de sincronizar."
  echo "    Use: bash scripts/use-supabase-db.sh"
  exit 1
fi

echo "🔍  Banco remoto detectado (Supabase)."
echo ""
echo "⚠️  Isso vai APAGAR todos os dados do banco local e substituir pelo dump do Supabase."
read -r -p "Confirmar? (s/N) " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
  echo "Cancelado."
  exit 0
fi

# ── Garante container local rodando ──────────────────────────────────────────
echo ""
echo "▶  Subindo container local..."
docker compose -f docker-compose.dev.yml up -d
sleep 2

# ── Dump do Supabase ──────────────────────────────────────────────────────────
echo "▶  Baixando dump do Supabase (pode demorar alguns segundos)..."
pg_dump \
  --no-owner \
  --no-acl \
  --schema=public \
  --format=plain \
  --file="$DUMP_FILE" \
  "$REMOTE_URL"

echo "✅  Dump salvo em $DUMP_FILE ($(du -sh "$DUMP_FILE" | cut -f1))"

# ── Restaura no local ─────────────────────────────────────────────────────────
echo "▶  Restaurando no banco local..."
psql "$LOCAL_DB_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null
psql "$LOCAL_DB_URL" -f "$DUMP_FILE" > /dev/null

echo ""
echo "✅  Banco local sincronizado com o Supabase."
echo "    Lembre de trocar o .env para o local antes de rodar a API:"
echo "    bash scripts/use-local-db.sh"
