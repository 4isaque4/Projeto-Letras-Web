# Contribuindo

Este projeto segue fluxo orientado por Issue + Pull Request.

## 1. Fluxo

1. Abra uma issue usando template (`feature_web`, `feature_api`, `bug` ou `task`).
2. Coloque a issue no GitHub Project.
3. Crie uma branch dedicada para a issue.
4. Faca commits pequenos e atomicos.
5. Abra PR linkando a issue (`Closes #<numero>`).
6. Merge apenas apos review e checks verdes.

## 2. Branch naming

Padrao recomendado:

- `feat/web/<numero-issue>-<slug>`
- `feat/api/<numero-issue>-<slug>`
- `fix/web/<numero-issue>-<slug>`
- `fix/api/<numero-issue>-<slug>`
- `chore/<numero-issue>-<slug>`

Exemplo:

`feat/web/42-dashboard-online-users`

## 3. Commit convention

Use Conventional Commits:

- `feat(web): add online users widget`
- `feat(api): add cadastro endpoint`
- `fix(web): handle reconnect timeout`
- `fix(api): validate duplicate email`
- `chore(repo): reorganize monorepo structure`

## 4. Separacao por app

- `apps/web`: UI, UX, componentes, paginas e estado client-side.
- `apps/api`: API, integracoes, regras de negocio e persistencia.
- `packages/*`: contratos e bibliotecas compartilhadas.

Evite PR gigante. Ideal: 1 issue = 1 PR.
