# Histórico após a consolidação em monorepo

Em 27/07/2026 o repositório `IsraelNunes/letras` foi consolidado aqui. Este
documento explica como alcançar o histórico anterior à consolidação, porque o
comportamento padrão do git surpreende.

## O que foi preservado

Tudo. O commit de importação tem dois pais e o grafo contém as duas linhas
completas — 413 commits no total, nada foi descartado. O repositório de origem
permanece no ar como arquivo.

## O que muda no dia a dia

`git log` e `git blame` **não** mostram o histórico anterior à consolidação para
os arquivos que mudaram de caminho (`apps/mobile-app/...` → `apps/mobile/...`).
Nem com `--follow`: a detecção de rename não atravessa a fronteira do merge de
subtree.

```bash
# Mostra só a partir da importação:
git log --oneline apps/mobile/src/views/learner/learnerFlowMapper.ts
```

## Como consultar o histórico antigo

Consulte o **caminho antigo** contra o último commit pré-consolidação
(`9105269`):

```bash
# 21 commits, incluindo tudo que veio antes da migração
git log --oneline 9105269 -- apps/mobile-app/src/views/learner/learnerFlowMapper.ts

# Ver um diff antigo
git show <sha> -- apps/mobile-app/src/views/learner/learnerFlowMapper.ts

# Blame no estado pré-migração
git blame 9105269 -- apps/mobile-app/src/views/learner/learnerFlowMapper.ts
```

Referências úteis:

| O que | Valor |
|---|---|
| Último commit do mobile antes da consolidação | `9105269` |
| Prefixo antigo do app mobile | `apps/mobile-app/` |
| Prefixo atual | `apps/mobile/` |
| Pacotes que também mudaram de repo | `packages/shared-types`, `packages/shared-utils` |

## Por que não ficou melhor

Fusão de histórico entre repositórios sempre tem essa ressalva: o caminho do
arquivo muda, e ferramentas baseadas em caminho perdem o rastro. As alternativas
(reescrever o histórico do mobile com `git subtree split` ou `filter-repo` para
que os caminhos coincidissem) reescreveriam SHAs, invalidando referências
existentes em issues, PRs e commits — custo maior que o benefício.
