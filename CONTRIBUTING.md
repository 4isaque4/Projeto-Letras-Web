# Contribuindo

Este projeto segue fluxo de trabalho orientado por Issue + Pull Request.

## 1. Fluxo

1. Abra uma issue usando template (`frontend`, `backend`, `bug` ou `task`).
2. Coloque a issue no GitHub Project.
3. Crie uma branch dedicada para a issue.
4. Faça commits pequenos e atomicos.
5. Abra PR linkando a issue (`Closes #<numero>`).
6. Merge apenas apos review e checks verdes.

## 2. Branch Naming

Use o padrao:

- `feat/front/<numero-issue>-<slug>`
- `feat/back/<numero-issue>-<slug>`
- `fix/front/<numero-issue>-<slug>`
- `fix/back/<numero-issue>-<slug>`
- `chore/<numero-issue>-<slug>`

Exemplo:

`feat/front/42-dashboard-online-users`

## 3. Commit Convention

Use Conventional Commits:

- `feat(front): add online users widget`
- `feat(back): add websocket auth middleware`
- `fix(front): handle reconnect timeout`
- `fix(back): fix user session leak`
- `chore(repo): add issue templates`

## 4. Separacao Front x Back

- `front`: UI, UX, componentes, paginas, estado client-side.
- `back`: API, banco, websocket server, regras de negocio.
- `fullstack`: alteracoes que mexem nos dois lados no mesmo card/issue.

Evite PR gigante. O ideal e 1 issue = 1 PR.
