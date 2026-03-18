#!/usr/bin/env bash
set -euo pipefail

APP_NAME="letras-web"

usage() {
  cat <<'EOF'
Usage:
  deploy-letras-web.sh [options]

Options:
  --app-name <name>      App identifier. Default: letras-web
  --help                 Show this help

This script expects an env file at /etc/<app-name>.env created by setup-letras-web.sh.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-name)
      APP_NAME="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

ENV_FILE="/etc/${APP_NAME}.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

: "${APP_DIR:?Missing APP_DIR in ${ENV_FILE}}"
: "${REPO_DIR:?Missing REPO_DIR in ${ENV_FILE}}"
: "${DIST_DIR:?Missing DIST_DIR in ${ENV_FILE}}"
: "${REPO_URL:?Missing REPO_URL in ${ENV_FILE}}"
: "${BRANCH:=main}"

for cmd in git node npm rsync nginx; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
done

echo "[1/5] Syncing repository..."
if [[ -d "${REPO_DIR}/.git" ]]; then
  git -C "$REPO_DIR" remote set-url origin "$REPO_URL"
  git -C "$REPO_DIR" fetch --prune origin
  git -C "$REPO_DIR" checkout "$BRANCH"
  git -C "$REPO_DIR" reset --hard "origin/${BRANCH}"
else
  install -d -m 755 "$APP_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

echo "[2/5] Writing build-time env (.env.production)..."
cat >"${REPO_DIR}/.env.production" <<EOF
VITE_WS_URL=${VITE_WS_URL:-}
VITE_WS_TOKEN=${VITE_WS_TOKEN:-}
VITE_USE_MOCKS=${VITE_USE_MOCKS:-true}
VITE_WS_RECONNECT_BASE_MS=${VITE_WS_RECONNECT_BASE_MS:-1000}
VITE_WS_RECONNECT_MAX_MS=${VITE_WS_RECONNECT_MAX_MS:-15000}
VITE_WS_HEARTBEAT_MS=${VITE_WS_HEARTBEAT_MS:-25000}
EOF

echo "[3/5] Building frontend..."
pushd "$REPO_DIR" >/dev/null
npm ci
npm run build
popd >/dev/null

echo "[4/5] Publishing dist to nginx root..."
NEXT_DIST="${APP_DIR}/dist_next"
rm -rf "$NEXT_DIST"
install -d -m 755 "$NEXT_DIST"
rsync -a --delete "${REPO_DIR}/dist/" "${NEXT_DIST}/"
rm -rf "$DIST_DIR"
mv "$NEXT_DIST" "$DIST_DIR"
chown -R www-data:www-data "$DIST_DIR"
find "$DIST_DIR" -type d -exec chmod 755 {} +
find "$DIST_DIR" -type f -exec chmod 644 {} +

echo "[5/5] Reloading nginx..."
nginx -t
systemctl reload nginx

echo
echo "Deploy completed for ${APP_NAME}."
echo "Domain: ${DOMAIN:-not-set}"
echo "Branch: ${BRANCH}"
