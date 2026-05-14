---
name: deploy-mobile
description: Build do app Expo (web) e deploy em mobile.letras.cloud. Use quando o usuário pedir "deploy do mobile", "subir o mobile", "publicar app mobile", ou após corrigir bugs em apps/mobile-app no repo letras-mobile-ref. Encadeia expo export → script Paramiko de upload SFTP → smoke tests.
---

# Deploy mobile (mobile.letras.cloud)

Executa o pipeline completo de build + deploy do app Expo web em `mobile.letras.cloud`. O script Paramiko (`artifacts/deploy_mobile_web_20260506.py`) já existe e cobre upload, backup e promoção da release. Esta skill orquestra a etapa pré (build) e chama o script.

## Pré-requisitos

- `letras-mobile-ref` checado em `C:\Projetos\letras-mobile-ref`
- Mudanças já commitadas no branch ativo (o build pega o estado atual do disco, mas commits são exigidos pela política do projeto antes de subir release)
- Python 3 + paramiko disponíveis (já estão)
- `pnpm` no PATH

## Passos

1. **Confirmar branch e working tree limpa**
   ```bash
   git -C "C:\Projetos\letras-mobile-ref" status --short
   git -C "C:\Projetos\letras-mobile-ref" log --oneline -3
   ```
   Se houver mudanças não-commitadas, perguntar ao usuário se ele quer commitar antes (não tentar commitar automaticamente — ele pode estar no meio de algo).

2. **Limpar builds antigos**
   ```bash
   rm -rf "C:\Projetos\letras-mobile-ref\apps\mobile-app\dist-fresh-build" "C:\Projetos\letras-mobile-ref\apps\mobile-app\dist-deploy"
   ```

3. **Build do bundle web do Expo** (apontando para a API de produção)
   ```bash
   cd "C:\Projetos\letras-mobile-ref\apps\mobile-app" && EXPO_PUBLIC_API_URL="https://painel.letras.cloud/api/v1" npx expo export --platform web --output-dir dist-fresh-build
   ```
   Rodar em background (`run_in_background: true`). Esperar até aparecer `Exported: dist-fresh-build` ou `ELIFECYCLE`/`Error`.

4. **Conferir o bundle gerado**
   ```bash
   ls "C:\Projetos\letras-mobile-ref\apps\mobile-app\dist-fresh-build\_expo\static\js\web"
   ```
   Tem que existir 1 arquivo `index-<hash>.js`.

5. **Rodar o deploy via Paramiko**
   ```bash
   python "C:\Projetos\Projeto Letras - Sandbox Web\artifacts\deploy_mobile_web_20260506.py"
   ```
   Rodar em background. O script faz:
   - SFTP upload de `dist-deploy` (gerado a partir de `dist-fresh-build` com reescritas de caminho `/mobile-expo/`, `/mobile-assets/`) para `/srv/letras-mobile-web/_releases/<TS>-mobile-web/`
   - Backup do release atual em `mobile.prev-<TS>` / `mobile-expo.prev-<TS>` / `mobile-assets.prev-<TS>`
   - Promove a nova release para `/srv/letras-mobile-web/mobile/` (e dirs irmãs)
   - Smoke tests via curl
   Esperar até `DEPLOY MOBILE OK release=...` aparecer.

6. **Validação visual via Playwright** (se solicitado / se o deploy tocou em telas)
   - Navegar para `https://mobile.letras.cloud/`
   - Login como Aprendiz, abrir aula, conferir telas afetadas
   - Tirar screenshot

## Rollback rápido

Se o smoke test falhar ou o usuário pedir rollback, executar via SSH:
```bash
ssh root@76.13.160.193 'TS=<timestamp>; cd /srv/letras-mobile-web && rm -rf mobile mobile-expo mobile-assets && cp -a mobile.prev-$TS mobile && cp -a mobile-expo.prev-$TS mobile-expo && cp -a mobile-assets.prev-$TS mobile-assets && chown -R www-data:www-data mobile mobile-expo mobile-assets'
```
Os timestamps das releases ficam em `/srv/letras-mobile-web/_releases/`.

## Saída esperada para o usuário

Mensagem curta com:
- `release=<TS>-mobile-web` (o ID que ficou em produção)
- HTTP 200 em todos smoke tests (root, headers, bundle js, favicon)
- Caminho do rollback (`mobile.prev-<TS>`)
