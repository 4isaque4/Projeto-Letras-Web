# GitHub Project Setup

Objetivo: organizar o trabalho como um Trello profissional, separando Front, Back e Fullstack.

## 1. Estrutura recomendada do board

Use o campo `Status` com:

- `Backlog`
- `Ready`
- `In Progress`
- `Review`
- `Done`

## 2. Campos customizados

- `Area` (single select): `Frontend`, `Backend`, `Fullstack`, `Infra`
- `Type` (single select): `Feature`, `Bug`, `Chore`, `Spike`
- `Priority` (single select): `P0`, `P1`, `P2`, `P3`

## 3. Views recomendadas

- `Board` (kanban por `Status`)
- `Frontend` (filtro `Area = Frontend`)
- `Backend` (filtro `Area = Backend`)
- `Bugs` (filtro `Type = Bug`)
- `This Week` (filtro por responsavel e status aberto)

## 4. Regras de operacao

- Toda feature nasce em issue.
- Toda issue precisa de `Area`, `Type` e `Priority`.
- Toda PR deve fechar issue (`Closes #123`).
- Card so vai para `Done` apos merge na `main`.

## 5. Bootstrap automatico via CLI

O script abaixo cria:

- labels padrao
- GitHub Project
- campos `Area`, `Type`, `Priority`
- issues iniciais de backlog

Comandos:

```powershell
gh auth login -h github.com
gh auth refresh -s project
.\scripts\bootstrap-github-project.ps1 -Owner 4isaque4 -Repo Projeto-Letras-Web
```

Se quiser criar sem issues iniciais:

```powershell
.\scripts\bootstrap-github-project.ps1 -Owner 4isaque4 -Repo Projeto-Letras-Web -SkipSeedIssues
```
