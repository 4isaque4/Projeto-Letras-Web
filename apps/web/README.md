# Projeto Letras Web

Painel web para controle, visualizacao e configuracao do app mobile.

## Rodar local

```bash
npm run dev --workspace @letras/web
```

## Autenticacao (Supabase)

1. Copie `apps/web/.env.example` para `apps/web/.env`.
2. Preencha:
   - `VITE_USE_SUPABASE_AUTH=true`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Realtime (WebSocket)

1. Configure `VITE_WS_URL` e `VITE_WS_TOKEN`.
2. O painel tenta conectar no websocket informado e exibe o estado da conexao no topo.

O painel exibe:

- status da conexao em tempo real
- quantidade de usuarios online
