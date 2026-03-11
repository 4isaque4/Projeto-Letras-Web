#!/usr/bin/env bash
set -euo pipefail

APP_NAME="letras-web"
DOMAIN=""
REPO_URL=""
BRANCH="main"
NODE_MAJOR="20"

usage() {
  cat <<'EOF'
Usage:
  setup-letras-web.sh --domain <domain> [options]

Options:
  --app-name <name>      App identifier. Default: letras-web
  --domain <domain>      Domain or subdomain for the web admin panel (required)
  --repo-url <url>       Git repository URL used by deploy script
  --branch <name>        Git branch to deploy. Default: main
  --node-major <major>   Node.js major version. Default: 20
  --help                 Show this help

Example:
  sudo ./scripts/vps/setup-letras-web.sh \
    --app-name letras-admin \
    --domain admin.seudominio.com \
    --repo-url https://github.com/4isaque4/Projeto-Letras-Web.git \
    --branch main
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-name)
      APP_NAME="$2"
      shift 2
      ;;
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --repo-url)
      REPO_URL="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --node-major)
      NODE_MAJOR="$2"
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

if [[ -z "$DOMAIN" ]]; then
  echo "--domain is required." >&2
  usage
  exit 1
fi

APP_DIR="/srv/${APP_NAME}"
REPO_DIR="${APP_DIR}/repo"
DIST_DIR="${APP_DIR}/dist"
ENV_FILE="/etc/${APP_NAME}.env"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}.conf"

echo "[1/6] Installing base packages..."
apt-get update -y
apt-get install -y ca-certificates curl git nginx rsync certbot python3-certbot-nginx

CURRENT_NODE_MAJOR=""
if command -v node >/dev/null 2>&1; then
  CURRENT_NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
fi

if [[ "$CURRENT_NODE_MAJOR" != "$NODE_MAJOR" ]]; then
  echo "[2/6] Installing Node.js ${NODE_MAJOR}.x..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
else
  echo "[2/6] Node.js ${NODE_MAJOR}.x already installed."
fi

echo "[3/6] Creating app directories..."
install -d -m 755 "$APP_DIR" "$REPO_DIR" "$DIST_DIR"
chown -R root:root "$APP_DIR"

echo "[4/6] Writing env file: ${ENV_FILE}"
if [[ ! -f "$ENV_FILE" ]]; then
  cat >"$ENV_FILE" <<EOF
APP_NAME=${APP_NAME}
DOMAIN=${DOMAIN}
APP_DIR=${APP_DIR}
REPO_DIR=${REPO_DIR}
DIST_DIR=${DIST_DIR}
REPO_URL=${REPO_URL}
BRANCH=${BRANCH}
VITE_WS_URL=wss://${DOMAIN}/ws
VITE_WS_TOKEN=
VITE_WS_RECONNECT_BASE_MS=1000
VITE_WS_RECONNECT_MAX_MS=15000
VITE_WS_HEARTBEAT_MS=25000
EOF
  chmod 600 "$ENV_FILE"
else
  echo "Env file already exists; keeping current values."
fi

echo "[5/6] Writing nginx site config: ${NGINX_SITE}"
cat >"$NGINX_SITE" <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name ${DOMAIN};

  root ${DIST_DIR};
  index index.html;
  client_max_body_size 20m;

  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  location /assets/ {
    try_files \$uri =404;
    access_log off;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

ln -sfn "$NGINX_SITE" "/etc/nginx/sites-enabled/${APP_NAME}.conf"

echo "[6/6] Validating and reloading nginx..."
nginx -t
systemctl enable nginx
systemctl reload nginx

echo
echo "Base setup finished for ${APP_NAME}."
echo "Next steps:"
echo "1) Review ${ENV_FILE} and set REPO_URL + VITE_WS_URL."
echo "2) Run deploy script:"
echo "   ./scripts/vps/deploy-letras-web.sh --app-name ${APP_NAME}"
echo "3) Enable HTTPS after DNS is pointing to this server:"
echo "   ./scripts/vps/enable-https.sh --domain ${DOMAIN} --email voce@seudominio.com"
