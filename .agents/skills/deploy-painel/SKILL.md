---
name: deploy-painel
description: Build do painel web (Vite) e deploy em painel.letras.cloud. Use quando o usuário pedir "deploy do painel", "deploy do web", "subir o painel", "publicar painel", ou após mudanças em apps/web ou apps/api. Encadeia pnpm build → script Paramiko de upload SFTP → restart do letras-painel-api → smoke tests.
---

# Deploy painel (painel.letras.cloud)

Executa o pipeline completo de build + deploy do painel React/Vite + API Express em `painel.letras.cloud`. O script Paramiko (`artifacts/deploy_painel_20260506.py`) cobre upload, backup, promoção, restart do serviço e smoke tests.

## Pré-requisitos

- Working tree limpa OU pelo menos confirmação do usuário de subir mudanças não-commitadas (o script faz `git reset --hard origin/<branch>` na VPS — então o branch remoto precisa ter os commits desejados)
- `apps/web/.env.production` presente com `VITE_API_BASE_URL=https://painel.letras.cloud/api/v1` (já existe e está no `.gitignore`/`AGENTS.md` como crítico)
- Python 3 + paramiko (já instalados)
- `pnpm` no PATH

## Passos

1. **Confirmar branch e estado do git**
   ```bash
   git -C "C:\Projetos\Projeto Letras - Sandbox Web" status --short
   git -C "C:\Projetos\Projeto Letras - Sandbox Web" log --oneline -3
   git -C "C:\Projetos\Projeto Letras - Sandbox Web" rev-parse --abbrev-ref HEAD
   ```
   Se o `BRANCH` no script (`deploy_painel_20260506.py` linha 25 — atualmente `feat/painel-mobile-integracao-mvp`) não bate com o branch ativo do usuário, **perguntar** antes de continuar. O script faz `git reset --hard origin/<BRANCH>` no servidor — branch errada = código errado em produção.

2. **Confirmar `.env.production` está presente**
   ```bash
   ls "C:\Projetos\Projeto Letras - Sandbox Web\apps\web\.env.production"
   grep VITE_API_BASE_URL "C:\Projetos\Projeto Letras - Sandbox Web\apps\web\.env.production"
   ```
   Tem que aparecer `VITE_API_BASE_URL=https://painel.letras.cloud/api/v1`. Sem isso o build cai no default `http://localhost:8080/api/v1` e o painel em produção quebra com "Failed to fetch".

3. **Limpar dist antigo e buildar**
   ```bash
   rm -rf "C:\Projetos\Projeto Letras - Sandbox Web\apps\web\dist"
   cd "C:\Projetos\Projeto Letras - Sandbox Web" && pnpm --filter web build
   ```
   Esperar `built in <Nms>`. Rodar em background se for demorar.

4. **Conferir bundle**
   ```bash
   ls "C:\Projetos\Projeto Letras - Sandbox Web\apps\web\dist"
   ls "C:\Projetos\Projeto Letras - Sandbox Web\apps\web\dist\assets" | head -5
   ```
   Tem que ter `index.html` + pasta `assets/` com `index-<hash>.js`.

5. **Rodar o deploy Paramiko**
   ```bash
   python "C:\Projetos\Projeto Letras - Sandbox Web\artifacts\deploy_painel_20260506.py"
   ```
   Em background. O script faz:
   - `git fetch + reset --hard origin/<BRANCH>` em `/srv/letras-painel/repo` (sincroniza código backend da API)
   - Cria `/srv/letras-painel/_releases/painel-<TS>/`
   - SFTP upload do `dist/` local
   - Backup do dist atual em `_releases/painel-<TS>-prelive/`
   - Promove a nova release pra `/srv/letras-painel/dist/`
   - Atualiza `/etc/letras-painel-api.env` (`UPLOAD_MAX_FILE_MB=200`)
   - Restart `systemctl restart letras-painel-api`
   - Smoke tests: root HTTP 200, `/api/v1/painel/conteudo`, `/api/v1/painel/conteudo?published=true`, `/api/v1/painel/progress` (deve retornar 400 com FK fake)
   Esperar `DEPLOY OK release=painel-<TS>`.

6. **Validação visual** (se a mudança afetou UI)
   - Playwright em `https://painel.letras.cloud/`
   - Login, navegar pela rota tocada
   - Screenshot

## Rollback rápido

```bash
ssh root@76.13.160.193 'TS=<timestamp>; cd /srv/letras-painel && rm -rf dist && cp -a _releases/painel-$TS-prelive dist && chown -R www-data:www-data dist && systemctl restart letras-painel-api'
```

Releases ficam em `/srv/letras-painel/_releases/`.

## Pontos de atenção

- **Branch no script**: o `BRANCH` é hardcoded em `deploy_painel_20260506.py`. Se você está deployando de outro branch, criar uma cópia datada do script ou editar a constante antes de rodar.
- **Migrations**: o script NÃO aplica migrations SQL. Se o deploy depender de migration em `infra/supabase/migrations/`, aplicar manualmente no Supabase **antes** de subir o código.
- **API + Frontend juntos**: o script faz git reset na VPS (que pega backend API atualizado) e sobe `dist/` separado (frontend). Eles vão pra produção quase simultaneamente; se a API tem breaking change, considere `feature flag` ou ordem específica.

## Saída esperada

Mensagem curta com:
- `release=painel-<TS>` (ID em produção)
- HTTP 200 em todos os smoke tests
- Caminho do prelive pra rollback
