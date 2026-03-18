# Projeto Letras Web

Painel web para controle, visualizacao e configuracao do app mobile.

## Realtime (WebSocket)

1. Copie `.env.example` para `.env`.
2. Configure `VITE_WS_URL` e `VITE_WS_TOKEN`.
3. Enquanto nao houver backend/mobile ativo, use `VITE_USE_MOCKS=true` para rodar com dados simulados.
4. Rode o projeto.

O painel exibe:
- status da conexao em tempo real
- quantidade de usuarios online

## Organizacao do Projeto

- GitHub Project (estilo Trello): veja `PROJECT_SETUP.md`
- Padrao de branch e commit: veja `CONTRIBUTING.md`
- Templates de issue e PR: pasta `.github/`

## Rodando local

```bash
npm i
npm run dev
```

## Deploy VPS (Hostinger)

Guia de setup base e deploy em VPS Ubuntu: veja `DEPLOY_HOSTINGER.md`.
