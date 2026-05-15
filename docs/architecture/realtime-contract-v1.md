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

## Socket.IO URL

- Desenvolvimento local: `http://localhost:8080/realtime`
- Producao: `https://api.letras.cloud/realtime`

O transporte padrao e Socket.IO com namespace `/realtime` e `transports: ["websocket"]`. O painel ainda aceita valores antigos no formato `ws://host/ws` e normaliza para `http://host/realtime` durante a migracao.

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

### `support.created`

Emitido apos `POST /api/v1/painel/support-requests` criar um pedido novo.
Pedidos duplicados ainda retornam via REST, mas nao disparam novo evento.

```json
{
  "id": "support-1",
  "studentId": "11111111-1111-4111-8111-111111111111",
  "tutorId": "33333333-3333-4333-8333-333333333333",
  "activityId": "22222222-2222-4222-8222-222222222222",
  "progressId": null,
  "status": "aberto",
  "priority": "alta",
  "message": "Preciso de ajuda para continuar.",
  "currentView": "lesson-screen",
  "sourcePlatform": "mobile",
  "requestedAt": "2026-03-18T20:00:00.000Z",
  "resolvedAt": null
}
```

### `notification.created`

Emitido quando uma acao operacional cria notificacao para o painel.

```json
{
  "id": "support:support-1",
  "type": "support_request",
  "recipientId": "33333333-3333-4333-8333-333333333333",
  "recipientRole": "tutor",
  "sourceEntityType": "support_request",
  "sourceEntityId": "support-1",
  "createdAt": "2026-03-18T20:00:00.000Z"
}
```

### `support.resolved`

Emitido apos `PATCH /api/v1/painel/fila/:id` resolver pedido de ajuda.
O mobile deve tratar o REST/polling como fonte canonica e usar este evento
apenas para liberar a tela mais rapido quando estiver conectado.

### `progress.locked`

Emitido apos `POST /api/v1/painel/progress` gravar status `LOCKED`.

```json
{
  "id": "progress-1",
  "studentId": "11111111-1111-4111-8111-111111111111",
  "activityId": "22222222-2222-4222-8222-222222222222",
  "status": "travado",
  "score": null,
  "elapsedSeconds": 42,
  "sourcePlatform": "mobile",
  "updatedAt": "2026-03-18T20:00:00.000Z"
}
```

### `progress.unlocked`

Emitido apos `PATCH /api/v1/painel/fila/:id` destravar progresso. A API tambem
tenta liberar `SessionState.isLocked = false` no schema mobile.

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

## Reacao esperada no web

Ao receber `support.created`, `support.resolved`, `progress.locked`,
`progress.unlocked` ou `notification.created`, o painel deve invalidar/refazer
as leituras REST afetadas: fila, badge de notificacoes e KPIs do dashboard. O
payload do evento serve para resposta instantanea e logs, mas o REST continua
sendo a fonte canonica.

## Observabilidade local

Se o Socket.IO ainda nao estiver ativo, o painel continua funcionando com:

- Status de conexao exibido no topo.
- Reconexao automatica com backoff.
- Fallback visual sem bloquear cadastro e acompanhamento.
