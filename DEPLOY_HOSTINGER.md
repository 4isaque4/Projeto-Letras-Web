# Deploy do Front Web na Hostinger (VPS + Nginx)

Objetivo: publicar o painel web deste repositório em `admin.letras.cloud`, sem conflitar com o que já está em produção.

## 1. Decisão de arquitetura

- Frontend web: app Vite estático servido por Nginx.
- Backend/API/WS: continua no serviço já existente.
- Domínio recomendado:
  - `admin.letras.cloud` -> painel web (este projeto)
  - `letras.cloud` e `www` -> continuam no fluxo atual

## 2. DNS na Hostinger (hPanel)

No DNS Zone de `letras.cloud`, crie:

- Tipo: `A`
- Nome: `admin`
- Conteúdo: `2.57.91.91`
- TTL: `300` (ou padrão)

Observação: o IP acima assume que a mesma VPS atual (`@ -> 2.57.91.91`) vai hospedar o painel admin.

Verifique propagação:

```bash
nslookup admin.letras.cloud
```

## 3. Setup inicial da VPS (uma vez)

Conecte na VPS:

```bash
ssh root@2.57.91.91
```

Clone o projeto e rode setup:

```bash
cd /root
git clone https://github.com/4isaque4/Projeto-Letras-Web.git projeto-letras-web
cd projeto-letras-web
chmod +x scripts/vps/*.sh

./scripts/vps/setup-letras-web.sh \
  --app-name letras-admin \
  --domain admin.letras.cloud \
  --repo-url https://github.com/4isaque4/Projeto-Letras-Web.git \
  --branch main
```

Isso prepara:

- `/etc/letras-admin.env` (config de deploy)
- `/srv/letras-admin/repo` (código)
- `/srv/letras-admin/dist` (build publicado)
- `/etc/nginx/sites-available/letras-admin.conf` (site Nginx)

## 4. Configurar variáveis de produção

Edite:

```bash
nano /etc/letras-admin.env
```

Ajuste principalmente:

```env
REPO_URL=https://github.com/4isaque4/Projeto-Letras-Web.git
BRANCH=main
VITE_WS_URL=wss://SEU_ENDPOINT_WS/ws
VITE_WS_TOKEN=
```

Notas:

- `VITE_*` vai para o frontend (bundle público). Não colocar segredo real.
- Se o WS já está no domínio principal, pode ser algo como `wss://letras.cloud/ws`.

## 5. Deploy da aplicação

```bash
cd /root/projeto-letras-web
./scripts/vps/deploy-letras-web.sh --app-name letras-admin
```

## 6. Ativar HTTPS (Let's Encrypt)

Quando o DNS de `admin.letras.cloud` já estiver propagado:

```bash
cd /root/projeto-letras-web
./scripts/vps/enable-https.sh --domain admin.letras.cloud --email seu-email@dominio.com
```

## 7. Testes finais

Checklist:

- `http://admin.letras.cloud` abre o app
- `https://admin.letras.cloud` abre com cadeado
- Rotas internas do frontend funcionam com refresh
- Realtime conecta ao `VITE_WS_URL` sem erro de CORS/SSL

## 8. Atualizações futuras

```bash
ssh root@2.57.91.91
cd /root/projeto-letras-web
git pull
./scripts/vps/deploy-letras-web.sh --app-name letras-admin
```

## 9. Rollback rápido (se der problema)

```bash
ssh root@2.57.91.91
cd /srv/letras-admin/repo
git log --oneline -n 5
git checkout <commit-anterior>
npm ci && npm run build
rsync -a --delete dist/ /srv/letras-admin/dist/
systemctl reload nginx
```
