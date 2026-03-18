# Realtime Contract v1 (Web <-> Backend)

Objetivo: definir contrato unico de eventos para o painel web e backend, mesmo com ambiente mock.

## Envelope padrão

Todos os eventos usam o mesmo envelope:

```json
{
  "type": "presence.snapshot",
  "payload": {},
  "emittedAt": "2026-03-18T20:00:00.000Z",
  "version": "1.0",
  "traceId": "optional-trace-id"
}
```

## WebSocket URL

- Desenvolvimento local: `ws://localhost:8080/ws`
- Produção: `wss://api.letras.cloud/ws`

## Eventos servidor -> web

### `presence.snapshot`

Payload:

```json
{
  "users": [
    {
      "userId": "u-1001",
      "name": "Joao Silva",
      "role": "alfabetizando",
      "device": "mobile",
      "online": true,
      "lastSeenAt": "2026-03-18T20:00:00.000Z",
      "sessionId": "sess-1001"
    }
  ]
}
```

### `presence.user_joined`

Payload:

```json
{
  "user": {
    "userId": "u-1001",
    "name": "Joao Silva",
    "role": "alfabetizando",
    "device": "mobile",
    "online": true,
    "lastSeenAt": "2026-03-18T20:00:00.000Z",
    "sessionId": "sess-1001"
  }
}
```

### `presence.user_left`

Payload:

```json
{
  "userId": "u-1001",
  "lastSeenAt": "2026-03-18T20:00:00.000Z"
}
```

### `session.metrics_updated`

Payload:

```json
{
  "onlineUsers": 42,
  "onlineTutors": 3,
  "onlineStudents": 39,
  "openTickets": 7,
  "updatedAt": "2026-03-18T20:00:00.000Z"
}
```

### `alert.created`

Payload:

```json
{
  "id": "alert-1",
  "priority": "low",
  "message": "Mensagem de alerta",
  "createdAt": "2026-03-18T20:00:00.000Z"
}
```

### `pong`

Payload:

```json
{
  "at": "2026-03-18T20:00:00.000Z"
}
```

## Eventos web -> servidor

### `subscribe.dashboard`

Payload:

```json
{
  "tenantId": "default"
}
```

### `unsubscribe.dashboard`

Payload:

```json
{
  "tenantId": "default"
}
```

### `ping`

Payload:

```json
{
  "at": "2026-03-18T20:00:00.000Z"
}
```

## Regras de compatibilidade

- `version` deve permanecer `1.0` para este contrato.
- novos campos podem ser adicionados sem remover campos existentes.
- remoções/renomeações exigem `version` nova.
- frontend deve ignorar eventos desconhecidos sem quebrar.

## Modo mock

Enquanto backend/mobile não estiverem ativos:

- `VITE_USE_MOCKS=true`
- frontend usa simulador local para `snapshot`, `join`, `left` e `metrics`.
- mesma estrutura de payload do contrato real.
