import {
  ClientEvent,
  ClientEventType,
  ConnectionStatus,
  ServerEvent,
  ServerEventType,
} from "./contracts";

type ServerEventHandler<T extends ServerEventType = ServerEventType> = (
  event: ServerEvent<T>,
) => void;

interface SocketClientOptions {
  url: string;
  token?: string;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  heartbeatIntervalMs?: number;
  onConnectionStatus?: (status: ConnectionStatus) => void;
}

export class RealtimeSocketClient {
  private readonly url: string;
  private readonly token?: string;
  private readonly reconnectBaseDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly listeners = new Map<ServerEventType, Set<ServerEventHandler>>();
  private readonly onConnectionStatus?: (status: ConnectionStatus) => void;

  private socket: WebSocket | null = null;
  private pendingMessages: string[] = [];
  private reconnectAttempts = 0;
  private manualClose = false;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;

  constructor(options: SocketClientOptions) {
    this.url = options.url;
    this.token = options.token;
    this.reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? 1000;
    this.reconnectMaxDelayMs = options.reconnectMaxDelayMs ?? 15000;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 25000;
    this.onConnectionStatus = options.onConnectionStatus;
  }

  connect() {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    const status: ConnectionStatus = this.reconnectAttempts > 0 ? "reconnecting" : "connecting";
    this.emitConnectionStatus(status);

    const endpoint = this.withToken(this.url, this.token);
    this.socket = new WebSocket(endpoint);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.emitConnectionStatus("connected");
      this.flushPendingMessages();
      this.startHeartbeat();
    };

    this.socket.onmessage = (message) => {
      const event = this.safeParseEvent(message.data);
      if (!event) {
        return;
      }

      if (event.type === "pong") {
        return;
      }

      this.dispatchEvent(event);
    };

    this.socket.onerror = () => {
      this.emitConnectionStatus("error");
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      this.emitConnectionStatus("disconnected");

      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };
  }

  disconnect() {
    this.manualClose = true;
    this.clearReconnect();
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    this.emitConnectionStatus("disconnected");
  }

  send<T extends ClientEventType>(eventType: T, payload: ClientEvent<T>["payload"]) {
    const event: ClientEvent<T> = {
      type: eventType,
      payload,
      emittedAt: new Date().toISOString(),
      version: "1.0",
    };

    const message = JSON.stringify(event);

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.pendingMessages.push(message);
      return;
    }

    this.socket.send(message);
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

  private safeParseEvent(data: unknown): ServerEvent | null {
    if (typeof data !== "string") {
      return null;
    }

    try {
      const parsed = JSON.parse(data) as ServerEvent;
      if (!parsed || typeof parsed !== "object" || !("type" in parsed) || !("payload" in parsed)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private dispatchEvent(event: ServerEvent) {
    const handlers = this.listeners.get(event.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    handlers.forEach((handler) => {
      handler(event);
    });
  }

  private scheduleReconnect() {
    this.clearReconnect();
    this.reconnectAttempts += 1;

    const delay = Math.min(
      this.reconnectBaseDelayMs * 2 ** (this.reconnectAttempts - 1),
      this.reconnectMaxDelayMs,
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send("ping", { at: new Date().toISOString() });
    }, this.heartbeatIntervalMs);
  }

  private flushPendingMessages() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (!message) {
        continue;
      }
      this.socket.send(message);
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private emitConnectionStatus(status: ConnectionStatus) {
    this.onConnectionStatus?.(status);
  }

  private withToken(url: string, token?: string) {
    if (!token) {
      return url;
    }

    try {
      const parsed = new URL(url);
      parsed.searchParams.set("token", token);
      return parsed.toString();
    } catch {
      return url;
    }
  }
}
