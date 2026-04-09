# SVGs do Mobile - Etapa 1

Coloque nesta pasta os arquivos SVG das telas do app mobile da etapa 1.

## Recomendacao de organizacao

Use nomes sem espacos e com contexto da tela:

- `etapa1-tela-login.svg`
- `etapa1-modulo-vogais-intro.svg`
- `etapa1-atividade-vogal-a.svg`

## Gerar manifesto para o CMS

Depois de adicionar/atualizar SVGs:

```bash
npm run mobile:manifest
```

Isso gera `manifest.json` no mesmo diretorio, com metadados prontos para mapear telas no painel web e no CMS.
