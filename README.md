
  # Wireframe painel Alfabetizador Online

  Painel de controle para o sistema de alfabetização online.

  ## Arquitetura

  Este projeto ja possui uma base de arquitetura para integracao entre app mobile, painel web e backend com WebSocket.

  Consulte `docs/ARCHITECTURE.md` para:
  - contratos de evento (web <-> backend)
  - fluxo de usuarios logados em tempo real
  - responsabilidades por time
  - checklist de producao

  ## Realtime (WebSocket)

  1. Copie `.env.example` para `.env`.
  2. Configure `VITE_WS_URL` e `VITE_WS_TOKEN`.
  3. Inicie o projeto normalmente.

  O painel exibe no topo:
  - status da conexao em tempo real
  - quantidade de usuarios online

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  