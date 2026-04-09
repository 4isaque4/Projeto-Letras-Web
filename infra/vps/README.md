# Deploy Web na Hostinger (VPS + Nginx)

Objetivo: publicar o painel web em `admin.letras.cloud` sem impactar outros servicos.

## 1. DNS

No DNS de `letras.cloud`, crie:

- Tipo: `A`
- Nome: `admin`
- Conteudo: `IP_DA_VPS`
- TTL: `300` (ou padrao)

## 2. Setup inicial da VPS

```bash
ssh root@IP_DA_VPS
cd /root
git clone https://github.com/SEU_ORG/SEU_REPO.git projeto-letras-web
cd projeto-letras-web
chmod +x infra/vps/*.sh

./infra/vps/setup-letras-web.sh \
  --app-name letras-admin \
  --domain admin.letras.cloud \
  --repo-url https://github.com/SEU_ORG/SEU_REPO.git \
  --branch main
```

## 3. Ajustar env de deploy

Edite `/etc/letras-admin.env` e configure:

```env
REPO_URL=https://github.com/SEU_ORG/SEU_REPO.git
BRANCH=main
VITE_WS_URL=wss://SEU_ENDPOINT_WS/ws
VITE_WS_TOKEN=
VITE_USE_MOCKS=true
VITE_USE_SUPABASE_AUTH=false
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```

## 4. Deploy

```bash
cd /root/projeto-letras-web
./infra/vps/deploy-letras-web.sh --app-name letras-admin
```

## 5. HTTPS (Let's Encrypt)

```bash
cd /root/projeto-letras-web
./infra/vps/enable-https.sh --domain admin.letras.cloud --email seu-email@dominio.com
```

## 6. Rollback rapido

```bash
ssh root@IP_DA_VPS
cd /srv/letras-admin/repo
git log --oneline -n 5
git checkout <commit-anterior>
npm ci && npm run build
rsync -a --delete apps/web/dist/ /srv/letras-admin/dist/
systemctl reload nginx
```
