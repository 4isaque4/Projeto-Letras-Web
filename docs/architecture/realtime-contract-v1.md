# Realtime Contract v1 (Web <-> Backend)

Objetivo: definir contrato unico de eventos para o painel web e backend em ambiente real.

## Envelope padrao

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
- Producao: `wss://api.letras.cloud/ws`

## Eventos servidor -> web

### `presence.snapshot`

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

```json
{
  "userId": "u-1001",
  "lastSeenAt": "2026-03-18T20:00:00.000Z"
}
```

### `session.metrics_updated`

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

```json
{
  "id": "alert-1",
  "priority": "low",
  "message": "Mensagem de alerta",
  "createdAt": "2026-03-18T20:00:00.000Z"
}
```

### `pong`

```json
{
  "at": "2026-03-18T20:00:00.000Z"
}
```

## Eventos web -> servidor

### `subscribe.dashboard`

```json
{
  "tenantId": "default"
}
```

### `unsubscribe.dashboard`

```json
{
  "tenantId": "default"
}
```

### `ping`

```json
{
  "at": "2026-03-18T20:00:00.000Z"
}
```

## Regras de compatibilidade

- `version` deve permanecer `1.0` para este contrato.
- Novos campos podem ser adicionados sem remover campos existentes.
- Remocoes/renomeacoes exigem nova `version`.
- O frontend deve ignorar eventos desconhecidos sem quebrar.

## Observabilidade local

Se o websocket ainda nao estiver ativo, o painel continua funcionando com:

- Status de conexao exibido no topo.
- Reconexao automatica com backoff.
- Fallback visual sem bloquear cadastro e acompanhamento.
