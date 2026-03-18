import { env } from "../config/env";
import {
  ClientEventType,
  ServerEvent,
  ServerEventType,
  WebToServerPayloadMap,
} from "./contracts";
import { MockRealtimeSocketClient } from "./mockSocketClient";
import { RealtimeSocketClient } from "./socketClient";
import { realtimeStore } from "./realtimeStore";

let started = false;

interface RealtimeBridgeClient {
  connect: () => void;
  disconnect: () => void;
  send: <T extends ClientEventType>(eventType: T, payload: WebToServerPayloadMap[T]) => void;
  subscribe: <T extends ServerEventType>(
    eventType: T,
    handler: (event: ServerEvent<T>) => void,
  ) => () => void;
}

let client: RealtimeBridgeClient | null = null;

export function startRealtimeBridge() {
  if (started) {
    return client;
  }

  if (env.useMocks) {
    client = new MockRealtimeSocketClient({
      heartbeatIntervalMs: env.heartbeatIntervalMs,
      onConnectionStatus: (status) => {
        realtimeStore.setConnectionStatus(status);
      },
    });
  } else {
    client = new RealtimeSocketClient({
      url: env.wsUrl,
      token: env.wsToken || undefined,
      reconnectBaseDelayMs: env.reconnectBaseDelayMs,
      reconnectMaxDelayMs: env.reconnectMaxDelayMs,
      heartbeatIntervalMs: env.heartbeatIntervalMs,
      onConnectionStatus: (status) => {
        realtimeStore.setConnectionStatus(status);
      },
    });
  }

  const forwardEventTypes = [
    "presence.snapshot",
    "presence.user_joined",
    "presence.user_left",
    "session.metrics_updated",
  ] as const;

  forwardEventTypes.forEach((eventType) => {
    client?.subscribe(eventType, (event) => {
      realtimeStore.applyServerEvent(event);
    });
  });

  client.connect();
  client.send("subscribe.dashboard", { tenantId: "default" });

  started = true;
  return client;
}

export function stopRealtimeBridge() {
  client?.send("unsubscribe.dashboard", { tenantId: "default" });
  client?.disconnect();
  client = null;
  started = false;
}
