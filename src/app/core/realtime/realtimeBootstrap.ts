import { env } from "../config/env";
import { RealtimeSocketClient } from "./socketClient";
import { realtimeStore } from "./realtimeStore";

let started = false;
let client: RealtimeSocketClient | null = null;

export function startRealtimeBridge() {
  if (started) {
    return client;
  }

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
