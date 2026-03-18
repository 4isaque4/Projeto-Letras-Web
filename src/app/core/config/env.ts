function parseBoolean(input: unknown, fallback: boolean) {
  if (typeof input !== "string") {
    return fallback;
  }

  const normalized = input.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
}

export const env = {
  appEnv: import.meta.env.MODE,
  useMocks: parseBoolean(import.meta.env.VITE_USE_MOCKS, true),
  wsUrl: import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws",
  wsToken: import.meta.env.VITE_WS_TOKEN ?? "",
  reconnectBaseDelayMs: Number(import.meta.env.VITE_WS_RECONNECT_BASE_MS ?? 1000),
  reconnectMaxDelayMs: Number(import.meta.env.VITE_WS_RECONNECT_MAX_MS ?? 15000),
  heartbeatIntervalMs: Number(import.meta.env.VITE_WS_HEARTBEAT_MS ?? 25000),
};
