# Deploy Base - Hostinger VPS (Ubuntu)

Objetivo: subir o painel web de administracao/relatorios em paralelo ao projeto que ja existe na VPS, sem conflito.

## 1. Arquitetura alvo

- Frontend web (este repositorio): app Vite estatico servido por Nginx.
- Dados/regras: backend/Supabase ja existente.
- Integracao realtime: `VITE_WS_URL` aponta para seu endpoint WebSocket.

Recomendacao de rota:

- `admin.seudominio.com` -> painel web (este projeto)
- API/WS continua no servico atual (dominio atual, subdominio `api`, ou rota dedicada)

## 2. Pre-requisitos

- VPS Ubuntu 24.04 com acesso root.
- DNS do subdominio apontando para a VPS (`A` -> `76.13.160.193`).
- Repositorio Git acessivel pela VPS (HTTPS publico ou SSH com deploy key).

## 3. Setup base na VPS (uma vez)

No servidor:

```bash
ssh root@76.13.160.193
cd /root
git clone https://github.com/4isaque4/Projeto-Letras-Web.git projeto-letras-web
cd projeto-letras-web
chmod +x scripts/vps/*.sh

./scripts/vps/setup-letras-web.sh \
  --app-name letras-admin \
  --domain admin.seudominio.com \
  --repo-url https://github.com/4isaque4/Projeto-Letras-Web.git \
  --branch main
```

Isso cria:

- `/etc/letras-admin.env` (config do deploy)
- `/srv/letras-admin/repo` (codigo)
- `/srv/letras-admin/dist` (build servido pelo Nginx)
- site Nginx em `/etc/nginx/sites-available/letras-admin.conf`

## 4. Ajustar variaveis do build

Edite o arquivo:

```bash
nano /etc/letras-admin.env
```

Ajuste principalmente:

```env
REPO_URL=https://github.com/4isaque4/Projeto-Letras-Web.git
BRANCH=main
VITE_WS_URL=wss://api.seudominio.com/ws
VITE_WS_TOKEN=
```

Observacao: variaveis `VITE_*` vao para o bundle frontend. Nao coloque segredo real em `VITE_WS_TOKEN`.

## 5. Deploy da aplicacao

```bash
cd /root/projeto-letras-web
./scripts/vps/deploy-letras-web.sh --app-name letras-admin
```

## 6. HTTPS (quando DNS ja propagou)

```bash
cd /root/projeto-letras-web
./scripts/vps/enable-https.sh --domain admin.seudominio.com --email voce@seudominio.com
```

## 7. Atualizacoes futuras

```bash
cd /root/projeto-letras-web
git pull
./scripts/vps/deploy-letras-web.sh --app-name letras-admin
```

## 8. Repositorio privado (opcional)

Se o repo for privado, use deploy key na VPS:

```bash
ssh-keygen -t ed25519 -C "letras-admin-deploy" -f /root/.ssh/letras-admin-deploy
cat /root/.ssh/letras-admin-deploy.pub
```

Adicione a chave publica em `GitHub > Repo > Settings > Deploy keys` (read-only), depois ajuste:

```env
REPO_URL=git@github.com:SEU_OWNER/SEU_REPO.git
GIT_SSH_COMMAND=ssh -i /root/.ssh/letras-admin-deploy -o IdentitiesOnly=yes
```

no arquivo `/etc/letras-admin.env`.
