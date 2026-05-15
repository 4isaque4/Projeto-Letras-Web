import {
  ClientEvent,
  ClientEventType,
  ConnectionStatus,
  ServerEvent,
  ServerEventType,
} from "./contracts";
import { io, Socket } from "socket.io-client";

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

  private socket: Socket | null = null;
  private pendingMessages: ClientEvent[] = [];
  private boundServerEvents = new Set<ServerEventType>();
  private reconnectAttempts = 0;
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
    if (this.socket?.connected || this.socket?.active) {
      return;
    }

    const status: ConnectionStatus = this.reconnectAttempts > 0 ? "reconnecting" : "connecting";
    this.emitConnectionStatus(status);

    const endpoint = this.toSocketIoEndpoint(this.url);
    this.boundServerEvents.clear();
    this.socket = io(endpoint, {
      auth: this.token ? { token: this.token } : undefined,
      reconnection: true,
      reconnectionDelay: this.reconnectBaseDelayMs,
      reconnectionDelayMax: this.reconnectMaxDelayMs,
      transports: ["websocket"],
    });

    this.socket.on("connect", () => {
      this.reconnectAttempts = 0;
      this.emitConnectionStatus("connected");
      this.flushPendingMessages();
      this.startHeartbeat();
    });

    this.socket.io.on("reconnect_attempt", (attempt) => {
      this.reconnectAttempts = attempt;
      this.emitConnectionStatus("reconnecting");
    });

    this.socket.on("connect_error", () => {
      this.emitConnectionStatus("error");
    });

    this.socket.on("disconnect", () => {
      this.stopHeartbeat();
      this.emitConnectionStatus("disconnected");
    });

    this.listeners.forEach((_handlers, eventType) => {
      this.bindSocketEvent(eventType);
    });
  }

  disconnect() {
    this.stopHeartbeat();
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.boundServerEvents.clear();
    this.emitConnectionStatus("disconnected");
  }

  send<T extends ClientEventType>(eventType: T, payload: ClientEvent<T>["payload"]) {
    const event: ClientEvent<T> = {
      type: eventType,
      payload,
      emittedAt: new Date().toISOString(),
      version: "1.0",
    };

    if (!this.socket?.connected) {
      this.pendingMessages.push(event);
      return;
    }

    this.socket.emit(event.type, event);
  }

  subscribe<T extends ServerEventType>(eventType: T, handler: ServerEventHandler<T>) {
    const handlers = this.listeners.get(eventType) ?? new Set<ServerEventHandler>();
    handlers.add(handler as ServerEventHandler);
    this.listeners.set(eventType, handlers);
    this.bindSocketEvent(eventType);

    return () => {
      const currentHandlers = this.listeners.get(eventType);
      currentHandlers?.delete(handler as ServerEventHandler);
      if (currentHandlers && currentHandlers.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  private safeParseEvent(data: unknown): ServerEvent | null {
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) as ServerEvent : data as ServerEvent;
      if (!parsed || typeof parsed !== "object" || !("type" in parsed) || !("payload" in parsed)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private bindSocketEvent(eventType: ServerEventType) {
    if (!this.socket || this.boundServerEvents.has(eventType)) {
      return;
    }

    this.boundServerEvents.add(eventType);
    this.socket.on(eventType, (data: unknown) => {
      const event = this.safeParseEvent(data);
      if (!event || event.type === "pong") {
        return;
      }

      this.dispatchEvent(event);
    });
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

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send("ping", { at: new Date().toISOString() });
    }, this.heartbeatIntervalMs);
  }

  private flushPendingMessages() {
    if (!this.socket?.connected) {
      return;
    }

    while (this.pendingMessages.length > 0) {
      const event = this.pendingMessages.shift();
      if (!event) {
        continue;
      }
      this.socket.emit(event.type, event);
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

  private toSocketIoEndpoint(url: string) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "ws:") {
        parsed.protocol = "http:";
      }
      if (parsed.protocol === "wss:") {
        parsed.protocol = "https:";
      }
      if (!parsed.pathname || parsed.pathname === "/" || parsed.pathname === "/ws") {
        parsed.pathname = "/realtime";
      }
      return parsed.toString().replace(/\/$/, "");
    } catch {
      return url;
    }
  }
}
