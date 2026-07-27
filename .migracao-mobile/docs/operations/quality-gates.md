# Rotina de qualidade - Letras Mobile Ref

## Comandos locais

- `pnpm quality`: valida ambiente esperado e copy de produto.
- `pnpm typecheck`: roda TypeScript no workspace.
- `pnpm lint`: hoje usa typecheck no API ate existir uma configuracao ESLint dedicada.
- `pnpm build`: compila API, web auxiliar e pacotes compartilhados.
- `pnpm build:mobile:web`: exporta o app Expo web para `apps/mobile-app/dist-web-check`.
- `pnpm check`: roda a esteira completa usada no pre-push e no GitHub Actions.
- `pnpm review:uncommitted`: pede revisao Codex das mudancas locais.
- `pnpm review:commit HEAD`: pede revisao Codex do ultimo commit.

## Hooks locais

Os hooks ficam versionados em `.githooks` e sao ativados por:

```bash
pnpm hooks:install
```

O `prepare` tambem tenta configurar `git config core.hooksPath .githooks` depois de `pnpm install`.

- `pre-commit`: roda `pnpm quality`.
- `pre-push`: roda `pnpm check`.
- `post-commit`: se `LETRAS_CODEX_REVIEW_ON_COMMIT=1`, roda `pnpm review:commit HEAD`.

## GitHub Actions

`.github/workflows/quality.yml` executa `pnpm check` em `push`, `pull_request` e `workflow_dispatch`.

## Gate de revisao Letras

Antes de mergear, valide:

- Nao ha duplicacao de usuario entre mobile, web e Supabase.
- Escritas relevantes registram `sync_events`.
- App mobile segue separado do painel web.
- Copy visivel nao usa "CMS".
- Fluxos de cadastro, vinculo, tutoriais, progresso e pedido de ajuda continuam funcionando.
