#!/usr/bin/env bash
set -euo pipefail

DOMAIN=""
EMAIL=""

usage() {
  cat <<'EOF'
Usage:
  enable-https.sh --domain <domain> --email <email>

Example:
  sudo ./scripts/vps/enable-https.sh --domain admin.seudominio.com --email voce@seudominio.com
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --email)
      EMAIL="$2"
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

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "--domain and --email are required." >&2
  usage
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "certbot not installed. Run setup-letras-web.sh first." >&2
  exit 1
fi

certbot --nginx --non-interactive --agree-tos --redirect -d "$DOMAIN" -m "$EMAIL"
echo "HTTPS enabled for ${DOMAIN}."
