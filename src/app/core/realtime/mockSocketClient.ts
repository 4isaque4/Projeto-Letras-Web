import {
  ClientEvent,
  ClientEventType,
  ConnectionStatus,
  PresenceUser,
  ServerEvent,
  ServerEventType,
  SessionMetrics,
} from "./contracts";

type ServerEventHandler<T extends ServerEventType = ServerEventType> = (
  event: ServerEvent<T>,
) => void;

interface MockSocketClientOptions {
  heartbeatIntervalMs?: number;
  onConnectionStatus?: (status: ConnectionStatus) => void;
}

const DEMO_USERS: PresenceUser[] = [
  {
    userId: "u-1001",
    name: "Joao Silva",
    role: "alfabetizando",
    device: "mobile",
    online: true,
    lastSeenAt: new Date().toISOString(),
    sessionId: "sess-1001",
  },
  {
    userId: "u-1002",
    name: "Maria Santos",
    role: "alfabetizando",
    device: "mobile",
    online: true,
    lastSeenAt: new Date().toISOString(),
    sessionId: "sess-1002",
  },
  {
    userId: "u-2001",
    name: "Tutor Ana",
    role: "tutor",
    device: "web",
    online: true,
    lastSeenAt: new Date().toISOString(),
    sessionId: "sess-2001",
  },
  {
    userId: "u-3001",
    name: "Gestor Carlos",
    role: "admin",
    device: "web",
    online: true,
    lastSeenAt: new Date().toISOString(),
    sessionId: "sess-3001",
  },
];

export class MockRealtimeSocketClient {
  private readonly listeners = new Map<ServerEventType, Set<ServerEventHandler>>();
  private readonly onConnectionStatus?: (status: ConnectionStatus) => void;
  private readonly heartbeatIntervalMs: number;

  private users: PresenceUser[] = [...DEMO_USERS];
  private metricsTimer: number | null = null;
  private presenceTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private connectTimer: number | null = null;
  private subscribed = false;
  private connected = false;
  private sequence = 0;

  constructor(options: MockSocketClientOptions) {
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 25000;
    this.onConnectionStatus = options.onConnectionStatus;
  }

  connect() {
    if (this.connected || this.connectTimer) {
      return;
    }

    this.emitConnectionStatus("connecting");
    this.connectTimer = window.setTimeout(() => {
      this.connectTimer = null;
      this.connected = true;
      this.emitConnectionStatus("connected");
      this.startHeartbeat();

      if (this.subscribed) {
        this.emitSnapshot();
        this.emitMetrics();
        this.startSimulation();
      }
    }, 350);
  }

  disconnect() {
    if (this.connectTimer) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    this.connected = false;
    this.stopSimulation();
    this.stopHeartbeat();
    this.emitConnectionStatus("disconnected");
  }

  send<T extends ClientEventType>(eventType: T, _payload: ClientEvent<T>["payload"]) {
    if (eventType === "subscribe.dashboard") {
      this.subscribed = true;
      if (this.connected) {
        this.emitSnapshot();
        this.emitMetrics();
        this.startSimulation();
      }
      return;
    }

    if (eventType === "unsubscribe.dashboard") {
      this.subscribed = false;
      this.stopSimulation();
      return;
    }

    if (eventType === "ping") {
      this.dispatch({
        type: "pong",
        payload: { at: new Date().toISOString() },
        emittedAt: new Date().toISOString(),
        version: "1.0",
      });
    }
  }

  subscribe<T extends ServerEventType>(eventType: T, handler: ServerEventHandler<T>) {
    const handlers = this.listeners.get(eventType) ?? new Set<ServerEventHandler>();
    handlers.add(handler as ServerEventHandler);
    this.listeners.set(eventType, handlers);

    return () => {
      const currentHandlers = this.listeners.get(eventType);
      currentHandlers?.delete(handler as ServerEventHandler);
      if (currentHandlers && currentHandlers.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  private startSimulation() {
    this.stopSimulation();

    this.metricsTimer = window.setInterval(() => {
      this.emitMetrics();
    }, 6000);

    this.presenceTimer = window.setInterval(() => {
      this.togglePresence();
    }, 9000);
  }

  private stopSimulation() {
    if (this.metricsTimer) {
      window.clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    if (this.presenceTimer) {
      window.clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.dispatch({
        type: "pong",
        payload: { at: new Date().toISOString() },
        emittedAt: new Date().toISOString(),
        version: "1.0",
      });
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private emitSnapshot() {
    this.dispatch({
      type: "presence.snapshot",
      payload: {
        users: this.users.filter((item) => item.online),
      },
      emittedAt: new Date().toISOString(),
      version: "1.0",
      traceId: this.nextTraceId(),
    });
  }

  private emitMetrics() {
    const onlineUsers = this.users.filter((item) => item.online);
    const metrics: SessionMetrics = {
      onlineUsers: onlineUsers.length,
      onlineTutors: onlineUsers.filter((item) => item.role === "tutor").length,
      onlineStudents: onlineUsers.filter((item) => item.role === "alfabetizando").length,
      openTickets: Math.max(0, Math.floor(onlineUsers.length / 2) - 1),
      updatedAt: new Date().toISOString(),
    };

    this.dispatch({
      type: "session.metrics_updated",
      payload: metrics,
      emittedAt: metrics.updatedAt,
      version: "1.0",
      traceId: this.nextTraceId(),
    });
  }

  private togglePresence() {
    const target = this.users[Math.floor(Math.random() * this.users.length)];
    const now = new Date().toISOString();

    if (target.online) {
      target.online = false;
      target.lastSeenAt = now;
      this.dispatch({
        type: "presence.user_left",
        payload: {
          userId: target.userId,
          lastSeenAt: now,
        },
        emittedAt: now,
        version: "1.0",
        traceId: this.nextTraceId(),
      });
      this.emitMetrics();
      return;
    }

    target.online = true;
    target.lastSeenAt = now;
    target.sessionId = `sess-${target.userId}-${Date.now()}`;
    this.dispatch({
      type: "presence.user_joined",
      payload: { user: { ...target } },
      emittedAt: now,
      version: "1.0",
      traceId: this.nextTraceId(),
    });
    this.emitMetrics();
  }

  private dispatch(event: ServerEvent) {
    const handlers = this.listeners.get(event.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    handlers.forEach((handler) => handler(event));
  }

  private emitConnectionStatus(status: ConnectionStatus) {
    this.onConnectionStatus?.(status);
  }

  private nextTraceId() {
    this.sequence += 1;
    return `mock-${this.sequence}`;
  }
}
