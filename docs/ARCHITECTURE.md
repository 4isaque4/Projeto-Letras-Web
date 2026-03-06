# Arquitetura Integrada (Web + Mobile + Backend)

## Objetivo
Garantir comunicacao consistente entre:
- App Mobile (uso principal pelo alfabetizando)
- Painel Web (operacao, monitoramento, ajustes e suporte)
- Backend (fonte de verdade e orquestrador de eventos)

## Principios de Arquitetura
1. Contrato primeiro: eventos em tempo real sao versionados e tipados.
2. Backend como autoridade: web e mobile nunca sincronizam estado direto entre si.
3. Contextos separados: leitura em tempo real no web, experiencia de aprendizado no mobile.
4. Tolerancia a falhas: reconexao automatica, heartbeat, idempotencia por `traceId`.
5. Observabilidade: cada evento deve carregar `emittedAt`, `traceId`, `version`.

## Desenho de Integracao
- Mobile envia interacoes e progresso para API/Backend.
- Backend atualiza estado canonical.
- Backend publica eventos via WebSocket para painel web.
- Painel web atualiza indicadores de sessao, usuarios online e alertas.

## Padrao de Mensagem
Envelope padrao:
- `type`: nome do evento.
- `payload`: conteudo do evento.
- `emittedAt`: data/hora ISO.
- `version`: versao do contrato (`1.0`).
- `traceId`: opcional para rastreabilidade.

## Eventos Base Definidos
Server -> Web:
- `presence.snapshot`
- `presence.user_joined`
- `presence.user_left`
- `session.metrics_updated`
- `alert.created`
- `pong`

Web -> Server:
- `subscribe.dashboard`
- `unsubscribe.dashboard`
- `ping`

## Fluxo de Presenca (Usuarios Logados)
1. Web conecta e envia `subscribe.dashboard`.
2. Backend responde com `presence.snapshot`.
3. Mudancas incrementais chegam por `presence.user_joined` e `presence.user_left`.
4. Painel atualiza contagem e listas em tempo real.

## Estrutura no Front Web
`src/app/core/config/env.ts`
- Parametros de ambiente e tunning de reconnect/heartbeat.

`src/app/core/realtime/contracts.ts`
- Contratos tipados de eventos e payloads.

`src/app/core/realtime/socketClient.ts`
- Cliente WebSocket com reconnect exponencial e heartbeat.

`src/app/core/realtime/realtimeStore.ts`
- Estado global minimo para conexao, presenca e metricas.

`src/app/core/realtime/useRealtimeStatus.ts`
- Hook React para consumo do estado de realtime.

`src/app/core/realtime/realtimeBootstrap.ts`
- Inicializacao unica da ponte realtime na subida do app.

## Responsabilidades por Time
Time Mobile:
- Publicar eventos de dominio via API.
- Garantir envio de identificadores de sessao/dispositivo.

Time Backend:
- Publicar eventos tipados no contrato acordado.
- Garantir ordenacao por entidade quando necessario.
- Tratar autenticacao WebSocket por token.

Time Web/Painel:
- Consumir somente contratos oficiais.
- Nao inferir estado fora do contrato.
- Exibir status de conectividade e degradar graciosamente.

## Checklist de Producao
- Definir estrategia de autenticacao do socket (JWT curto + refresh via API).
- Definir politicas de autorizacao por `tenantId` e role.
- Definir politicas de retencao e auditoria dos eventos.
- Criar testes de contrato entre backend e front (consumer-driven contract).
- Adicionar telemetry (latencia, reconnect, perda de evento, taxa de erro).
